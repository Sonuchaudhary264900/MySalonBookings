const STEPS = [
  {
    step: "01",
    icon: "🔍",
    title: "Search",
    desc: "Find salons near you by location, service name, or city. Browse hundreds of verified salons instantly.",
    color: "bg-indigo-50",
    iconBg: "bg-indigo-100 text-indigo-600",
  },
  {
    step: "02",
    icon: "✂",
    title: "Choose Service",
    desc: "Browse services, check prices, read real reviews from verified customers.",
    color: "bg-violet-50",
    iconBg: "bg-violet-100 text-violet-600",
  },
  {
    step: "03",
    icon: "📅",
    title: "Book Instantly",
    desc: "Pick your time slot and confirm in one tap. Get instant confirmation — no calls, no waiting.",
    color: "bg-green-50",
    iconBg: "bg-green-100 text-green-600",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-14 sm:py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <span className="inline-block bg-indigo-50 text-indigo-600 text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3">
            How It Works
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Book your salon in 3 simple steps
          </h2>
          <p className="text-slate-500 mt-2 text-sm sm:text-base max-w-md mx-auto">
            No more calling around. Find, choose, and book in under a minute.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden sm:block absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-indigo-200 via-violet-200 to-green-200 z-0" style={{ left: "20%", right: "20%" }} />

          {STEPS.map(({ step, icon, title, desc, color, iconBg }) => (
            <div
              key={step}
              className={`relative text-center p-6 rounded-2xl ${color} hover:-translate-y-1 transition-transform duration-200 group`}
            >
              <div className="absolute top-4 right-4 text-5xl font-black text-white/60 leading-none select-none">
                {step}
              </div>
              <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                {icon}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
