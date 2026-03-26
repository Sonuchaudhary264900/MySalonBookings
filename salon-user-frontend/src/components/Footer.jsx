import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-slate-900 mt-16">
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white text-lg">✂</span>
              </div>
              <span className="text-white text-lg font-extrabold tracking-tight">My Salon Bookings</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-5">
              Discover top-rated salons near you and book appointments in seconds. Your perfect look is just a tap away.
            </p>
            <div className="flex gap-3">
              {[
                { icon: "f", label: "Facebook",  color: "hover:bg-blue-600" },
                { icon: "in", label: "Instagram", color: "hover:bg-pink-600" },
                { icon: "𝕏", label: "Twitter",   color: "hover:bg-slate-600" },
              ].map(({ icon, label, color }) => (
                <button
                  key={label}
                  aria-label={label}
                  className={`w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white ${color} flex items-center justify-center text-xs font-bold transition-all`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Discover */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Discover</h4>
            <ul className="space-y-2.5">
              {[
                { to: "/",          label: "Browse Salons" },
                { to: "/dashboard", label: "My Bookings" },
                { to: "/favorites", label: "Saved Salons" },
                { to: "/register",  label: "Create Account" },
                { to: "/login",     label: "Sign In" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-slate-400 hover:text-white text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Owners */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4">For Salon Owners</h4>
            <ul className="space-y-2.5">
              {[
                { href: "https://mysalonbookings.in", label: "Owner Dashboard", external: true },
                { href: "https://play.google.com/store/apps/details?id=com.mysalonbookings.owner", label: "Owner App", external: true },
              ].map(({ href, label, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1"
                  >
                    {label} {external && <span className="text-xs opacity-50">↗</span>}
                  </a>
                </li>
              ))}
              <li className="pt-2">
                <a
                  href="https://play.google.com/store/apps/details?id=com.mysalonbookings.owner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                >
                  <span className="text-base">▶</span>
                  <div className="text-left">
                    <div className="text-slate-400 text-[9px] leading-none">GET IT ON</div>
                    <div className="text-white text-xs font-bold leading-tight">Google Play</div>
                  </div>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Contact &amp; Legal</h4>
            <ul className="space-y-2.5 text-slate-400 text-sm mb-5">
              <li className="flex items-center gap-2">
                <span className="text-base">✉</span>
                <a href="mailto:support@mysalonbookings.in" className="hover:text-white transition-colors">
                  support@mysalonbookings.in
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-base">📞</span>
                <a href="tel:+918726490024" className="hover:text-white transition-colors">
                  +91 87264 90024
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-base">📍</span>
                <span>Across India</span>
              </li>
            </ul>
            <div className="space-y-2">
              <Link to="/legal/customer-privacy" className="block text-slate-500 hover:text-slate-300 text-xs transition-colors">Privacy Policy</Link>
              <Link to="/legal/customer-terms"   className="block text-slate-500 hover:text-slate-300 text-xs transition-colors">Terms &amp; Conditions</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-slate-500 text-xs text-center sm:text-left">
            © {new Date().getFullYear()} My Salon Bookings by Gigamind Technology Pvt Ltd. All rights reserved.
          </p>
          <p className="text-slate-600 text-xs">Made with ❤️ for Indian salons</p>
        </div>
      </div>
    </footer>
  );
}
