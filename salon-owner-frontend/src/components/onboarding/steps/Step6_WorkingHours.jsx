import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ArrowRight, Clock, ChevronDown, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const S6_CSS = `
  @keyframes s6-up   {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s6-row  {from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
  @keyframes s6-drop {from{opacity:0;transform:scale(0.92) translateY(-8px)}to{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes s6-badge{from{opacity:0;transform:scale(0.75)}to{opacity:1;transform:scale(1)}}

  .s6-a1{animation:s6-up 0.5s 0.00s cubic-bezier(0.16,1,0.3,1) both}
  .s6-a2{animation:s6-up 0.5s 0.06s cubic-bezier(0.16,1,0.3,1) both}
  .s6-a3{animation:s6-up 0.5s 0.12s cubic-bezier(0.16,1,0.3,1) both}

  .s6-r0{animation:s6-row 0.38s 0.08s cubic-bezier(0.16,1,0.3,1) both}
  .s6-r1{animation:s6-row 0.38s 0.12s cubic-bezier(0.16,1,0.3,1) both}
  .s6-r2{animation:s6-row 0.38s 0.16s cubic-bezier(0.16,1,0.3,1) both}
  .s6-r3{animation:s6-row 0.38s 0.20s cubic-bezier(0.16,1,0.3,1) both}
  .s6-r4{animation:s6-row 0.38s 0.24s cubic-bezier(0.16,1,0.3,1) both}
  .s6-r5{animation:s6-row 0.38s 0.28s cubic-bezier(0.16,1,0.3,1) both}
  .s6-r6{animation:s6-row 0.38s 0.32s cubic-bezier(0.16,1,0.3,1) both}

  /* Chip */
  .s6-chip{
    display:inline-flex;align-items:center;gap:5px;
    cursor:pointer;border:none;outline:none;font-family:inherit;
    transition:box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease, transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
  }
  .s6-chip:hover{transform:translateY(-1px);}
  .s6-chip:active{transform:scale(0.96);transition:transform 0.07s ease;}

  /* Dropdown portal */
  .s6-drop{
    animation:s6-drop 0.2s cubic-bezier(0.34,1.56,0.64,1) both;
    transform-origin:top center;
  }

  /* Scrollable columns */
  .s6-col{overflow-y:auto;scrollbar-width:none;}
  .s6-col::-webkit-scrollbar{display:none;}

  /* Time item */
  .s6-ti{
    display:flex;align-items:center;justify-content:center;
    height:38px;border-radius:9px;cursor:pointer;
    font-size:14.5px;font-weight:500;letter-spacing:0.2px;
    transition:background 0.12s, color 0.12s, transform 0.12s;
    user-select:none;
  }
  .s6-ti:hover:not(.s6-ti-sel){background:rgba(99,102,241,0.07);transform:scale(1.04);}
  .s6-ti-sel{font-weight:800;transform:scale(1.06);}

  /* Preset */
  .s6-pre{border:none;outline:none;cursor:pointer;transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1);}
  .s6-pre:hover{transform:scale(1.02);}

  /* Toggle */
  .s6-tog{cursor:pointer;transition:background 0.3s cubic-bezier(0.4,0,0.2,1);}

  /* AM/PM */
  .s6-ap{border:none;outline:none;cursor:pointer;font-family:inherit;transition:all 0.18s cubic-bezier(0.34,1.56,0.64,1);}
  .s6-ap:hover{transform:scale(1.05);}
  .s6-ap:active{transform:scale(0.93);}

  /* CTA */
  .s6-cta{transition:all 0.22s cubic-bezier(0.16,1,0.3,1);}
  .s6-cta:hover{transform:translateY(-3px)!important;box-shadow:0 18px 50px rgba(124,58,237,0.55)!important;}
  .s6-cta:active{transform:scale(0.98)!important;}

  .s6-badge{animation:s6-badge 0.18s cubic-bezier(0.34,1.56,0.64,1) both}
`;

/* ─── Constants ───────────────────────────────────────────────────────────── */
const ALL_DAYS = [
  { key: 'Mon', full: 'Monday'    },
  { key: 'Tue', full: 'Tuesday'   },
  { key: 'Wed', full: 'Wednesday' },
  { key: 'Thu', full: 'Thursday'  },
  { key: 'Fri', full: 'Friday'    },
  { key: 'Sat', full: 'Saturday'  },
  { key: 'Sun', full: 'Sunday'    },
];
const ALL_DAY_KEYS = ALL_DAYS.map(d => d.key);
const PRESETS      = [
  { label: 'Weekdays', days: ['Mon','Tue','Wed','Thu','Fri'] },
  { label: 'Mon–Sat',  days: ['Mon','Tue','Wed','Thu','Fri','Sat'] },
  { label: 'All 7',    days: ALL_DAY_KEYS },
];
const HOURS_12 = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MINUTES  = ['00','15','30','45'];
const ROW_H    = 38;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'pm' : 'am'}`;
}
function parse12(t) {
  const [h, m] = (t || '09:00').split(':').map(Number);
  return {
    hr:  String(h % 12 || 12).padStart(2,'0'),
    min: String(m).padStart(2,'0'),
    ap:  h >= 12 ? 'PM' : 'AM',
  };
}
function build24(hr, min, ap) {
  let h = parseInt(hr) % 12;
  if (ap === 'PM') h += 12;
  return `${String(h).padStart(2,'0')}:${min}`;
}
function calcDur(a, b) {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  const d = bh * 60 + bm - ah * 60 - am;
  if (d <= 0) return null;
  return `${Math.floor(d/60)}h${d%60 ? ` ${d%60}m` : ''}`;
}

/* ─── Toggle ──────────────────────────────────────────────────────────────── */
function Toggle({ on, onChange }) {
  return (
    <div className="s6-tog" onClick={e => { e.stopPropagation(); onChange(); }}
      style={{
        width: 44, height: 26, borderRadius: 99, position: 'relative', flexShrink: 0,
        background: on ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'rgba(209,213,219,0.9)',
        boxShadow: on ? '0 2px 12px rgba(99,102,241,0.42)' : 'inset 0 1px 3px rgba(0,0,0,0.1)',
      }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        transition: 'left 0.28s cubic-bezier(0.34,1.56,0.64,1)',
      }} />
    </div>
  );
}

/* ─── Dropdown (portal, fixed pos) ───────────────────────────────────────── */
function Dropdown({ anchor, time, onChange, onClose, isDark, label }) {
  const { hr: ih, min: im, ap: ia } = parse12(time);
  const [hr,  setHr]  = useState(ih);
  const [min, setMin] = useState(im);
  const [ap,  setAp]  = useState(ia);
  const hrRef  = useRef(null);
  const minRef = useRef(null);
  const boxRef = useRef(null);

  /* position relative to anchor rect */
  const vw   = window.innerWidth;
  const DBOX = 218;
  let left   = anchor.left + anchor.width / 2 - DBOX / 2;
  if (left < 8)            left = 8;
  if (left + DBOX > vw - 8) left = vw - DBOX - 8;

  /* flip up if not enough space below */
  const spaceBelow = window.innerHeight - anchor.bottom;
  const dropH      = 292;
  const top = spaceBelow > dropH + 12
    ? anchor.bottom + 8
    : anchor.top - dropH - 8;

  /* scroll to selection on mount */
  useEffect(() => {
    const hIdx = HOURS_12.indexOf(hr);
    const mIdx = MINUTES.indexOf(min);
    if (hrRef.current)  hrRef.current.scrollTop  = Math.max(0, (hIdx - 1) * ROW_H);
    if (minRef.current) minRef.current.scrollTop  = Math.max(0, (mIdx - 1) * ROW_H);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* close on outside click or scroll */
  useEffect(() => {
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) onClose(); };
    const onScroll = () => onClose();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose]);

  const pick = useCallback((h, m, a) => {
    setHr(h); setMin(m); setAp(a);
    onChange(build24(h, m, a));
  }, [onChange]);

  const bg     = isDark ? '#16172e' : '#fff';
  const border = isDark ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.18)';
  const divBg  = isDark ? 'rgba(255,255,255,0.04)' : '#f5f6ff';
  const selBg  = isDark ? 'rgba(99,102,241,0.22)' : '#eef2ff';
  const selClr = isDark ? '#c4b5fd' : '#4338ca';
  const dimClr = isDark ? '#475569'  : '#9ca3af';
  const hdClr  = isDark ? '#64748b'  : '#94a3b8';

  return ReactDOM.createPortal(
    <div ref={boxRef} className="s6-drop"
      style={{
        position: 'fixed', top, left, zIndex: 99999,
        width: DBOX,
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 20,
        boxShadow: isDark
          ? '0 24px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(99,102,241,0.12)'
          : '0 24px 80px rgba(99,102,241,0.18), 0 4px 16px rgba(0,0,0,0.07)',
        overflow: 'hidden',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}>

      {/* Header strip */}
      <div style={{
        padding: '11px 14px 9px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#eef0fb'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase', color: hdClr }}>
          {label}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#c4b5fd' : '#4338ca', letterSpacing: -0.3, fontVariantNumeric: 'tabular-nums' }}>
          {fmt12(build24(hr, min, ap))}
        </span>
      </div>

      {/* Pickers row */}
      <div style={{ display: 'flex', padding: '10px 10px 12px', gap: 6 }}>

        {/* Hours */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: hdClr, textAlign: 'center', margin: '0 0 4px' }}>Hr</p>
          <div ref={hrRef} className="s6-col"
            style={{ maxHeight: ROW_H * 4.5, borderRadius: 12, background: divBg, padding: '3px' }}>
            {HOURS_12.map(h => (
              <div key={h}
                className={`s6-ti${hr === h ? ' s6-ti-sel' : ''}`}
                onClick={() => pick(h, min, ap)}
                style={{ color: hr === h ? selClr : dimClr, background: hr === h ? selBg : 'transparent' }}>
                {h}
              </div>
            ))}
          </div>
        </div>

        {/* Colon */}
        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 24, flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: isDark ? '#6366f1' : '#6366f1', lineHeight: 1 }}>:</span>
        </div>

        {/* Minutes */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: hdClr, textAlign: 'center', margin: '0 0 4px' }}>Min</p>
          <div ref={minRef} className="s6-col"
            style={{ borderRadius: 12, background: divBg, padding: '3px' }}>
            {MINUTES.map(m => (
              <div key={m}
                className={`s6-ti${min === m ? ' s6-ti-sel' : ''}`}
                onClick={() => pick(hr, m, ap)}
                style={{ color: min === m ? selClr : dimClr, background: min === m ? selBg : 'transparent' }}>
                {m}
              </div>
            ))}
          </div>
        </div>

        {/* AM / PM */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6, paddingBottom: 3, flexShrink: 0 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: hdClr, textAlign: 'center', margin: '0 0 4px' }}>  </p>
          {['AM','PM'].map(a => (
            <button key={a} className="s6-ap"
              onClick={() => pick(hr, min, a)}
              style={{
                width: 42, padding: '9px 0', borderRadius: 11,
                fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
                background: ap === a
                  ? 'linear-gradient(135deg,#6366f1,#818cf8)'
                  : (isDark ? 'rgba(255,255,255,0.06)' : '#f0f1fb'),
                color: ap === a ? '#fff' : dimClr,
                boxShadow: ap === a ? '0 4px 14px rgba(99,102,241,0.45)' : 'none',
                border: `1.5px solid ${ap === a ? 'transparent' : (isDark ? 'rgba(255,255,255,0.07)' : '#e5e7f0')}`,
              }}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Done */}
      <div style={{ padding: '0 10px 12px' }}>
        <button onClick={onClose}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 12,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff', fontWeight: 700, fontSize: 13.5,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: '0 4px 18px rgba(99,102,241,0.4)',
            transition: 'all 0.15s ease',
          }}>
          <Check size={14} strokeWidth={3} />
          Done
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ─── TimeChip ────────────────────────────────────────────────────────────── */
function TimeChip({ time, onChange, label, isDark }) {
  const [open,   setOpen]   = useState(false);
  const [anchor, setAnchor] = useState(null);
  const chipRef = useRef(null);

  const handleOpen = useCallback((e) => {
    e.stopPropagation();
    if (!open && chipRef.current) {
      setAnchor(chipRef.current.getBoundingClientRect());
    }
    setOpen(o => !o);
  }, [open]);

  const indigo = isDark ? '#a5b4fc' : '#4338ca';

  return (
    <>
      <button ref={chipRef} className={`s6-chip${open ? '' : ''}`}
        onClick={handleOpen}
        style={{
          padding: '7px 11px', borderRadius: 11,
          background: open
            ? (isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff')
            : (isDark ? 'rgba(99,102,241,0.1)' : 'rgba(238,242,255,0.85)'),
          border: `1.5px solid ${open
            ? (isDark ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.45)')
            : (isDark ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.18)')}`,
          color: indigo,
          fontSize: 12.5, fontWeight: 600,
          boxShadow: open
            ? '0 4px 18px rgba(99,102,241,0.22)'
            : '0 1px 4px rgba(99,102,241,0.08)',
        }}>
        <Clock size={11} color={isDark ? '#818cf8' : '#6366f1'} strokeWidth={2.2} style={{ flexShrink: 0 }} />
        <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: 0.2 }}>{fmt12(time)}</span>
        <ChevronDown size={11}
          color={isDark ? 'rgba(165,180,252,0.6)' : 'rgba(99,102,241,0.55)'}
          strokeWidth={2.5}
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease', flexShrink: 0 }}
        />
      </button>

      {open && anchor && (
        <Dropdown
          anchor={anchor}
          time={time}
          onChange={onChange}
          onClose={() => setOpen(false)}
          isDark={isDark}
          label={label}
        />
      )}
    </>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function Step6_WorkingHours() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const [days,      setDays]      = useState(data.workingDays?.length ? data.workingDays : ALL_DAY_KEYS);
  const [openTime,  setOpenTime]  = useState(data.openTime  || '09:00');
  const [closeTime, setCloseTime] = useState(data.closeTime || '18:00');

  const toggleDay = (key) =>
    setDays(p => p.includes(key) ? p.filter(d => d !== key) : [...p, key]);

  const handleNext = () => {
    if (!days.length) { toast.error('Select at least one working day'); return; }
    update({ workingDays: days, openTime, closeTime, hasLunchBreak: false });
    toast.success('Schedule saved! 🗓️');
    nextStep();
  };

  const text   = isDark ? '#f1f5f9' : '#0f172a';
  const sub    = isDark ? '#64748b'  : '#94a3b8';
  const cardBg = isDark ? 'rgba(255,255,255,0.025)' : '#ffffff';
  const cardBd = isDark ? 'rgba(255,255,255,0.07)'   : '#e8eaf0';
  const dur    = calcDur(openTime, closeTime);

  const matchPreset = PRESETS.find(p =>
    JSON.stringify([...p.days].sort()) === JSON.stringify([...days].sort())
  );

  return (
    <>
      <style>{S6_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div className="s6-a1">
          <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.1rem)', fontWeight: 900, color: text, margin: '0 0 6px', letterSpacing: '-0.6px', lineHeight: 1.1 }}>
            When are you open? <span style={{ fontSize: '1.3rem' }}>🕘</span>
          </h1>
          <p style={{ color: sub, fontSize: 13.5, margin: 0 }}>
            Set your hours once — customers see real-time availability.
          </p>
        </div>

        {/* Card */}
        <div className="s6-a2" style={{
          background: cardBg, border: `1px solid ${cardBd}`,
          borderRadius: 26,
          boxShadow: isDark
            ? '0 0 0 1px rgba(99,102,241,0.06), 0 20px 60px rgba(0,0,0,0.4)'
            : '0 0 0 1px rgba(99,102,241,0.04), 0 20px 56px rgba(99,102,241,0.09)',
        }}>

          {/* Preset segmented control */}
          <div style={{ padding: '16px 16px 12px' }}>
            <div style={{ display: 'flex', gap: 3, background: isDark ? 'rgba(255,255,255,0.04)' : '#f2f3fb', borderRadius: 14, padding: 4 }}>
              {PRESETS.map(p => {
                const active = matchPreset?.label === p.label;
                return (
                  <button key={p.label} className="s6-pre"
                    onClick={() => setDays([...p.days])}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 10,
                      fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit',
                      background: active ? (isDark ? 'rgba(99,102,241,0.28)' : '#fff') : 'transparent',
                      color: active ? (isDark ? '#c4b5fd' : '#4338ca') : sub,
                      boxShadow: active ? (isDark ? '0 2px 10px rgba(0,0,0,0.35)' : '0 2px 12px rgba(99,102,241,0.14)') : 'none',
                    }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.05)' : '#f0f1f9', margin: '0 16px' }} />

          {/* Day rows */}
          <div>
            {ALL_DAYS.map(({ key, full }, i) => {
              const on = days.includes(key);
              return (
                <div key={key} className={`s6-r${i}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 18px',
                    background: on
                      ? (isDark ? 'rgba(99,102,241,0.035)' : 'rgba(99,102,241,0.016)')
                      : 'transparent',
                    borderBottom: i < 6
                      ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f2f3fa'}`
                      : 'none',
                    transition: 'background 0.24s',
                  }}>

                  <Toggle on={on} onChange={() => toggleDay(key)} />

                  <span style={{
                    flex: 1, minWidth: 0,
                    fontSize: 14, fontWeight: on ? 600 : 500,
                    color: on ? text : sub,
                    transition: 'color 0.2s, font-weight 0.2s',
                    userSelect: 'none',
                  }}>
                    {full}
                  </span>

                  {on ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <TimeChip time={openTime}  onChange={setOpenTime}  label="Opens"  isDark={isDark} />
                      <span style={{ fontSize: 10.5, color: sub, fontWeight: 500, userSelect: 'none', letterSpacing: 0.2 }}>to</span>
                      <TimeChip time={closeTime} onChange={setCloseTime} label="Closes" isDark={isDark} />
                    </div>
                  ) : (
                    <span className="s6-badge" style={{
                      fontSize: 11, fontWeight: 600,
                      color: isDark ? '#3f4a60' : '#c4c9d9',
                      padding: '4px 10px', borderRadius: 99,
                      background: isDark ? 'rgba(255,255,255,0.03)' : '#f7f8fc',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#eaedf5'}`,
                      userSelect: 'none',
                    }}>
                      Closed
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary strip */}
          <div style={{
            margin: '10px 14px 14px',
            borderRadius: 14,
            background: isDark ? 'rgba(99,102,241,0.09)' : 'rgba(99,102,241,0.05)',
            border: `1px solid ${isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.11)'}`,
            padding: '11px 15px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', flexShrink: 0 }} />
              <p style={{ fontSize: 12.5, color: isDark ? '#c4b5fd' : '#4338ca', margin: 0, fontWeight: 500, lineHeight: 1.5, minWidth: 0 }}>
                <strong style={{ fontWeight: 800 }}>{days.length ? days.join(' · ') : 'No days'}</strong>
                {days.length > 0 && <span style={{ opacity: 0.75 }}> &nbsp;·&nbsp; {fmt12(openTime)} – {fmt12(closeTime)}</span>}
              </p>
            </div>
            {dur && (
              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: isDark ? '#a78bfa' : '#6366f1', background: isDark ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.08)', borderRadius: 99, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                {dur}
              </span>
            )}
          </div>
        </div>

        {/* Continue */}
        <button className="s6-cta s6-a3" onClick={handleNext}
          style={{
            width: '100%', padding: '16px 24px', borderRadius: 16,
            background: 'linear-gradient(135deg,#7c3aed 0%,#9333ea 50%,#ec4899 100%)',
            color: '#fff', fontWeight: 800, fontSize: 16, border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'inherit', letterSpacing: 0.2,
            boxShadow: '0 6px 28px rgba(124,58,237,0.45)',
          }}>
          Continue — Upload Photos & Video <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
