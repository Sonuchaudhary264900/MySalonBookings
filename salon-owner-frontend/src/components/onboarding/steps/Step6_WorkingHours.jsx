import React, { useState, useRef } from 'react';
import { ArrowRight, Calendar, Clock, Coffee, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';

/* ─────────────────────────────────────── CSS ── */
const S6_CSS = `
  @keyframes s6-fadeup{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s6-pop{0%{transform:scale(0.86)}55%{transform:scale(1.1)}100%{transform:scale(1)}}
  @keyframes s6-slide{from{opacity:0;max-height:0}to{opacity:1;max-height:320px}}
  .s6-fu1{animation:s6-fadeup 0.55s 0s cubic-bezier(0.16,1,0.3,1) both}
  .s6-fu2{animation:s6-fadeup 0.55s 0.07s cubic-bezier(0.16,1,0.3,1) both}
  .s6-fu3{animation:s6-fadeup 0.55s 0.14s cubic-bezier(0.16,1,0.3,1) both}
  .s6-day{border:none;outline:none;cursor:pointer;user-select:none;transition:all 0.22s cubic-bezier(0.34,1.56,0.64,1);}
  .s6-day:hover{transform:translateY(-3px) scale(1.08)!important;}
  .s6-day.pop{animation:s6-pop 0.38s cubic-bezier(0.34,1.56,0.64,1)}
  .s6-lunch-expand{animation:s6-slide 0.32s cubic-bezier(0.16,1,0.3,1) both;overflow:hidden;}
  .s6-cta{transition:all 0.2s cubic-bezier(0.16,1,0.3,1);}
  .s6-cta:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(124,58,237,0.55)!important;}
  .s6-cta:active{transform:scale(0.98);}
  .s6-preset-btn{border:none;outline:none;cursor:pointer;transition:all 0.18s;}
  .s6-ampm{border:none;outline:none;cursor:pointer;transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1);}
  .s6-ampm:hover{transform:scale(1.05);}
`;

/* ─────────────────────────────────────── CONSTANTS ── */
const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const PRESETS  = [
  { label: 'Weekdays', days: ['Mon','Tue','Wed','Thu','Fri'] },
  { label: 'Mon–Sat',  days: ['Mon','Tue','Wed','Thu','Fri','Sat'] },
  { label: 'All 7',    days: ALL_DAYS },
];
const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '30'];

/* ─────────────────────────────────────── HELPERS ── */
function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function calcDuration(open, close) {
  const [oh,om] = open.split(':').map(Number);
  const [ch,cm] = close.split(':').map(Number);
  const mins = ch*60+cm - (oh*60+om);
  if (mins <= 0) return null;
  const h = Math.floor(mins/60), r = mins%60;
  return h + (r ? `h ${r}m` : 'h');
}

/* ─────────────────────────────────────── WHEEL ── */
const ITEM_H = 50;

function WheelPicker({ items, value, onChange, isDark }) {
  const idx       = items.indexOf(value);
  const [off, setOff] = useState(0);
  const dragging  = useRef(false);
  const startY    = useRef(0);

  const purple = isDark ? '#a78bfa' : '#7c3aed';
  const dimClr = isDark ? '#334155' : '#cbd5e1';

  /* triple items for infinite wrap feel */
  const ext    = [...items, ...items, ...items];
  const extIdx = items.length + idx;

  const snapTo = (raw) => {
    const norm = ((raw % items.length) + items.length) % items.length;
    onChange(items[norm]);
    setOff(0);
    dragging.current = false;
  };

  const onWheel    = (e) => { e.preventDefault(); snapTo(idx + (e.deltaY > 0 ? 1 : -1)); };
  const onStart    = (y) => { dragging.current = true; startY.current = y; };
  const onMove     = (y) => { if (!dragging.current) return; setOff(y - startY.current); };
  const onEnd      = (y) => {
    if (!dragging.current) return;
    snapTo(idx + Math.round(-(y - startY.current) / ITEM_H));
  };

  const ty = ITEM_H - extIdx * ITEM_H + off; /* VISIBLE center row = index 1 */

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
        WebkitMaskImage: 'linear-gradient(to bottom,transparent 0%,#000 30%,#000 70%,transparent 100%)',
        maskImage:        'linear-gradient(to bottom,transparent 0%,#000 30%,#000 70%,transparent 100%)',
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
            <div key={`${item}-${i}`} onClick={() => snapTo(items.indexOf(item) + (i < items.length ? -items.length : i >= 2*items.length ? items.length : 0))}
              style={{
                height: ITEM_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: sel ? 30 : 22, fontWeight: sel ? 900 : 500,
                color: sel ? purple : dimClr,
                opacity: Math.max(0.12, 1 - dist * 0.5),
                transform: `scale(${Math.max(0.68, 1 - dist * 0.14)})`,
                transition: dragging.current ? 'none' : 'all 0.22s ease',
                fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5,
                cursor: 'pointer',
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── TIME PICKER ── */
function TimePicker({ label, value, onChange, isDark, icon: Icon }) {
  const [h, m] = value.split(':').map(Number);
  const ampm   = h >= 12 ? 'PM' : 'AM';
  const hr12   = h % 12 || 12;
  const purple = isDark ? '#a78bfa' : '#7c3aed';
  const sub    = isDark ? '#64748b' : '#94a3b8';

  const setHour = (hStr) => {
    const newH = (parseInt(hStr) % 12) + (ampm === 'PM' ? 12 : 0);
    onChange(`${String(newH).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  };
  const setMin  = (mStr) => onChange(`${String(h).padStart(2,'0')}:${mStr}`);
  const toggleAP = (ap) => {
    if (ap === ampm) return;
    onChange(`${String(h >= 12 ? h - 12 : h + 12).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, flex:1 }}>
      {/* Label */}
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        {Icon && <Icon size={12} color={purple} />}
        <span style={{ fontSize:10, fontWeight:800, letterSpacing:1.8, textTransform:'uppercase', color:sub }}>
          {label}
        </span>
      </div>

      {/* Wheel card */}
      <div style={{
        position:'relative', display:'flex', alignItems:'center', gap:0,
        background: isDark
          ? 'linear-gradient(150deg,rgba(124,58,237,0.14),rgba(168,85,247,0.08))'
          : 'linear-gradient(150deg,#faf5ff,#f5f3ff)',
        border:`1.5px solid ${isDark?'rgba(124,58,237,0.28)':'rgba(124,58,237,0.15)'}`,
        borderRadius:22, padding:'0 12px',
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(124,58,237,0.18)'
          : 'inset 0 1px 0 rgba(255,255,255,1), 0 8px 32px rgba(124,58,237,0.1)',
      }}>
        {/* Center highlight band */}
        <div style={{
          position:'absolute', left:12, right:12,
          top:'50%', transform:'translateY(-50%)',
          height: ITEM_H, borderRadius:14,
          background: isDark?'rgba(124,58,237,0.14)':'rgba(124,58,237,0.07)',
          border:`1px solid ${isDark?'rgba(124,58,237,0.22)':'rgba(124,58,237,0.12)'}`,
          pointerEvents:'none',
        }} />

        <WheelPicker items={HOURS}   value={String(hr12).padStart(2,'0')} onChange={setHour} isDark={isDark} />
        <span style={{ fontSize:26, fontWeight:900, color:purple, padding:'0 3px', lineHeight:1, position:'relative', zIndex:1 }}>:</span>
        <WheelPicker items={MINUTES} value={String(m).padStart(2,'0')}   onChange={setMin}  isDark={isDark} />

        {/* AM / PM */}
        <div style={{ display:'flex', flexDirection:'column', gap:5, marginLeft:10, position:'relative', zIndex:1 }}>
          {['AM','PM'].map(ap => (
            <button key={ap} className="s6-ampm"
              onClick={() => toggleAP(ap)}
              style={{
                padding:'6px 10px', borderRadius:11, fontSize:11, fontWeight:800,
                fontFamily:'inherit', letterSpacing:0.5,
                background: ap === ampm
                  ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                  : (isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)'),
                color: ap === ampm ? '#fff' : sub,
                boxShadow: ap === ampm ? '0 3px 12px rgba(124,58,237,0.4)' : 'none',
              }}>
              {ap}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── DIVIDER ── */
function Divider({ isDark }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'0 22px' }}>
      <div style={{ flex:1, height:1, background: isDark?'linear-gradient(to right,transparent,rgba(255,255,255,0.07))':'linear-gradient(to right,transparent,#e5e7eb)' }} />
      <div style={{ width:4, height:4, borderRadius:'50%', background: isDark?'rgba(255,255,255,0.1)':'#d1d5db' }} />
      <div style={{ flex:1, height:1, background: isDark?'linear-gradient(to left,transparent,rgba(255,255,255,0.07))':'linear-gradient(to left,transparent,#e5e7eb)' }} />
    </div>
  );
}

/* ─────────────────────────────────────── MAIN ── */
export default function Step6_WorkingHours() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const [days,       setDays]       = useState(data.workingDays);
  const [openTime,   setOpenTime]   = useState(data.openTime   || '09:00');
  const [closeTime,  setCloseTime]  = useState(data.closeTime  || '21:00');
  const [lunch,      setLunch]      = useState(data.hasLunchBreak || false);
  const [lunchStart, setLunchStart] = useState(data.lunchStart || '13:00');
  const [lunchEnd,   setLunchEnd]   = useState(data.lunchEnd   || '14:00');
  const [bounced,    setBounced]    = useState(null);

  const toggleDay = (day) => {
    setDays(p => p.includes(day) ? p.filter(d => d !== day) : [...p, day]);
    setBounced(day);
    setTimeout(() => setBounced(null), 420);
  };

  const handleNext = () => {
    if (!days.length) { toast.error('Select at least one working day'); return; }
    update({ workingDays:days, openTime, closeTime, hasLunchBreak:lunch, lunchStart, lunchEnd });
    toast.success('Your schedule is set! 🗓️');
    nextStep();
  };

  const text   = isDark ? '#f1f5f9' : '#0f172a';
  const sub    = isDark ? '#64748b' : '#94a3b8';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#ffffff';
  const cardBd = isDark ? 'rgba(255,255,255,0.07)' : '#ede9fe';
  const purple = isDark ? '#a78bfa' : '#7c3aed';
  const dur    = calcDuration(openTime, closeTime);

  const matchPreset = PRESETS.find(p =>
    JSON.stringify([...p.days].sort()) === JSON.stringify([...days].sort())
  );

  return (
    <>
      <style>{S6_CSS}</style>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── Header ── */}
        <div className="s6-fu1">
          <h1 style={{ fontSize:'clamp(1.6rem,4vw,2.1rem)', fontWeight:900, color:text, margin:'0 0 6px', letterSpacing:'-0.6px', lineHeight:1.1 }}>
            When are you open? <span style={{ fontSize:'1.4rem' }}>🕘</span>
          </h1>
          <p style={{ color:sub, fontSize:13.5, margin:0 }}>
            Set your hours once — customers see real-time availability.
          </p>
        </div>

        {/* ── Card ── */}
        <div className="s6-fu2" style={{
          background:cardBg, border:`1px solid ${cardBd}`, borderRadius:28, overflow:'hidden',
          boxShadow: isDark
            ? '0 0 0 1px rgba(124,58,237,0.06),0 24px 64px rgba(0,0,0,0.4)'
            : '0 0 0 1px rgba(124,58,237,0.06),0 20px 60px rgba(124,58,237,0.09)',
        }}>

          {/* ── Days ── */}
          <div style={{ padding:'24px 22px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:14 }}>
              <div style={{ width:30, height:30, borderRadius:9, background: isDark?'rgba(124,58,237,0.15)':'rgba(124,58,237,0.09)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Calendar size={14} color={purple} />
              </div>
              <span style={{ fontSize:11, fontWeight:800, letterSpacing:1.4, textTransform:'uppercase', color:sub }}>Days of Operation</span>
            </div>

            {/* Segmented presets */}
            <div style={{ display:'flex', gap:3, background: isDark?'rgba(255,255,255,0.04)':'#f4f4f8', borderRadius:14, padding:4, marginBottom:14 }}>
              {PRESETS.map(p => {
                const active = matchPreset?.label === p.label;
                return (
                  <button key={p.label} className="s6-preset-btn"
                    onClick={() => setDays(p.days)}
                    style={{
                      flex:1, padding:'8px 6px', borderRadius:10, fontSize:11.5, fontWeight:700, fontFamily:'inherit',
                      background: active ? (isDark?'rgba(124,58,237,0.28)':'#fff') : 'transparent',
                      color: active ? purple : sub,
                      boxShadow: active ? (isDark?'0 2px 10px rgba(0,0,0,0.4)':'0 2px 12px rgba(124,58,237,0.1)') : 'none',
                    }}>
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Day circles */}
            <div style={{ display:'flex', gap:7, flexWrap:'wrap', justifyContent:'center' }}>
              {ALL_DAYS.map(day => {
                const on = days.includes(day);
                return (
                  <button key={day} className={`s6-day${bounced===day?' pop':''}`}
                    onClick={() => toggleDay(day)}
                    style={{
                      width:46, height:46, borderRadius:'50%',
                      fontWeight:800, fontSize:12, fontFamily:'inherit',
                      background: on ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : (isDark?'rgba(255,255,255,0.05)':'#f8f7ff'),
                      border:`2px solid ${on?'transparent':(isDark?'rgba(255,255,255,0.09)':'#ede9fe')}`,
                      color: on ? '#fff' : (isDark?'#475569':'#a5b4fc'),
                      boxShadow: on ? '0 6px 20px rgba(124,58,237,0.45)' : (isDark?'none':'0 1px 3px rgba(0,0,0,0.04)'),
                      transform: on ? 'scale(1.06)' : 'scale(1)',
                    }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <Divider isDark={isDark} />

          {/* ── Opening Hours ── */}
          <div style={{ padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:18 }}>
              <div style={{ width:30, height:30, borderRadius:9, background: isDark?'rgba(124,58,237,0.15)':'rgba(124,58,237,0.09)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Clock size={14} color={purple} />
              </div>
              <span style={{ fontSize:11, fontWeight:800, letterSpacing:1.4, textTransform:'uppercase', color:sub }}>Opening Hours</span>
              {dur && (
                <div style={{ marginLeft:'auto', background: isDark?'rgba(124,58,237,0.15)':'rgba(124,58,237,0.08)', borderRadius:99, padding:'3px 10px' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:purple }}>{dur} open</span>
                </div>
              )}
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:12, justifyContent:'center' }}>
              <TimePicker label="Opens"  value={openTime}  onChange={setOpenTime}  isDark={isDark} icon={Sun}  />
              <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background: isDark?'rgba(255,255,255,0.06)':'#f5f3ff', border:`1px solid ${isDark?'rgba(255,255,255,0.1)':'#ede9fe'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ArrowRight size={12} color={sub} />
              </div>
              <TimePicker label="Closes" value={closeTime} onChange={setCloseTime} isDark={isDark} icon={Moon} />
            </div>
          </div>

          <Divider isDark={isDark} />

          {/* ── Lunch Break ── */}
          <div style={{ padding:'4px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 22px', cursor:'pointer' }}
              onClick={() => setLunch(v => !v)}>
              <div style={{
                width:46, height:46, borderRadius:14, flexShrink:0, transition:'all 0.25s',
                background: lunch ? 'linear-gradient(135deg,#f97316,#fb923c)' : (isDark?'rgba(255,255,255,0.06)':'#fff7ed'),
                border:`1.5px solid ${lunch?(isDark?'transparent':'#fed7aa'):(isDark?'rgba(255,255,255,0.08)':'#fde8c8')}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: lunch?'0 6px 20px rgba(249,115,22,0.38)':'none',
              }}>
                <Coffee size={20} color={lunch?'#fff':(isDark?'#94a3b8':'#fb923c')} />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700, color: lunch?(isDark?'#fed7aa':'#c2410c'):text, margin:0 }}>Lunch Break</p>
                <p style={{ fontSize:12, color: lunch?(isDark?'#fdba74':'#ea580c'):sub, margin:'2px 0 0' }}>
                  {lunch ? `Blocked ${formatTime12(lunchStart)} – ${formatTime12(lunchEnd)}` : "Customers can't book during your break"}
                </p>
              </div>
              <div style={{ width:50, height:28, borderRadius:99, position:'relative', transition:'background 0.28s', background: lunch?'#f97316':(isDark?'rgba(255,255,255,0.1)':'#e5e7eb'), boxShadow: lunch?'0 2px 12px rgba(249,115,22,0.4)':'none', flexShrink:0 }}>
                <div style={{ position:'absolute', top:5, left: lunch?28:5, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 2px 6px rgba(0,0,0,0.25)', transition:'left 0.28s cubic-bezier(0.34,1.56,0.64,1)' }} />
              </div>
            </div>

            {lunch && (
              <div className="s6-lunch-expand" style={{ borderTop:`1px dashed ${isDark?'rgba(251,146,60,0.2)':'rgba(249,115,22,0.15)'}`, background: isDark?'rgba(249,115,22,0.04)':'rgba(255,237,213,0.3)', padding:'18px 22px 22px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, justifyContent:'center' }}>
                  <TimePicker label="Break From" value={lunchStart} onChange={setLunchStart} isDark={isDark} />
                  <span style={{ fontSize:18, color:sub }}>☕</span>
                  <TimePicker label="Break Until" value={lunchEnd}   onChange={setLunchEnd}   isDark={isDark} />
                </div>
              </div>
            )}
          </div>

          {/* ── Schedule Preview ── */}
          <div style={{ margin:'0 16px 16px', borderRadius:16, background: isDark?'rgba(124,58,237,0.1)':'rgba(124,58,237,0.05)', border:`1px solid ${isDark?'rgba(124,58,237,0.18)':'rgba(124,58,237,0.12)'}`, padding:'12px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#a855f7)' }} />
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', color:purple }}>Your Schedule</span>
            </div>
            <p style={{ fontSize:13, color: isDark?'#c4b5fd':'#5b21b6', margin:0, fontWeight:500, lineHeight:1.65 }}>
              <strong style={{ fontWeight:800 }}>{days.length ? days.join(' · ') : 'No days selected'}</strong>
              {days.length > 0 && (
                <><br /><span style={{ opacity:0.8 }}>
                  {formatTime12(openTime)}
                  {lunch ? ` → ${formatTime12(lunchStart)}, break, ${formatTime12(lunchEnd)}` : ''}
                  {' → '}{formatTime12(closeTime)}
                  {dur && <span style={{ opacity:0.6 }}> · {dur}</span>}
                </span></>
              )}
            </p>
          </div>
        </div>

        {/* ── Continue ── */}
        <button className="s6-cta s6-fu3" onClick={handleNext}
          style={{
            width:'100%', padding:'16px 24px', borderRadius:16,
            background:'linear-gradient(135deg,#7c3aed 0%,#9333ea 50%,#ec4899 100%)',
            color:'#fff', fontWeight:800, fontSize:16, border:'none',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            fontFamily:'inherit', letterSpacing:0.2,
            boxShadow:'0 6px 28px rgba(124,58,237,0.45)',
          }}>
          Continue — Upload Photos & Video <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
