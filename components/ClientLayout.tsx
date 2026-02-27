'use client';

import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Providers = dynamic(() => import('@/components/Providers'), { ssr: false });

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <Footer />
    </Providers>
  );
}
