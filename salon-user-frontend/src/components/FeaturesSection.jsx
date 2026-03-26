import { useEffect, useRef } from "react";

const FEATURES = [
  {
    icon: "📅",
    title: "Easy Booking",
    desc: "Book any service in seconds — no phone calls, no standing in queues.",
    glow: "rgba(99,102,241,0.35)",
    iconBg: "linear-gradient(135deg, #4f46e5, #6366f1)",
    border: "rgba(99,102,241,0.2)",
  },
  {
    icon: "✅",
    title: "Verified Salons",
    desc: "Every salon is verified before listing. Quality and trust, guaranteed.",
    glow: "rgba(16,185,129,0.35)",
    iconBg: "linear-gradient(135deg, #059669, #10b981)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    icon: "⚡",
    title: "Instant Confirmation",
    desc: "Get your booking confirmed instantly. No waiting for callbacks.",
    glow: "rgba(234,179,8,0.35)",
    iconBg: "linear-gradient(135deg, #d97706, #f59e0b)",
    border: "rgba(234,179,8,0.2)",
  },
  {
    icon: "🎯",
    title: "Smart Recommendations",
    desc: "We suggest the best salons based on your location and preferences.",
    glow: "rgba(244,63,94,0.35)",
    iconBg: "linear-gradient(135deg, #e11d48, #f43f5e)",
    border: "rgba(244,63,94,0.2)",
  },
];

const STATS = [
  { value: "1,000+", label: "Happy Customers", icon: "😊" },
  { value: "500+",   label: "Verified Salons",  icon: "✅" },
  { value: "25+",    label: "Cities",           icon: "🏙" },
  { value: "4.9★",   label: "Average Rating",   icon: "⭐" },
];

function useInView(ref, delay = 0) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("visible"), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, delay]);
}

function FeatureCard({ icon, title, desc, glow, iconBg, border, delay }) {
  const ref = useRef(null);
  useInView(ref, delay);

  return (
    <div
      ref={ref}
      className="inview p-6 rounded-3xl group cursor-default transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${border}`,
        transitionDelay: `${delay}ms`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-5px)";
        e.currentTarget.style.boxShadow = `0 0 30px ${glow}, 0 20px 50px rgba(0,0,0,0.3)`;
        e.currentTarget.style.borderColor = glow.replace("0.35", "0.5");
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = border;
      }}
    >
      <div
        className="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110"
        style={{ background: iconBg, width: 52, height: 52, boxShadow: `0 0 16px ${glow}` }}
      >
        {icon}
      </div>
      <h3 className="font-bold text-white text-base mb-2">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(148,163,184,0.65)" }}>{desc}</p>
    </div>
  );
}

export default function FeaturesSection() {
  const titleRef  = useRef(null);
  const statsRef  = useRef(null);
  useInView(titleRef);
  useInView(statsRef, 200);

  return (
    <section
      className="py-16 sm:py-20 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #050509 0%, #070711 60%, #050509 100%)" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-[500px] h-[400px] blur-3xl opacity-15 rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.5), transparent)" }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">

        {/* Header */}
        <div ref={titleRef} className="inview text-center mb-12">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <span className="text-violet-400 text-xs font-bold tracking-widest uppercase">Why Choose Us</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-white">
            Everything you need to{" "}
            <span className="text-neon-gradient">look your best</span>
          </h2>
          <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: "rgba(148,163,184,0.65)" }}>
            My Salon Bookings makes beauty effortless — for customers and salon owners.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 80} />
          ))}
        </div>

        {/* Stats bar */}
        <div
          ref={statsRef}
          className="inview grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {STATS.map(({ value, label, icon }) => (
            <div
              key={label}
              className="rounded-2xl p-5 text-center transition-all duration-300 cursor-default"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(99,102,241,0.08)";
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(99,102,241,0.1)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-neon-gradient leading-tight">{value}</div>
              <div className="text-xs font-medium mt-1" style={{ color: "rgba(148,163,184,0.6)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
