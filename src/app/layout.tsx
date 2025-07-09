import type {Metadata} from 'next';
import {Inter} from 'next/font/google';
import './globals.css';
import {Providers} from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: "KuKe's Motivation",
  description:
    'Your personal AI-powered motivator to track and conquer your goals.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
