const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-sm text-gray-500">
        <p>© {new Date().getFullYear()} MySalonBookings. All rights reserved.</p>
        <div className="flex items-center gap-6 flex-wrap justify-center">
          <span className="flex items-center gap-1">
            ✉ <a href="mailto:support@mysalonbookings.com" className="hover:text-blue-600 transition-colors">support@mysalonbookings.com</a>
          </span>
          <span className="flex items-center gap-1">
            📞 <a href="tel:+918726490024" className="hover:text-blue-600 transition-colors">+91 87264 90024</a>
          </span>
          <a href="/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-blue-600 transition-colors">Terms &amp; Conditions</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
