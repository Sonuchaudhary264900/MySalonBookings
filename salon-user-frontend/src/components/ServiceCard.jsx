import { useNavigate } from "react-router-dom";
import { isCustomer, clearCustomerAuth } from "../utils/auth";
import { Scissors, Zap, User, Sparkles, Hand, Leaf, Palette, Clock, Star } from "lucide-react";

const serviceIconMap = {
  haircut:  <Scissors className="w-5 h-5 text-indigo-500" />,
  shave:    <Zap className="w-5 h-5 text-indigo-500" />,
  beard:    <User className="w-5 h-5 text-indigo-500" />,
  facial:   <Sparkles className="w-5 h-5 text-indigo-500" />,
  massage:  <Leaf className="w-5 h-5 text-indigo-500" />,
  manicure: <Hand className="w-5 h-5 text-indigo-500" />,
  pedicure: <Hand className="w-5 h-5 text-indigo-500" />,
  waxing:   <Leaf className="w-5 h-5 text-indigo-500" />,
  color:    <Palette className="w-5 h-5 text-indigo-500" />,
  default:  <Star className="w-5 h-5 text-indigo-500" />,
};

function getIcon(name = "") {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(serviceIconMap)) {
    if (key !== "default" && lower.includes(key)) return icon;
  }
  return serviceIconMap.default;
}

function ServiceCard({ service, salonId }) {
  const navigate = useNavigate();

  const handleBooking = () => {
    if (!isCustomer()) {
      clearCustomerAuth();
      navigate("/login");
      return;
    }
    navigate(`/booking/${salonId}/${service._id}`);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all duration-200 group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
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
              <Clock className="w-3.5 h-3.5" /> {service.duration} min
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
          <p className="font-bold text-slate-900">₹{service.basePrice ?? service.price}</p>
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
