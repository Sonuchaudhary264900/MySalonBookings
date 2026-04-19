import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

/**
 * Custom dropdown replacing native <select> for full dark/light theme control.
 * Uses a portal so it renders above overflow:hidden containers.
 *
 * Props:
 *   value      – current selected string value
 *   onChange   – (value: string) => void
 *   options    – string[]
 *   placeholder
 *   disabled
 *   isDark     – boolean from useTheme()
 *   error      – boolean, highlights border red
 */
export default function SelectDropdown({
  value, onChange, options = [], placeholder = 'Select...', disabled = false, isDark = false, error = false,
}) {
  const [open, setOpen]   = useState(false);
  const [rect, setRect]   = useState(null);
  const triggerRef        = useRef(null);
  const listRef           = useRef(null);

  const openMenu = () => {
    if (disabled) return;
    const r = triggerRef.current.getBoundingClientRect();
    setRect(r);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        listRef.current && !listRef.current.contains(e.target)
      ) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Scroll selected item into view when menu opens
  useEffect(() => {
    if (open && listRef.current && value) {
      const el = listRef.current.querySelector('[data-selected="true"]');
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [open]);

  const bg          = isDark ? '#1e293b' : '#f9fafb';
  const textClr     = isDark ? '#f1f5f9' : '#111827';
  const borderClr   = error ? '#f87171' : isDark ? 'rgba(255,255,255,0.14)' : '#d1d5db';
  const phClr       = isDark ? '#64748b' : '#9ca3af';
  const menuBg      = isDark ? '#1e293b' : '#ffffff';
  const menuBorder  = isDark ? '#334155' : '#e5e7eb';
  const hoverBg     = isDark ? '#334155' : '#f3f4f6';
  const activeBg    = isDark ? '#312e81' : '#eef2ff';
  const activeClr   = isDark ? '#a5b4fc' : '#4f46e5';

  // Position: prefer below trigger; flip above if not enough room
  const menuTop  = rect ? rect.bottom + 4 : 0;
  const menuLeft = rect ? rect.left      : 0;
  const menuW    = rect ? rect.width     : 200;
  const flipUp   = rect ? rect.bottom + 240 > window.innerHeight : false;
  const menuBottom = rect ? window.innerHeight - rect.top + 4 : 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 12,
          border: `1.5px solid ${borderClr}`,
          background: bg, color: value ? textClr : phClr,
          fontSize: 13.5, fontFamily: 'inherit',
          textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          outline: 'none', opacity: disabled ? 0.5 : 1, boxSizing: 'border-box',
          transition: 'border-color 0.2s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={14}
          style={{ flexShrink: 0, color: phClr, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && createPortal(
        <div
          ref={listRef}
          style={{
            position: 'fixed',
            top:    flipUp ? 'auto' : menuTop,
            bottom: flipUp ? menuBottom : 'auto',
            left: menuLeft,
            width: menuW,
            zIndex: 99999,
            background: menuBg,
            border: `1px solid ${menuBorder}`,
            borderRadius: 12,
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.7)'
              : '0 8px 32px rgba(0,0,0,0.15)',
            maxHeight: 232,
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: '10px 14px', color: phClr, fontSize: 13 }}>No options</div>
          )}
          {options.map(opt => {
            const selected = opt === value;
            return (
              <div
                key={opt}
                data-selected={selected}
                onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: selected ? activeBg : 'transparent',
                  color: selected ? activeClr : textClr,
                  fontSize: 13.5,
                  fontWeight: selected ? 600 : 400,
                  userSelect: 'none',
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
