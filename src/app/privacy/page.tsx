export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <div className="prose prose-gray max-w-none">
        <p className="text-sm text-gray-600 mb-8">Last updated: September 20, 2025</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Data Collection</h2>
        <p>
          Study Sentinel is a local-first application that prioritizes your privacy. All your study data,
          including routines, tasks, plans, and analytics, is stored locally on your device using IndexedDB.
          We do not collect, store, or transmit any personal information to external servers.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Local Storage</h2>
        <p>
          Your data remains on your device and is only accessible through your browser.
          The application does not require internet connectivity for core functionality and works offline.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Data Export and Backup</h2>
        <p>
          You can export your data at any time through the application&apos;s export functionality.
          We recommend regularly backing up your data to prevent loss.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Third-Party Services</h2>
        <p>
          Study Sentinel may optionally integrate with AI services (such as Google Gemini) for enhanced features.
          These integrations are opt-in and only used when explicitly requested by you.
          No third-party analytics or tracking services are used.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Cookies</h2>
        <p>
          This application does not use cookies or any similar tracking technologies.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Security</h2>
        <p>
          We implement industry-standard security measures, including Content Security Policy (CSP) headers,
          to protect your data. However, since data is stored locally, you are responsible for securing your device.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. Changes will be reflected with an updated date.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact</h2>
        <p>
          If you have questions about this privacy policy, please reach out through the application&apos;s
          feedback channels or GitHub repository.
        </p>
      </div>
    </div>
  );
}