import { Link } from "react-router-dom";

const SOCIAL = [
  { icon: "f",  label: "Facebook",  glow: "rgba(59,130,246,0.6)" },
  { icon: "in", label: "Instagram", glow: "rgba(236,72,153,0.6)" },
  { icon: "𝕏",  label: "Twitter",  glow: "rgba(148,163,184,0.4)" },
];

export default function Footer() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #050509 0%, #030306 100%)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Top glow line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)" }}
      />

      {/* Ambient orb */}
      <div
        className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] blur-3xl opacity-10 rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.8), transparent)" }}
      />

      <div className="max-w-7xl mx-auto px-6 pt-14 pb-8 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}
              >
                <span className="text-white text-lg">✂</span>
              </div>
              <span className="font-extrabold tracking-tight text-lg text-white">My Salon Bookings</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs mb-5" style={{ color: "rgba(148,163,184,0.6)" }}>
              Discover top-rated salons near you and book appointments in seconds. Your perfect look is just a tap away.
            </p>
            <div className="flex gap-3">
              {SOCIAL.map(({ icon, label, glow }) => (
                <button
                  key={label}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(148,163,184,0.7)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.borderColor = glow.replace("0.6", "0.4").replace("0.4", "0.3");
                    e.currentTarget.style.boxShadow = `0 0 12px ${glow}`;
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.color = "rgba(148,163,184,0.7)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Discover */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-5">Discover</h4>
            <ul className="space-y-3">
              {[
                { to: "/",          label: "Browse Salons" },
                { to: "/dashboard", label: "My Bookings" },
                { to: "/favorites", label: "Saved Salons" },
                { to: "/register",  label: "Create Account" },
                { to: "/login",     label: "Sign In" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm transition-colors duration-200"
                    style={{ color: "rgba(148,163,184,0.55)" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#a78bfa"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.55)"; }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Owners */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-5">For Salon Owners</h4>
            <ul className="space-y-3">
              {[
                { href: "https://mysalonbookings.in", label: "Owner Dashboard" },
                { href: "https://play.google.com/store/apps/details?id=com.mysalonbookings.owner", label: "Owner App" },
              ].map(({ href, label }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm transition-colors duration-200 flex items-center gap-1"
                    style={{ color: "rgba(148,163,184,0.55)" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#a78bfa"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.55)"; }}
                  >
                    {label} <span className="text-xs opacity-40">↗</span>
                  </a>
                </li>
              ))}
              <li className="pt-1">
                <a
                  href="https://play.google.com/store/apps/details?id=com.mysalonbookings.owner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#fff",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(99,102,241,0.15)";
                    e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
                    e.currentTarget.style.boxShadow = "0 0 12px rgba(99,102,241,0.2)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span className="text-sm">▶</span>
                  <div className="text-left">
                    <div className="text-[9px] leading-none" style={{ color: "rgba(148,163,184,0.5)" }}>GET IT ON</div>
                    <div className="text-xs font-bold leading-tight">Google Play</div>
                  </div>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-5">Contact &amp; Legal</h4>
            <ul className="space-y-3 text-sm mb-5">
              <li className="flex items-center gap-2" style={{ color: "rgba(148,163,184,0.6)" }}>
                <span>✉</span>
                <a
                  href="mailto:support@mysalonbookings.in"
                  className="transition-colors duration-200 hover:text-violet-400"
                >
                  support@mysalonbookings.in
                </a>
              </li>
              <li className="flex items-center gap-2" style={{ color: "rgba(148,163,184,0.6)" }}>
                <span>📞</span>
                <a href="tel:+918726490024" className="transition-colors duration-200 hover:text-violet-400">
                  +91 87264 90024
                </a>
              </li>
              <li className="flex items-center gap-2" style={{ color: "rgba(148,163,184,0.6)" }}>
                <span>📍</span>
                <span>Across India</span>
              </li>
            </ul>
            <div className="space-y-2">
              <Link
                to="/legal/customer-privacy"
                className="block text-xs transition-colors duration-200"
                style={{ color: "rgba(148,163,184,0.4)" }}
                onMouseEnter={e => { e.currentTarget.style.color = "rgba(167,139,250,0.8)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.4)"; }}
              >
                Privacy Policy
              </Link>
              <Link
                to="/legal/customer-terms"
                className="block text-xs transition-colors duration-200"
                style={{ color: "rgba(148,163,184,0.4)" }}
                onMouseEnter={e => { e.currentTarget.style.color = "rgba(167,139,250,0.8)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.4)"; }}
              >
                Terms &amp; Conditions
              </Link>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-6" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }} />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-center sm:text-left" style={{ color: "rgba(148,163,184,0.35)" }}>
            © {new Date().getFullYear()} My Salon Bookings by Gigamind Technology Pvt Ltd. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: "rgba(148,163,184,0.25)" }}>Made with ❤️ for Indian salons</p>
        </div>
      </div>
    </footer>
  );
}
