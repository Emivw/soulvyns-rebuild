/**
 * Teams integration tests for createTeamsMeeting (Microsoft Graph API).
 * Uses mocks so no real API calls or credentials are required.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTeamsMeeting, type CreateMeetingOptions } from './graphClient';

// Hoist mock fns so they can be used in vi.mock factory and in tests
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@azure/identity', () => ({
  ClientSecretCredential: vi.fn(),
}));

vi.mock('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials', () => ({
  TokenCredentialAuthenticationProvider: vi.fn(),
}));

vi.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    initWithMiddleware: vi.fn().mockReturnValue({
      api: vi.fn().mockImplementation((path: string) => {
        if (path.includes('onlineMeetings')) return { post: mockPost };
        return { get: mockGet };
      }),
    }),
  },
}));

const validOptions: CreateMeetingOptions = {
  organizerEmail: 'counselor@test.com',
  attendeeEmail: 'client@test.com',
  subject: 'Counseling Session - Dr. Jane',
  startTime: '2025-03-01T10:00:00.000Z',
  endTime: '2025-03-01T11:00:00.000Z',
};

describe('Teams integration (createTeamsMeeting)', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GRAPH_TENANT_ID = 'test-tenant';
    process.env.GRAPH_CLIENT_ID = 'test-client';
    process.env.GRAPH_CLIENT_SECRET = 'test-secret';
    mockGet.mockResolvedValue({ id: 'organizer-uuid-123' });
    mockPost.mockResolvedValue({
      id: 'meeting-uuid-456',
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/abc123',
    });
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('returns joinUrl and meetingId when Graph API succeeds', async () => {
    const result = await createTeamsMeeting(validOptions);

    expect(result).toEqual({
      meetingId: 'meeting-uuid-456',
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/abc123',
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('calls Graph to fetch organizer (get) then create meeting (post)', async () => {
    await createTeamsMeeting(validOptions);

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('creates online meeting with subject and times only (organizer from URL)', async () => {
    await createTeamsMeeting(validOptions);

    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: validOptions.subject,
        startDateTime: expect.any(String),
        endDateTime: expect.any(String),
      })
    );
    const postBody = mockPost.mock.calls[0][0];
    expect(Object.keys(postBody)).toEqual(expect.arrayContaining(['subject', 'startDateTime', 'endDateTime']));
    expect(new Date(postBody.startDateTime).toISOString()).toBe('2025-03-01T10:00:00.000Z');
    expect(new Date(postBody.endDateTime).toISOString()).toBe('2025-03-01T11:00:00.000Z');
  });

  it('throws when organizer lookup fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('User not found'));

    await expect(createTeamsMeeting(validOptions)).rejects.toThrow('User not found');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('throws when online meeting creation fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('Insufficient privileges'));

    await expect(createTeamsMeeting(validOptions)).rejects.toThrow('Insufficient privileges');
  });

  it('throws when Graph env vars are missing', async () => {
    vi.resetModules();
    delete process.env.GRAPH_TENANT_ID;
    const { createTeamsMeeting: createTeamsMeetingFresh } = await import('./graphClient');

    await expect(createTeamsMeetingFresh(validOptions)).rejects.toThrow(
      /Missing Microsoft Graph environment variables/
    );
  });
});
