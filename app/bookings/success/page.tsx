'use client';

import Link from 'next/link';

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
          <p className="text-gray-600 mb-8">
            Your booking has been confirmed. You will receive meeting details via email shortly.
          </p>
          <div className="space-y-4">
            <Link
              href="/bookings"
              className="block w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition font-medium"
            >
              View My Bookings
            </Link>
            <Link
              href="/book"
              className="block w-full text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Book Another Session
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
