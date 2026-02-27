'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TermsPage() {
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);
  const [agreed3, setAgreed3] = useState(false);
  const allChecked = agreed1 && agreed2 && agreed3;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Soulvyn Client Informed Consent &amp; Platform Agreement
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Please read the following agreement carefully before accepting.
            </p>
          </div>

          <div className="px-6 py-6 max-h-[60vh] overflow-y-auto prose prose-sm prose-gray max-w-none">
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Introduction</h2>
              <p className="text-gray-700">
                This Informed Consent &amp; Platform Agreement (&quot;Agreement&quot;) governs your use of the Soulvyn platform and the counselling services provided through it. By accepting this Agreement, you acknowledge that you have read, understood, and agree to be bound by its terms.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Nature of Services</h2>
              <p className="text-gray-700">
                Soulvyn provides a platform that connects you with qualified counsellors for remote counselling sessions. Sessions may be conducted via video call (e.g. Microsoft Teams). The services are intended for general counselling support and are not a substitute for emergency care, crisis intervention, or specialised mental health treatment where required.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Confidentiality</h2>
              <p className="text-gray-700">
                Your counsellor will maintain confidentiality in accordance with applicable professional and ethical standards. Exceptions may apply where required by law (e.g. risk of harm to self or others, or legal obligation). Session content will not be shared with third parties except as permitted by this Agreement or by law.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Your Responsibilities</h2>
              <p className="text-gray-700">
                You agree to provide accurate information, attend scheduled sessions on time, and use the platform in good faith. You are responsible for ensuring a private and appropriate environment for your sessions and for the security of your account credentials.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Payment and Cancellation</h2>
              <p className="text-gray-700">
                Payment is processed via our payment provider (PayFast). Refund and cancellation policies apply as stated at the time of booking. By completing payment, you agree to the terms of the booking and this Agreement.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Limitation of Liability</h2>
              <p className="text-gray-700">
                To the fullest extent permitted by law, Soulvyn and its counsellors shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform or the counselling services. Our liability is limited to the amount you paid for the relevant session(s).
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Consent to Terms</h2>
              <p className="text-gray-700">
                By ticking the boxes below and clicking &quot;Accept&quot;, you confirm that you have read and understood this Agreement, that you consent to the collection and use of your information as described, and that you agree to participate in counselling services subject to these terms.
              </p>
            </section>
          </div>

          <div className="px-6 py-6 border-t border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Confirmation</h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3">
                <input
                  id="agree1"
                  type="checkbox"
                  checked={agreed1}
                  onChange={(e) => setAgreed1(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="agree1" className="text-sm text-gray-700">
                  I have read and understood the Soulvyn Client Informed Consent &amp; Platform Agreement.
                </label>
              </li>
              <li className="flex items-start gap-3">
                <input
                  id="agree2"
                  type="checkbox"
                  checked={agreed2}
                  onChange={(e) => setAgreed2(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="agree2" className="text-sm text-gray-700">
                  I consent to the use of my information and to the terms of the counselling services as described.
                </label>
              </li>
              <li className="flex items-start gap-3">
                <input
                  id="agree3"
                  type="checkbox"
                  checked={agreed3}
                  onChange={(e) => setAgreed3(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="agree3" className="text-sm text-gray-700">
                  I agree to participate in counselling sessions in accordance with this Agreement.
                </label>
              </li>
            </ul>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                disabled={!allChecked}
                className="px-4 py-2 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Accept
              </button>
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Return to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
