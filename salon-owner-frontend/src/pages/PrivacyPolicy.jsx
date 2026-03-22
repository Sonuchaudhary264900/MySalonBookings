import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: [
      'Account information: When you register, we collect your full name, phone number, and email address. Phone numbers are verified using Firebase Phone Authentication (Google LLC) via a one-time password (OTP).',
      'Salon information: We collect your salon name, address, location (GPS coordinates), working hours, services, pricing, and salon photos you upload.',
      'Profile and salon photos: Photos are stored securely on Cloudinary (Cloudinary Ltd.) servers.',
      'Booking data: We store all bookings made by customers at your salon, including customer names, phone numbers, selected services, appointment times, and status history.',
      'Referral data: If you use the referral programme, we store your referral code and the referrer identity to process rewards.',
      'Payment information: Payments are processed by Razorpay (Razorpay Software Pvt. Ltd.). We do not store your card details or banking credentials. We only retain transaction IDs and payment status.',
      'Push notification token: We collect your device push token via Expo Notifications to send you new booking alerts. This token is stored securely on our servers.',
      'Device and usage data: We automatically collect device type, OS version, app version, login times, features used, and crash/error logs to maintain platform stability.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    body: [
      'To register and manage your salon owner account and dashboard.',
      'To verify your identity via phone number OTP during registration and password reset.',
      'To display your salon profile, services, photos, and location to customers searching on the MySalonBookings platform.',
      'To receive and manage bookings from customers in real time.',
      'To send you instant push notifications for new bookings and customer activity.',
      'To process payments for bookings through Razorpay.',
      'To generate booking analytics and revenue reports on your dashboard.',
      'To process referral rewards when applicable.',
      'To respond to your support queries and resolve disputes.',
      'To improve app performance and develop new features using anonymised usage analytics.',
    ],
  },
  {
    title: '3. Third-Party Services We Use',
    body: [
      'Firebase Authentication (Google LLC) — Used for phone number OTP verification. Privacy policy: https://policies.google.com/privacy',
      'Cloudinary (Cloudinary Ltd.) — Used to store and serve salon and profile photos. Privacy policy: https://cloudinary.com/privacy',
      'Google Maps Platform (Google LLC) — Used to display and set your salon location on a map. Privacy policy: https://policies.google.com/privacy',
      'Razorpay (Razorpay Software Pvt. Ltd.) — Used to process customer payments. Your banking/payment details are handled entirely by Razorpay. Privacy policy: https://razorpay.com/privacy',
      'Expo Notifications (Expo Inc.) — Used to send push notifications to your device for new bookings. Privacy policy: https://expo.dev/privacy',
      'MongoDB Atlas (MongoDB Inc.) — Our primary database provider. Privacy policy: https://www.mongodb.com/legal/privacy-policy',
      'Render (Render Services Inc.) — Our backend server hosting provider. Privacy policy: https://render.com/privacy',
    ],
  },
  {
    title: '4. Sharing Your Information',
    body: [
      'Customers: Your salon name, location, services, photos, working hours, and ratings are publicly visible to customers on the MySalonBookings platform.',
      'Customer data: When a customer books your salon, you receive their name, phone number, and booking details. This data must be used only to fulfil the appointment.',
      'Payment processor: Transaction data is shared with Razorpay solely to process payments.',
      'Third-party services: We share only the minimum necessary data with the service providers listed in Section 3, solely to operate the platform.',
      'We do not sell, rent, or trade your personal information to any third party for advertising or marketing purposes.',
      'We may disclose your information if required by applicable law, court order, or government authority in India.',
    ],
  },
  {
    title: '5. Data Storage & Retention',
    body: [
      'Your data is stored on secure servers (MongoDB Atlas) with encryption in transit (HTTPS/TLS) and at rest.',
      'Passwords are hashed using bcrypt and are never stored in plain text.',
      'We retain your account data for as long as your account is active.',
      'Booking records are retained for a minimum of 2 years for dispute resolution and legal compliance.',
      'If you delete your account, your personal data is removed within 30 days, except where retention is required by law.',
      'Customer booking data associated with your salon is retained per our obligations to those customers.',
    ],
  },
  {
    title: '6. Your Rights',
    body: [
      'Access & Update: You may view and update your personal and salon information at any time from your dashboard settings.',
      'Delete account: You may request deletion of your account and all associated personal data by contacting us at sonuchaudhary264900@gmail.com. We will process your request within 30 days.',
      'Withdraw location permission: You may disable location access in your device settings. This will affect your ability to set your salon location.',
      'Disable notifications: You may turn off push notifications from your device settings or within the app.',
      'Data portability: You may request a copy of the data we hold about you by contacting us.',
    ],
  },
  {
    title: '7. Permissions We Request (Mobile App)',
    body: [
      'Location (Fine & Coarse): Used to set and display your salon location on the map.',
      'Camera & Photo Library: Used when you upload salon photos or update your profile picture.',
      'Push Notifications: Used to alert you instantly when a new booking is received.',
      'Internet: Required for the app to connect to our servers, maps, and payment gateway.',
    ],
  },
  {
    title: '8. Referral Programme',
    body: [
      'If you participate in the referral programme, we store your referral code and the referrer identity.',
      'This data is used solely to track and process referral rewards and is not shared with third parties.',
    ],
  },
  {
    title: '9. Data Security',
    body: [
      'We implement industry-standard security measures including HTTPS/TLS encryption, hashed passwords, JWT-based authentication, and rate limiting.',
      'Access to user data is restricted to authorised personnel only.',
      'While we take every reasonable precaution, no system can guarantee 100% security. We will notify affected users promptly in the event of a data breach.',
    ],
  },
  {
    title: '10. Children\'s Privacy',
    body: [
      'MySalonBookings Owner platform is intended for business owners aged 18 and above.',
      'We do not knowingly collect information from anyone under 18. If you believe this has occurred, contact us at sonuchaudhary264900@gmail.com.',
    ],
  },
  {
    title: '11. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.',
      'We will notify you of significant changes via push notification or email at least 7 days before the change takes effect.',
      'Continued use of the platform after the effective date constitutes your acceptance of the updated policy.',
    ],
  },
  {
    title: '12. Contact Us',
    body: [
      'For any privacy-related questions, data requests, or complaints, please contact us:',
      'Email: sonuchaudhary264900@gmail.com',
      'Phone: +91 87264 90024',
      'Address: MySalonBookings, India',
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
          <p className="text-indigo-100 text-sm">Last updated: 22 March 2026 · MySalonBookings Owner Platform</p>
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
