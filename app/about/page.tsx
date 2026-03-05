import Link from 'next/link';
import Image from 'next/image';
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

      {/* Our approach – counseling in action */}
      <div className="mt-12 rounded-xl overflow-hidden border border-border bg-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[240px]">
            <Image
              src="/assets/photos/pexels-mart-production-7699526.jpg"
              alt="Counselor listening and taking notes in a supportive session"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[240px]">
            <Image
              src="/assets/photos/pexels-gustavo-fring-7447255.jpg"
              alt="Understanding your feelings in a safe, supportive space"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center mt-4">
        Professional, confidential support tailored to you.
      </p>

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

      {/* Relationship and group support */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative rounded-xl overflow-hidden border border-border aspect-[16/10] bg-muted">
          <Image
            src="/assets/photos/pexels-cottonbro-4098232.jpg"
            alt="A calm, professional session space"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div className="relative rounded-xl overflow-hidden border border-border aspect-[16/10] bg-muted">
          <Image
            src="/assets/photos/pexels-shkrabaanthony-7579115.jpg"
            alt="Relationship support and mediation"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center mt-4">
        From one-on-one sessions to relationship and group support.
      </p>

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
