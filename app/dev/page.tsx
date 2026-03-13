'use client';

import { useState } from 'react';

export default function DevPage() {
  const [seedStatus, setSeedStatus] = useState<string>('');
  const [webhookStatus, setWebhookStatus] = useState<string>('');
  const [graphStatus, setGraphStatus] = useState<string>('');
  const [bookingId, setBookingId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    setSeedStatus('Seeding database...');

    try {
      const response = await fetch('/api/dev/seed', {
        method: 'POST',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Display detailed error information
        const errorDetails = {
          error: data.error || 'Seed failed',
          message: data.message || 'Unknown error',
          ...(data.code && { code: data.code }),
          ...(data.stack && { stack: data.stack }),
        };
        throw new Error(JSON.stringify(errorDetails, null, 2));
      }

      setSeedStatus(`✅ Seed successful!\n\n${JSON.stringify(data.data, null, 2)}`);
    } catch (error: any) {
      // Try to parse as JSON, otherwise use message directly
      try {
        const parsed = JSON.parse(error.message);
        setSeedStatus(`❌ Error:\n${JSON.stringify(parsed, null, 2)}`);
      } catch {
        setSeedStatus(`❌ Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!bookingId.trim()) {
      setWebhookStatus('⚠️ Please enter a booking ID');
      return;
    }

    setLoading(true);
    setWebhookStatus('Simulating webhook...');

    try {
      const response = await fetch('/api/dev/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: bookingId.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Webhook test failed');
      }

      setWebhookStatus(`✅ Webhook simulated successfully!\n\n${JSON.stringify(data.booking, null, 2)}`);
    } catch (error: any) {
      setWebhookStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestGraph = async (useBookingId: boolean) => {
    setLoading(true);
    setGraphStatus('Calling real Microsoft Graph API...');

    try {
      const body = useBookingId && bookingId.trim()
        ? { bookingId: bookingId.trim() }
        : {
            organizerEmail: 'admin@soulvyns.co.za',
            attendeeEmail: 'emiya.vanwyk@gmail.com',
            startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          };

      const response = await fetch('/api/dev/test-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = [data.message || data.error || 'Graph test failed', data.hint].filter(Boolean).join('\n');
        throw new Error(msg);
      }

      const joinUrl = data.joinUrl;
      const msg = [
        '✅ Real Teams meeting created',
        joinUrl ? `\nJoin URL: ${joinUrl}` : '',
        data.bookingId ? `\nBooking updated with meeting link (ID: ${data.bookingId}). Check My Bookings.)` : '',
      ].join('');
      setGraphStatus(msg);
    } catch (error: any) {
      setGraphStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Development Tools</h1>

        <div className="space-y-6">
          {/* Seed Database */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Database Seed</h2>
            <p className="text-gray-600 mb-2">
              Seeds the database with test data:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-1 text-gray-600">
              <li>1 test counselor (counselor@test.com / TestPassword123!)</li>
              <li>2 availability slots</li>
              <li>1 test client (client@test.com / TestPassword123!)</li>
            </ul>
            <button
              onClick={handleSeed}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              {loading ? 'Seeding...' : 'Seed Database'}
            </button>
            {seedStatus && (
              <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto">
                {seedStatus}
              </pre>
            )}
          </div>

          {/* Test Webhook */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test PayFast Webhook</h2>
            <p className="text-gray-600 mb-4">
              Simulates a PayFast payment webhook for testing the booking → payment → meeting pipeline.
            </p>
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Enter booking ID"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={handleTestWebhook}
                disabled={loading || !bookingId.trim()}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
              >
                {loading ? 'Testing...' : 'Test Webhook'}
              </button>
            </div>
            {webhookStatus && (
              <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto">
                {webhookStatus}
              </pre>
            )}
          </div>

          {/* Test Microsoft Graph (real callbacks) */}
          <div className="bg-white p-6 rounded-lg shadow border-2 border-purple-200">
            <h2 className="text-xl font-semibold mb-4">Test Microsoft Graph (Teams) – real API</h2>
            <p className="text-gray-600 mb-4">
              Uses real Microsoft Graph to create a Teams meeting. Requires GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET. Organizer for tests is admin@soulvyns.co.za (must exist in your tenant). If you see &quot;Insufficient privileges&quot;, add Graph app permissions and an application access policy – see docs/GRAPH_TEAMS_SETUP.md.
            </p>
            <div className="flex flex-wrap gap-4 mb-4">
              <button
                onClick={() => handleTestGraph(true)}
                disabled={loading || !bookingId.trim()}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-300"
              >
                {loading ? 'Calling Graph...' : 'Create meeting for booking above'}
              </button>
              <button
                onClick={() => handleTestGraph(false)}
                disabled={loading}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-300"
              >
                {loading ? 'Calling Graph...' : 'Create test meeting (admin@soulvyns.co.za / emiya.vanwyk@gmail.com)'}
              </button>
            </div>
            {graphStatus && (
              <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto whitespace-pre-wrap">
                {graphStatus}
              </pre>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">End-to-End Test Flow</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET in .env.local. The organizational user for Teams is <code className="bg-gray-200 px-1">admin@soulvyns.co.za</code> (must exist in your tenant).</li>
              <li>Optional: use &quot;Test Microsoft Graph&quot; to create one real Teams meeting and confirm the join URL works.</li>
              <li>Click &quot;Seed Database&quot; to populate test data</li>
              <li>Login as client@test.com (password: TestPassword123!)</li>
              <li>Browse counselors and select a time slot, then create a booking</li>
              <li>Copy the booking ID from the URL or Supabase, paste above, then click &quot;Test Webhook&quot; to simulate payment (uses real Graph to create the meeting)</li>
              <li>Verify the booking status is &quot;paid&quot; and &quot;Join Meeting&quot; appears on My Bookings</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
