import Link from 'next/link';
import CounselorErrorBanner from '@/components/CounselorErrorBanner';
import { ArrowRight } from '@/components/icons';
import { FadeInOnScroll } from '@/components/FadeInOnScroll';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* Hero */}
      <section className="relative flex w-full items-center justify-center bg-[url('/assets/photos/pexels-cottonbro-4098223.jpg')] bg-cover bg-center bg-no-repeat min-h-[calc(100vh-64px)]">
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-emerald-800/40" />
        <div className="relative max-w-5xl mx-auto px-4 text-center md:px-6 text-white">
          <CounselorErrorBanner />
          <FadeInOnScroll>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-medium tracking-wide uppercase mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Built for real, human conversations
            </div>
          </FadeInOnScroll>
          <FadeInOnScroll>
            <div className="space-y-6">
              <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Therapy that fits your real life.
              </h1>
              <p className="max-w-2xl mx-auto text-lg text-gray-100 md:text-xl">
                Soulvyns connects you to verified counselors, secure online sessions, and a booking flow that takes you
                from &quot;I need help&quot; to a confirmed Teams link in minutes.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-2">
                <Link
                  href="/find-counselor"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-7 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-500 hover:shadow-lg transition"
                >
                  Find a counselor
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="/my-bookings"
                  className="inline-flex items-center justify-center rounded-full bg-white/10 border border-white/30 px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-white/15 transition"
                >
                  View my bookings
                </Link>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-4 max-w-xl mx-auto text-xs md:text-sm text-gray-100/90">
                <div className="border border-white/15 rounded-lg px-3 py-2 bg-black/20">
                  <p className="font-semibold">End‑to‑end encrypted</p>
                  <p className="text-gray-200/80">Sessions hosted over Microsoft Teams.</p>
                </div>
                <div className="border border-white/15 rounded-lg px-3 py-2 bg-black/20">
                  <p className="font-semibold">Local payment rails</p>
                  <p className="text-gray-200/80">Secure PayFast checkout for South Africa.</p>
                </div>
                <div className="border border-white/15 rounded-lg px-3 py-2 bg-black/20">
                  <p className="font-semibold">Designed with clinicians</p>
                  <p className="text-gray-200/80">A flow that respects how therapy works.</p>
                </div>
              </div>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FadeInOnScroll className="grid grid-cols-1 gap-6 text-center sm:grid-cols-3">
            <div>
              <p className="text-3xl font-headline font-bold text-emerald-600">60s</p>
              <p className="text-sm text-muted-foreground">From slot selection to payment screen.</p>
            </div>
            <div>
              <p className="text-3xl font-headline font-bold text-emerald-600">100%</p>
              <p className="text-sm text-muted-foreground">Sessions delivered online via Teams.</p>
            </div>
            <div>
              <p className="text-3xl font-headline font-bold text-emerald-600">0 calls</p>
              <p className="text-sm text-muted-foreground">No admin back‑and‑forth to confirm.</p>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-gray-100 bg-[#faf5ff] py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInOnScroll>
            <h2 className="font-headline text-2xl font-bold text-center text-gray-900 mb-3">A calmer way to book care</h2>
          </FadeInOnScroll>
          <FadeInOnScroll>
            <p className="text-center text-sm text-gray-600 max-w-2xl mx-auto mb-10">
              We borrowed the smoothness of modern product sites and applied it to counseling. Three simple steps, no
              friction, and you keep full control of your data.
            </p>
          </FadeInOnScroll>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <FadeInOnScroll delayMs={40}>
              <div className="text-center rounded-2xl bg-white shadow-sm border border-emerald-100 px-5 py-6">
                <div className="mx-auto w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 font-headline font-bold text-base mb-4">
                  1
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Tell us what you need</h3>
                <p className="text-sm text-gray-600">
                  Create a client profile so counselors understand your context before you even join the call.
                </p>
              </div>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={110}>
              <div className="text-center rounded-2xl bg-white shadow-sm border border-emerald-100 px-5 py-6">
                <div className="mx-auto w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 font-headline font-bold text-base mb-4">
                  2
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Pick a time that works</h3>
                <p className="text-sm text-gray-600">
                  Browse real‑time availability and lock in a 60‑minute slot, all inside the app.
                </p>
              </div>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={180}>
              <div className="text-center rounded-2xl bg-white shadow-sm border border-emerald-100 px-5 py-6">
                <div className="mx-auto w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 font-headline font-bold text-base mb-4">
                  3
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Pay once, join with one click</h3>
                <p className="text-sm text-gray-600">
                  Complete payment via PayFast and receive a Microsoft Teams link, ready in your inbox and dashboard.
                </p>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-100 bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInOnScroll className="rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-6 py-8 md:px-10 md:py-10 text-white text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-100 mb-2">
                Ready when you are
              </p>
              <h3 className="font-headline text-2xl font-bold mb-2">Start your first Soulvyns session.</h3>
              <p className="text-sm text-emerald-50 max-w-xl">
                Log in, pick a counselor, and book a time that suits you. No calls, no paperwork—just a clear path to support.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-white text-emerald-700 px-6 py-3 text-sm font-semibold shadow-sm hover:bg-emerald-50 transition"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                Create client account
              </Link>
            </div>
          </FadeInOnScroll>
        </div>
      </section>
    </main>
  );
}
