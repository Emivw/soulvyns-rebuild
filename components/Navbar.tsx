'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useMsal } from '@azure/msal-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { HeartHandshake, Menu, X } from '@/components/icons';

export default function Navbar() {
  const [clientUser, setClientUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { accounts, instance } = useMsal();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setClientUser(user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setClientUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isCounselor = accounts.length > 0;
  const isClient = !!clientUser;

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/counselors', label: 'Find a Counselor' },
  ];

  if (isCounselor) {
    navLinks.push({ href: '/admin', label: 'Admin' });
  }

  const linkClass = (href: string) =>
    `font-medium transition-colors hover:text-primary ${pathname === href ? 'text-primary' : 'text-muted-foreground'}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/95 backdrop-blur">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <HeartHandshake className="h-7 w-7 text-primary" />
          <span className="font-headline text-xl font-bold text-primary">Soulvyns</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {loading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : isClient ? (
            <>
              <Link href="/book" className={linkClass('/book')}>Book</Link>
              <Link href="/bookings" className={linkClass('/bookings')}>My Bookings</Link>
              <Link href="/client/dashboard" className="text-sm text-muted-foreground">{clientUser?.email}</Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/');
                }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Logout
              </button>
            </>
          ) : isCounselor ? (
            <>
              <Link href="/counselor/dashboard" className={linkClass('/counselor/dashboard')}>Dashboard</Link>
              <span className="text-sm text-muted-foreground">{accounts[0]?.username}</span>
              <button
                onClick={async () => {
                  try {
                    await instance.logoutRedirect();
                  } catch {
                    router.push('/');
                    if (typeof window !== 'undefined') window.location.href = '/';
                  }
                }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass('/login')}>Login</Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block py-2 ${linkClass(link.href)}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {isClient && (
            <>
              <Link href="/book" className={`block py-2 ${linkClass('/book')}`} onClick={() => setMobileOpen(false)}>Book</Link>
              <Link href="/bookings" className={`block py-2 ${linkClass('/bookings')}`} onClick={() => setMobileOpen(false)}>My Bookings</Link>
              <Link href="/client/dashboard" className="block py-2 text-muted-foreground" onClick={() => setMobileOpen(false)}>Dashboard</Link>
            </>
          )}
          {isCounselor && (
            <Link href="/counselor/dashboard" className={`block py-2 ${linkClass('/counselor/dashboard')}`} onClick={() => setMobileOpen(false)}>Dashboard</Link>
          )}
          {!isClient && !isCounselor && (
            <>
              <Link href="/login" className="block py-2 text-muted-foreground" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link href="/register" className="block py-2 text-primary font-medium" onClick={() => setMobileOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
