import { useState, useRef, useCallback } from 'react';
import { LayoutGrid } from 'lucide-react';
import { CATEGORY_CARD_IMAGE_MAP } from '../constants/salonCategories';

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
  // Use dedicated subcategory image (distinct from service card image)
  if (adminCatalogMap?.subCategoryImages?.[subLabel]) return adminCatalogMap.subCategoryImages[subLabel];
  return null;
};

const CircleBtn = ({ label, imgSrc, isSelected, isAll, onSelect, accentColor, IconComponent }) => {
  const [pressed, setPressed]     = useState(false);
  const [hovered, setHovered]     = useState(false);
  const [imgBroken, setImgBroken] = useState(false);
  const ref = useRef(null);

  const showImg = !isAll && !!imgSrc && !imgBroken;
  const accent  = accentColor || '#7c3aed';

  const getTransform = () => {
    if (isSelected) return 'translateY(-6px) scale(1.05)';
    if (pressed)    return 'scale(0.95)';
    if (hovered)    return 'scale(1.03)';
    return 'translateY(0px) scale(1)';
  };

  const handleClick = useCallback(() => {
    onSelect();
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [onSelect]);

  return (
    <div
      ref={ref}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        cursor: 'pointer', flexShrink: 0, padding: '0 8px',
        overflow: 'visible',
        opacity: isSelected || hovered ? 1 : 0.65,
        transform: getTransform(),
        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
    >
      {/* Circle */}
      <div style={{
        width: 54, height: 54, borderRadius: '50%', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        background: showImg ? '#111' : isSelected
          ? `linear-gradient(145deg,${accent}bb 0%,${accent} 100%)`
          : 'rgba(26,26,46,0.9)',
        boxShadow: isSelected
          ? `0 0 0 3px ${accent}, 0 0 0 6px ${accent}44, 0 8px 24px ${accent}66`
          : '0 0 0 1.5px rgba(255,255,255,0.09)',
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {isAll ? (
          <LayoutGrid style={{ width: 22, height: 22, color: '#fff' }} />
        ) : showImg ? (
          <img
            src={imgSrc} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgBroken(true)}
          />
        ) : IconComponent ? (
          <IconComponent style={{ width: 22, height: 22, color: isSelected ? '#fff' : accent }} />
        ) : (
          <LayoutGrid style={{ width: 22, height: 22, color: isSelected ? '#fff' : accent }} />
        )}
      </div>

      {/* Accent bar */}
      <div style={{
        width: 20, height: 3, borderRadius: 999,
        background: isSelected ? accent : 'transparent',
        boxShadow: isSelected ? `0 0 8px ${accent}cc` : 'none',
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        marginTop: -2,
      }} />

      {/* Label */}
      <span style={{
        fontSize: 11, fontWeight: isSelected ? 700 : 500,
        whiteSpace: 'nowrap', maxWidth: 72, textAlign: 'center',
        overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
        color: isSelected ? '#fff' : 'rgba(156,163,175,1)',
        transition: 'color 0.22s ease',
      }}>
        {label}
      </span>
    </div>
  );
};

export const CategoryCircleNav = ({ categories, selected, onSelect, salon, accentColor, iconMap = {}, adminCatalogMap }) => (
  <>
    <style>{`
      .glw-cat-scroll::-webkit-scrollbar{display:none}
      @keyframes glwFadeDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
    `}</style>
    <div className="glw-cat-scroll" style={{
      display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
      overflowX: 'auto', overflowY: 'visible',
      scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      paddingTop: 18, paddingBottom: 8,
    }}>
      <CircleBtn label="All" isAll isSelected={!selected} onSelect={() => onSelect(null)} accentColor={accentColor} />
      {categories.map(cat => (
        <CircleBtn
          key={cat}
          label={cat}
          imgSrc={getCatImg(cat, salon, adminCatalogMap)}
          isSelected={selected === cat}
          onSelect={() => onSelect(cat)}
          accentColor={accentColor}
          IconComponent={iconMap[cat]}
        />
      ))}
    </div>
  </>
);

export const SubCircleNav = ({ catLabel, subs, selected, onSelect, salon, services, accentColor, iconMap = {}, adminCatalogMap }) => (
  <div className="glw-cat-scroll" style={{
    display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
    overflowX: 'auto', overflowY: 'visible',
    scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
    paddingTop: 10, paddingBottom: 4,
    animation: 'glwFadeDown 0.22s ease both',
  }}>
    <CircleBtn label="All" isAll isSelected={!selected} onSelect={() => onSelect(null)} accentColor={accentColor} />
    {subs.map(sub => (
      <CircleBtn
        key={sub}
        label={sub}
        imgSrc={getSubImg(catLabel, sub, salon, services, adminCatalogMap)}
        isSelected={selected === sub}
        onSelect={() => onSelect(sub)}
        accentColor={accentColor}
        IconComponent={iconMap[catLabel]}
      />
    ))}
  </div>
);
