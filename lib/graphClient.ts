import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

let graphClient: Client | null = null;

function getGraphClient(): Client {
  if (graphClient) {
    return graphClient;
  }

  const tenantId = process.env.GRAPH_TENANT_ID!;
  const clientId = process.env.GRAPH_CLIENT_ID!;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET!;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing Microsoft Graph environment variables');
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  graphClient = Client.initWithMiddleware({ authProvider });
  return graphClient;
}

export interface CreateMeetingOptions {
  organizerEmail: string;
  attendeeEmail: string;
  subject: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
}

export async function createTeamsMeeting(options: CreateMeetingOptions): Promise<{
  joinUrl: string;
  meetingId: string;
}> {
  console.log('📅 [GRAPH API] Creating Teams meeting...', {
    organizer: options.organizerEmail,
    attendee: options.attendeeEmail,
    subject: options.subject,
    startTime: options.startTime,
    endTime: options.endTime,
  });

  try {
    const client = getGraphClient();

    // Get organizer user ID
    console.log(`👤 [GRAPH API] Fetching organizer user: ${options.organizerEmail}`);
    const organizer = await client
      .api(`/users/${encodeURIComponent(options.organizerEmail)}`)
      .get();

    console.log(`✅ [GRAPH API] Organizer found: ${organizer.id}`);

    const startDateTime = new Date(options.startTime);
    const endDateTime = new Date(options.endTime);
    const startStr = startDateTime.toISOString();
    const endStr = endDateTime.toISOString();

    const requestBody = {
      subject: options.subject ?? 'Soulvyns session',
      startDateTime: startStr,
      endDateTime: endStr,
    };

    console.log('📅 [GRAPH API] Creating online meeting...');
    // Create online meeting (organizer is implied by URL; only subject + times in body per Graph API)
    const meeting = await client
      .api(`/users/${organizer.id}/onlineMeetings`)
      .post(requestBody);

    const joinUrl = (meeting as { joinWebUrl?: string }).joinWebUrl ?? (meeting as { joinUrl?: string }).joinUrl ?? '';
    console.log(`✅ [GRAPH API] Teams meeting created: ${meeting.id}`);
    console.log(`🔗 [GRAPH API] Join URL: ${joinUrl}`);

    return {
      joinUrl,
      meetingId: meeting.id ?? '',
    };
  } catch (error: any) {
    console.error('❌ [GRAPH API] Failed to create Teams meeting:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    });
    throw error;
  }
}
