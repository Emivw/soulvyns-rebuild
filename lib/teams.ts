'use server';

/**
 * Simple Microsoft Teams / Graph integration using client credentials.
 *
 * Env vars:
 * - GRAPH_TENANT_ID
 * - GRAPH_CLIENT_ID
 * - GRAPH_CLIENT_SECRET
 */

type CreateMeetingInput = {
  subject: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  organizerEmail: string;
};

export async function getGraphAccessToken(): Promise<string> {
  const tenant = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;

  if (!tenant || !clientId || !clientSecret) {
    throw new Error(
      'GRAPH_TENANT_ID, GRAPH_CLIENT_ID, and GRAPH_CLIENT_SECRET must be set to create Teams meetings.',
    );
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  console.log('[TEAMS] Requesting Graph access token…');

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[TEAMS] Failed to fetch Graph token:', res.status, text);
    throw new Error(`Graph token request failed with status ${res.status}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('Graph token response did not include access_token');
  }

  console.log('[TEAMS] Graph access token acquired.');
  return data.access_token;
}

export async function createTeamsMeeting(input: CreateMeetingInput): Promise<string> {
  const { subject, startTime, endTime, organizerEmail } = input;

  const token = await getGraphAccessToken();
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
    organizerEmail,
  )}/onlineMeetings`;

  console.log('[TEAMS] Creating Teams meeting via Graph…', {
    organizerEmail,
    subject,
    startTime,
    endTime,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject,
      startDateTime: startTime,
      endDateTime: endTime,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[TEAMS] Failed to create Teams meeting:', res.status, text);
    throw new Error(`Teams meeting creation failed with status ${res.status}`);
  }

  const data = (await res.json()) as { joinWebUrl?: string; joinUrl?: string };
  const joinUrl = data.joinWebUrl || data.joinUrl;

  if (!joinUrl) {
    console.warn('[TEAMS] Meeting created but join URL missing in response.');
    return '';
  }

  console.log('[TEAMS] Teams meeting created. Join URL:', joinUrl);
  return joinUrl;
}

/**
 * Create a Teams meeting by creating a calendar event for the organizer with
 * isOnlineMeeting: true. Graph sends proper Outlook/Teams invites to attendees.
 *
 * Organizer must be the account that has the Teams meeting policy (e.g. admin@soulvyns.co.za).
 * Counselor and client are added as required attendees and receive the meeting invite.
 */
export type CreateMeetingWithInvitesInput = {
  subject: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  organizerEmail: string;
  attendeeEmails: string[]; // e.g. [counselorEmail, clientEmail]
  attendeeNames?: (string | null)[]; // optional display names, same order as attendeeEmails
};

export async function createTeamsMeetingWithInvites(
  input: CreateMeetingWithInvitesInput,
): Promise<string> {
  const { subject, startTime, endTime, organizerEmail, attendeeEmails, attendeeNames } = input;

  const token = await getGraphAccessToken();
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
    organizerEmail,
  )}/events`;

  // Graph expects start/end as { dateTime, timeZone }. Use UTC to match typical slot storage.
  const start = { dateTime: startTime, timeZone: 'UTC' };
  const end = { dateTime: endTime, timeZone: 'UTC' };

  const attendees = attendeeEmails
    .filter((e) => e && e.trim())
    .map((address, i) => ({
      emailAddress: {
        address: address.trim(),
        name: attendeeNames?.[i] ?? undefined,
      },
      type: 'required' as const,
    }));

  console.log('[TEAMS] Creating calendar event with Teams meeting and invites…', {
    organizerEmail,
    subject,
    startTime,
    endTime,
    attendeeCount: attendees.length,
  });

  const body: Record<string, unknown> = {
    subject,
    start,
    end,
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness',
    attendees,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[TEAMS] Failed to create event with Teams meeting:', res.status, text);
    throw new Error(`Teams meeting (event) creation failed with status ${res.status}`);
  }

  const event = (await res.json()) as {
    onlineMeeting?: { joinUrl?: string };
    id?: string;
  };

  const joinUrl = event.onlineMeeting?.joinUrl ?? '';

  if (!joinUrl) {
    console.warn('[TEAMS] Event created but onlineMeeting.joinUrl missing.');
    return '';
  }

  console.log('[TEAMS] Teams meeting with invites created. Join URL:', joinUrl);
  return joinUrl;
}

