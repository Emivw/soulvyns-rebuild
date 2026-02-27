'use client';

import { useState } from 'react';

/**
 * PayFast Sandbox Test Page
 *
 * Uses server-side signature only: POSTs to /api/bookings/payfast-form,
 * which returns HTML with a signed form that auto-submits to PayFast.
 */
export default function TestPayFastPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePayment = async () => {
    setIsSubmitting(true);
    console.log('🚀 [TEST] Requesting PayFast form (server-side signature)...');

    try {
      const res = await fetch('/api/bookings/payfast-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counselorId: 'b4ba80b0-79d2-45da-a759-e6ba5395af1a',
          slotId: 'test-slot-001',
          amount: 500,
          clientEmail: 'client@test.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Request failed: ${res.status}`);
      }

      const html = await res.text();
      const w = window.open('', '_blank');
      if (!w) {
        alert('Popup blocked. Allow popups and try again.');
        setIsSubmitting(false);
        return;
      }
      w.document.write(html);
      w.document.close();
    } catch (error: unknown) {
      console.error('❌ [TEST] Error triggering payment:', error);
      alert(`Payment error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">PayFast Sandbox Test</h1>

          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Integration Status</h2>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-3 bg-green-500"></div>
                  <span>Signature: Server-side only (canonical)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-3 bg-green-500"></div>
                  <span>Payment form: Via /api/bookings/payfast-form</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Instructions</h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>Click the &quot;Test PayFast Payment&quot; button below</li>
                <li>A new tab will open and redirect to PayFast Sandbox</li>
                <li>Use PayFast test credentials to complete payment</li>
                <li>After payment, you&apos;ll be redirected back to /bookings/success or /bookings/cancel</li>
              </ul>
            </div>

            <button
              onClick={handlePayment}
              disabled={isSubmitting}
              className="w-full bg-blue-500 text-white py-4 px-6 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition font-medium text-lg"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Test PayFast Payment'
              )}
            </button>

            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <h3 className="font-semibold mb-2">Configuration</h3>
              <p className="text-gray-600">
                Merchant ID, key, passphrase and URLs are read from env. Signature is generated only in <code className="bg-gray-200 px-1">lib/payfast.ts</code> (server).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
