import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: [
      'When you create an account or book an appointment, we collect: your name, phone number, email address, and profile photo (optional).',
      'We collect your approximate location to show nearby salons. This is used only within the app and is not stored permanently.',
      'We collect booking history, service preferences, and reviews you submit.',
      'We automatically receive standard device and usage data (device type, OS version, app version, crash logs) to improve app performance.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    body: [
      'To create and manage your account and bookings.',
      'To show you relevant salons and services near your location.',
      'To send booking confirmations, reminders, and status updates via push notifications and email.',
      'To improve our platform, fix bugs, and develop new features.',
      'To resolve disputes and enforce our Terms & Conditions.',
    ],
  },
  {
    title: '3. Sharing Your Information',
    body: [
      'We share your name and booking details with the salon owner only when you make a booking — this is necessary to fulfil the service.',
      'We do not sell, rent, or trade your personal information to any third party for marketing purposes.',
      'We may share aggregated, anonymised usage data (no personal identifiers) with analytics providers to improve our service.',
      'We may disclose your information if required by law, court order, or government authority.',
    ],
  },
  {
    title: '4. Data Storage & Security',
    body: [
      'Your data is stored on secure servers located in India. We use encryption in transit (HTTPS/TLS) and at rest.',
      'Passwords are hashed using industry-standard algorithms and are never stored in plain text.',
      'We retain your account data for as long as your account is active. You may request deletion at any time.',
      'While we take reasonable precautions, no system is 100% secure. Please use a strong, unique password for your account.',
    ],
  },
  {
    title: '5. Your Rights',
    body: [
      'You may view, update, or delete your personal information at any time from your Profile settings.',
      'You may request a copy of all data we hold about you by contacting us at support@mysalonbookings.com.',
      'You may opt out of marketing emails using the unsubscribe link in any such email.',
      'You may disable location access in your device settings; this will limit nearby-salon discovery.',
    ],
  },
  {
    title: '6. Cookies & Tracking',
    body: [
      'Our web platform uses cookies and similar technologies for session management, preferences, and analytics.',
      'You can control cookies through your browser settings; disabling them may affect some functionality.',
    ],
  },
  {
    title: '7. Children\'s Privacy',
    body: [
      'MySalonBookings is not directed at children under 13. We do not knowingly collect personal information from children.',
      'If you believe a child has provided us with personal data, please contact us and we will delete it promptly.',
    ],
  },
  {
    title: '8. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification.',
      'Continued use of the platform after changes are posted constitutes your acceptance of the updated policy.',
    ],
  },
  {
    title: '9. Contact Us',
    body: [
      'For any privacy-related questions or requests, please reach out to us:',
      'Email: support@mysalonbookings.com',
      'Phone: +91 87264 90024',
      'Address: MySalonBookings, India',
    ],
  },
];

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Privacy Policy</h1>
          <p className="text-indigo-100 text-sm">Last updated: March 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <p className="text-slate-600 text-sm leading-relaxed">
            MySalonBookings ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how
            we collect, use, share, and protect your personal information when you use our platform — including the MySalonBookings
            website and mobile application. By using our services, you agree to the practices described in this policy.
          </p>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4">{section.title}</h2>
            <ul className="space-y-2.5">
              {section.body.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="text-center pt-4">
          <Link to="/" className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
