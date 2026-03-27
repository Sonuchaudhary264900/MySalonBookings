import { Scissors, Zap, User, Sparkles, Hand, Leaf, Palette, Clock, Star, Plus, Check } from "lucide-react";

const serviceIconMap = {
  haircut:  <Scissors className="w-5 h-5" style={{ color: 'var(--t-accent)' }} />,
  shave:    <Zap      className="w-5 h-5" style={{ color: 'var(--t-accent)' }} />,
  beard:    <User     className="w-5 h-5" style={{ color: 'var(--t-accent)' }} />,
  facial:   <Sparkles className="w-5 h-5" style={{ color: 'var(--t-accent)' }} />,
  massage:  <Leaf     className="w-5 h-5" style={{ color: 'var(--t-accent)' }} />,
  manicure: <Hand     className="w-5 h-5" style={{ color: 'var(--t-accent)' }} />,
  pedicure: <Hand     className="w-5 h-5" style={{ color: 'var(--t-accent)' }} />,
  waxing:   <Leaf     className="w-5 h-5" style={{ color: 'var(--t-accent)' }} />,
  color:    <Palette  className="w-5 h-5" style={{ color: 'var(--t-accent)' }} />,
  default:  <Star     className="w-5 h-5" style={{ color: 'var(--t-accent)' }} />,
};

function getIcon(name = "") {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(serviceIconMap)) {
    if (key !== "default" && lower.includes(key)) return icon;
  }
  return serviceIconMap.default;
}

function ServiceCard({ service, isSelected, onToggle, showGenderBadge = false }) {
  const unavailable = service.available === false;

  return (
    <div
      className="flex items-center justify-between p-5 rounded-xl border-2 transition-all duration-200 group"
      style={{
        background: isSelected ? 'rgba(99,102,241,0.07)' : 'var(--t-card)',
        borderColor: isSelected ? 'rgba(99,102,241,0.5)' : 'var(--t-border)',
        boxShadow: isSelected ? '0 0 0 1px rgba(99,102,241,0.15)' : 'var(--t-shadow)',
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: isSelected ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)' }}
        >
          {getIcon(service.name)}
        </div>
        <div>
          <h3
            className="text-[15px] font-semibold transition-colors"
            style={{ color: 'var(--t-text)' }}
          >
            {service.name}
          </h3>
          {service.description && (
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--t-text-3)' }}>
              {service.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[13px] flex items-center gap-1" style={{ color: 'var(--t-text-2)' }}>
              <Clock className="w-3.5 h-3.5" /> {service.duration} min
            </span>
            {!unavailable ? (
              <span className="text-xs font-medium" style={{ color: 'var(--t-success-text)' }}>Available</span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--t-error-text)' }}>Unavailable</span>
            )}
            {showGenderBadge && service.applicableFor?.length > 0 && (() => {
              const af = service.applicableFor;
              const hasMale   = af.includes("male");
              const hasFemale = af.includes("female");
              const label = hasMale && hasFemale ? "👥 Both" : hasMale ? "👨 Men" : "👩 Women";
              const bg    = hasMale && hasFemale ? "rgba(139,92,246,0.12)" : hasMale ? "rgba(59,130,246,0.12)" : "rgba(236,72,153,0.12)";
              const color = hasMale && hasFemale ? "#a78bfa" : hasMale ? "#60a5fa" : "#f472b6";
              return (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: bg, color }}
                >{label}</span>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="text-base font-bold" style={{ color: 'var(--t-text)' }}>
            ₹{service.basePrice ?? service.price}
          </p>
        </div>
        <button
          onClick={onToggle}
          disabled={unavailable}
          className="py-2.5 px-5 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          style={isSelected
            ? { background: 'var(--t-accent)', color: '#fff' }
            : { border: '2px solid var(--t-accent)', color: 'var(--t-accent-text)', background: 'transparent' }
          }
        >
          {isSelected ? (
            <><Check className="w-4 h-4" /> Added</>
          ) : (
            <><Plus className="w-4 h-4" /> Add</>
          )}
        </button>
      </div>
    </div>
  );
}

export default ServiceCard;
