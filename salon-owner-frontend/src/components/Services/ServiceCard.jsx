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
    <div className={`bg-white rounded-lg border-2 p-4 hover:shadow-lg transition ${isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-lg">{service.name}</h3>
              {!isActive && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Inactive</span>
              )}
            </div>
            {service.description && (
              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
            )}
          </div>
          {/* Active / Inactive toggle */}
          {onToggle && (
            <button
              onClick={handleToggleClick}
              disabled={loading}
              title={isActive ? 'Deactivate service' : 'Activate service'}
              className={`relative shrink-0 ml-2 w-11 h-6 rounded-full transition-colors focus:outline-none ${isActive ? 'bg-indigo-600' : 'bg-gray-300'} disabled:opacity-50`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          )}
        </div>

        {/* Info */}
        <div className="flex items-center gap-4 py-3 border-t border-b border-gray-200">
          <div className="flex items-center gap-1">
            <Tag className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-gray-900">
              ₹{service.basePrice ?? service.price}
            </span>
          </div>

          {service.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">
                {service.duration} min
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(service)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this service?')) {
                onDelete(service._id || service.id);
              }
            }}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
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