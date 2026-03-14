import React from 'react';
import { Edit2, Trash2, Tag, Clock } from 'lucide-react';
import Button from '../common/Button';

/**
 * ServiceCard Component
 * 
 * Shows:
 * - Service name
 * - Description
 * - Price
 * - Duration
 * - Edit/Delete buttons
 */
const ServiceCard = ({
  service,
  onEdit,
  onDelete,
  loading = false,
}) => {
  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:shadow-lg transition">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg">{service.name}</h3>
            {service.description && (
              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
            )}
          </div>
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
  );
};

export default ServiceCard;