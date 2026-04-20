import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../common/Modal';
import {
  CATEGORY_IMAGES,
  getCategoriesForSalonType,
} from '../../constants/salonCategories';
import { uploadServicePhoto } from '../../services/salonService';

const _nameHash = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

const getCategoryDefaultImage = (category) => {
  const entry = CATEGORY_IMAGES[category];
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  return entry[0]; // first image for the category
};

const GENDER_LABELS = { male: 'Male', female: 'Female' };

const getCategoryOptions = (businessType, servedGender, offeredCategories) => {
  const allCats = getCategoriesForSalonType(businessType || 'salon', servedGender);
  if (offeredCategories && offeredCategories.length > 0) {
    const iconMap = Object.fromEntries(allCats.map(c => [c.label, c.icon]));
    return offeredCategories.map(c => ({ icon: iconMap[c.name] || '✨', label: c.name }));
  }
  return allCats.map(c => ({ icon: c.icon, label: c.label }));
};

const ServiceModal = ({ isOpen, onClose, service = null, onSubmit, loading = false, error = '', salon }) => {
  const servedGender  = salon?.servedGender  || 'male';
  const businessType  = salon?.businessType  || 'salon';
  const categoryOptions = getCategoryOptions(businessType, servedGender, salon?.offeredCategories);

  const [catOpen, setCatOpen] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', basePrice: '', duration: '',
    category: '', applicableFor: servedGender === 'unisex' ? 'both' : servedGender,
  });
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile]           = useState(null);
  const [imagePreview, setImagePreview]     = useState('');
  const [isCustomImage, setIsCustomImage]   = useState(false); // true = owner uploaded, false = category default
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (service) {
      const af = service.applicableFor || [];
      let applicableFor = 'both';
      if (servedGender !== 'unisex') {
        applicableFor = servedGender;
      } else if (af.length === 1) {
        applicableFor = af[0];
      }
      const cat = service.category || '';
      const isCustom = cat && !categoryOptions.find(o => o.label === cat);
      setCustomCategory(isCustom ? cat : '');
      setForm({
        name:          service.name        || '',
        description:   service.description || '',
        basePrice:     service.basePrice   ?? '',
        duration:      service.duration    ?? '',
        category:      cat,
        applicableFor,
      });
      const existingPhoto = service.photos?.[0] || '';
      setImagePreview(existingPhoto || getCategoryDefaultImage(cat) || '');
      setIsCustomImage(!!existingPhoto);
      setImageFile(null);
    } else {
      setCustomCategory('');
      setForm({
        name: '', description: '', basePrice: '', duration: '',
        category: '',
        applicableFor: servedGender === 'unisex' ? '' : servedGender,
      });
      setImagePreview('');
      setIsCustomImage(false);
      setImageFile(null);
    }
    setErrors({});
    return () => {
      setImageFile(prev => { if (prev) return null; return prev; });
    };
  }, [service, isOpen]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setIsCustomImage(true);
  };

  const handleRemoveImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setIsCustomImage(false);
    const catDefault = getCategoryDefaultImage(form.category);
    setImagePreview(catDefault || '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim())                    errs.name          = 'Service name is required';
    if (servedGender === 'unisex' && !form.applicableFor) errs.applicableFor = 'Please select who this service is for';
    if (!form.category || form.category === '__other__') errs.category = 'Please select a category';
    if (!form.basePrice)                      errs.basePrice     = 'Price is required';
    else if (Number(form.basePrice) < 0)      errs.basePrice     = 'Price must be positive';
    if (!form.duration)                       errs.duration      = 'Duration is required';
    else if (Number(form.duration) < 1)       errs.duration      = 'Duration must be at least 1 min';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const applicableFor =
      form.applicableFor === 'both' ? ['male', 'female'] : [form.applicableFor];

    // Only save photos that are owner-uploaded (not category defaults)
    let photos = (isCustomImage && imagePreview && !imagePreview.startsWith('blob:')) ? [imagePreview] : [];
    if (imageFile) {
      setImageUploading(true);
      try {
        const url = await uploadServicePhoto(imageFile);
        if (url) photos = [url];
      } catch { /* non-blocking — service saves without photo */ } finally {
        setImageUploading(false);
      }
    }

    await onSubmit({
      name:          form.name.trim(),
      description:   form.description.trim(),
      category:      form.category,
      applicableFor,
      basePrice:     Number(form.basePrice),
      duration:      Number(form.duration),
      photos,
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

        {/* Applicable For — only shown for unisex salons */}
        {servedGender === 'unisex' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Applicable For *</label>
            <div className="flex gap-2">
              {[['male', '👨 Men'], ['female', '👩 Women'], ['both', '👥 Both']].map(([val, label]) => (
                <button key={val} type="button"
                  onClick={() => {
                    setForm(p => ({ ...p, applicableFor: val }));
                    if (errors.applicableFor) setErrors(p => ({ ...p, applicableFor: '' }));
                  }}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition ${
                    form.applicableFor === val
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : errors.applicableFor
                      ? 'border-red-300 text-gray-600'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            {errors.applicableFor && <p className="mt-1 text-xs text-red-500">{errors.applicableFor}</p>}
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>

          {/* Trigger button */}
          <button
            type="button"
            disabled={loading}
            onClick={() => setCatOpen(o => !o)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition ${
              errors.category
                ? 'border-red-400 text-red-500'
                : form.category && form.category !== '__other__'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-400 hover:border-indigo-300'
            }`}
          >
            <span>
              {form.category && form.category !== '__other__'
                ? `${categoryOptions.find(o => o.label === form.category)?.icon ?? '✏️'} ${form.category}`
                : form.category === '__other__'
                ? '✏️ Other…'
                : 'Select category…'}
            </span>
            {catOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
          </button>

          {/* Expandable grid */}
          {catOpen && (
            <div className="mt-2 border border-gray-200 rounded-xl p-2 bg-gray-50 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {categoryOptions.map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setCustomCategory('');
                      setForm(p => ({ ...p, category: opt.label }));
                      if (errors.category) setErrors(p => ({ ...p, category: '' }));
                      setCatOpen(false);
                      if (!isCustomImage && !imageFile) {
                        setImagePreview(getCategoryDefaultImage(opt.label) || '');
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium text-left transition ${
                      form.category === opt.label
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                    }`}
                  >
                    <span className="text-lg shrink-0">{opt.icon}</span>
                    <span className="leading-tight">{opt.label}</span>
                  </button>
                ))}

                {/* Other option */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setForm(p => ({ ...p, category: '__other__' }));
                    if (errors.category) setErrors(p => ({ ...p, category: '' }));
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium text-left transition ${
                    form.category === '__other__' || (form.category && !categoryOptions.find(o => o.label === form.category))
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  <span className="text-lg shrink-0">✏️</span>
                  <span className="leading-tight">Other</span>
                </button>
              </div>

              {/* Custom category input shown when Other is selected */}
              {(form.category === '__other__' || (customCategory && !categoryOptions.find(o => o.label === form.category))) && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Type category name…"
                    disabled={loading}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={loading || !customCategory.trim()}
                    onClick={() => {
                      const val = customCategory.trim();
                      if (!val) return;
                      setForm(p => ({ ...p, category: val }));
                      if (errors.category) setErrors(p => ({ ...p, category: '' }));
                      setCatOpen(false);
                    }}
                    className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          )}

          {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
        </div>

        {/* Service Photo — shown right after category so default image appears immediately */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service Photo
            {!isCustomImage && imagePreview && <span className="ml-1.5 text-gray-400 font-normal text-xs">(category default)</span>}
            {isCustomImage && <span className="ml-1.5 text-indigo-500 font-normal text-xs">(custom)</span>}
          </label>
          {imagePreview ? (
            <div className="relative w-full rounded-lg overflow-hidden border border-gray-200" style={{ height: 144 }}>
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover"
                style={{ opacity: isCustomImage ? 1 : 0.75 }} />
              {/* Camera overlay to change photo */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || imageUploading}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.45)' }}
                title="Upload your own photo"
              >
                <span style={{ fontSize: 22 }}>📷</span>
                <span className="text-xs text-white font-medium">Change photo</span>
              </button>
              {isCustomImage && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={loading || imageUploading}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/80 transition"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 16, lineHeight: 1 }}
                  title="Remove custom photo"
                >×</button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || imageUploading}
              className="w-full flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition"
              style={{ height: 108, border: '2px dashed #d1d5db', borderRadius: 8 }}
            >
              <span style={{ fontSize: 26 }}>📷</span>
              <span className="text-sm">Upload a photo</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleImageChange}
            disabled={loading || imageUploading}
          />
          {imageUploading
            ? <p className="mt-1 text-xs text-indigo-500">Uploading photo…</p>
            : <p className="mt-1 text-xs text-gray-400">
                {isCustomImage ? 'Your custom photo will be shown to customers' : 'Select category to see default photo · hover to upload yours'}
              </p>
          }
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
          <button type="submit" disabled={loading || imageUploading}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition">
            {imageUploading ? 'Uploading…' : loading ? 'Saving…' : service ? 'Save Changes' : 'Add Service'}
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
