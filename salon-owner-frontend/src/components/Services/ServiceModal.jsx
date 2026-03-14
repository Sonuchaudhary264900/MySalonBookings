import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

const ServiceModal = ({ isOpen, onClose, service = null, onSubmit, loading = false, error = '' }) => {
  const [form, setForm] = useState({ name: '', description: '', basePrice: '', duration: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (service) {
      setForm({
        name:        service.name        || '',
        description: service.description || '',
        basePrice:   service.basePrice   ?? '',
        duration:    service.duration    ?? '',
      });
    } else {
      setForm({ name: '', description: '', basePrice: '', duration: '' });
    }
    setErrors({});
  }, [service, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim())          errs.name      = 'Service name is required';
    if (!form.basePrice)            errs.basePrice  = 'Price is required';
    else if (Number(form.basePrice) < 0) errs.basePrice = 'Price must be positive';
    if (!form.duration)             errs.duration  = 'Duration is required';
    else if (Number(form.duration) < 1)  errs.duration  = 'Duration must be at least 1 min';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    await onSubmit({
      name:        form.name.trim(),
      description: form.description.trim(),
      basePrice:   Number(form.basePrice),
      duration:    Number(form.duration),
    });
  };

  const inputCls = (field) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={service ? 'Edit Service' : 'Add New Service'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
          <input name="name" value={form.name} onChange={handleChange} disabled={loading}
            placeholder="e.g. Haircut" className={inputCls('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange}
            disabled={loading} rows={2} placeholder="Optional description…"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
            <input type="number" name="basePrice" value={form.basePrice} onChange={handleChange}
              disabled={loading} min="0" placeholder="e.g. 200" className={inputCls('basePrice')} />
            {errors.basePrice && <p className="mt-1 text-xs text-red-500">{errors.basePrice}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min) *</label>
            <input type="number" name="duration" value={form.duration} onChange={handleChange}
              disabled={loading} min="1" placeholder="e.g. 30" className={inputCls('duration')} />
            {errors.duration && <p className="mt-1 text-xs text-red-500">{errors.duration}</p>}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition">
            {loading ? 'Saving…' : service ? 'Save Changes' : 'Add Service'}
          </button>
          <button type="button" onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ServiceModal;
