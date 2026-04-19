import React, { useState } from 'react';
import { ArrowRight, ChevronUp, ChevronDown, Calendar, Clock, Coffee, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';

const S6_CSS = `
  @keyframes s6-fadeup{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s6-pop{0%{transform:scale(0.88)}55%{transform:scale(1.1)}100%{transform:scale(1)}}
  @keyframes s6-slide{from{opacity:0;max-height:0;transform:translateY(-8px)}to{opacity:1;max-height:300px;transform:translateY(0)}}
  .s6-fu1{animation:s6-fadeup 0.55s 0s cubic-bezier(0.16,1,0.3,1) both}
  .s6-fu2{animation:s6-fadeup 0.55s 0.07s cubic-bezier(0.16,1,0.3,1) both}
  .s6-fu3{animation:s6-fadeup 0.55s 0.14s cubic-bezier(0.16,1,0.3,1) both}
  .s6-day{border:none;outline:none;cursor:pointer;user-select:none;transition:all 0.22s cubic-bezier(0.34,1.56,0.64,1);}
  .s6-day:hover{transform:translateY(-3px) scale(1.08)!important;}
  .s6-day.pop{animation:s6-pop 0.38s cubic-bezier(0.34,1.56,0.64,1)}
  .s6-tc{border:none;outline:none;cursor:pointer;transition:all 0.16s cubic-bezier(0.34,1.56,0.64,1);}
  .s6-tc:hover{transform:scale(1.12)!important;}
  .s6-tc:active{transform:scale(0.93)!important;}
  .s6-lunch-expand{animation:s6-slide 0.3s cubic-bezier(0.16,1,0.3,1) both;overflow:hidden;}
  .s6-cta{transition:all 0.2s cubic-bezier(0.16,1,0.3,1);}
  .s6-cta:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(124,58,237,0.55)!important;}
  .s6-cta:active{transform:scale(0.98);}
  .s6-preset-btn{border:none;outline:none;cursor:pointer;transition:all 0.18s;}
  .s6-preset-btn:hover{opacity:0.85;}
`;

const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const PRESETS  = [
  { label: 'Weekdays', days: ['Mon','Tue','Wed','Thu','Fri'] },
  { label: 'Mon–Sat',  days: ['Mon','Tue','Wed','Thu','Fri','Sat'] },
  { label: 'All 7',    days: ALL_DAYS },
];

function stepTime(t, delta) {
  const [h, m] = t.split(':').map(Number);
  const finalM = delta > 0 ? (m < 30 ? 30 : 0) : (m === 0 ? 30 : 0);
  const finalH = delta > 0 ? (m >= 30 ? (h + 1) % 24 : h) : (m === 0 ? Math.max(0, h - 1) : h);
  return `${String(finalH).padStart(2,'0')}:${String(finalM).padStart(2,'0')}`;
}

function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function calcDuration(open, close) {
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  const mins = (ch * 60 + cm) - (oh * 60 + om);
  if (mins <= 0) return null;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return hrs + (rem ? `h ${rem}m` : 'h');
}

function TimePicker({ label, value, onChange, isDark, icon: Icon, accent }) {
  const [h, m] = value.split(':').map(Number);
  const ampm   = h >= 12 ? 'PM' : 'AM';
  const hr     = h % 12 || 12;
  const purple = isDark ? '#a78bfa' : '#7c3aed';
  const btnBg  = isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.07)';
  const btnBd  = isDark ? 'rgba(124,58,237,0.28)' : 'rgba(124,58,237,0.18)';

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, flex:1 }}>
      {/* Label */}
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        {Icon && <Icon size={13} color={purple} />}
        <span style={{ fontSize:10, fontWeight:800, letterSpacing:1.8, textTransform:'uppercase', color: isDark?'#64748b':'#94a3b8' }}>
          {label}
        </span>
      </div>

      {/* Up */}
      <button className="s6-tc" onClick={() => onChange(stepTime(value, 30))}
        style={{ width:42, height:42, borderRadius:'50%', background:btnBg, border:`1.5px solid ${btnBd}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <ChevronUp size={18} color={purple} />
      </button>

      {/* Display */}
      <div style={{
        borderRadius:20, padding:'14px 22px', textAlign:'center', minWidth:108,
        background: isDark
          ? 'linear-gradient(150deg,rgba(124,58,237,0.18),rgba(168,85,247,0.1))'
          : 'linear-gradient(150deg,#faf5ff,#f0f9ff)',
        border:`1.5px solid ${isDark?'rgba(124,58,237,0.3)':'rgba(124,58,237,0.15)'}`,
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(124,58,237,0.12)'
          : 'inset 0 1px 0 rgba(255,255,255,1), 0 4px 20px rgba(124,58,237,0.08)',
      }}>
        <div style={{ fontSize:30, fontWeight:900, letterSpacing:-1.5, color: isDark?'#f1f5f9':'#1e1b4b', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
          {String(hr).padStart(2,'0')}:{String(m).padStart(2,'0')}
        </div>
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:purple, marginTop:5 }}>
          {ampm}
        </div>
      </div>

      {/* Down */}
      <button className="s6-tc" onClick={() => onChange(stepTime(value, -30))}
        style={{ width:42, height:42, borderRadius:'50%', background:btnBg, border:`1.5px solid ${btnBd}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <ChevronDown size={18} color={purple} />
      </button>
    </div>
  );
}

function Divider({ isDark }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, margin:'2px 0' }}>
      <div style={{ flex:1, height:1, background: isDark ? 'linear-gradient(to right,transparent,rgba(255,255,255,0.07))' : 'linear-gradient(to right,transparent,#e5e7eb)' }} />
      <div style={{ width:4, height:4, borderRadius:'50%', background: isDark?'rgba(255,255,255,0.1)':'#d1d5db' }} />
      <div style={{ flex:1, height:1, background: isDark ? 'linear-gradient(to left,transparent,rgba(255,255,255,0.07))' : 'linear-gradient(to left,transparent,#e5e7eb)' }} />
    </div>
  );
}

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
    setTimeout(() => setBounced(null), 400);
  };

  const handleNext = () => {
    if (!days.length) { toast.error('Select at least one working day'); return; }
    update({ workingDays:days, openTime, closeTime, hasLunchBreak:lunch, lunchStart, lunchEnd });
    toast.success('Your schedule is set! 🗓️');
    nextStep();
  };

  const text      = isDark ? '#f1f5f9' : '#0f172a';
  const sub       = isDark ? '#64748b' : '#94a3b8';
  const cardBg    = isDark ? 'rgba(255,255,255,0.03)' : '#ffffff';
  const cardBd    = isDark ? 'rgba(255,255,255,0.07)' : '#ede9fe';
  const purple    = isDark ? '#a78bfa' : '#7c3aed';
  const duration  = calcDuration(openTime, closeTime);

  const activePreset = PRESETS.find(p => JSON.stringify([...p.days].sort()) === JSON.stringify([...days].sort()));

  return (
    <>
      <style>{S6_CSS}</style>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── Header ── */}
        <div className="s6-fu1">
          <h1 style={{ fontSize:'clamp(1.6rem,4vw,2.1rem)', fontWeight:900, color:text, margin:'0 0 6px', letterSpacing:'-0.6px', lineHeight:1.1 }}>
            When are you open?
            <span style={{ marginLeft:10, fontSize:'1.4rem' }}>🕘</span>
          </h1>
          <p style={{ color:sub, fontSize:13.5, margin:0, lineHeight:1.5 }}>
            Set your hours once — customers see real-time availability.
          </p>
        </div>

        {/* ── Main card ── */}
        <div className="s6-fu2" style={{
          background:cardBg, border:`1px solid ${cardBd}`, borderRadius:28,
          overflow:'hidden',
          boxShadow: isDark
            ? '0 0 0 1px rgba(124,58,237,0.06), 0 24px 64px rgba(0,0,0,0.35)'
            : '0 0 0 1px rgba(124,58,237,0.06), 0 20px 60px rgba(124,58,237,0.09)',
        }}>

          {/* ── Section: Days ── */}
          <div style={{ padding:'24px 22px 20px' }}>
            {/* Label */}
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:14 }}>
              <div style={{ width:30, height:30, borderRadius:9, background: isDark?'rgba(124,58,237,0.15)':'rgba(124,58,237,0.09)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Calendar size={14} color={purple} />
              </div>
              <span style={{ fontSize:11, fontWeight:800, letterSpacing:1.4, textTransform:'uppercase', color:sub }}>
                Days of Operation
              </span>
            </div>

            {/* Segmented presets */}
            <div style={{
              display:'flex', gap:3, background: isDark?'rgba(255,255,255,0.04)':'#f4f4f8',
              borderRadius:14, padding:4, marginBottom:14,
            }}>
              {PRESETS.map(p => {
                const active = activePreset?.label === p.label;
                return (
                  <button key={p.label} className="s6-preset-btn"
                    onClick={() => setDays(p.days)}
                    style={{
                      flex:1, padding:'8px 6px', borderRadius:10, fontSize:11.5, fontWeight:700,
                      fontFamily:'inherit',
                      background: active
                        ? (isDark?'rgba(124,58,237,0.28)':'#fff')
                        : 'transparent',
                      color: active ? purple : sub,
                      boxShadow: active
                        ? (isDark?'0 2px 10px rgba(0,0,0,0.4)':'0 2px 12px rgba(124,58,237,0.1)')
                        : 'none',
                    }}>
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Day pills */}
            <div style={{ display:'flex', gap:7, flexWrap:'wrap', justifyContent:'center' }}>
              {ALL_DAYS.map(day => {
                const on = days.includes(day);
                return (
                  <button key={day} className={`s6-day${bounced===day?' pop':''}`}
                    onClick={() => toggleDay(day)}
                    style={{
                      width:46, height:46, borderRadius:'50%',
                      fontWeight:800, fontSize:12, letterSpacing:0.2,
                      fontFamily:'inherit',
                      background: on
                        ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                        : (isDark?'rgba(255,255,255,0.05)':'#f8f7ff'),
                      border: `2px solid ${on ? 'transparent' : (isDark?'rgba(255,255,255,0.09)':'#ede9fe')}`,
                      color: on ? '#fff' : (isDark?'#475569':'#a5b4fc'),
                      boxShadow: on
                        ? '0 6px 20px rgba(124,58,237,0.45)'
                        : (isDark?'none':'0 1px 3px rgba(0,0,0,0.04)'),
                      transform: on ? 'scale(1.06)' : 'scale(1)',
                    }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <Divider isDark={isDark} />

          {/* ── Section: Hours ── */}
          <div style={{ padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:20 }}>
              <div style={{ width:30, height:30, borderRadius:9, background: isDark?'rgba(124,58,237,0.15)':'rgba(124,58,237,0.09)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Clock size={14} color={purple} />
              </div>
              <span style={{ fontSize:11, fontWeight:800, letterSpacing:1.4, textTransform:'uppercase', color:sub }}>
                Opening Hours
              </span>
              {duration && (
                <div style={{ marginLeft:'auto', background: isDark?'rgba(124,58,237,0.15)':'rgba(124,58,237,0.08)', borderRadius:99, padding:'3px 10px' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:purple }}>{duration} open</span>
                </div>
              )}
            </div>

            {/* Time pickers row */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:8, justifyContent:'center' }}>
              <TimePicker label="Opens"  value={openTime}  onChange={setOpenTime}  isDark={isDark} icon={Sun} />

              {/* Connector */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:62, gap:3 }}>
                <div style={{ width:1, height:16, background: isDark?'rgba(255,255,255,0.1)':'#e5e7eb' }} />
                <div style={{
                  width:28, height:28, borderRadius:'50%',
                  background: isDark?'rgba(255,255,255,0.06)':'#f5f3ff',
                  border:`1px solid ${isDark?'rgba(255,255,255,0.1)':'#ede9fe'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <ArrowRight size={12} color={sub} />
                </div>
                <div style={{ width:1, height:16, background: isDark?'rgba(255,255,255,0.1)':'#e5e7eb' }} />
              </div>

              <TimePicker label="Closes" value={closeTime} onChange={setCloseTime} isDark={isDark} icon={Moon} />
            </div>
          </div>

          <Divider isDark={isDark} />

          {/* ── Section: Lunch Break ── */}
          <div style={{ padding:'4px 0' }}>
            <div
              style={{
                display:'flex', alignItems:'center', gap:14, padding:'16px 22px',
                cursor:'pointer',
              }}
              onClick={() => setLunch(v => !v)}
            >
              {/* Icon */}
              <div style={{
                width:46, height:46, borderRadius:14, flexShrink:0, transition:'all 0.25s',
                background: lunch
                  ? 'linear-gradient(135deg,#f97316,#fb923c)'
                  : (isDark?'rgba(255,255,255,0.06)':'#fff7ed'),
                border:`1.5px solid ${lunch?(isDark?'transparent':'#fed7aa'):(isDark?'rgba(255,255,255,0.08)':'#fde8c8')}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: lunch?'0 6px 20px rgba(249,115,22,0.38)':'none',
              }}>
                <Coffee size={20} color={lunch?'#fff':(isDark?'#94a3b8':'#fb923c')} />
              </div>

              {/* Text */}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:14, fontWeight:700, color: lunch?(isDark?'#fed7aa':'#c2410c'):text, margin:0, transition:'color 0.2s' }}>
                  Lunch Break
                </p>
                <p style={{ fontSize:12, color: lunch?(isDark?'#fdba74':'#ea580c'):sub, margin:'2px 0 0', transition:'color 0.2s' }}>
                  {lunch ? `Blocked ${formatTime12(lunchStart)} – ${formatTime12(lunchEnd)}` : "Customers can't book during your break"}
                </p>
              </div>

              {/* Toggle */}
              <div style={{ flexShrink:0 }}>
                <div style={{
                  width:50, height:28, borderRadius:99, position:'relative', transition:'background 0.28s',
                  background: lunch?'#f97316':(isDark?'rgba(255,255,255,0.1)':'#e5e7eb'),
                  boxShadow: lunch?'0 2px 12px rgba(249,115,22,0.4)':'none',
                  cursor:'pointer',
                }}>
                  <div style={{
                    position:'absolute', top:5, left: lunch?28:5,
                    width:18, height:18, borderRadius:'50%', background:'#fff',
                    boxShadow:'0 2px 6px rgba(0,0,0,0.25)',
                    transition:'left 0.28s cubic-bezier(0.34,1.56,0.64,1)',
                  }} />
                </div>
              </div>
            </div>

            {/* Expanded lunch pickers */}
            {lunch && (
              <div className="s6-lunch-expand" style={{
                borderTop:`1px dashed ${isDark?'rgba(251,146,60,0.2)':'rgba(249,115,22,0.15)'}`,
                background: isDark?'rgba(249,115,22,0.04)':'rgba(255,237,213,0.35)',
                padding:'18px 22px 22px',
              }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, justifyContent:'center' }}>
                  <TimePicker label="Break From" value={lunchStart} onChange={setLunchStart} isDark={isDark} />
                  <div style={{ paddingTop:62, color:sub, fontSize:18 }}>☕</div>
                  <TimePicker label="Break Until" value={lunchEnd}   onChange={setLunchEnd}   isDark={isDark} />
                </div>
              </div>
            )}
          </div>

          {/* ── Schedule Preview ── */}
          <div style={{
            margin:'0 16px 16px',
            borderRadius:16,
            background: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.05)',
            border:`1px solid ${isDark?'rgba(124,58,237,0.18)':'rgba(124,58,237,0.12)'}`,
            padding:'12px 16px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#a855f7)' }} />
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', color:purple }}>
                Your Schedule
              </span>
            </div>
            <p style={{ fontSize:13, color: isDark?'#c4b5fd':'#5b21b6', margin:0, fontWeight:500, lineHeight:1.6 }}>
              <strong style={{ fontWeight:800 }}>
                {days.length ? days.join(' · ') : 'No days selected'}
              </strong>
              {days.length > 0 && (
                <>
                  <br />
                  <span style={{ opacity:0.8 }}>
                    {formatTime12(openTime)}
                    {lunch ? ` → ${formatTime12(lunchStart)}, break, ${formatTime12(lunchEnd)}` : ''}
                    {' → '}{formatTime12(closeTime)}
                    {duration && <span style={{ opacity:0.6 }}> · {duration}</span>}
                  </span>
                </>
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
          Continue — Upload Photos & Video
          <ArrowRight size={18} />
        </button>

      </div>
    </>
  );
}
