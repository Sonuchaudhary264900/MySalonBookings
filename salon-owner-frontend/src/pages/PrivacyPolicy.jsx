import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: [
      'When you register as a salon owner, we collect: your name, phone number, email address, business name, business address, and profile photo.',
      'We collect salon information you provide: photos, services, pricing, working hours, and any documents submitted for verification.',
      'We automatically collect usage data such as login times, features used, booking activity, and device/browser information.',
      'We may collect your location to enable location-based features for your salon listing.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    body: [
      'To create and manage your salon owner account and dashboard.',
      'To display your salon profile to customers searching the MySalonBookings platform.',
      'To send you booking notifications, customer messages, and platform updates.',
      'To generate analytics and reports on your bookings and revenue.',
      'To verify your identity and salon credentials during the approval process.',
      'To improve our platform and develop new features based on usage patterns.',
    ],
  },
  {
    title: '3. Sharing Your Information',
    body: [
      'Your salon name, location, services, photos, and ratings are publicly visible to customers on the MySalonBookings user app and website.',
      'Your contact information shared with customers is limited to what is necessary for booking fulfilment.',
      'We do not sell or rent your personal information to third parties for marketing.',
      'We may share data with trusted service providers (hosting, analytics) who process it on our behalf under strict confidentiality agreements.',
      'We may disclose information if required by law or valid legal process.',
    ],
  },
  {
    title: '4. Data Storage & Security',
    body: [
      'Your data is stored on secure servers in India using encryption in transit (HTTPS/TLS) and at rest.',
      'Passwords are hashed using industry-standard algorithms and are never stored in plain text.',
      'Access to your data within our organisation is limited to personnel who need it to operate the platform.',
      'We retain your data for as long as your account is active or as required by law.',
    ],
  },
  {
    title: '5. Your Rights',
    body: [
      'You may update your personal and salon information at any time from your dashboard.',
      'You may request a copy of all data we hold about you by contacting support@mysalonbookings.com.',
      'You may request deletion of your account and associated data — subject to legal retention obligations.',
      'You may opt out of marketing communications at any time.',
    ],
  },
  {
    title: '6. Referral Programme Data',
    body: [
      'If you participate in the referral programme, we store your referral code and the identity of the referrer.',
      'This data is used solely to process referral rewards and is not shared externally.',
    ],
  },
  {
    title: '7. Changes to This Policy',
    body: [
      'We may update this Privacy Policy periodically. Significant changes will be communicated via email or dashboard notification.',
      'Continued use of the platform after changes are posted constitutes your acceptance.',
    ],
  },
  {
    title: '8. Contact Us',
    body: [
      'For privacy-related questions or requests:',
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
      {/* Nav */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
              <span className="text-white text-sm">✂</span>
            </div>
            <span className="font-bold text-slate-900">SmartSalon</span>
            <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">Owner</span>
          </Link>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-900 transition">← Back</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Privacy Policy</h1>
          <p className="text-indigo-100 text-sm">Last updated: March 2026 · MySalonBookings Owner Platform</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <p className="text-slate-600 text-sm leading-relaxed">
            MySalonBookings ("we", "our", or "us") is committed to protecting the privacy of salon owners who use our
            Owner Dashboard platform. This Privacy Policy describes how we collect, use, and protect your information
            when you use the SmartSalon owner app and web dashboard. By using our services, you agree to the practices described here.
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

      <footer className="bg-white border-t border-slate-100 py-5 px-4 text-center text-xs text-slate-400 mt-8">
        © 2026 MySalonBookings · All rights reserved
      </footer>
    </div>
  );
}
