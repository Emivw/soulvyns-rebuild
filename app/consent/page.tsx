import Link from 'next/link';
import { FadeInOnScroll } from '@/components/FadeInOnScroll';

export default function ConsentPage() {
  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-emerald-50 via-white to-sky-50">
      <div className="max-w-3xl mx-auto">
        <FadeInOnScroll className="bg-card border border-border rounded-lg shadow-sm p-8 md:p-10">
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-foreground mb-2">
            Soulvyn Online Psychology Platform
          </h1>
          <p className="text-lg font-semibold text-foreground mb-8">
            Client Informed Consent &amp; Platform Agreement
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            By ticking the box on the booking page and proceeding to book or attend a session, you confirm that you have read, understood, and agree to the following:
          </p>

          <div className="prose prose-sm max-w-none text-foreground space-y-6">
            <section>
              <h2 className="font-headline text-lg font-semibold text-foreground mt-8 mb-2">1. Nature of the Service</h2>
              <ul className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>I understand that Soulvyn is an online platform that connects clients with independent, licensed psychologists.</li>
                <li>I understand that the clinical relationship exists solely between myself and the psychologist I book with.</li>
                <li>Soulvyn does not provide psychological treatment, diagnosis, clinical supervision, emergency intervention, or therapeutic services.</li>
                <li>All clinical decisions, treatment planning, diagnoses, and professional responsibility rest solely with the psychologist.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-headline text-lg font-semibold text-foreground mt-8 mb-2">2. Independent Practitioners</h2>
              <ul className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Psychologists listed on Soulvyn operate as independent practitioners.</li>
                <li>They are individually responsible for: clinical care; record keeping; ethical compliance; emergency management; confidentiality obligations.</li>
                <li>Soulvyn is not responsible for the clinical actions, omissions, or outcomes of any psychologist.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-headline text-lg font-semibold text-foreground mt-8 mb-2">3. Online Therapy Risks &amp; Limitations</h2>
              <ul className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>I understand that online therapy may involve: technology disruptions; privacy risks due to internet use; delays in communication.</li>
                <li>I confirm that I will attend sessions in a private space where confidentiality can be maintained.</li>
                <li>I understand that online services may not be appropriate for crisis or emergency situations.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-headline text-lg font-semibold text-foreground mt-8 mb-2">4. Emergency Situations</h2>
              <ul className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Soulvyn does not provide emergency services.</li>
                <li>If I am in crisis or require immediate assistance, I will contact: local emergency services; a crisis hotline; a nearby hospital.</li>
                <li>I understand that psychologists may require my emergency contact details before commencing treatment.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-headline text-lg font-semibold text-foreground mt-8 mb-2">5. Payments &amp; Cancellations</h2>
              <ul className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Payments are processed via the Soulvyn platform.</li>
                <li>Cancellation policies are set by the individual psychologist and will be communicated prior to booking.</li>
                <li>Refunds, where applicable, are subject to the psychologist&apos;s cancellation policy.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-headline text-lg font-semibold text-foreground mt-8 mb-2">6. Confidentiality &amp; Data Protection (POPIA Compliance)</h2>
              <ul className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>I understand that: my clinical records are kept by the psychologist, not Soulvyn; Soulvyn collects only necessary personal information to facilitate bookings and payments.</li>
                <li>Soulvyn processes personal information in accordance with the Protection of Personal Information Act (POPIA) of South Africa.</li>
                <li>My information will not be shared without my consent unless required by law.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-headline text-lg font-semibold text-foreground mt-8 mb-2">7. Limitation of Liability</h2>
              <ul className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>I acknowledge that Soulvyn acts solely as a technology platform.</li>
                <li>Soulvyn shall not be held liable for: clinical outcomes; therapeutic advice; psychological diagnoses; treatment decisions; any direct or indirect damages arising from services provided by the psychologist.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-headline text-lg font-semibold text-foreground mt-8 mb-2">8. Voluntary Consent</h2>
              <p className="text-muted-foreground mb-4">
                By ticking the box on the booking page, I confirm that:
              </p>
              <ul className="list-none space-y-2 text-muted-foreground">
                <li>☐ I have read and understood this agreement</li>
                <li>☐ I consent to receiving online psychological services</li>
                <li>☐ I understand Soulvyn is not my healthcare provider</li>
                <li>☐ I agree to proceed under these terms</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Full Name: ____________________<br />
                Date: ____________________
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                (Your name and the date of acceptance are recorded when you confirm on the booking page.)
              </p>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-4">
            <Link
              href="/book"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              Book a Session
            </Link>
            <Link
              href="/counselors"
              className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition"
            >
              Find a Counselor
            </Link>
          </div>
        </FadeInOnScroll>
      </div>
    </main>
  );
}
