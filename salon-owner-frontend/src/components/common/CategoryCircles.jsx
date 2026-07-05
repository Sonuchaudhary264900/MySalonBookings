import React from 'react';
import { createPortal } from 'react-dom';
import { LayoutGrid, Camera, Loader2, Pencil } from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import { CATEGORY_CARD_IMAGE_MAP, SUBCATEGORY_IMAGE_MAP } from '../../constants/salonCategories';

// adminCatalogMap: { categoryImages: { 'Hair Services (Men)': url }, serviceImages: { 'Haircut': url } }
export const getCatImg = (label, salon, adminCatalogMap) => {
  const saved = salon?.categoryImages;
  if (saved) {
    const custom = saved instanceof Map ? saved.get(label) : saved[label];
    if (custom) return custom;
  }
  if (adminCatalogMap?.categoryImages?.[label]) return adminCatalogMap.categoryImages[label];
  return CATEGORY_CARD_IMAGE_MAP[label] || null;
};

export const getSubImg = (catLabel, subLabel, salon, services, adminCatalogMap) => {
  const key = `${catLabel}::${subLabel}`;
  const saved = salon?.categoryImages;
  if (saved) {
    const custom = saved instanceof Map ? saved.get(key) : saved[key];
    if (custom) return custom;
  }
  // Admin-uploaded subcategory image
  if (adminCatalogMap?.subCategoryImages?.[subLabel]) return adminCatalogMap.subCategoryImages[subLabel];
  // First service photo in this subcategory
  const svc = services?.find(s => s.photo || s.photos?.[0]);
  if (svc?.photo) return svc.photo;
  if (svc?.photos?.[0]) return svc.photos[0];
  // Admin service defaultImage
  if (adminCatalogMap?.serviceImages?.[subLabel]) return adminCatalogMap.serviceImages[subLabel];
  // Static fallback map
  return SUBCATEGORY_IMAGE_MAP[subLabel] || null;
};

export const CircleButton = ({ label, imgSrc, isSelected, isUploading, onSelect, onImageChange, showEdit, isAll, btnRef }) => {
  const [pressed,       setPressed]       = React.useState(false);
  const [hovered,       setHovered]       = React.useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = React.useState(false);
  const [popupPos,      setPopupPos]      = React.useState(null);
  const selfRef       = React.useRef(null);
  const portalRef     = React.useRef(null);
  const timerRef      = React.useRef(null);
  const longFiredRef  = React.useRef(false);
  const touchOrigin   = React.useRef({ x: 0, y: 0 });
  const fileInputRef  = React.useRef(null);
  const penInputRef   = React.useRef(null);

  const setRef = React.useCallback(el => {
    selfRef.current = el;
    if (typeof btnRef === 'function') btnRef(el);
  }, [btnRef]);

  const clearTimer = () => clearTimeout(timerRef.current);

  const startPress = (e) => {
    longFiredRef.current = false;
    setPressed(true);
    if (e.touches) {
      touchOrigin.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (!showEdit || !onImageChange || isAll) return;
    timerRef.current = setTimeout(() => {
      longFiredRef.current = true;
      setPressed(false);
      if (selfRef.current) {
        const r = selfRef.current.getBoundingClientRect();
        setPopupPos({ x: r.left + r.width / 2, y: r.bottom + 8 });
      }
      setShowPhotoMenu(true);
    }, 600);
  };

  const handleTouchMove = (e) => {
    const dx = Math.abs(e.touches[0].clientX - touchOrigin.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchOrigin.current.y);
    if (dx > 10 || dy > 10) { clearTimer(); setPressed(false); }
  };

  const endPress = () => { clearTimer(); setPressed(false); };

  const handleClick = () => {
    if (longFiredRef.current) { longFiredRef.current = false; return; }
    onSelect();
    requestAnimationFrame(() => {
      selfRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  };

  React.useEffect(() => {
    if (!showPhotoMenu) return;
    let id;
    const close = (e) => {
      if (!selfRef.current?.contains(e.target) && !portalRef.current?.contains(e.target)) {
        setShowPhotoMenu(false);
        setPopupPos(null);
      }
    };
    id = setTimeout(() => {
      document.addEventListener('mousedown', close);
      document.addEventListener('touchstart', close);
    }, 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [showPhotoMenu]);

  const getTransform = () => {
    if (isSelected) return 'translateY(-6px) scale(1.05)';
    if (pressed)    return 'scale(0.95)';
    if (hovered)    return 'scale(1.03)';
    return 'translateY(0px) scale(1)';
  };

  const [imgBroken, setImgBroken] = React.useState(false);
  const showImg = !isAll && !!imgSrc && !imgBroken;

  const circleStyle = {
    width: 68, height: 68, borderRadius: '50%', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    position: 'relative',
    background: showImg ? '#111' : isSelected
      ? 'linear-gradient(145deg,#818cf8 0%,#6366f1 40%,#4f46e5 100%)'
      : 'rgba(26,26,46,0.9)',
    boxShadow: isSelected
      ? '0 0 0 3px #818cf8, 0 0 0 6px rgba(99,102,241,0.28), 0 8px 24px rgba(99,102,241,0.45)'
      : '0 0 0 1.5px rgba(255,255,255,0.09)',
    transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
  };

  const showPen = !isAll && showEdit && onImageChange;

  return (
    <div
      ref={setRef}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        cursor: 'pointer', flexShrink: 0, padding: '0 8px',
        overflow: 'visible',
        opacity: isSelected || hovered ? 1 : 0.65,
        transform: getTransform(),
        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); endPress(); }}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchMove={handleTouchMove}
      onContextMenu={e => e.preventDefault()}
    >
      <div style={{ position: 'relative' }}>
        <div style={circleStyle}>
          {isAll ? (
            <LayoutGrid style={{ width: 27, height: 27, color: '#fff' }} />
          ) : showImg ? (
            <img
              src={imgSrc} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={() => setImgBroken(true)}
            />
          ) : (
            <div style={{ color: isSelected ? '#fff' : '#6366f1', display: 'flex' }}>
              <CategoryIcon label={label} className="w-[27px] h-[27px]" />
            </div>
          )}
          {isUploading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 style={{ width: 20, height: 20, color: '#fff' }} className="animate-spin" />
            </div>
          )}
        </div>

        {/* pen badge — click to add/change photo (discoverable) */}
        {showPen && !isUploading && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); penInputRef.current?.click(); }}
            title="Change photo"
            style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 24, height: 24, borderRadius: '50%',
              background: 'linear-gradient(135deg,#818cf8,#6366f1)',
              border: '2px solid #0b0b18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.5)',
              padding: 0,
            }}
          >
            <Pencil style={{ width: 12, height: 12, color: '#fff' }} />
            <input
              ref={penInputRef}
              type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageChange(label, f); e.target.value = ''; }}
            />
          </button>
        )}
      </div>

      <div style={{
        width: 20, height: 3, borderRadius: 999,
        background: isSelected ? 'linear-gradient(90deg,#818cf8,#6366f1)' : 'transparent',
        boxShadow: isSelected ? '0 0 8px rgba(99,102,241,0.8)' : 'none',
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        marginTop: -2,
      }} />

      <span style={{
        fontSize: 11.5, fontWeight: isSelected ? 700 : 500,
        whiteSpace: 'nowrap', maxWidth: 88, textAlign: 'center',
        overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
        color: isSelected ? '#fff' : 'rgba(156,163,175,1)',
        transition: 'color 0.22s ease',
      }}>
        {label}
      </span>

      {showPhotoMenu && showEdit && onImageChange && popupPos && createPortal(
        <div
          ref={portalRef}
          style={{
            position: 'fixed', top: popupPos.y, left: popupPos.x,
            transform: 'translateX(-50%)',
            zIndex: 9999, minWidth: 140,
            background: '#1e1e36',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            overflow: 'hidden',
            animation: 'scaleIn 0.15s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
          onClick={e => e.stopPropagation()}
        >
          <style>{`@keyframes scaleIn{from{opacity:0;transform:translateX(-50%) scale(0.85)}to{opacity:1;transform:translateX(-50%) scale(1)}}`}</style>
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', cursor: 'pointer',
              color: '#e0e0ff', fontSize: 13, fontWeight: 600,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Camera style={{ width: 14, height: 14, color: '#818cf8', flexShrink: 0 }} />
            Change photo
            <input
              ref={fileInputRef}
              type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) onImageChange(label, f);
                e.target.value = '';
                setShowPhotoMenu(false);
                setPopupPos(null);
              }}
            />
          </label>
        </div>,
        document.body
      )}
    </div>
  );
};

export const CategoryNav = ({ categories, selectedCatLabel, onSelect, salon, onImageChange, uploadingMap = {}, catRefs, scrollRef, adminCatalogMap }) => (
  <>
    <style>{`
      @keyframes fadeSlideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
      .cat-scroll-owner::-webkit-scrollbar{display:none}
    `}</style>
    <div
      ref={scrollRef}
      className="cat-scroll-owner"
      style={{
        display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
        overflowX: 'auto', overflowY: 'visible',
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        paddingTop: 18, paddingBottom: 8,
      }}
    >
      <CircleButton
        label="All"
        isAll
        isSelected={!selectedCatLabel}
        onSelect={() => onSelect(null)}
        showEdit={false}
        btnRef={el => { if (catRefs) catRefs.current['__all__'] = el; }}
      />
      {categories.map(label => (
        <CircleButton
          key={label}
          label={label}
          imgSrc={getCatImg(label, salon, adminCatalogMap)}
          isSelected={selectedCatLabel === label}
          isUploading={!!uploadingMap[label]}
          onSelect={() => onSelect(label)}
          onImageChange={onImageChange}
          showEdit={!!onImageChange}
          btnRef={el => { if (catRefs) catRefs.current[label] = el; }}
        />
      ))}
    </div>
  </>
);

export const SubcategoryRow = ({ catLabel, subs, selectedSubLabel, onSelect, salon, services, onImageChange, uploadingMap = {}, adminCatalogMap }) => (
  <div
    className="cat-scroll-owner"
    style={{
      display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
      overflowX: 'auto', overflowY: 'visible',
      scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      paddingTop: 10, paddingBottom: 4,
      animation: 'fadeSlideDown 0.22s ease both',
    }}
  >
    <CircleButton
      label="All"
      imgSrc={getCatImg(catLabel, salon, adminCatalogMap)}
      isSelected={!selectedSubLabel}
      onSelect={() => onSelect(null)}
      showEdit={false}
    />
    {subs.map(sub => {
      const key = `${catLabel}::${sub}`;
      return (
        <CircleButton
          key={sub}
          label={sub}
          imgSrc={getSubImg(catLabel, sub, salon, services, adminCatalogMap)}
          isSelected={selectedSubLabel === sub}
          isUploading={!!uploadingMap[key]}
          onSelect={() => onSelect(sub)}
          showEdit={!!onImageChange}
          onImageChange={onImageChange ? (_, file) => onImageChange(key, file) : undefined}
        />
      );
    })}
  </div>
);
