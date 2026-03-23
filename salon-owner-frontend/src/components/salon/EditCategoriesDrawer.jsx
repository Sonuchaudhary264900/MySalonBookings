import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import {
  MALE_CATEGORIES, MALE_OPTIONALS,
  FEMALE_CATEGORIES, FEMALE_OPTIONALS,
  UNISEX_CATEGORIES,
} from '../../constants/salonCategories';

const Toggle = ({ name, checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer shrink-0">
    <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only peer" />
    <div className="w-11 h-6 bg-gray-200 rounded-full peer
      peer-checked:bg-blue-600
      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
      after:bg-white after:border after:border-gray-300 after:rounded-full
      after:h-5 after:w-5 after:transition-all
      peer-checked:after:translate-x-full peer-checked:after:border-white" />
  </label>
);

const normalizeSubs = (subs) =>
  (subs || []).map(s =>
    typeof s === 'string' ? { name: s, price: '' } : { name: s.name, price: s.price ?? '' }
  );

const buildSelections = (catList, offeredCategories) =>
  catList.reduce((acc, cat) => {
    const found = (offeredCategories || []).find(c => c.name === cat.label);
    acc[cat.key] = { enabled: !!found, subServices: normalizeSubs(found?.subServices) };
    return acc;
  }, {});

const EditCategoriesDrawer = ({ isOpen, onClose, salon, updateSalon }) => {
  const [gender,      setGender]      = useState(salon?.servedGender || '');
  const [loading,     setLoading]     = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);

  const [maleSelections,   setMaleSelections]   = useState(() => buildSelections(MALE_CATEGORIES,   salon?.offeredCategories));
  const [femaleSelections, setFemaleSelections] = useState(() => buildSelections(FEMALE_CATEGORIES, salon?.offeredCategories));
  const [unisexSelections, setUnisexSelections] = useState(() => buildSelections(UNISEX_CATEGORIES, salon?.offeredCategories));
  const [maleOptionals,    setMaleOptionals]    = useState({ kidsHaircut: salon?.kidsHaircut || false, atHomeServices: salon?.atHomeServices || false });
  const [femaleOptionals,  setFemaleOptionals]  = useState({ kidsServices: salon?.kidsHaircut || false, atHomeServices: salon?.atHomeServices || false });

  // Sync with latest salon data when drawer opens
  useEffect(() => {
    if (!isOpen || !salon) return;
    setGender(salon.servedGender || '');
    setMaleSelections(buildSelections(MALE_CATEGORIES,   salon.offeredCategories));
    setFemaleSelections(buildSelections(FEMALE_CATEGORIES, salon.offeredCategories));
    setUnisexSelections(buildSelections(UNISEX_CATEGORIES, salon.offeredCategories));
    setMaleOptionals({ kidsHaircut: salon.kidsHaircut || false, atHomeServices: salon.atHomeServices || false });
    setFemaleOptionals({ kidsServices: salon.kidsHaircut || false, atHomeServices: salon.atHomeServices || false });
    setExpandedKey(null);
  }, [isOpen]);

  const toggleCat = (key) => {
    const update = (prev) => {
      const enabling = !prev[key].enabled;
      if (enabling) setExpandedKey(key);
      return { ...prev, [key]: { ...prev[key], enabled: enabling } };
    };
    if (gender === 'male')        setMaleSelections(update);
    else if (gender === 'female') setFemaleSelections(update);
    else                          setUnisexSelections(update);
  };

  const toggleSub = (catKey, sub) => {
    const update = (prev) => {
      const subs = prev[catKey].subServices;
      const exists = subs.find(s => s.name === sub);
      const next = exists ? subs.filter(s => s.name !== sub) : [...subs, { name: sub, price: '' }];
      return { ...prev, [catKey]: { ...prev[catKey], subServices: next } };
    };
    if (gender === 'male')        setMaleSelections(update);
    else if (gender === 'female') setFemaleSelections(update);
    else                          setUnisexSelections(update);
  };

  const updateSubPrice = (catKey, subName, price) => {
    const update = (prev) => {
      const updated = prev[catKey].subServices.map(s =>
        s.name === subName ? { ...s, price } : s
      );
      return { ...prev, [catKey]: { ...prev[catKey], subServices: updated } };
    };
    if (gender === 'male')        setMaleSelections(update);
    else if (gender === 'female') setFemaleSelections(update);
    else                          setUnisexSelections(update);
  };

  const handleSave = async () => {
    if (!gender) { toast.error('Please select a gender'); return; }
    let offeredCategories = [];
    let kidsHaircut = false;
    let atHomeServices = false;

    const toPayload = (subs) => subs.map(s => ({ name: s.name, price: parseFloat(s.price) || 0 }));

    if (gender === 'male') {
      offeredCategories = MALE_CATEGORIES.filter(c => maleSelections[c.key].enabled)
        .map(c => ({ name: c.label, subServices: toPayload(maleSelections[c.key].subServices) }));
      kidsHaircut    = maleOptionals.kidsHaircut;
      atHomeServices = maleOptionals.atHomeServices;
    } else if (gender === 'female') {
      offeredCategories = FEMALE_CATEGORIES.filter(c => femaleSelections[c.key].enabled)
        .map(c => ({ name: c.label, subServices: toPayload(femaleSelections[c.key].subServices) }));
      kidsHaircut    = femaleOptionals.kidsServices;
      atHomeServices = femaleOptionals.atHomeServices;
    } else {
      offeredCategories = UNISEX_CATEGORIES.filter(c => unisexSelections[c.key].enabled)
        .map(c => ({ name: c.label, subServices: toPayload(unisexSelections[c.key].subServices) }));
      kidsHaircut    = unisexSelections['kids_services_unisex']?.enabled || false;
      atHomeServices = unisexSelections['at_home_services_unisex']?.enabled || false;
    }

    if (!offeredCategories.length) { toast.error('Please select at least one category'); return; }

    setLoading(true);
    try {
      await updateSalon({ servedGender: gender, offeredCategories, kidsHaircut, atHomeServices });
      toast.success('Service categories updated!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update categories');
    } finally { setLoading(false); }
  };

  const currentCats = gender === 'male' ? MALE_CATEGORIES
    : gender === 'female' ? FEMALE_CATEGORIES
    : gender === 'unisex' ? UNISEX_CATEGORIES : [];

  const currentSels = gender === 'male' ? maleSelections
    : gender === 'female' ? femaleSelections
    : gender === 'unisex' ? unisexSelections : {};

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Service Categories</h2>
            <p className="text-xs text-gray-500 mt-0.5">Toggle categories and select sub-services</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Gender selector */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Who do you serve?</p>
            <div className="grid grid-cols-3 gap-2">
              {[['male','👨','Male'],['female','👩','Female'],['unisex','👥','Unisex']].map(([val, emoji, label]) => (
                <button key={val} type="button"
                  onClick={() => { setGender(val); setExpandedKey(null); }}
                  className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg border-2 font-medium text-sm transition ${
                    gender === val
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300'
                  }`}>
                  <span className="text-xl">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Category list */}
          {gender && currentCats.length > 0 && (
            <div className="space-y-2">
              {currentCats.map(cat => {
                const sel = currentSels[cat.key] || { enabled: false, subServices: [] };
                const isExpanded = expandedKey === cat.key && sel.enabled;
                return (
                  <div key={cat.key} className={`rounded-xl border-2 overflow-hidden transition-all ${sel.enabled ? 'border-blue-200' : 'border-gray-200'}`}>
                    <div className={`flex items-center gap-3 px-4 py-3 ${sel.enabled ? 'bg-blue-50' : 'bg-white'}`}>
                      <span className="text-lg">{cat.icon}</span>
                      <span className="flex-1 text-sm font-medium text-gray-800">{cat.label}</span>
                      {sel.enabled && (
                        <button type="button"
                          onClick={() => setExpandedKey(isExpanded ? null : cat.key)}
                          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mr-1">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {sel.subServices.length}
                        </button>
                      )}
                      <Toggle name={cat.key} checked={sel.enabled} onChange={() => toggleCat(cat.key)} />
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-2 border-t border-blue-100 bg-white">
                        <p className="text-xs text-gray-400 mb-2">Tap to select · set price below</p>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.subServices.map(sub => {
                            const active = sel.subServices.find(s => s.name === sub);
                            return (
                              <button key={sub} type="button" onClick={() => toggleSub(cat.key, sub)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                                  active
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                                }`}>
                                {sub}
                              </button>
                            );
                          })}
                        </div>
                        {sel.subServices.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                            <p className="text-xs text-gray-500 font-medium">Prices (₹):</p>
                            {sel.subServices.map(s => (
                              <div key={s.name} className="flex items-center gap-2">
                                <span className="flex-1 text-xs text-gray-700 truncate">{s.name}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-xs text-gray-400">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={s.price}
                                    onChange={e => updateSubPrice(cat.key, s.name, e.target.value)}
                                    className="w-20 text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Optional add-ons */}
              {gender === 'male' && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Optional Add-ons</p>
                  {MALE_OPTIONALS.map(opt => (
                    <div key={opt.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                        <span>{opt.icon}</span> {opt.label}
                      </div>
                      <Toggle name={opt.key} checked={maleOptionals[opt.key]}
                        onChange={e => setMaleOptionals(p => ({ ...p, [opt.key]: e.target.checked }))} />
                    </div>
                  ))}
                </div>
              )}
              {gender === 'female' && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Optional Add-ons</p>
                  {FEMALE_OPTIONALS.map(opt => (
                    <div key={opt.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                        <span>{opt.icon}</span> {opt.label}
                      </div>
                      <Toggle name={opt.key} checked={femaleOptionals[opt.key]}
                        onChange={e => setFemaleOptionals(p => ({ ...p, [opt.key]: e.target.checked }))} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="px-5 py-4 border-t border-gray-200 shrink-0">
          <Button variant="primary" onClick={handleSave} loading={loading} disabled={loading || !gender} fullWidth>
            <Save className="w-4 h-4" /> Save Categories
          </Button>
        </div>
      </div>
    </>
  );
};

export default EditCategoriesDrawer;
