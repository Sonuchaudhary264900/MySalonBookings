const Footer = () => (
  <footer className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800/60 py-5 px-6 transition-colors duration-300">
    <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-500">

      {/* Copyright */}
      <p className="text-xs text-gray-400 dark:text-gray-600 text-center md:text-left">
        © {new Date().getFullYear()} My Salon Bookings by{' '}
        <span className="font-semibold text-gray-500 dark:text-gray-400">Gigamind Technology Pvt Ltd.</span>{' '}
        All rights reserved.
      </p>

      {/* Contact */}
      <div className="flex items-center gap-5 flex-wrap justify-center text-xs">
        <a href="mailto:support@mysalonbookings.com"
          className="flex items-center gap-1.5 text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          ✉ support@mysalonbookings.com
        </a>
        <a href="tel:+918726490024"
          className="flex items-center gap-1.5 text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          📞 +91 87264 90024
        </a>
      </div>

      {/* Links */}
      <div className="flex items-center gap-4 flex-wrap justify-center text-xs">
        <a href="/legal/owner-privacy" className="text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</a>
        <a href="/legal/owner-terms"   className="text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms &amp; Conditions</a>
        <a href="/legal"               className="text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Legal</a>
      </div>
    </div>
  </footer>
);

export default Footer;
