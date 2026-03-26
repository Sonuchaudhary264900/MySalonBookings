const FEATURES = [
  {
    icon: "📅",
    title: "Easy Booking",
    desc: "Book any service in seconds — no phone calls, no standing in queues.",
    bg: "bg-indigo-50",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    border: "hover:border-indigo-200",
  },
  {
    icon: "✅",
    title: "Verified Salons",
    desc: "Every salon is verified before listing. Quality and trust, guaranteed.",
    bg: "bg-green-50",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    border: "hover:border-green-200",
  },
  {
    icon: "⚡",
    title: "Instant Confirmation",
    desc: "Get your booking confirmed instantly. No waiting for callbacks.",
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    border: "hover:border-amber-200",
  },
  {
    icon: "🎯",
    title: "Smart Recommendations",
    desc: "We suggest the best salons based on your location and preferences.",
    bg: "bg-rose-50",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    border: "hover:border-rose-200",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-14 sm:py-16 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <span className="inline-block bg-indigo-50 text-indigo-600 text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3">
            Why Choose Us
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Everything you need to look your best
          </h2>
          <p className="text-slate-500 mt-2 text-sm sm:text-base max-w-md mx-auto">
            My Salon Bookings makes beauty effortless — for customers and salon owners.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {FEATURES.map(({ icon, title, desc, bg, iconBg, iconColor, border }) => (
            <div
              key={title}
              className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 ${border} hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default`}
            >
              <div className={`w-12 h-12 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center text-2xl mb-4 shadow-sm`}>
                {icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-base">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Trust stats */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: "1,000+", label: "Happy Customers", icon: "😊" },
            { value: "500+",   label: "Verified Salons",  icon: "✅" },
            { value: "25+",    label: "Cities",           icon: "🏙" },
            { value: "4.9★",   label: "Average Rating",   icon: "⭐" },
          ].map(({ value, label, icon }) => (
            <div key={label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-xl sm:text-2xl font-extrabold text-indigo-600 leading-tight">{value}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
