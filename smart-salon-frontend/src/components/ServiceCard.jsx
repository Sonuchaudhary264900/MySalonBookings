import { useNavigate } from "react-router-dom";

const serviceIcons = {
  haircut: "✂",
  shave: "🪒",
  beard: "🧔",
  facial: "💆",
  massage: "💆",
  manicure: "💅",
  pedicure: "🦶",
  waxing: "🪮",
  color: "🎨",
  default: "✨",
};

function getIcon(name = "") {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(serviceIcons)) {
    if (lower.includes(key)) return icon;
  }
  return serviceIcons.default;
}

function ServiceCard({ service, salonId }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleBooking = () => {
    if (!token) {
      navigate("/login");
      return;
    }
    navigate(`/booking/${salonId}/${service._id}`);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all duration-200 group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-lg shrink-0">
          {getIcon(service.name)}
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
            {service.name}
          </h3>
          {service.description && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{service.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <span>🕐</span> {service.duration} min
            </span>
            {service.available !== false ? (
              <span className="text-xs text-green-600 font-medium">Available</span>
            ) : (
              <span className="text-xs text-red-400">Unavailable</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="font-bold text-slate-900">₹{service.price}</p>
        </div>
        <button
          onClick={handleBooking}
          disabled={service.available === false}
          className="btn-primary text-sm py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Book
        </button>
      </div>
    </div>
  );
}

export default ServiceCard;
