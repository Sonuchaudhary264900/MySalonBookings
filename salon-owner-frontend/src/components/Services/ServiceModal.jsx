import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import {
  MALE_CATEGORIES,
  FEMALE_CATEGORIES,
  UNISEX_CATEGORIES,
} from '../../constants/salonCategories';

const GENDER_LABELS = { male: 'Male', female: 'Female' };

const getCategoryOptions = (servedGender) => {
  if (servedGender === 'male')   return MALE_CATEGORIES.map(c => ({ icon: c.icon, label: c.label }));
  if (servedGender === 'female') return FEMALE_CATEGORIES.map(c => ({ icon: c.icon, label: c.label }));
  return UNISEX_CATEGORIES.map(c => ({ icon: c.icon, label: c.label }));
};

const ServiceModal = ({ isOpen, onClose, service = null, onSubmit, loading = false, error = '', salon }) => {
  const servedGender = salon?.servedGender || 'male';
  const categoryOptions = getCategoryOptions(servedGender);

  const [form, setForm] = useState({
    name: '', description: '', basePrice: '', duration: '',
    category: '', applicableFor: servedGender === 'unisex' ? 'both' : servedGender,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (service) {
      const af = service.applicableFor || [];
      let applicableFor = 'both';
      if (servedGender !== 'unisex') {
        applicableFor = servedGender;
      } else if (af.length === 1) {
        applicableFor = af[0];
      }
      setForm({
        name:          service.name        || '',
        description:   service.description || '',
        basePrice:     service.basePrice   ?? '',
        duration:      service.duration    ?? '',
        category:      service.category    || '',
        applicableFor,
      });
    } else {
      setForm({
        name: '', description: '', basePrice: '', duration: '',
        category: '',
        applicableFor: servedGender === 'unisex' ? 'both' : servedGender,
      });
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
    if (!form.name.trim())                    errs.name      = 'Service name is required';
    if (!form.category)                       errs.category  = 'Please select a category';
    if (!form.basePrice)                      errs.basePrice = 'Price is required';
    else if (Number(form.basePrice) < 0)      errs.basePrice = 'Price must be positive';
    if (!form.duration)                       errs.duration  = 'Duration is required';
    else if (Number(form.duration) < 1)       errs.duration  = 'Duration must be at least 1 min';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const applicableFor =
      form.applicableFor === 'both' ? ['male', 'female'] : [form.applicableFor];

    await onSubmit({
      name:          form.name.trim(),
      description:   form.description.trim(),
      category:      form.category,
      applicableFor,
      basePrice:     Number(form.basePrice),
      duration:      Number(form.duration),
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

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
          <div className="grid grid-cols-2 gap-2">
            {categoryOptions.map(opt => (
              <button
                key={opt.label}
                type="button"
                disabled={loading}
                onClick={() => {
                  setForm(p => ({ ...p, category: opt.label }));
                  if (errors.category) setErrors(p => ({ ...p, category: '' }));
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium text-left transition ${
                  form.category === opt.label
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                }`}
              >
                <span className="text-lg shrink-0">{opt.icon}</span>
                <span className="leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
          {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
        </div>

        {/* Applicable For — only shown for unisex salons */}
        {servedGender === 'unisex' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Applicable For *</label>
            <div className="flex gap-2">
              {[['male', '👨 Men'], ['female', '👩 Women'], ['both', '👥 Both']].map(([val, label]) => (
                <button key={val} type="button"
                  onClick={() => setForm(p => ({ ...p, applicableFor: val }))}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition ${
                    form.applicableFor === val
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

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
