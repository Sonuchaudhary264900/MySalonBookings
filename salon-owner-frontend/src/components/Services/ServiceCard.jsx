import React, { useState, useRef, useEffect } from 'react';
import { Clock, MoreVertical, Edit2, Trash2, Power } from 'lucide-react';
import { getServiceImage } from '../../constants/salonCategories';

const ServiceCard = ({ service, onEdit, onDelete, onToggle, loading = false }) => {
  const isActive      = service.isActive !== false;
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const handleToggleClick = (e) => {
    e.stopPropagation();
    if (isActive) setShowConfirm(true);
    else onToggle(service._id || service.id, true);
  };

  const imgSrc   = getServiceImage(service);
  const price    = service.basePrice ?? service.price;
  const isPopular = service.isPopular || service.popular;

  return (
    <>
      <div className={`relative rounded-2xl overflow-hidden flex flex-col
        bg-[#16162a] border transition-all duration-200
        hover:shadow-xl hover:shadow-indigo-900/30 hover:-translate-y-0.5
        ${isActive ? 'border-white/[0.07]' : 'border-white/[0.04] opacity-55'}`}>

        {/* ── Image ── */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={service.name}
              className="w-full h-full object-cover"
              style={{ opacity: 0, transition: 'opacity .18s' }}
              onLoad={e  => { e.currentTarget.style.opacity = '1'; }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center
              bg-gradient-to-br from-indigo-900/50 to-violet-900/50">
              <span className="text-4xl opacity-30">✂</span>
            </div>
          )}

          {/* bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-1/3
            bg-gradient-to-t from-[#16162a]/80 to-transparent pointer-events-none" />

          {/* POPULAR badge */}
          {isPopular && (
            <span className="absolute top-2 left-2 text-[10px] font-extrabold tracking-widest
              px-2 py-0.5 rounded bg-emerald-500 text-white shadow z-10">
              POPULAR
            </span>
          )}

          {/* ⋮ menu */}
          <div className="absolute top-2 right-2 z-10" ref={menuRef}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
              disabled={loading}
              className="w-7 h-7 rounded-full flex items-center justify-center
                bg-black/40 hover:bg-black/70 text-white transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-9 z-30 min-w-[130px]
                bg-[#1e1e36] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); onEdit(service); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                    text-gray-200 hover:bg-indigo-600/20 hover:text-indigo-300 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setShowDelete(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                    text-gray-200 hover:bg-red-600/20 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>

          {/* Inactive overlay */}
          {!isActive && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full
                bg-gray-900/90 text-gray-400 border border-white/10">Inactive</span>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="px-3 pt-2.5 pb-3 flex flex-col gap-1">

          {/* Name */}
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-1">
            {service.name}
          </h3>

          {/* Price */}
          <p className="text-sm font-bold text-violet-400">
            ₹{price ?? '—'}
          </p>

          {/* Duration + Toggle */}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            {service.duration ? (
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Clock className="w-3 h-3 shrink-0" />
                {service.duration} min
              </span>
            ) : (
              <span />
            )}

            {onToggle && (
              <button
                onClick={handleToggleClick}
                disabled={loading}
                title={isActive ? 'Deactivate' : 'Activate'}
                className={`relative shrink-0 w-10 h-5 rounded-full transition-all duration-300
                  focus:outline-none disabled:opacity-40 cursor-pointer
                  ${isActive ? 'bg-indigo-500' : 'bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow
                  transition-transform duration-300
                  ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          icon={<Power className="w-5 h-5 text-amber-500" />}
          iconBg="bg-amber-100 dark:bg-amber-950"
          title="Disable Service?"
          body={<><span className="font-semibold text-gray-800 dark:text-gray-200">"{service.name}"</span> will be hidden from customers.</>}
          confirmLabel="Yes, Disable"
          confirmCls="bg-amber-500 hover:bg-amber-600 text-white"
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => { setShowConfirm(false); onToggle(service._id || service.id, false); }}
        />
      )}

      {showDelete && (
        <ConfirmModal
          icon={<Trash2 className="w-5 h-5 text-red-500" />}
          iconBg="bg-red-100 dark:bg-red-950"
          title="Delete Service?"
          body={<><span className="font-semibold text-gray-800 dark:text-gray-200">"{service.name}"</span> will be permanently removed.</>}
          confirmLabel="Delete Forever"
          confirmCls="bg-red-600 hover:bg-red-700 text-white"
          onCancel={() => setShowDelete(false)}
          onConfirm={() => { setShowDelete(false); onDelete(service._id || service.id); }}
        />
      )}
    </>
  );
};

const ConfirmModal = ({ icon, iconBg, title, body, confirmLabel, confirmCls, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
      rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{body}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
            text-sm font-medium text-gray-600 dark:text-gray-300
            hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
        <button onClick={onConfirm}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${confirmCls}`}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ServiceCard;
