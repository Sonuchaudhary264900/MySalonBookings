import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: [
      'By registering as a salon owner on GlowLoox ("Platform"), you agree to be bound by these Terms & Conditions and our Privacy Policy.',
      'If you do not agree with any part of these terms, you must not use our services.',
      'We reserve the right to update these terms at any time. Continued use after changes are published constitutes your acceptance.',
    ],
  },
  {
    title: '2. Account Registration & Approval',
    body: [
      'You must provide accurate, complete, and up-to-date information during registration. Providing false information may result in immediate account termination.',
      'New salon accounts are subject to an approval process. We reserve the right to reject any application without providing reasons.',
      'You are responsible for maintaining the security of your account credentials and all activity under your account.',
      'You must notify us immediately at glowloox@gmail.com if you suspect unauthorised access to your account.',
    ],
  },
  {
    title: '3. Salon Listing & Services',
    body: [
      'You are solely responsible for the accuracy of all information published on your salon profile, including services, prices, photos, and working hours.',
      'You must not list services you are not qualified or licensed to provide.',
      'You must keep your availability and pricing updated to avoid customer complaints or booking conflicts.',
      'GlowLoox reserves the right to remove or suspend any salon listing that violates these terms or applicable laws.',
    ],
  },
  {
    title: '4. Bookings & Customer Obligations',
    body: [
      'When a customer books through the platform, you are entering a direct service agreement with that customer. GlowLoox is not a party to that agreement.',
      'You must honour confirmed bookings unless cancelled by the customer or under exceptional circumstances.',
      'You must treat all customers with respect and provide services as advertised.',
      'Repeated cancellations, no-shows, or customer complaints may result in your listing being suspended or removed.',
    ],
  },
  {
    title: '5. Platform Fees & Payments',
    body: [
      'Current platform usage fees (if any) are communicated during registration and may be updated with advance notice.',
      'You are responsible for collecting payment from customers for services rendered, unless otherwise agreed.',
      'GlowLoox is not responsible for payment disputes between you and customers.',
    ],
  },
  {
    title: '6. Referral Programme',
    body: [
      'By participating in the referral programme, you agree to its specific terms communicated within the programme section.',
      'Referral rewards are granted only upon fulfilment of the qualifying conditions and are subject to verification.',
      'Fraudulent referrals or abuse of the programme will result in disqualification and potential account suspension.',
      'We reserve the right to modify or discontinue the referral programme at any time with reasonable notice.',
    ],
  },
  {
    title: '7. Content & Intellectual Property',
    body: [
      'By uploading photos, descriptions, or other content, you grant GlowLoox a non-exclusive, royalty-free licence to display and promote that content on our platform.',
      'You must only upload content that you own or have the right to use. Do not upload copyrighted material without permission.',
      'GlowLoox\'s logo, branding, and platform code are our exclusive intellectual property and may not be reproduced without written consent.',
    ],
  },
  {
    title: '8. Prohibited Conduct',
    body: [
      'You must not use the platform for any unlawful activity or in a way that harms other users, customers, or GlowLoox.',
      'You must not post fake reviews for yourself or competitor salons.',
      'You must not attempt to circumvent the platform by directing customers to book directly after initial contact through the platform.',
      'You must not use automated tools, bots, or scripts to interact with the platform.',
    ],
  },
  {
    title: '9. Suspension & Termination',
    body: [
      'We may suspend or terminate your account at our discretion if you breach these terms, receive repeated complaints, or engage in fraudulent activity.',
      'You may close your account at any time by contacting glowloox@gmail.com.',
      'Upon termination, your salon listing will be removed. Existing booking data may be retained as required by law.',
    ],
  },
  {
    title: '10. Limitation of Liability',
    body: [
      'GlowLoox provides the platform "as is" and makes no guarantees regarding uptime, customer volume, or revenue outcomes.',
      'We are not liable for any indirect, incidental, or consequential losses arising from your use of the platform.',
      'Our total liability for any claim shall not exceed the amount you paid to GlowLoox in the three months preceding the claim.',
    ],
  },
  {
    title: '11. Governing Law',
    body: [
      'These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.',
      'If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force.',
    ],
  },
  {
    title: '12. Contact Us',
    body: [
      'For any questions regarding these Terms & Conditions:',
      'Email: glowloox@gmail.com',
      'Phone: +91 87264 90024',
      'Address: GlowLoox, India',
    ],
  },
];

export default function TermsAndConditions() {
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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Terms &amp; Conditions</h1>
          <p className="text-indigo-100 text-sm">Last updated: March 2026 · GlowLoox Owner Platform</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <p className="text-slate-600 text-sm leading-relaxed">
            Welcome to the GlowLoox Owner Platform. These Terms &amp; Conditions govern your registration and use of the
            SmartSalon owner dashboard and mobile application. Please read them carefully. By creating an account, you agree to
            be legally bound by these terms.
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
        © 2026 GlowLoox by Gigamind Technology Pvt Ltd. All rights reserved
      </footer>
    </div>
  );
}
