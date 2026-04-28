import { Mail, Phone, MessageCircle, Instagram, Facebook, Youtube, Linkedin } from 'lucide-react';

const Footer = () => (
  <footer className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800/60 py-4 px-6 transition-colors duration-300">
    <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-500">

      {/* Copyright */}
      <p className="text-xs text-gray-400 dark:text-gray-600 text-center md:text-left">
        © {new Date().getFullYear()} GlowLoox by{' '}
        <span className="font-semibold text-gray-500 dark:text-gray-400">Gigamind Technology Pvt Ltd.</span>{' '}
        All rights reserved.
      </p>

      {/* Contact */}
      <div className="flex items-center gap-4 flex-wrap justify-center text-xs">
        <a href="mailto:glowloox@gmail.com"
          className="flex items-center gap-1.5 text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <Mail size={13} /> glowloox@gmail.com
        </a>
        <a href="tel:+917973270642"
          className="flex items-center gap-1.5 text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <Phone size={13} /> +91 79732 70642
        </a>
        <a href="https://wa.me/917973270642" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-gray-400 dark:text-gray-600 hover:text-green-500 dark:hover:text-green-400 transition-colors">
          <MessageCircle size={13} /> WhatsApp
        </a>
        <a href="https://instagram.com/glowloox" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-gray-400 dark:text-gray-600 hover:text-pink-500 dark:hover:text-pink-400 transition-colors">
          <Instagram size={13} /> Instagram
        </a>
        <a href="https://facebook.com/glowloox" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-gray-400 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
          <Facebook size={13} /> Facebook
        </a>
        <a href="https://youtube.com/@glowloox" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
          <Youtube size={13} /> YouTube
        </a>
        <a href="https://linkedin.com/company/glowloox" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-gray-400 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-500 transition-colors">
          <Linkedin size={13} /> LinkedIn
        </a>
      </div>

      {/* Legal links */}
      <div className="flex items-center gap-4 flex-wrap justify-center text-xs">
        <a href="/legal/owner-privacy" className="text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</a>
        <a href="/legal/owner-terms"   className="text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms &amp; Conditions</a>
      </div>
    </div>
  </footer>
);

export default Footer;
