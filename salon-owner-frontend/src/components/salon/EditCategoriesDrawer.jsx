import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, Save, Users, AlertTriangle } from 'lucide-react';
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

const normalizeSubs = (subs, catLabel = null) => {
  const uniCat    = catLabel ? UNISEX_CATEGORIES.find(u => u.label === catLabel) : null;
  const maleSet   = uniCat ? new Set(uniCat.maleSubServices)   : new Set();
  const femaleSet = uniCat ? new Set(uniCat.femaleSubServices) : new Set();

  return (subs || []).map(s => {
    if (typeof s === 'string') return { name: s, price: '', duration: '' };

    let genderContext = null;
    if (s.applicableFor?.length === 1) {
      genderContext = s.applicableFor[0];
    } else if (!s.applicableFor || s.applicableFor.length === 0) {
      const inMale   = maleSet.has(s.name);
      const inFemale = femaleSet.has(s.name);
      if (inMale && !inFemale)      genderContext = 'male';
      else if (inFemale && !inMale) genderContext = 'female';
    }

    return {
      name: s.name,
      price: s.price ?? '',
      duration: s.duration ?? '',
      genderContext,
      ...(s.applicableFor ? { applicableFor: s.applicableFor } : {}),
    };
  });
};

const buildSelections = (catList, offeredCategories) =>
  catList.reduce((acc, cat) => {
    const found = (offeredCategories || []).find(c => c.name === cat.label);
    acc[cat.key] = { enabled: !!found, subServices: normalizeSubs(found?.subServices, cat.label) };
    return acc;
  }, {});

const EMPTY_MODAL = { open: false, catKey: '', subName: '', price: '', duration: '', genderContext: null };

const EditCategoriesDrawer = ({ isOpen, onClose, onOpen, salon, updateSalon }) => {
  const [gender,         setGender]       = useState(salon?.servedGender || '');
  const [genderOpen,     setGenderOpen]   = useState(false);
  const [pendingGender,  setPendingGender] = useState(null);
  const [loading,        setLoading]      = useState(false);
  const [expandedKey,    setExpandedKey]  = useState(null);
  const [priceModal,  setPriceModal]  = useState(EMPTY_MODAL);
  const priceRef    = useRef(null);
  const durationRef = useRef(null);

  const [maleSelections,   setMaleSelections]   = useState(() => buildSelections(MALE_CATEGORIES,   salon?.offeredCategories));
  const [femaleSelections, setFemaleSelections] = useState(() => buildSelections(FEMALE_CATEGORIES, salon?.offeredCategories));
  const [unisexSelections, setUnisexSelections] = useState(() => buildSelections(UNISEX_CATEGORIES, salon?.offeredCategories));
  const [maleOptionals,    setMaleOptionals]    = useState({ kidsHaircut: salon?.kidsHaircut || false, atHomeServices: salon?.atHomeServices || false });
  const [femaleOptionals,  setFemaleOptionals]  = useState({ kidsServices: salon?.kidsHaircut || false, atHomeServices: salon?.atHomeServices || false });

  // Fetch fresh salon data every time the drawer opens
  useEffect(() => {
    if (isOpen && onOpen) onOpen();
  }, [isOpen]);

  // Sync with latest salon data when drawer opens OR when salon data arrives
  useEffect(() => {
    if (!isOpen || !salon) return;
    setGender(salon.servedGender || '');
    setMaleSelections(buildSelections(MALE_CATEGORIES,   salon.offeredCategories));
    setFemaleSelections(buildSelections(FEMALE_CATEGORIES, salon.offeredCategories));
    setUnisexSelections(buildSelections(UNISEX_CATEGORIES, salon.offeredCategories));
    setMaleOptionals({ kidsHaircut: salon.kidsHaircut || false, atHomeServices: salon.atHomeServices || false });
    setFemaleOptionals({ kidsServices: salon.kidsHaircut || false, atHomeServices: salon.atHomeServices || false });
    setExpandedKey(null);
    setGenderOpen(false);
    setPendingGender(null);
    setPriceModal(EMPTY_MODAL);
  }, [isOpen, salon]);

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

  const getSels = () =>
    gender === 'male' ? maleSelections : gender === 'female' ? femaleSelections : unisexSelections;
  const setSels = (update) => {
    if (gender === 'male')        setMaleSelections(update);
    else if (gender === 'female') setFemaleSelections(update);
    else                          setUnisexSelections(update);
  };

  const toggleSub = (catKey, sub, genderContext = null) => {
    const subs = getSels()[catKey].subServices;
    const exists = genderContext
      ? subs.find(s => s.name === sub && s.genderContext === genderContext)
      : subs.find(s => s.name === sub);
    if (exists) {
      setSels(prev => ({
        ...prev,
        [catKey]: {
          ...prev[catKey],
          subServices: genderContext
            ? subs.filter(s => !(s.name === sub && s.genderContext === genderContext))
            : subs.filter(s => s.name !== sub),
        },
      }));
    } else {
      setPriceModal({ open: true, catKey, subName: sub, price: '', duration: '', genderContext });
      setTimeout(() => priceRef.current?.focus(), 50);
    }
  };

  const confirmSubPrice = () => {
    const { catKey, subName, price, duration, genderContext } = priceModal;
    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      priceRef.current?.focus();
      return;
    }
    if (!duration || parseInt(duration) <= 0) {
      toast.error('Please enter a valid duration');
      durationRef.current?.focus();
      return;
    }
    const applicableFor = genderContext === 'male' ? ['male'] : genderContext === 'female' ? ['female'] : null;
    setSels(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        subServices: [
          ...prev[catKey].subServices,
          { name: subName, price, duration, genderContext, ...(applicableFor ? { applicableFor } : {}) },
        ],
      },
    }));
    setPriceModal(EMPTY_MODAL);
  };

  const handleSave = async () => {
    if (!gender) { toast.error('Please select a gender'); return; }
    let offeredCategories = [];
    let kidsHaircut = false;
    let atHomeServices = false;

    const toPayload = (subs) => subs.map(s => ({
      name:     s.name,
      price:    parseFloat(s.price)    || 0,
      duration: parseInt(s.duration)   || 0,
      ...(s.applicableFor ? { applicableFor: s.applicableFor } : {}),
    }));

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
            <h2 className="text-lg font-bold text-gray-900">Service Menu</h2>
            <p className="text-xs text-gray-500 mt-0.5">Configure categories, services &amp; pricing</p>
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
            {/* Trigger button */}
            <button
              type="button"
              onClick={() => setGenderOpen(o => !o)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition ${
                gender
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500 shrink-0" />
                {gender ? (
                  <span className="text-sm font-semibold text-blue-700">
                    {gender === 'male' ? '👨 Male' : gender === 'female' ? '👩 Female' : '👥 Unisex'}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-gray-500">Who do you serve?</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {gender && (
                  <span className="text-xs text-blue-500 font-medium">Change</span>
                )}
                {genderOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {/* Expandable options */}
            {genderOpen && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[['male','👨','Male'],['female','👩','Female'],['unisex','👥','Unisex']].map(([val, emoji, label]) => (
                  <button key={val} type="button"
                    onClick={() => {
                      if (val === gender) { setGenderOpen(false); return; }
                      // check if current gender has any enabled categories
                      const currentSels = gender === 'male' ? maleSelections : gender === 'female' ? femaleSelections : unisexSelections;
                      const hasData = Object.values(currentSels).some(s => s.enabled);
                      if (hasData) {
                        setPendingGender(val);
                      } else {
                        setGender(val); setExpandedKey(null); setGenderOpen(false);
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border-2 font-medium text-sm transition ${
                      gender === val
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                    }`}>
                    <span className="text-xl">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
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
                        <p className="text-xs text-gray-400 mb-2">Tap to select · enter price &amp; duration</p>

                        {/* Unisex gender-split chips */}
                        {gender === 'unisex' && cat.maleSubServices ? (
                          <div className="space-y-3">
                            {cat.maleSubServices.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1">👨 Men</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {cat.maleSubServices.map(sub => {
                                    const active = sel.subServices.find(s => s.name === sub && s.genderContext === 'male');
                                    return (
                                      <button key={sub} type="button" onClick={() => toggleSub(cat.key, sub, 'male')}
                                        className={`text-xs px-2.5 py-1 rounded-full border transition ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                                        {sub}{active && active.price > 0 && <span className="ml-1 opacity-80">₹{active.price}</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {cat.femaleSubServices.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-pink-600 mb-1.5 flex items-center gap-1">👩 Women</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {cat.femaleSubServices.map(sub => {
                                    const active = sel.subServices.find(s => s.name === sub && s.genderContext === 'female');
                                    return (
                                      <button key={sub} type="button" onClick={() => toggleSub(cat.key, sub, 'female')}
                                        className={`text-xs px-2.5 py-1 rounded-full border transition ${active ? 'bg-pink-500 text-white border-pink-500' : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                                        {sub}{active && active.price > 0 && <span className="ml-1 opacity-80">₹{active.price}</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Single-gender chips (male / female / no-split unisex) */
                          <div className="flex flex-wrap gap-1.5">
                            {cat.subServices.map(sub => {
                              const active = sel.subServices.find(s => s.name === sub);
                              return (
                                <button key={sub} type="button" onClick={() => toggleSub(cat.key, sub)}
                                  className={`text-xs px-2.5 py-1 rounded-full border transition ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                                  {sub}{active && active.price > 0 && <span className="ml-1 opacity-80">₹{active.price}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {sel.subServices.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 font-medium mb-1">Selected:</p>
                            <div className="space-y-1">
                              {sel.subServices.map((s, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                  {s.genderContext && (
                                    <span className="shrink-0">{s.genderContext === 'male' ? '👨' : '👩'}</span>
                                  )}
                                  <span className="flex-1 truncate">{s.name}</span>
                                  <span className="text-blue-600 font-medium shrink-0">₹{s.price}</span>
                                  <span className="text-gray-400 shrink-0">{s.duration} min</span>
                                </div>
                              ))}
                            </div>
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
            <Save className="w-4 h-4" /> Save Menu
          </Button>
        </div>
      </div>

      {/* Gender change confirmation */}
      {pendingGender && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPendingGender(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Change customer type?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  You have categories configured for{' '}
                  <span className="font-semibold text-gray-700 capitalize">{gender}</span> customers.
                  Switching to{' '}
                  <span className="font-semibold text-gray-700 capitalize">{pendingGender}</span> will
                  replace all saved categories when you save.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingGender(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Keep Current
              </button>
              <button
                type="button"
                onClick={() => {
                  setGender(pendingGender);
                  setExpandedKey(null);
                  setGenderOpen(false);
                  setPendingGender(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition"
              >
                Yes, Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price + Duration modal */}
      {priceModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPriceModal(EMPTY_MODAL)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Set Price &amp; Duration</h3>
              <p className="text-sm text-gray-500 mt-0.5 font-medium">{priceModal.subName}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Price (₹) *</label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-500">
                  <span className="px-3 text-gray-400 text-sm bg-gray-50 border-r border-gray-300 py-2">₹</span>
                  <input
                    ref={priceRef}
                    type="number"
                    min="1"
                    placeholder="e.g. 250"
                    value={priceModal.price}
                    onChange={e => setPriceModal(p => ({ ...p, price: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && durationRef.current?.focus()}
                    className="flex-1 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Duration (minutes) *</label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-500">
                  <span className="px-3 text-gray-400 text-sm bg-gray-50 border-r border-gray-300 py-2">min</span>
                  <input
                    ref={durationRef}
                    type="number"
                    min="1"
                    placeholder="e.g. 30"
                    value={priceModal.duration}
                    onChange={e => setPriceModal(p => ({ ...p, duration: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && confirmSubPrice()}
                    className="flex-1 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPriceModal(EMPTY_MODAL)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSubPrice}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditCategoriesDrawer;
