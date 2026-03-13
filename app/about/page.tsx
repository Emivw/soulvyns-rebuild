import Link from 'next/link';
import Image from 'next/image';
import { HeartHandshake, Users, Shield, Clock } from '@/components/icons';
import { FadeInOnScroll } from '@/components/FadeInOnScroll';

export default function About() {
  return (
    <div className="bg-gradient-to-b from-emerald-50 via-white to-sky-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <FadeInOnScroll>
          <div className="text-center md:text-left">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-emerald-600 mb-2">
              ABOUT SOULVYNS
            </p>
            <h1 className="font-headline text-4xl font-bold text-foreground mb-3">
              A calmer system for getting help.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              We built Soulvyns so people could move from &quot;I think I need to talk to someone&quot; to a confirmed,
              confidential session—without phone tags, admin chaos, or endless forms.
            </p>
          </div>
        </FadeInOnScroll>

        {/* Split hero visuals */}
        <FadeInOnScroll className="mt-10 rounded-2xl overflow-hidden border border-border bg-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[260px]">
              <Image
                src="/assets/photos/pexels-mart-production-7699526.jpg"
                alt="Counselor listening and taking notes in a supportive session"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[260px]">
              <Image
                src="/assets/photos/pexels-gustavo-fring-7447255.jpg"
                alt="Understanding your feelings in a safe, supportive space"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </FadeInOnScroll>
        <p className="text-sm text-muted-foreground text-center mt-4">
          Professional, confidential support—delivered online, on your terms.
        </p>

        {/* Story + product explanation */}
        <FadeInOnScroll className="mt-10 prose prose-sm md:prose max-w-none text-foreground">
          <p className="text-muted-foreground">
            Soulvyns is built for people who are already carrying a lot. Instead of asking you to phone around or fill
            in the same details ten times, we combine a clean booking experience, PayFast payments, and Microsoft Teams
            meetings into one flow.
          </p>
          <p className="text-muted-foreground">
            Counselors get a dashboard that reflects how they really work—availability slots, upcoming sessions, and
            client context in one place. Clients get a clear view of upcoming sessions and a single &quot;Join
            Meeting&quot; button when it&apos;s time.
          </p>
        </FadeInOnScroll>

        {/* Pillars */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mt-12">
          <FadeInOnScroll>
            <div className="flex gap-4 p-6 rounded-xl border border-border bg-card/80 shadow-sm">
              <Users className="h-10 w-10 text-primary flex-shrink-0" />
              <div>
                <h2 className="font-headline font-semibold text-lg text-foreground mb-2">Clinically grounded</h2>
                <p className="text-sm text-muted-foreground">
                  We collaborate with qualified counselors so the product respects therapeutic boundaries and pacing.
                </p>
              </div>
            </div>
          </FadeInOnScroll>
          <FadeInOnScroll delayMs={80}>
            <div className="flex gap-4 p-6 rounded-xl border border-border bg-card/80 shadow-sm">
              <Shield className="h-10 w-10 text-primary flex-shrink-0" />
              <div>
                <h2 className="font-headline font-semibold text-lg text-foreground mb-2">Private by design</h2>
                <p className="text-sm text-muted-foreground">
                  Sessions run over Microsoft Teams with robust security, and payments are handled by PayFast—so your
                  data stays protected.
                </p>
              </div>
            </div>
          </FadeInOnScroll>
          <FadeInOnScroll delayMs={150}>
            <div className="flex gap-4 p-6 rounded-xl border border-border bg-card/80 shadow-sm">
              <Clock className="h-10 w-10 text-primary flex-shrink-0" />
              <div>
                <h2 className="font-headline font-semibold text-lg text-foreground mb-2">Frustration‑free scheduling</h2>
                <p className="text-sm text-muted-foreground">
                  Availability slots and live booking status prevent double‑bookings and &quot;are we still on?&quot; messages.
                </p>
              </div>
            </div>
          </FadeInOnScroll>
          <FadeInOnScroll delayMs={220}>
            <div className="flex gap-4 p-6 rounded-xl border border-border bg-card/80 shadow-sm">
              <HeartHandshake className="h-10 w-10 text-primary flex-shrink-0" />
              <div>
                <h2 className="font-headline font-semibold text-lg text-foreground mb-2">Human first</h2>
                <p className="text-sm text-muted-foreground">
                  Under the UI, it&apos;s still one human meeting another. Our job is to remove as much friction as possible
                  so that can happen.
                </p>
              </div>
            </div>
          </FadeInOnScroll>
        </div>

        {/* Visual band */}
        <FadeInOnScroll className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative rounded-2xl overflow-hidden border border-border aspect-[16/10] bg-muted">
            <Image
              src="/assets/photos/pexels-cottonbro-4098232.jpg"
              alt="A calm, professional session space"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-border aspect-[16/10] bg-muted">
            <Image
              src="/assets/photos/pexels-shkrabaanthony-7579115.jpg"
              alt="Relationship support and mediation"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </FadeInOnScroll>
        <p className="text-sm text-muted-foreground text-center mt-4">
          Individual, relationship, and group support—delivered wherever you have a quiet moment and a connection.
        </p>

        {/* CTA */}
        <FadeInOnScroll className="mt-12 text-center">
          <Link
            href="/counselors"
            className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md transition"
          >
            Meet our counselors
          </Link>
        </FadeInOnScroll>
      </div>
    </div>
  );
}
