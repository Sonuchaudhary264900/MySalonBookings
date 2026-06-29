import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: [
      'Account information: When you register, we collect your full name and phone number. Phone numbers are verified using Firebase Phone Authentication (Google LLC) via a one-time password (OTP).',
      'Location data: We collect your device GPS location to show nearby salons. Location is used in real-time and is not stored permanently on our servers.',
      'Booking data: We store your booking history, selected services, appointment dates and times, and any special notes you provide.',
      'Reviews and ratings: Any reviews or star ratings you submit for salons are stored and displayed publicly within the app.',
      'Payment information: Payments are processed by Razorpay (Razorpay Software Pvt. Ltd.). We do not store your card details, UPI IDs, or payment credentials. We only retain the transaction ID and payment status for order records.',
      'Push notification token: We collect your device push token via Expo Notifications to send you booking alerts. This token is stored securely on our servers.',
      'Device and usage data: We automatically collect device type, OS version, app version, and crash/error logs to maintain app stability.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    body: [
      'To register and manage your account.',
      'To verify your identity via phone number OTP during registration and password reset.',
      'To display nearby salons and services based on your current location.',
      'To process and manage your salon bookings.',
      'To send you booking confirmation, status updates (confirmed, in-progress, completed, cancelled), and reminders via push notifications.',
      'To enable salon owners to fulfil your appointment — your name, phone number, and booking details are shared with the relevant salon owner.',
      'To process payments securely through Razorpay.',
      'To respond to your support queries and resolve disputes.',
      'To improve app performance, fix bugs, and develop new features using anonymised usage analytics.',
    ],
  },
  {
    title: '3. Third-Party Services We Use',
    body: [
      'Firebase Authentication (Google LLC) — Used for phone number OTP verification. Google may collect device identifiers during this process. Privacy policy: https://policies.google.com/privacy',
      'Cloudinary (Cloudinary Ltd.) — Used to serve salon images uploaded by salon owners. Privacy policy: https://cloudinary.com/privacy',
      'Google Maps Platform (Google LLC) — Used to display salon locations on a map and calculate distances. Privacy policy: https://policies.google.com/privacy',
      'Razorpay (Razorpay Software Pvt. Ltd.) — Used to process payments. Your payment details are handled entirely by Razorpay and are not stored by us. Privacy policy: https://razorpay.com/privacy',
      'Expo Notifications (Expo Inc.) — Used to send push notifications to your device. Your push token is stored on our servers. Privacy policy: https://expo.dev/privacy',
      'MongoDB Atlas (MongoDB Inc.) — Our primary database provider, hosted on secure cloud infrastructure. Privacy policy: https://www.mongodb.com/legal/privacy-policy',
      'Render (Render Services Inc.) — Our backend server hosting provider. Privacy policy: https://render.com/privacy',
    ],
  },
  {
    title: '4. Sharing Your Information',
    body: [
      'Salon owners: We share your name, phone number, and booking details with the salon owner you book with. This is required to fulfil your appointment.',
      'Payment processor: Transaction data (amount, status, transaction ID) is shared with Razorpay to process your payment.',
      'Third-party services: We share only the minimum necessary data with the service providers listed in Section 3 above, solely to operate our platform.',
      'We do not sell, rent, or trade your personal information to any third party for advertising or marketing purposes.',
      'We may disclose your information if required by applicable law, court order, or government authority in India.',
    ],
  },
  {
    title: '5. Data Storage & Retention',
    body: [
      'Your account data is stored on secure servers (MongoDB Atlas) with encryption in transit (HTTPS/TLS) and at rest.',
      'Passwords are hashed using bcrypt and are never stored in plain text.',
      'We retain your account data for as long as your account is active.',
      'Booking records are retained for a minimum of 2 years for dispute resolution and legal compliance.',
      'If you delete your account, your personal data is removed within 30 days, except where retention is required by law.',
      'Push notification tokens are deleted immediately when you log out or uninstall the app.',
    ],
  },
  {
    title: '6. Your Rights',
    body: [
      'Access: You may view all your personal information from your Profile page within the app.',
      'Update: You may update your name at any time from Profile settings.',
      'Delete account: You may request deletion of your account and all associated data by contacting us at sonuchaudhary264900@gmail.com. We will process your request within 30 days.',
      'Withdraw location permission: You may disable location access in your device settings at any time. This will limit nearby-salon discovery but will not affect existing bookings.',
      'Disable notifications: You may turn off push notifications from your device settings or within the app.',
      'Data portability: You may request a copy of the data we hold about you by contacting us.',
    ],
  },
  {
    title: '7. Permissions We Request',
    body: [
      'Location (Fine & Coarse): Used to find salons near you. Only accessed when the app is in use.',
      'Push Notifications: Used to send you booking status updates and reminders.',
      'Internet: Required for the app to function — connecting to our servers, maps, and payment gateway.',
    ],
  },
  {
    title: '8. Cookies & Tracking (Web Only)',
    body: [
      'Our website uses cookies and local storage for session management, authentication tokens, and user preferences.',
      'We do not use third-party advertising or tracking cookies.',
      'You can clear cookies via your browser settings. Clearing them will log you out of the website.',
    ],
  },
  {
    title: '9. Children\'s Privacy',
    body: [
      'GlowLoox is intended for users aged 13 and above. We do not knowingly collect personal information from children under 13.',
      'If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at sonuchaudhary264900@gmail.com and we will delete it promptly.',
    ],
  },
  {
    title: '10. Data Security',
    body: [
      'We implement industry-standard security measures including HTTPS/TLS encryption, hashed passwords, JWT-based authentication, and rate limiting.',
      'Access to user data is restricted to authorised personnel only.',
      'While we take every reasonable precaution to protect your data, no system can guarantee 100% security. We will notify affected users promptly in the event of a data breach.',
    ],
  },
  {
    title: '11. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.',
      'We will notify you of significant changes via push notification or email at least 7 days before the change takes effect.',
      'The "Last updated" date at the top of this page will always reflect the most recent revision.',
      'Continued use of the app after the effective date constitutes your acceptance of the updated policy.',
    ],
  },
  {
    title: '12. Contact Us',
    body: [
      'For any privacy-related questions, data requests, or complaints, please contact us:',
      'Email: sonuchaudhary264900@gmail.com',
      'Phone: +91 87264 90024',
      'Address: GlowLoox, India',
      'We will respond to all privacy-related requests within 30 days.',
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
          <p className="text-indigo-100 text-sm">Last updated: 22 March 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <p className="text-slate-600 text-sm leading-relaxed">
            GlowLoox ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how
            we collect, use, share, and protect your personal information when you use our platform — including the GlowLoox
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
