import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="bg-slate-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white text-base">✂</span>
              </div>
              <span className="text-xl font-bold text-white">SmartSalon</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Discover top-rated salons near you and book appointments in seconds. Your perfect look is just a tap away.
            </p>
            <div className="flex gap-4 mt-5">
              {["📘", "📸", "🐦"].map((icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-indigo-600 transition-colors"
                >
                  <span className="text-sm">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { to: "/", label: "Browse Salons" },
                { to: "/dashboard", label: "My Bookings" },
                { to: "/favorites", label: "Favorites" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-slate-400 hover:text-white text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-2.5 text-slate-400 text-sm">
              <li className="flex items-center gap-2">
                <span>✉</span>
                <span>support@smartsalon.com</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📍</span>
                <span>Chandigarh, India</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📞</span>
                <span>+91 98765 43210</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} SmartSalon. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
