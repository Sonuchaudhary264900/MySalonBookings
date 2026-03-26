import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function Footer() {
  const { isDark } = useTheme();

  const bg      = isDark ? "bg-slate-900"   : "bg-slate-100";
  const heading = isDark ? "text-white"      : "text-slate-800";
  const muted   = isDark ? "text-slate-400"  : "text-slate-500";
  const lhover  = isDark ? "hover:text-white": "hover:text-indigo-600";
  const btnBg   = isDark ? "bg-slate-800"    : "bg-white";
  const divider = isDark ? "border-slate-800": "border-slate-200";
  const sub     = isDark ? "text-slate-500"  : "text-slate-400";

  return (
    <footer className={`${bg} mt-16 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white text-base">✂</span>
              </div>
              <span className={`text-xl font-bold ${heading}`}>MySalonBookings</span>
            </div>
            <p className={`${muted} text-sm leading-relaxed max-w-xs`}>
              Discover top-rated salons near you and book appointments in seconds. Your perfect look is just a tap away.
            </p>
            <div className="flex gap-4 mt-5">
              {["📘", "📸", "🐦"].map((icon, i) => (
                <button
                  key={i}
                  className={`w-9 h-9 rounded-full ${btnBg} flex items-center justify-center hover:bg-indigo-600 transition-colors`}
                >
                  <span className="text-sm">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={`text-sm font-semibold ${heading} uppercase tracking-wider mb-4`}>Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { to: "/", label: "Browse Salons" },
                { to: "/dashboard", label: "My Bookings" },
                { to: "/favorites", label: "Favorites" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className={`${muted} ${lhover} text-sm transition-colors`}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className={`text-sm font-semibold ${heading} uppercase tracking-wider mb-4`}>Contact</h4>
            <ul className={`space-y-2.5 ${muted} text-sm`}>
              <li className="flex items-center gap-2">
                <span>✉</span>
                <span>support@mysalonbookings.com</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📍</span>
                <span>Across India</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📞</span>
                <span>+91 87264 90024</span>
              </li>
            </ul>
          </div>
        </div>

        <div className={`border-t ${divider} pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-sm ${sub}`}>
          <p>© {new Date().getFullYear()} My Salon Bookings by Gigamind Technology Pvt Ltd. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/legal/customer-privacy" className={`${lhover} transition-colors`}>Privacy Policy</Link>
            <Link to="/legal/customer-terms" className={`${lhover} transition-colors`}>Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
