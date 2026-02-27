import Link from 'next/link';
import { HeartHandshake, Users, Shield, Clock } from '@/components/icons';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <h1 className="font-headline text-4xl font-bold text-foreground mb-4">About Soulvyns</h1>
      <p className="text-lg text-muted-foreground mb-8">
        We connect you with qualified counselors for secure, confidential sessions—so you can focus on what matters.
      </p>

      <div className="prose prose-lg max-w-none text-foreground">
        <p className="text-muted-foreground mb-6">
          Soulvyns is a platform designed to make professional counseling accessible. Whether you&apos;re dealing with anxiety, 
          relationship issues, or simply want to invest in your mental health, we help you find the right counselor and 
          book sessions that fit your schedule. All sessions are conducted via Microsoft Teams with secure payment through PayFast.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mt-12">
        <div className="flex gap-4 p-6 rounded-lg border border-border bg-card">
          <Users className="h-10 w-10 text-primary flex-shrink-0" />
          <div>
            <h2 className="font-headline font-semibold text-lg text-foreground mb-2">Qualified Counselors</h2>
            <p className="text-sm text-muted-foreground">Our counselors are verified professionals ready to support you.</p>
          </div>
        </div>
        <div className="flex gap-4 p-6 rounded-lg border border-border bg-card">
          <Shield className="h-10 w-10 text-primary flex-shrink-0" />
          <div>
            <h2 className="font-headline font-semibold text-lg text-foreground mb-2">Secure & Private</h2>
            <p className="text-sm text-muted-foreground">Your data and sessions are handled with care and confidentiality.</p>
          </div>
        </div>
        <div className="flex gap-4 p-6 rounded-lg border border-border bg-card">
          <Clock className="h-10 w-10 text-primary flex-shrink-0" />
          <div>
            <h2 className="font-headline font-semibold text-lg text-foreground mb-2">Flexible Booking</h2>
            <p className="text-sm text-muted-foreground">Choose a time that works for you and join via Teams.</p>
          </div>
        </div>
        <div className="flex gap-4 p-6 rounded-lg border border-border bg-card">
          <HeartHandshake className="h-10 w-10 text-primary flex-shrink-0" />
          <div>
            <h2 className="font-headline font-semibold text-lg text-foreground mb-2">Your Journey</h2>
            <p className="text-sm text-muted-foreground">We&apos;re here to support your path to wellness.</p>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/counselors"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
        >
          Find a Counselor
        </Link>
      </div>
    </div>
  );
}
