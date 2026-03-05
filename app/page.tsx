import Link from 'next/link';
import CounselorErrorBanner from '@/components/CounselorErrorBanner';
import { ArrowRight } from '@/components/icons';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* Hero */}
      <section className="relative flex-1 flex w-full items-center justify-center bg-[url('/assets/photos/pexels-cottonbro-4098223.jpg')] bg-cover bg-center bg-no-repeat">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-4xl mx-auto px-4 text-center md:px-6 text-white">
          <CounselorErrorBanner />
          <div className="space-y-6 animate-fade-in-up">
            <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Find Your Path to Wellness
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-gray-100 md:text-xl">
              Soulvyns helps you find the right counselor, tailored to your needs. Start your journey towards a healthier mind today.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link
                href="/find-counselor"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-400 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-500 transition"
              >
                Find a Counselor
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/my-bookings"
                className="inline-flex items-center justify-center rounded-lg bg-white border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 transition"
              >
                My Bookings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-gray-100 bg-[#faf5ff] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-headline text-2xl font-bold text-center text-gray-900 mb-8">How It Works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 font-headline font-bold text-lg mb-4">1</div>
              <h3 className="font-semibold text-gray-800 mb-2">Create Account</h3>
              <p className="text-sm text-gray-600">Register as a client to get started</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 font-headline font-bold text-lg mb-4">2</div>
              <h3 className="font-semibold text-gray-800 mb-2">Choose &amp; Book</h3>
              <p className="text-sm text-gray-600">Find a counselor and pick a time slot</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 font-headline font-bold text-lg mb-4">3</div>
              <h3 className="font-semibold text-gray-800 mb-2">Pay &amp; Meet</h3>
              <p className="text-sm text-gray-600">Pay via PayFast and join your Teams session</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
