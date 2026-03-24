import React, { useState } from 'react';
import { Edit2, Trash2, Tag, Clock, AlertTriangle } from 'lucide-react';
import Button from '../common/Button';

const ServiceCard = ({
  service,
  onEdit,
  onDelete,
  onToggle,
  loading = false,
}) => {
  const isActive = service.isActive !== false;
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggleClick = () => {
    if (isActive) {
      // turning OFF → show confirmation first
      setShowConfirm(true);
    } else {
      // turning ON → immediate, no confirmation needed
      onToggle(service._id || service.id, true);
    }
  };

  const confirmDeactivate = () => {
    setShowConfirm(false);
    onToggle(service._id || service.id, false);
  };

  return (
    <>
    <div className={`bg-white rounded-lg border px-3 py-2 flex items-center gap-3 hover:shadow-sm transition ${!isActive ? 'opacity-50' : ''}`}>
      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 truncate">{service.name}</span>
          {!isActive && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Inactive</span>}
          {service.category && <span className="text-xs bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-full">{service.category}</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs font-bold text-blue-600">₹{service.basePrice ?? service.price}</span>
          {service.duration && <span className="text-xs text-gray-400">{service.duration} min</span>}
        </div>
      </div>

      {/* Toggle */}
      {onToggle && (
        <button
          onClick={handleToggleClick}
          disabled={loading}
          title={isActive ? 'Deactivate' : 'Activate'}
          className={`relative shrink-0 w-9 h-5 rounded-full transition-colors focus:outline-none ${isActive ? 'bg-indigo-500' : 'bg-gray-300'} disabled:opacity-50`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      )}

      {/* Actions */}
      <button onClick={() => onEdit(service)} disabled={loading} className="text-gray-400 hover:text-indigo-600 transition" title="Edit">
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => { if (window.confirm('Delete this service?')) onDelete(service._id || service.id); }}
        disabled={loading}
        className="text-gray-400 hover:text-red-500 transition"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>

    {/* Deactivate confirmation modal */}
    {showConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirm(false)} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Disable Service?</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="font-medium text-gray-700">"{service.name}"</span> will be hidden from customers and cannot be booked.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeactivate}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition"
            >
              Yes, Disable
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default ServiceCard;