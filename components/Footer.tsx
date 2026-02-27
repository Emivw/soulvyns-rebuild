'use client';

import Link from 'next/link';
import { HeartHandshake } from '@/components/icons';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <HeartHandshake className="h-6 w-6 text-primary" />
              <span className="font-headline text-xl font-bold text-primary">Soulvyns</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Your trusted partner in mental wellness.
            </p>
          </div>
          <div>
            <h3 className="font-headline font-semibold text-foreground">Soulvyns</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/about" className="text-muted-foreground hover:text-primary">About Us</Link></li>
              <li><Link href="/counselors" className="text-muted-foreground hover:text-primary">Find a Counselor</Link></li>
              <li><Link href="/book" className="text-muted-foreground hover:text-primary">Book a Session</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-headline font-semibold text-foreground">Support</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/consent" className="text-muted-foreground hover:text-primary">Client Consent &amp; Agreement</Link></li>
              <li><Link href="/terms" className="text-muted-foreground hover:text-primary">Terms</Link></li>
              <li><Link href="/login" className="text-muted-foreground hover:text-primary">Login</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          &copy; {year} Soulvyns. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
