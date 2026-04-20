import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Clock, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const S6_CSS = `
  @keyframes s6-fadeup{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s6-row-slide{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
  @keyframes s6-drop-in{from{opacity:0;transform:scale(0.94) translateY(-6px)}to{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes s6-closed-in{from{opacity:0;transform:scale(0.82)}to{opacity:1;transform:scale(1)}}

  .s6-fu1{animation:s6-fadeup 0.55s 0.00s cubic-bezier(0.16,1,0.3,1) both}
  .s6-fu2{animation:s6-fadeup 0.55s 0.07s cubic-bezier(0.16,1,0.3,1) both}
  .s6-fu3{animation:s6-fadeup 0.55s 0.14s cubic-bezier(0.16,1,0.3,1) both}

  .s6-row-0{animation:s6-row-slide 0.4s 0.08s cubic-bezier(0.16,1,0.3,1) both}
  .s6-row-1{animation:s6-row-slide 0.4s 0.12s cubic-bezier(0.16,1,0.3,1) both}
  .s6-row-2{animation:s6-row-slide 0.4s 0.16s cubic-bezier(0.16,1,0.3,1) both}
  .s6-row-3{animation:s6-row-slide 0.4s 0.20s cubic-bezier(0.16,1,0.3,1) both}
  .s6-row-4{animation:s6-row-slide 0.4s 0.24s cubic-bezier(0.16,1,0.3,1) both}
  .s6-row-5{animation:s6-row-slide 0.4s 0.28s cubic-bezier(0.16,1,0.3,1) both}
  .s6-row-6{animation:s6-row-slide 0.4s 0.32s cubic-bezier(0.16,1,0.3,1) both}

  .s6-chip{
    display:inline-flex;align-items:center;gap:5px;
    cursor:pointer;user-select:none;border:none;outline:none;font-family:inherit;
    transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1);
  }
  .s6-chip:hover{transform:translateY(-1px) scale(1.03);}
  .s6-chip.open{transform:scale(0.97);}

  .s6-dropdown{
    animation:s6-drop-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both;
    transform-origin:top left;
  }

  .s6-time-item{
    display:flex;align-items:center;justify-content:center;
    padding:7px 0;border-radius:9px;cursor:pointer;
    font-size:14px;font-weight:500;
    transition:all 0.14s ease;user-select:none;
  }
  .s6-time-item:hover{transform:scale(1.05);}
  .s6-time-item.sel{font-weight:800;transform:scale(1.06);}

  .s6-scroll{overflow-y:auto;scrollbar-width:none;}
  .s6-scroll::-webkit-scrollbar{display:none;}

  .s6-preset-btn{border:none;outline:none;cursor:pointer;transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1);}
  .s6-preset-btn:hover{transform:scale(1.02);}

  .s6-cta{transition:all 0.22s cubic-bezier(0.16,1,0.3,1);}
  .s6-cta:hover{transform:translateY(-3px)!important;box-shadow:0 18px 50px rgba(124,58,237,0.55)!important;}
  .s6-cta:active{transform:scale(0.98)!important;}

  .s6-closed-badge{animation:s6-closed-in 0.2s cubic-bezier(0.34,1.56,0.64,1) both}

  .s6-ampm{border:none;outline:none;cursor:pointer;font-family:inherit;transition:all 0.18s cubic-bezier(0.34,1.56,0.64,1);}
  .s6-ampm:hover{transform:scale(1.06);}
  .s6-ampm:active{transform:scale(0.92);}
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

/* ─── Toggle ──────────────────────────────────────────────────────────────── */
function Toggle({ on, onChange }) {
  return (
    <div onClick={e => { e.stopPropagation(); onChange(); }}
      style={{
        width: 46, height: 27, borderRadius: 99, position: 'relative', flexShrink: 0,
        background: on ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(203,213,225,0.8)',
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

/* ─── TimePickerDropdown ──────────────────────────────────────────────────── */
function TimePickerDropdown({ time, onChange, isDark }) {
  const { hr12, min: initMin, ampm: initAP } = parse12(time);
  const [open,   setOpen]   = useState(false);
  const [selHr,  setSelHr]  = useState(hr12);
  const [selMin, setSelMin] = useState(initMin);
  const [selAP,  setSelAP]  = useState(initAP);
  const wrapRef  = useRef(null);
  const hrRef    = useRef(null);
  const minRef   = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* Scroll selected hour/min into view when dropdown opens */
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      const hIdx = HOURS_12.indexOf(selHr);
      const mIdx = MINUTES.indexOf(selMin);
      if (hrRef.current)  hrRef.current.scrollTop  = hIdx  * 37 - 37;
      if (minRef.current) minRef.current.scrollTop = mIdx  * 37 - 37;
    }, 30);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = (h, m, ap) => {
    setSelHr(h); setSelMin(m); setSelAP(ap);
    onChange(build24(h, m, ap));
  };

  const indigo  = isDark ? '#a5b4fc' : '#4338ca';
  const sub     = isDark ? '#64748b'  : '#94a3b8';
  const dropBg  = isDark ? '#1a1a2e'  : '#ffffff';
  const selBg   = isDark ? 'rgba(99,102,241,0.2)'  : 'rgba(99,102,241,0.1)';
  const selClr  = isDark ? '#c4b5fd'  : '#4338ca';
  const dimClr  = isDark ? '#475569'  : '#94a3b8';
  const divClr  = isDark ? 'rgba(255,255,255,0.06)' : '#f0f1f8';

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Chip trigger */}
      <button
        className={`s6-chip${open ? ' open' : ''}`}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          padding: '7px 11px', borderRadius: 11,
          background: open
            ? (isDark ? 'rgba(99,102,241,0.22)' : 'rgba(238,242,255,1)')
            : (isDark ? 'rgba(99,102,241,0.1)'  : 'rgba(238,242,255,0.8)'),
          border: `1.5px solid ${open
            ? (isDark ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.4)')
            : (isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)')}`,
          color: indigo, fontSize: 12.5, fontWeight: 600,
          boxShadow: open
            ? (isDark ? '0 4px 18px rgba(99,102,241,0.3)' : '0 4px 14px rgba(99,102,241,0.18)')
            : (isDark ? '0 2px 8px rgba(99,102,241,0.12)' : '0 1px 4px rgba(99,102,241,0.08)'),
        }}>
        <Clock size={11} color={isDark ? '#818cf8' : '#6366f1'} strokeWidth={2.2} style={{ flexShrink: 0 }} />
        <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: 0.2 }}>{fmt12(time)}</span>
        <ChevronDown
          size={11}
          color={isDark ? 'rgba(165,180,252,0.6)' : 'rgba(99,102,241,0.55)'}
          strokeWidth={2.5}
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease' }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="s6-dropdown" style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 500,
          background: dropBg,
          border: `1.5px solid ${isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.18)'}`,
          borderRadius: 18,
          boxShadow: isDark
            ? '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)'
            : '0 20px 60px rgba(99,102,241,0.18), 0 4px 12px rgba(0,0,0,0.06)',
          padding: '14px 10px 12px',
          width: 210,
          userSelect: 'none',
        }}>

          {/* Column headers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '0 4px' }}>
            <span style={{ flex: 1, fontSize: 9, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color: sub, textAlign: 'center' }}>Hour</span>
            <span style={{ width: 8 }} />
            <span style={{ flex: 1, fontSize: 9, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color: sub, textAlign: 'center' }}>Min</span>
            <span style={{ width: 52 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>

            {/* Hours */}
            <div ref={hrRef} className="s6-scroll"
              style={{ flex: 1, maxHeight: 168, borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f9ff', border: `1px solid ${divClr}`, padding: '4px 2px' }}>
              {HOURS_12.map(h => (
                <div key={h} className={`s6-time-item${selHr === h ? ' sel' : ''}`}
                  onClick={() => commit(h, selMin, selAP)}
                  style={{
                    color: selHr === h ? selClr : dimClr,
                    background: selHr === h ? selBg : 'transparent',
                  }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Colon */}
            <div style={{ paddingTop: 20, fontSize: 18, fontWeight: 900, color: isDark ? '#a78bfa' : '#6366f1', flexShrink: 0, lineHeight: 1 }}>:</div>

            {/* Minutes */}
            <div ref={minRef} className="s6-scroll"
              style={{ flex: 1, borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f9ff', border: `1px solid ${divClr}`, padding: '4px 2px' }}>
              {MINUTES.map(m => (
                <div key={m} className={`s6-time-item${selMin === m ? ' sel' : ''}`}
                  onClick={() => commit(selHr, m, selAP)}
                  style={{
                    color: selMin === m ? selClr : dimClr,
                    background: selMin === m ? selBg : 'transparent',
                  }}>
                  {m}
                </div>
              ))}
            </div>

            {/* AM / PM */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4, flexShrink: 0, width: 46 }}>
              {['AM','PM'].map(ap => (
                <button key={ap} className="s6-ampm"
                  onClick={() => commit(selHr, selMin, ap)}
                  style={{
                    padding: '9px 0', borderRadius: 11, fontSize: 11, fontWeight: 800, letterSpacing: 0.4,
                    background: ap === selAP
                      ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                      : (isDark ? 'rgba(255,255,255,0.05)' : '#f0f1f8'),
                    color: ap === selAP ? '#fff' : sub,
                    boxShadow: ap === selAP ? '0 3px 14px rgba(99,102,241,0.45)' : 'none',
                    border: `1.5px solid ${ap === selAP ? 'transparent' : divClr}`,
                    width: '100%',
                  }}>
                  {ap}
                </button>
              ))}
            </div>
          </div>

          {/* Current preview */}
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, fontWeight: 700, color: isDark ? '#a78bfa' : '#6366f1', opacity: 0.9, letterSpacing: 0.3 }}>
            {fmt12(build24(selHr, selMin, selAP))}
          </div>
        </div>
      )}
    </div>
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

  const toggleDay = (key) =>
    setDays(p => p.includes(key) ? p.filter(d => d !== key) : [...p, key]);

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

        {/* ── Card (no overflow:hidden so dropdowns escape) ── */}
        <div className="s6-fu2" style={{
          background: cardBg,
          border: `1px solid ${cardBd}`,
          borderRadius: 28,
          boxShadow: isDark
            ? '0 0 0 1px rgba(99,102,241,0.06), 0 24px 64px rgba(0,0,0,0.4)'
            : '0 0 0 1px rgba(99,102,241,0.04), 0 20px 60px rgba(99,102,241,0.09)',
        }}>

          {/* Presets */}
          <div style={{ padding: '18px 16px 14px' }}>
            <div style={{ display: 'flex', gap: 3, background: isDark ? 'rgba(255,255,255,0.04)' : '#f4f5fb', borderRadius: 14, padding: 4 }}>
              {PRESETS.map(p => {
                const active = matchPreset?.label === p.label;
                return (
                  <button key={p.label} className="s6-preset-btn"
                    onClick={() => setDays([...p.days])}
                    style={{
                      flex: 1, padding: '8px 6px', borderRadius: 10,
                      fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit',
                      background: active ? (isDark ? 'rgba(99,102,241,0.3)' : '#ffffff') : 'transparent',
                      color: active ? (isDark ? '#c4b5fd' : '#4338ca') : sub,
                      boxShadow: active ? (isDark ? '0 2px 10px rgba(0,0,0,0.4)' : '0 2px 14px rgba(99,102,241,0.14)') : 'none',
                    }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.05)' : '#f0f1f8', margin: '0 16px' }} />

          {/* ── Day rows ── */}
          <div style={{ padding: '4px 0' }}>
            {ALL_DAYS.map(({ key, full }, idx) => {
              const on = days.includes(key);
              return (
                <div key={key} className={`s6-row-${idx}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 18px',
                    background: on
                      ? (isDark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.018)')
                      : 'transparent',
                    borderBottom: idx < ALL_DAYS.length - 1
                      ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f3f4fa'}`
                      : 'none',
                    transition: 'background 0.25s',
                    /* overflow visible so dropdown escapes */
                    overflow: 'visible',
                  }}>

                  <Toggle on={on} onChange={() => toggleDay(key)} />

                  <span style={{
                    flex: 1, fontSize: 14, fontWeight: on ? 600 : 500,
                    color: on ? text : sub,
                    transition: 'color 0.22s',
                    userSelect: 'none',
                  }}>
                    {full}
                  </span>

                  {on ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <TimePickerDropdown time={openTime}  onChange={setOpenTime}  isDark={isDark} />
                      <span style={{ fontSize: 11, color: sub, fontWeight: 500, userSelect: 'none' }}>to</span>
                      <TimePickerDropdown time={closeTime} onChange={setCloseTime} isDark={isDark} />
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

          {/* ── Schedule summary ── */}
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
              <strong style={{ fontWeight: 800 }}>{days.length ? days.join(' · ') : 'No days selected'}</strong>
              {days.length > 0 && (
                <><br /><span style={{ opacity: 0.8 }}>{fmt12(openTime)} → {fmt12(closeTime)}</span></>
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
    </>
  );
}
