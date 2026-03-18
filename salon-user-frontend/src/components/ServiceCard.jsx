import { useNavigate } from "react-router-dom";
import { isCustomer, clearCustomerAuth } from "../utils/auth";
import { Scissors, Zap, User, Sparkles, Hand, Leaf, Palette, Clock, Star, Plus, Check } from "lucide-react";

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

function ServiceCard({ service, isSelected, onToggle }) {
  const navigate = useNavigate();

  const handleToggle = () => {
    if (!isCustomer()) {
      clearCustomerAuth();
      navigate("/login");
      return;
    }
    onToggle();
  };

  const unavailable = service.available === false;

  return (
    <div className={`flex items-center justify-between p-4 bg-white rounded-xl border transition-all duration-200 group ${
      isSelected
        ? "border-indigo-400 shadow-sm bg-indigo-50/30"
        : "border-slate-100 hover:border-indigo-200 hover:shadow-sm"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-indigo-100" : "bg-indigo-50"}`}>
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
            {!unavailable ? (
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
          onClick={handleToggle}
          disabled={unavailable}
          className={`text-sm py-2 px-4 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 ${
            isSelected
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "border border-indigo-600 text-indigo-600 hover:bg-indigo-50"
          }`}
        >
          {isSelected ? (
            <><Check className="w-3.5 h-3.5" /> Added</>
          ) : (
            <><Plus className="w-3.5 h-3.5" /> Add</>
          )}
        </button>
      </div>
    </div>
  );
}

export default ServiceCard;
