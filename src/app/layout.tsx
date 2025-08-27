
import type {Metadata, Viewport} from 'next';
import {Inter} from 'next/font/google';
import './globals.css';
import ClientLayout from './client-layout';
 
  const inter = Inter({
    subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: "KuKe's Motivation",
  description:
    'Your personal AI-powered motivator to track and conquer your goals.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "KuKe's Motivation",
  },
  other: {
    'permissions-policy': 'wake-lock=*',
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3eefc' },
    { media: '(prefers-color-scheme: dark)', color: '#1c192c' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.variable} font-body antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
