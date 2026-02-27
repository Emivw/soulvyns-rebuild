import Link from 'next/link';
import CounselorErrorBanner from '@/components/CounselorErrorBanner';
import { ArrowRight } from '@/components/icons';

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <section className="relative flex flex-1 w-full min-h-[70vh] items-center justify-center bg-gradient-to-br from-primary/20 via-background to-accent/10">
        <div className="absolute inset-0 bg-foreground/30" />
        <div className="relative max-w-4xl mx-auto px-4 text-center md:px-6">
          <CounselorErrorBanner />
          <div className="space-y-6 animate-fade-in-up">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Find Your Path to Wellness
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground md:text-xl">
              Soulvyns helps you find the right counselor, tailored to your needs. Start your journey towards a healthier mind today.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link
                href="/counselors"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition"
              >
                Find a Counselor
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent/10 transition"
              >
                Book a Session
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card/50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-headline text-2xl font-bold text-center text-foreground mb-8">How It Works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-headline font-bold text-lg mb-4">1</div>
              <h3 className="font-semibold text-foreground mb-2">Create Account</h3>
              <p className="text-sm text-muted-foreground">Register as a client to get started</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-headline font-bold text-lg mb-4">2</div>
              <h3 className="font-semibold text-foreground mb-2">Choose & Book</h3>
              <p className="text-sm text-muted-foreground">Find a counselor and pick a time slot</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-headline font-bold text-lg mb-4">3</div>
              <h3 className="font-semibold text-foreground mb-2">Pay & Meet</h3>
              <p className="text-sm text-muted-foreground">Pay via PayFast and join your Teams session</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
