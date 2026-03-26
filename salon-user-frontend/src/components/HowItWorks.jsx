import { useEffect, useRef } from "react";

const STEPS = [
  {
    step: "01",
    icon: "🔍",
    title: "Search",
    desc: "Find salons near you by location, service name, or city. Browse hundreds of verified salons instantly.",
    glow: "rgba(99,102,241,0.3)",
    border: "rgba(99,102,241,0.25)",
    numColor: "rgba(99,102,241,0.08)",
  },
  {
    step: "02",
    icon: "✂",
    title: "Choose Service",
    desc: "Browse services, check prices, read real reviews from verified customers. Pick exactly what you want.",
    glow: "rgba(139,92,246,0.3)",
    border: "rgba(139,92,246,0.25)",
    numColor: "rgba(139,92,246,0.08)",
  },
  {
    step: "03",
    icon: "📅",
    title: "Book Instantly",
    desc: "Pick your time slot and confirm in one tap. Get instant confirmation — no calls, no waiting.",
    glow: "rgba(6,182,212,0.3)",
    border: "rgba(6,182,212,0.25)",
    numColor: "rgba(6,182,212,0.08)",
  },
];

function useInView(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
}

function StepCard({ step, icon, title, desc, glow, border, numColor, delay }) {
  const ref = useRef(null);
  useInView(ref);

  return (
    <div
      ref={ref}
      className="inview relative p-7 rounded-3xl group cursor-default"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${border}`,
        transitionDelay: `${delay}ms`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 0 32px ${glow}, 0 20px 60px rgba(0,0,0,0.3)`;
        e.currentTarget.style.transform = "translateY(-6px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Faded step number watermark */}
      <div
        className="absolute top-4 right-5 font-black select-none leading-none"
        style={{ fontSize: "5rem", color: numColor }}
      >
        {step}
      </div>

      {/* Icon */}
      <div
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 transition-transform duration-300 group-hover:scale-110"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${border}`,
          boxShadow: `0 0 16px ${glow}`,
        }}
      >
        {icon}
      </div>

      <h3 className="font-extrabold text-white text-lg mb-2.5">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(148,163,184,0.7)" }}>{desc}</p>
    </div>
  );
}

export default function HowItWorks() {
  const titleRef = useRef(null);
  useInView(titleRef);

  return (
    <section
      className="py-16 sm:py-20 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #050509 0%, #080812 50%, #050509 100%)" }}
    >
      {/* Subtle background gradient */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-3xl opacity-25 rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.3), transparent)" }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative">

        {/* Header */}
        <div ref={titleRef} className="inview text-center mb-12">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4"
            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase">How It Works</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-white">
            Book your salon in{" "}
            <span className="text-neon-gradient">3 simple steps</span>
          </h2>
          <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: "rgba(148,163,184,0.65)" }}>
            No more calling around. Find, choose, and book in under a minute.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative">
          {/* Connector line (desktop) */}
          <div
            className="hidden sm:block absolute top-14 z-0"
            style={{
              left: "calc(33.33% + 20px)",
              right: "calc(33.33% + 20px)",
              height: 1,
              background: "linear-gradient(90deg, rgba(99,102,241,0.4), rgba(139,92,246,0.4), rgba(6,182,212,0.4))",
              boxShadow: "0 0 8px rgba(99,102,241,0.3)",
            }}
          />
          {STEPS.map((step, i) => (
            <StepCard key={step.step} {...step} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}
