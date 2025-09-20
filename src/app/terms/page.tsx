export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

      <div className="prose prose-gray max-w-none">
        <p className="text-sm text-gray-600 mb-8">Last updated: September 20, 2025</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Acceptance of Terms</h2>
        <p>
          By using Study Sentinel, you agree to these terms of service. If you do not agree to these terms,
          please do not use the application.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Description of Service</h2>
        <p>
          Study Sentinel is a local-first, offline-first productivity application designed to help students
          track their study sessions, manage routines, and analyze their productivity patterns.
          The application runs entirely in your browser and stores data locally on your device.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Use of the Application</h2>
        <p>
          You may use Study Sentinel for personal, non-commercial purposes. You are responsible for maintaining
          the security of your device and any data stored within the application.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Data Ownership and Responsibility</h2>
        <p>
          You retain full ownership of all data you create or store within Study Sentinel. Since all data is
          stored locally on your device, you are solely responsible for backing up and securing your data.
          We are not responsible for data loss due to device failure, accidental deletion, or other circumstances.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Third-Party Services</h2>
        <p>
          Study Sentinel may optionally integrate with third-party AI services. Use of these services is subject
          to their respective terms of service and privacy policies. We are not responsible for the content
          or services provided by third parties.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Limitation of Liability</h2>
        <p>
          Study Sentinel is provided &quot;as is&quot; without warranty of any kind. We shall not be liable for
          any direct, indirect, incidental, special, or consequential damages arising from the use of or
          inability to use the application.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Modifications to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Changes will be effective immediately upon
          posting. Your continued use of the application constitutes acceptance of the modified terms.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Governing Law</h2>
        <p>
          These terms shall be governed by and construed in accordance with the laws of your jurisdiction.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact</h2>
        <p>
          If you have questions about these terms, please reach out through the application&apos;s feedback
          channels or GitHub repository.
        </p>
      </div>
    </div>
  );
}