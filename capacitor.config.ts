import type { CapacitorConfig } from '@capacitor/cli';

// Allow switching between bundling static assets (out/) and loading from a server URL.
// Set CAP_SERVER_URL to your deployed Next.js URL to enable full Server Actions support.
const serverUrl = process.env.CAP_SERVER_URL;
const isMobileStatic = process.env.NEXT_PUBLIC_MOBILE_STATIC === 'true';

const config: CapacitorConfig = serverUrl
  ? {
      appId: 'com.studysentinel.app',
      appName: 'Study Sentinel',
      // Keep webDir to satisfy Capacitor CLI even when loading from a server URL
      webDir: 'public',
      server: {
        url: serverUrl,
        cleartext: serverUrl.startsWith('http://'),
      },
    }
  : {
      appId: 'com.studysentinel.app',
      appName: 'Study Sentinel',
      // For offline-static builds we ship Next export in `out/`.
      // Otherwise fall back to public/ to keep CLI happy before export.
      webDir: isMobileStatic ? 'out' : 'public',
    };

export default config;
