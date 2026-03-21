import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: [
      'By accessing or using MySalonBookings (the "Platform"), you agree to be bound by these Terms & Conditions and our Privacy Policy.',
      'If you do not agree with any part of these terms, you must not use our services.',
      'We reserve the right to update these terms at any time. Continued use of the Platform after changes are published constitutes your acceptance.',
    ],
  },
  {
    title: '2. User Accounts',
    body: [
      'You must be at least 13 years old to create an account.',
      'You are responsible for maintaining the confidentiality of your login credentials and all activity under your account.',
      'You must provide accurate and complete information during registration. Providing false information may result in account suspension.',
      'You must notify us immediately at support@mysalonbookings.com if you suspect unauthorised access to your account.',
    ],
  },
  {
    title: '3. Booking Policy',
    body: [
      'When you book an appointment, you are entering into a direct agreement with the salon. MySalonBookings acts as an intermediary platform only.',
      'Bookings are subject to salon availability and confirmation by the salon owner.',
      'You must arrive on time for your appointment. Late arrivals may result in shortened service or cancellation at the salon\'s discretion.',
      'MySalonBookings does not guarantee the quality of services provided by salons listed on the platform.',
    ],
  },
  {
    title: '4. Cancellation & Refund Policy',
    body: [
      'You may cancel a booking from your "My Bookings" page. Cancellation policies vary by salon.',
      'Refunds, if applicable, are processed at the salon\'s discretion and may take 5–7 business days to reflect in your account.',
      'MySalonBookings is not liable for refunds on services rendered or no-show bookings.',
      'Repeated no-shows may result in restrictions on your ability to book appointments.',
    ],
  },
  {
    title: '5. Payments',
    body: [
      'Payment terms are determined by individual salons. Some salons require advance payment; others collect payment on arrival.',
      'MySalonBookings does not store your payment card information. All payments are processed through secure third-party gateways.',
      'Prices displayed are set by salon owners and may change without notice. Always confirm the final price with the salon.',
    ],
  },
  {
    title: '6. Reviews & Content',
    body: [
      'You may submit reviews and ratings for salons you have visited. Reviews must be honest, accurate, and based on personal experience.',
      'You must not post content that is offensive, defamatory, misleading, or violates the rights of others.',
      'MySalonBookings reserves the right to remove any content that violates these guidelines without notice.',
      'By submitting content, you grant MySalonBookings a non-exclusive, royalty-free licence to use, display, and distribute it on the platform.',
    ],
  },
  {
    title: '7. Referral Programme',
    body: [
      'The MySalonBookings referral programme allows users to share referral codes with salon owners.',
      'Rewards are granted only when the referred salon owner uses the platform continuously for the required period as specified in the programme terms.',
      'Referral rewards are non-transferable and have no cash value unless explicitly stated.',
      'We reserve the right to modify or discontinue the referral programme at any time.',
    ],
  },
  {
    title: '8. Prohibited Conduct',
    body: [
      'You must not use the Platform for any unlawful purpose or in any way that violates these terms.',
      'You must not attempt to gain unauthorised access to any part of the Platform, its servers, or connected systems.',
      'You must not post false reviews, manipulate ratings, or engage in any deceptive practices.',
      'You must not use automated tools, bots, or scripts to interact with the Platform.',
    ],
  },
  {
    title: '9. Limitation of Liability',
    body: [
      'MySalonBookings is a booking platform and is not responsible for the quality, safety, or legality of services provided by salons.',
      'To the maximum extent permitted by law, MySalonBookings shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.',
      'Our total liability to you for any claim shall not exceed the amount you paid for the specific booking giving rise to the claim.',
    ],
  },
  {
    title: '10. Governing Law',
    body: [
      'These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.',
      'If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force.',
    ],
  },
  {
    title: '11. Contact Us',
    body: [
      'For any questions regarding these Terms & Conditions, please contact us:',
      'Email: support@mysalonbookings.com',
      'Phone: +91 87264 90024',
      'Address: MySalonBookings, India',
    ],
  },
];

export default function TermsAndConditions() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Terms &amp; Conditions</h1>
          <p className="text-indigo-100 text-sm">Last updated: March 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <p className="text-slate-600 text-sm leading-relaxed">
            Welcome to MySalonBookings. These Terms &amp; Conditions govern your use of our platform, including our website and
            mobile application. Please read them carefully before using our services. These terms create a legally binding agreement
            between you and MySalonBookings.
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
