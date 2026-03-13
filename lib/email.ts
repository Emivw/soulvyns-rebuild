/**
 * Booking confirmation emails via Azure Email Communication Service (soulvyns-email).
 * Sends to both client and counselor after payment.
 * If Azure env vars are not set, logs payloads only.
 */

import { EmailClient } from '@azure/communication-email';

export type BookingForEmail = {
  id: string;
  counselors: { display_name?: string; email?: string; ms_graph_user_email?: string };
  users_profile: { email?: string; full_name?: string };
};

export type SlotForEmail = {
  start_time: string;
  end_time: string;
};

export type SessionForEmail = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
};

const formatTime = (slot: SlotForEmail | null) =>
  slot?.start_time ? new Date(slot.start_time).toLocaleString() : 'See booking';

function getEmailClient(): EmailClient | null {
  const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
  if (!connectionString?.trim()) return null;
  return new EmailClient(connectionString);
}

function buildClientHtml(body: {
  recipientName: string;
  counselorName: string;
  startTime: string;
  meetingLink: string;
  bookingId: string;
}): string {
  return `
    <p>Hi ${escapeHtml(body.recipientName)},</p>
    <p>Your counseling session with <strong>${escapeHtml(body.counselorName)}</strong> is confirmed.</p>
    <ul>
      <li><strong>When:</strong> ${escapeHtml(body.startTime)}</li>
      <li><strong>Booking ID:</strong> ${escapeHtml(body.bookingId)}</li>
    </ul>
    <p>Join your Teams meeting here: <a href="${escapeHtml(body.meetingLink)}">${escapeHtml(body.meetingLink)}</a></p>
    <p>— Soulvyn</p>
  `.trim();
}

function buildCounselorHtml(body: {
  counselorName: string;
  clientName: string;
  clientEmail: string;
  startTime: string;
  meetingLink: string;
  bookingId: string;
}): string {
  return `
    <p>Hi ${escapeHtml(body.counselorName)},</p>
    <p>You have a new paid booking.</p>
    <ul>
      <li><strong>Client:</strong> ${escapeHtml(body.clientName)} (${escapeHtml(body.clientEmail)})</li>
      <li><strong>When:</strong> ${escapeHtml(body.startTime)}</li>
      <li><strong>Booking ID:</strong> ${escapeHtml(body.bookingId)}</li>
    </ul>
    <p>Teams meeting link: <a href="${escapeHtml(body.meetingLink)}">${escapeHtml(body.meetingLink)}</a></p>
    <p>— Soulvyn</p>
  `.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 15000;

async function sendOne(
  client: EmailClient,
  from: string,
  to: string,
  toDisplayName: string,
  subject: string,
  html: string
): Promise<void> {
  const poller = await client.beginSend({
    senderAddress: from,
    content: { subject, html },
    recipients: { to: [{ address: to, displayName: toDisplayName }] },
  });

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (typeof poller.poll === 'function') poller.poll();
    if (poller.isDone()) {
      const result = poller.getResult();
      if (result?.status === 'Succeeded') {
        console.log(`📧 [EMAIL] Sent to ${to} (op: ${result?.id})`);
        return;
      }
      if (result?.status === 'Failed' && result?.error) {
        throw new Error((result.error as { message?: string }).message ?? 'Email send failed');
      }
      break;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  console.warn(`⚠️ [EMAIL] Send to ${to} still in progress after ${POLL_TIMEOUT_MS}ms (may still succeed)`);
}

/**
 * Send confirmation emails to both client and counselor (booking details + Teams link).
 * Uses Azure Email Communication Service when AZURE_COMMUNICATION_CONNECTION_STRING
 * and AZURE_EMAIL_FROM are set; otherwise logs payloads only.
 */
export async function sendBookingConfirmation(
  booking: BookingForEmail,
  slot: SlotForEmail | null,
  meetingJoinUrl: string | null
): Promise<void> {
  const clientEmail = booking.users_profile?.email;
  const counselorEmail = booking.counselors?.email ?? booking.counselors?.ms_graph_user_email;
  const startTimeStr = formatTime(slot);
  const meetingLink = meetingJoinUrl ?? '(Meeting link will be sent separately)';
  const counselorName = booking.counselors?.display_name ?? 'Counselor';
  const clientName = booking.users_profile?.full_name ?? 'Client';

  const from = process.env.AZURE_EMAIL_FROM?.trim();
  const emailClient = getEmailClient();

  const clientBody = {
    recipientName: clientName,
    counselorName,
    startTime: startTimeStr,
    meetingLink,
    bookingId: booking.id,
  };
  const counselorBody = {
    counselorName,
    clientName,
    clientEmail: clientEmail ?? '(not provided)',
    startTime: startTimeStr,
    meetingLink,
    bookingId: booking.id,
  };

  if (emailClient && from) {
    try {
      if (clientEmail) {
        await sendOne(
          emailClient,
          from,
          clientEmail,
          clientName,
          'Booking confirmed – Soulvyn',
          buildClientHtml(clientBody)
        );
      }
      if (counselorEmail) {
        await sendOne(
          emailClient,
          from,
          counselorEmail,
          counselorName,
          `New paid booking – ${clientName} – Soulvyn`,
          buildCounselorHtml(counselorBody)
        );
      }
    } catch (err: unknown) {
      console.error('❌ [EMAIL] Azure send failed:', err);
      throw err;
    }
  } else {
    if (clientEmail) {
      console.log('📧 [EMAIL] Client confirmation (no Azure config):', {
        to: clientEmail,
        subject: 'Booking confirmed – Soulvyn',
        body: clientBody,
      });
    }
    if (counselorEmail) {
      console.log('📧 [EMAIL] Counselor confirmation (no Azure config):', {
        to: counselorEmail,
        subject: `New paid booking – ${clientName} – Soulvyn`,
        body: counselorBody,
      });
    }
    if (!clientEmail) console.warn('⚠️ [EMAIL] No client email for booking confirmation');
    if (!counselorEmail) console.warn('⚠️ [EMAIL] No counselor email for booking notification');
  }
}

/**
 * Send confirmation email for a session-based booking (using the `sessions` table).
 * Email includes counselor name, session date, start_time, end_time, and Teams link.
 */
export async function sendSessionConfirmationEmail(params: {
  clientEmail: string;
  clientName: string;
  counselorName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  teamsLink: string;
  sessionId: string;
}): Promise<void> {
  const from = process.env.AZURE_EMAIL_FROM?.trim();
  const emailClient = getEmailClient();

  const subject = 'Session confirmed – Soulvyn';
  const html = `
    <p>Hi ${escapeHtml(params.clientName)},</p>
    <p>Your counseling session with <strong>${escapeHtml(params.counselorName)}</strong> is confirmed.</p>
    <ul>
      <li><strong>Date:</strong> ${escapeHtml(params.sessionDate)}</li>
      <li><strong>Time:</strong> ${escapeHtml(params.startTime)}–${escapeHtml(params.endTime)}</li>
      <li><strong>Session ID:</strong> ${escapeHtml(params.sessionId)}</li>
    </ul>
    <p>Join your Microsoft Teams meeting here:<br/>
      <a href="${escapeHtml(params.teamsLink)}">${escapeHtml(params.teamsLink)}</a>
    </p>
    <p>— Soulvyn</p>
  `.trim();

  if (emailClient && from) {
    try {
      await sendOne(
        emailClient,
        from,
        params.clientEmail,
        params.clientName,
        subject,
        html,
      );
    } catch (err: unknown) {
      console.error('❌ [EMAIL] Session confirmation send failed:', err);
      throw err;
    }
  } else {
    console.log('📧 [EMAIL] Session confirmation (no Azure config):', {
      to: params.clientEmail,
      subject,
      body: {
        counselorName: params.counselorName,
        sessionDate: params.sessionDate,
        startTime: params.startTime,
        endTime: params.endTime,
        teamsLink: params.teamsLink,
        sessionId: params.sessionId,
      },
    });
  }
}

