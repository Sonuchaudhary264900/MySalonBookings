import React, { useState, useRef } from 'react';
import { ArrowRight, Clock, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const S6_CSS = `
  @keyframes s6-fadeup{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s6-sheet-up{from{transform:translateY(110%)}to{transform:translateY(0)}}
  @keyframes s6-bd-in{from{opacity:0}to{opacity:1}}
  @keyframes s6-row-slide{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
  @keyframes s6-closed-in{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}

  .s6-fu1{animation:s6-fadeup 0.55s 0.00s cubic-bezier(0.16,1,0.3,1) both}
  .s6-fu2{animation:s6-fadeup 0.55s 0.07s cubic-bezier(0.16,1,0.3,1) both}
  .s6-fu3{animation:s6-fadeup 0.55s 0.14s cubic-bezier(0.16,1,0.3,1) both}

  /* Day rows staggered */
  .s6-row-0{animation:s6-row-slide 0.4s 0.08s cubic-bezier(0.16,1,0.3,1) both}
  .s6-row-1{animation:s6-row-slide 0.4s 0.12s cubic-bezier(0.16,1,0.3,1) both}
  .s6-row-2{animation:s6-row-slide 0.4s 0.16s cubic-bezier(0.16,1,0.3,1) both}
  .s6-row-3{animation:s6-row-slide 0.4s 0.20s cubic-bezier(0.16,1,0.3,1) both}
  .s6-row-4{animation:s6-row-slide 0.4s 0.24s cubic-bezier(0.16,1,0.3,1) both}
  .s6-row-5{animation:s6-row-slide 0.4s 0.28s cubic-bezier(0.16,1,0.3,1) both}
  .s6-row-6{animation:s6-row-slide 0.4s 0.32s cubic-bezier(0.16,1,0.3,1) both}

  .s6-time-chip{
    display:inline-flex;align-items:center;gap:5px;
    cursor:pointer;user-select:none;border:none;outline:none;font-family:inherit;
    transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1);
  }
  .s6-time-chip:hover{transform:translateY(-1px) scale(1.04);}
  .s6-time-chip:active{transform:scale(0.96);transition:transform 0.08s ease;}

  .s6-preset-btn{border:none;outline:none;cursor:pointer;transition:all 0.22s cubic-bezier(0.34,1.56,0.64,1);}
  .s6-preset-btn:hover{transform:scale(1.02);}

  .s6-sheet{animation:s6-sheet-up 0.44s cubic-bezier(0.32,0.72,0,1) both;}
  .s6-bd{animation:s6-bd-in 0.28s ease both;}

  .s6-cta{transition:all 0.22s cubic-bezier(0.16,1,0.3,1);}
  .s6-cta:hover{transform:translateY(-3px)!important;box-shadow:0 18px 50px rgba(124,58,237,0.55)!important;}
  .s6-cta:active{transform:scale(0.98)!important;}

  .s6-done-btn{transition:all 0.18s cubic-bezier(0.34,1.56,0.64,1);border:none;outline:none;cursor:pointer;font-family:inherit;}
  .s6-done-btn:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 10px 32px rgba(99,102,241,0.5)!important;}
  .s6-done-btn:active{transform:scale(0.97);}

  .s6-ampm-btn{transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1);border:none;outline:none;cursor:pointer;font-family:inherit;}
  .s6-ampm-btn:hover{transform:scale(1.06);}
  .s6-ampm-btn:active{transform:scale(0.94);}

  .s6-closed-badge{animation:s6-closed-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both}
  .s6-times-wrap{transition:opacity 0.18s, transform 0.18s;}
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

const PRESETS = [
  { label: 'Weekdays', days: ['Mon','Tue','Wed','Thu','Fri'] },
  { label: 'Mon–Sat',  days: ['Mon','Tue','Wed','Thu','Fri','Sat'] },
  { label: 'All 7',    days: ALL_DAY_KEYS },
];

const HOURS_12 = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MINUTES  = ['00','15','30','45'];
const ITEM_H   = 52;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'pm' : 'am'}`;
}
function parse12(t) {
  const [h, m] = (t || '09:00').split(':').map(Number);
  return {
    hr12: String(h % 12 || 12).padStart(2,'0'),
    min:  String(m).padStart(2,'0'),
    ampm: h >= 12 ? 'PM' : 'AM',
  };
}
function build24(hr12, min, ampm) {
  let h = parseInt(hr12) % 12;
  if (ampm === 'PM') h += 12;
  return `${String(h).padStart(2,'0')}:${min}`;
}
function calcDuration(open, close) {
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  const mins = ch * 60 + cm - (oh * 60 + om);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60), r = mins % 60;
  return `${h}h${r ? ` ${r}m` : ''}`;
}

/* ─── WheelPicker ─────────────────────────────────────────────────────────── */
function WheelPicker({ items, value, onChange, isDark }) {
  const idx      = items.indexOf(value);
  const [off, setOff] = useState(0);
  const dragging = useRef(false);
  const startY   = useRef(0);
  const purple   = isDark ? '#a78bfa' : '#6366f1';
  const dimClr   = isDark ? '#334155' : '#c7d2fe';
  const ext      = [...items, ...items, ...items];
  const extIdx   = items.length + idx;

  const snapTo = (raw) => {
    const norm = ((raw % items.length) + items.length) % items.length;
    onChange(items[norm]);
    setOff(0);
    dragging.current = false;
  };
  const onWheel  = (e) => { e.preventDefault(); snapTo(idx + (e.deltaY > 0 ? 1 : -1)); };
  const onStart  = (y) => { dragging.current = true; startY.current = y; };
  const onMove   = (y) => { if (!dragging.current) return; setOff(y - startY.current); };
  const onEnd    = (y) => { if (!dragging.current) return; snapTo(idx + Math.round(-(y - startY.current) / ITEM_H)); };
  const ty       = ITEM_H - extIdx * ITEM_H + off;

  return (
    <div
      onWheel={onWheel}
      onMouseDown={e  => onStart(e.clientY)}
      onMouseMove={e  => onMove(e.clientY)}
      onMouseUp={e    => onEnd(e.clientY)}
      onMouseLeave={e => onEnd(e.clientY)}
      onTouchStart={e => onStart(e.touches[0].clientY)}
      onTouchMove={e  => onMove(e.touches[0].clientY)}
      onTouchEnd={e   => onEnd(e.changedTouches[0].clientY)}
      style={{
        height: 3 * ITEM_H, overflow: 'hidden', cursor: 'ns-resize',
        userSelect: 'none', position: 'relative',
        WebkitMaskImage: 'linear-gradient(to bottom,transparent 0%,#000 28%,#000 72%,transparent 100%)',
        maskImage:        'linear-gradient(to bottom,transparent 0%,#000 28%,#000 72%,transparent 100%)',
      }}
    >
      <div style={{
        transform: `translateY(${ty}px)`,
        transition: dragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        willChange: 'transform',
      }}>
        {ext.map((item, i) => {
          const dist = Math.abs(i - extIdx - off / ITEM_H);
          const sel  = i === extIdx && !dragging.current;
          return (
            <div key={`${item}-${i}`} style={{
              height: ITEM_H,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: sel ? 32 : 22, fontWeight: sel ? 900 : 500,
              color: sel ? purple : dimClr,
              opacity: Math.max(0.1, 1 - dist * 0.52),
              transform: `scale(${Math.max(0.65, 1 - dist * 0.15)})`,
              transition: dragging.current ? 'none' : 'all 0.22s ease',
              fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5,
            }}>
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Toggle ──────────────────────────────────────────────────────────────── */
function Toggle({ on, onChange }) {
  return (
    <div onClick={e => { e.stopPropagation(); onChange(); }}
      style={{
        width: 46, height: 27, borderRadius: 99, position: 'relative', flexShrink: 0,
        background: on
          ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
          : 'rgba(203,213,225,0.8)',
        cursor: 'pointer',
        transition: 'background 0.3s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: on ? '0 2px 14px rgba(99,102,241,0.45)' : 'inset 0 1px 3px rgba(0,0,0,0.08)',
      }}>
      <div style={{
        position: 'absolute', top: 3.5,
        left: on ? 22 : 3.5,
        width: 20, height: 20, borderRadius: '50%',
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
        transition: 'left 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }} />
    </div>
  );
}

/* ─── TimeChip ────────────────────────────────────────────────────────────── */
function TimeChip({ time, onClick, isDark }) {
  const indigo = isDark ? '#a5b4fc' : '#4338ca';
  return (
    <button className="s6-time-chip" onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        padding: '7px 11px', borderRadius: 11,
        background: isDark
          ? 'rgba(99,102,241,0.12)'
          : 'rgba(238,242,255,1)',
        border: `1.5px solid ${isDark ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.2)'}`,
        color: indigo, fontSize: 12.5, fontWeight: 600,
        boxShadow: isDark
          ? '0 2px 8px rgba(99,102,241,0.15)'
          : '0 1px 4px rgba(99,102,241,0.1)',
      }}>
      <Clock size={11} color={isDark ? '#818cf8' : '#6366f1'} strokeWidth={2.2} style={{ flexShrink: 0 }} />
      <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: 0.2 }}>{fmt12(time)}</span>
      <ChevronDown size={11} color={isDark ? 'rgba(165,180,252,0.55)' : 'rgba(99,102,241,0.5)'} strokeWidth={2.5} />
    </button>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function Step6_WorkingHours() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const initDays = data.workingDays?.length ? data.workingDays : ALL_DAY_KEYS;
  const [days,      setDays]      = useState(initDays);
  const [openTime,  setOpenTime]  = useState(data.openTime  || '09:00');
  const [closeTime, setCloseTime] = useState(data.closeTime || '18:00');

  /* Picker sheet */
  const [pickerTarget, setPickerTarget] = useState(null);
  const [pickHr,  setPickHr]  = useState('09');
  const [pickMin, setPickMin] = useState('00');
  const [pickAP,  setPickAP]  = useState('AM');

  const toggleDay = (key) =>
    setDays(p => p.includes(key) ? p.filter(d => d !== key) : [...p, key]);

  const openPicker = (target) => {
    const { hr12, min, ampm } = parse12(target === 'open' ? openTime : closeTime);
    setPickHr(hr12); setPickMin(min); setPickAP(ampm);
    setPickerTarget(target);
  };

  const confirmPicker = () => {
    const t = build24(pickHr, pickMin, pickAP);
    if (pickerTarget === 'open') setOpenTime(t);
    else setCloseTime(t);
    setPickerTarget(null);
  };

  const handleNext = () => {
    if (!days.length) { toast.error('Select at least one working day'); return; }
    update({ workingDays: days, openTime, closeTime, hasLunchBreak: false });
    toast.success('Your schedule is set! 🗓️');
    nextStep();
  };

  const text   = isDark ? '#f1f5f9' : '#0f172a';
  const sub    = isDark ? '#64748b'  : '#94a3b8';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#ffffff';
  const cardBd = isDark ? 'rgba(255,255,255,0.07)'  : '#e8eaf0';
  const dur    = calcDuration(openTime, closeTime);

  const matchPreset = PRESETS.find(p =>
    JSON.stringify([...p.days].sort()) === JSON.stringify([...days].sort())
  );

  return (
    <>
      <style>{S6_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header ── */}
        <div className="s6-fu1">
          <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.1rem)', fontWeight: 900, color: text, margin: '0 0 6px', letterSpacing: '-0.6px', lineHeight: 1.1 }}>
            When are you open? <span style={{ fontSize: '1.4rem' }}>🕘</span>
          </h1>
          <p style={{ color: sub, fontSize: 13.5, margin: 0 }}>
            Set your hours once — customers see real-time availability.
          </p>
        </div>

        {/* ── Card ── */}
        <div className="s6-fu2" style={{
          background: cardBg,
          border: `1px solid ${cardBd}`,
          borderRadius: 28, overflow: 'hidden',
          boxShadow: isDark
            ? '0 0 0 1px rgba(99,102,241,0.06), 0 24px 64px rgba(0,0,0,0.4)'
            : '0 0 0 1px rgba(99,102,241,0.04), 0 20px 60px rgba(99,102,241,0.09)',
        }}>

          {/* Preset segmented control */}
          <div style={{ padding: '18px 16px 14px' }}>
            <div style={{
              display: 'flex', gap: 3,
              background: isDark ? 'rgba(255,255,255,0.04)' : '#f4f5fb',
              borderRadius: 14, padding: 4,
            }}>
              {PRESETS.map(p => {
                const active = matchPreset?.label === p.label;
                return (
                  <button key={p.label} className="s6-preset-btn"
                    onClick={() => setDays([...p.days])}
                    style={{
                      flex: 1, padding: '8px 6px', borderRadius: 10,
                      fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit',
                      background: active
                        ? (isDark ? 'rgba(99,102,241,0.3)' : '#ffffff')
                        : 'transparent',
                      color: active
                        ? (isDark ? '#c4b5fd' : '#4338ca')
                        : sub,
                      boxShadow: active
                        ? (isDark ? '0 2px 10px rgba(0,0,0,0.4)' : '0 2px 14px rgba(99,102,241,0.14)')
                        : 'none',
                    }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thin divider */}
          <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.05)' : '#f0f1f8', margin: '0 16px' }} />

          {/* ── Day rows ── */}
          <div style={{ padding: '4px 0 4px' }}>
            {ALL_DAYS.map(({ key, full }, idx) => {
              const on = days.includes(key);
              return (
                <div key={key} className={`s6-row-${idx}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 18px',
                    background: on
                      ? (isDark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.015)')
                      : 'transparent',
                    borderBottom: idx < ALL_DAYS.length - 1
                      ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f3f4fa'}`
                      : 'none',
                    transition: 'background 0.25s',
                  }}>

                  {/* Toggle */}
                  <Toggle on={on} onChange={() => toggleDay(key)} />

                  {/* Day name */}
                  <span style={{
                    flex: 1, fontSize: 14, fontWeight: on ? 600 : 500,
                    color: on ? text : sub,
                    transition: 'color 0.22s, font-weight 0.22s',
                    userSelect: 'none',
                  }}>
                    {full}
                  </span>

                  {/* Time range OR "Closed" */}
                  {on ? (
                    <div className="s6-times-wrap" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <TimeChip time={openTime}  onClick={() => openPicker('open')}  isDark={isDark} />
                      <span style={{ fontSize: 11, color: sub, fontWeight: 500, userSelect: 'none' }}>to</span>
                      <TimeChip time={closeTime} onClick={() => openPicker('close')} isDark={isDark} />
                    </div>
                  ) : (
                    <span className="s6-closed-badge" style={{
                      fontSize: 11, fontWeight: 600,
                      color: isDark ? '#475569' : '#c4c9d9',
                      padding: '4px 10px', borderRadius: 99,
                      background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fc',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#ebedf5'}`,
                      userSelect: 'none',
                    }}>
                      Closed
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Schedule preview strip ── */}
          <div style={{
            margin: '0 14px 14px',
            borderRadius: 16,
            background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)',
            border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)'}`,
            padding: '12px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: isDark ? '#a78bfa' : '#6366f1' }}>
                Schedule Summary
              </span>
              {dur && (
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: isDark ? '#a78bfa' : '#6366f1', background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)', borderRadius: 99, padding: '2px 8px' }}>
                  {dur} / day
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: isDark ? '#c4b5fd' : '#4338ca', margin: 0, fontWeight: 500, lineHeight: 1.7 }}>
              <strong style={{ fontWeight: 800 }}>
                {days.length ? days.join(' · ') : 'No days selected'}
              </strong>
              {days.length > 0 && (
                <><br />
                  <span style={{ opacity: 0.8 }}>
                    {fmt12(openTime)} → {fmt12(closeTime)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* ── Continue ── */}
        <button className="s6-cta s6-fu3" onClick={handleNext}
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

      {/* ── Time Picker Bottom Sheet ── */}
      {pickerTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>

          {/* Backdrop */}
          <div className="s6-bd"
            onClick={() => setPickerTarget(null)}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          />

          {/* Sheet */}
          <div className="s6-sheet" style={{
            position: 'relative',
            background: isDark
              ? 'linear-gradient(180deg,#16162e 0%,#12122a 100%)'
              : '#ffffff',
            borderRadius: '28px 28px 0 0',
            padding: '0 24px 40px',
            boxShadow: '0 -24px 80px rgba(0,0,0,0.35)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.12)'}`,
            borderBottom: 'none',
          }}>

            {/* Drag handle */}
            <div style={{ width: 44, height: 4, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.14)' : '#e5e7eb', margin: '14px auto 22px' }} />

            {/* Label */}
            <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, letterSpacing: 2.2, textTransform: 'uppercase', color: sub, margin: '0 0 20px' }}>
              {pickerTarget === 'open' ? 'Opening Time' : 'Closing Time'}
            </p>

            {/* Wheel picker card */}
            <div style={{
              position: 'relative', display: 'flex', alignItems: 'center',
              background: isDark
                ? 'linear-gradient(150deg,rgba(99,102,241,0.14),rgba(139,92,246,0.08))'
                : 'linear-gradient(150deg,#f5f3ff,#eef2ff)',
              border: `1.5px solid ${isDark ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.16)'}`,
              borderRadius: 24, padding: '0 14px',
              margin: '0 auto', maxWidth: 320,
              boxShadow: isDark
                ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 40px rgba(99,102,241,0.2)'
                : 'inset 0 1px 0 rgba(255,255,255,1), 0 10px 40px rgba(99,102,241,0.12)',
            }}>
              {/* Center selection band */}
              <div style={{
                position: 'absolute', left: 14, right: 14,
                top: '50%', transform: 'translateY(-50%)',
                height: ITEM_H, borderRadius: 16, pointerEvents: 'none',
                background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
                border: `1px solid ${isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.14)'}`,
              }} />

              <WheelPicker items={HOURS_12} value={pickHr}  onChange={setPickHr}  isDark={isDark} />
              <span style={{ fontSize: 28, fontWeight: 900, color: isDark ? '#a78bfa' : '#6366f1', padding: '0 2px', position: 'relative', zIndex: 1, lineHeight: 1 }}>:</span>
              <WheelPicker items={MINUTES}  value={pickMin} onChange={setPickMin} isDark={isDark} />

              {/* AM / PM */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 14, position: 'relative', zIndex: 1 }}>
                {['AM', 'PM'].map(ap => (
                  <button key={ap} className="s6-ampm-btn"
                    onClick={() => setPickAP(ap)}
                    style={{
                      padding: '8px 12px', borderRadius: 12,
                      fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
                      background: ap === pickAP
                        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                        : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      color: ap === pickAP ? '#ffffff' : sub,
                      boxShadow: ap === pickAP ? '0 3px 14px rgba(99,102,241,0.45)' : 'none',
                    }}>
                    {ap}
                  </button>
                ))}
              </div>
            </div>

            {/* Current preview */}
            <p style={{ textAlign: 'center', fontSize: 13, color: sub, margin: '14px 0 0', fontWeight: 500 }}>
              {fmt12(build24(pickHr, pickMin, pickAP))}
            </p>

            {/* Confirm */}
            <button className="s6-done-btn" onClick={confirmPicker}
              style={{
                width: '100%', maxWidth: 320, display: 'block', margin: '16px auto 0',
                padding: '16px 24px', borderRadius: 16,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#ffffff', fontWeight: 800, fontSize: 15,
                letterSpacing: 0.2,
                boxShadow: '0 6px 28px rgba(99,102,241,0.45)',
              }}>
              Set {pickerTarget === 'open' ? 'Opening' : 'Closing'} Time
            </button>
          </div>
        </div>
      )}
    </>
  );
}
