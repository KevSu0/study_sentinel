
import type {Metadata, Viewport} from 'next';
import './globals.css';
import './fonts.css';
import {Providers} from '@/components/providers';
import {OfflineIndicator, OfflineBanner} from '@/components/offline-indicator';
import {TimezoneBanner} from '@/components/ui/timezone-banner';

export const metadata: Metadata = {
  title: "Study Sentinel",
  description:
    'Your personal AI-powered study companion to track progress and conquer your goals.',
  manifest: '/manifest.json',
  keywords: ['study', 'productivity', 'education', 'timer', 'habits', 'goals'],
  authors: [{ name: 'Study Sentinel Team' }],
  creator: 'Study Sentinel',
  publisher: 'Study Sentinel',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Study Sentinel',
    startupImage: [
      {
        url: '/icons/apple-startup-1125x2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'Study Sentinel',
    title: 'Study Sentinel - Your AI Study Companion',
    description: 'Track your study progress, build habits, and achieve your goals with AI-powered insights.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Study Sentinel - Your AI Study Companion',
    description: 'Track your study progress, build habits, and achieve your goals with AI-powered insights.',
  },
  other: {
    'permissions-policy': 'wake-lock=*',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Study Sentinel',
    'application-name': 'Study Sentinel',
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#7c3aed' },
    { media: '(prefers-color-scheme: dark)', color: '#1c192c' },
  ],
  colorScheme: 'dark light',
  viewportFit: 'cover',
  userScalable: false,
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
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <meta name="msapplication-TileColor" content="#7c3aed" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
      </head>
      <body className="font-body antialiased">
        <Providers>
          <TimezoneBanner />
          {children}
          <OfflineIndicator />
          <OfflineBanner />
        </Providers>
      </body>
    </html>
  );
}
