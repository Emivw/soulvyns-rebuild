import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createTeamsMeeting } from '@/lib/graphClient';

/**
 * Development route to test real Microsoft Graph (Teams) integration.
 * Creates a real Teams meeting and optionally attaches it to a booking.
 * WARNING: Only use in development; uses real Graph API.
 */
export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Test Graph is disabled in production' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const bookingId = body?.bookingId as string | undefined;
    const organizerEmail = body?.organizerEmail as string | undefined;
    const attendeeEmail = body?.attendeeEmail as string | undefined;
    const startTime = body?.startTime as string | undefined;
    const endTime = body?.endTime as string | undefined;

    // Require either bookingId or both organizer and attendee emails
    if (bookingId) {
      // Use real booking: load and create meeting, then save to booking
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .select(
          '*, counselors!inner(ms_graph_user_email, display_name), availability_slots!inner(start_time, end_time), users_profile!inner(email, full_name)'
        )
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        return NextResponse.json(
          { error: 'Booking not found', details: bookingError?.message },
          { status: 404 }
        );
      }

      const organizer = booking.counselors?.ms_graph_user_email;
      const attendee = booking.users_profile?.email;
      const slot = booking.availability_slots;

      if (!organizer || !attendee || !slot?.start_time || !slot?.end_time) {
        return NextResponse.json(
          { error: 'Booking missing counselor email, client email, or slot times' },
          { status: 400 }
        );
      }

      const meeting = await createTeamsMeeting({
        organizerEmail: organizer,
        attendeeEmail: attendee,
        subject: `Counseling Session - ${booking.counselors?.display_name ?? 'Session'}`,
        startTime: slot.start_time,
        endTime: slot.end_time,
      });

      // Save meeting URL to booking so My Bookings shows "Join Meeting"
      await supabaseAdmin
        .from('bookings')
        .update({
          meeting_url: meeting.joinUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      return NextResponse.json({
        success: true,
        message: 'Real Teams meeting created and saved to booking',
        joinUrl: meeting.joinUrl,
        meetingId: meeting.meetingId,
        bookingId,
        organizerEmail: organizer,
        attendeeEmail: attendee,
      });
    }

    if (organizerEmail && attendeeEmail) {
      // Ad-hoc test: create one meeting with provided emails (no booking)
      const start = startTime || new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const end = endTime || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      const meeting = await createTeamsMeeting({
        organizerEmail,
        attendeeEmail,
        subject: 'Soulvyns Graph Test Meeting',
        startTime: start,
        endTime: end,
      });

      return NextResponse.json({
        success: true,
        message: 'Real Teams meeting created (no booking)',
        joinUrl: meeting.joinUrl,
        meetingId: meeting.meetingId,
        organizerEmail,
        attendeeEmail,
      });
    }

    return NextResponse.json(
      {
        error: 'Provide either bookingId or both organizerEmail and attendeeEmail',
        exampleBooking: { bookingId: '<uuid>' },
        exampleCustom: {
          organizerEmail: 'counselor@your-tenant.com',
          attendeeEmail: 'client@example.com',
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        },
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; statusCode?: number };
    console.error('❌ [TEST GRAPH] Error:', err);
    return NextResponse.json(
      {
        error: 'Graph test failed',
        message: err?.message ?? 'Unknown error',
        code: err?.code,
        statusCode: err?.statusCode,
      },
      { status: 500 }
    );
  }
}
