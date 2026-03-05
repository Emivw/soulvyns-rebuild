import './globals.css';
import { ClientLayout } from '@/components/ClientLayout';
import { Lato, Poppins } from 'next/font/google';

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-lato',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-poppins',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${lato.variable} ${poppins.variable}`}>
      <body className="font-body min-h-screen flex flex-col text-foreground">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
