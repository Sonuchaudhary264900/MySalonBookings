import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';

const S6_CSS = `
  @keyframes s6-fadeup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s6-bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}
  @keyframes s6-slide-in{from{opacity:0;max-height:0}to{opacity:1;max-height:200px}}
  .s6-fu1{animation:s6-fadeup 0.45s 0s ease both}
  .s6-fu2{animation:s6-fadeup 0.45s 0.1s ease both}
  .s6-fu3{animation:s6-fadeup 0.45s 0.2s ease both}
  .s6-day{transition:all 0.18s cubic-bezier(0.34,1.56,0.64,1);cursor:pointer;user-select:none;}
  .s6-day:hover{transform:scale(1.06)!important;}
  .s6-day.active{animation:s6-bounce 0.3s ease}
  .s6-preset{transition:all 0.15s;cursor:pointer;}
  .s6-preset:hover{background:rgba(124,58,237,0.2)!important;}
  .s6-time-btn{transition:all 0.1s;cursor:pointer;}
  .s6-time-btn:hover{background:rgba(124,58,237,0.2)!important;}
  .s6-btn{transition:transform 0.15s,box-shadow 0.15s;}
  .s6-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 30px rgba(124,58,237,0.5)!important;}
`;

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PRESETS = [
  { label: 'Weekdays', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { label: 'Mon–Sat',  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  { label: 'All 7 Days', days: ALL_DAYS },
];

function stepTime(t, delta) {
  const [h, m] = t.split(':').map(Number);
  const total  = h * 60 + m + delta;
  const newH   = Math.max(0, Math.min(23, Math.floor(((total % 1440) + 1440) % 1440 / 60)));
  const newM   = ((total % 30) + 30) % 30 === 0 ? (m === 0 ? 30 : 0) : (m < 30 ? 30 : 0);
  const adjH   = delta > 0 ? (m >= 30 ? newH + 1 : newH) : (m <= 30 && m > 0 ? newH : newH);
  const finalM = delta > 0 ? (m < 30 ? 30 : 0) : (m <= 30 && m > 0 ? 0 : 30);
  const finalH = delta > 0 ? (m >= 30 ? (h + 1) % 24 : h) : (m === 0 ? Math.max(0, h - 1) : h);
  return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
}

function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr   = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

function TimePicker({ label, value, onChange, isDark, min, max }) {
  const border = isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db';
  const bg     = isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb';
  const text   = isDark ? '#f1f5f9' : '#111827';
  const sub    = isDark ? '#94a3b8' : '#6b7280';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: sub, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        border: `1.5px solid ${border}`, borderRadius: 14, overflow: 'hidden', background: bg,
      }}>
        <button className="s6-time-btn" onClick={() => onChange(stepTime(value, 30))}
          style={{ padding: '8px 20px', background: 'none', border: 'none', color: sub, fontSize: 18, fontFamily: 'inherit', cursor: 'pointer' }}>▲</button>
        <div style={{ padding: '8px 20px', fontSize: 20, fontWeight: 800, color: text, minWidth: 70, textAlign: 'center', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
          {formatTime12(value)}
        </div>
        <button className="s6-time-btn" onClick={() => onChange(stepTime(value, -30))}
          style={{ padding: '8px 20px', background: 'none', border: 'none', color: sub, fontSize: 18, fontFamily: 'inherit', cursor: 'pointer' }}>▼</button>
      </div>
    </div>
  );
}

export default function Step6_WorkingHours() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const [days,      setDays]      = useState(data.workingDays);
  const [openTime,  setOpenTime]  = useState(data.openTime  || '09:00');
  const [closeTime, setCloseTime] = useState(data.closeTime || '21:00');
  const [lunch,     setLunch]     = useState(data.hasLunchBreak || false);
  const [lunchStart, setLunchStart] = useState(data.lunchStart || '13:00');
  const [lunchEnd,   setLunchEnd]   = useState(data.lunchEnd   || '14:00');
  const [bounced, setBounced] = useState(null);

  const toggleDay = (day) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    setBounced(day);
    setTimeout(() => setBounced(null), 350);
  };

  const applyPreset = (preset) => setDays(preset.days);

  const handleNext = () => {
    if (days.length === 0) { toast.error('Select at least one working day'); return; }
    update({ workingDays: days, openTime, closeTime, hasLunchBreak: lunch, lunchStart, lunchEnd });
    toast.success('Your schedule is set! Customers will know exactly when to visit. 🗓️');
    nextStep();
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,0.1)'  : '#e5e7eb';
  const text   = isDark ? '#f1f5f9' : '#111827';
  const sub    = isDark ? '#94a3b8' : '#6b7280';

  return (
    <>
      <style>{S6_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Header */}
        <div className="s6-fu1">
          <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            When are you open? 🕘
          </h1>
          <p style={{ color: sub, fontSize: 14, margin: 0 }}>
            You can always change this later from your dashboard.
          </p>
        </div>

        <div className="s6-fu2" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 24, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 22, boxShadow: isDark ? 'none' : '0 8px 40px rgba(124,58,237,0.07)' }}>

          {/* Days */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: sub, marginBottom: 10 }}>
              Days of Operation
            </label>

            {/* Quick presets */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {PRESETS.map(p => (
                <button key={p.label} className="s6-preset"
                  onClick={() => applyPreset(p)}
                  style={{
                    padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db'}`,
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                    color: sub, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Day pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALL_DAYS.map(day => {
                const on = days.includes(day);
                return (
                  <button key={day} className={`s6-day${bounced === day ? ' active' : ''}`}
                    onClick={() => toggleDay(day)}
                    style={{
                      padding: '8px 14px', borderRadius: 12, fontFamily: 'inherit',
                      fontWeight: 700, fontSize: 13, border: `2px solid ${on ? '#7c3aed' : (isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db')}`,
                      background: on ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : (isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb'),
                      color: on ? '#fff' : sub,
                      boxShadow: on ? '0 2px 12px rgba(124,58,237,0.35)' : 'none',
                      transform: on ? 'scale(1.04)' : 'scale(1)',
                    }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Open / Close time */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: sub, marginBottom: 14 }}>
              Opening & Closing Time
            </label>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              <TimePicker label="Opens" value={openTime}  onChange={setOpenTime}  isDark={isDark} />
              <span style={{ fontSize: 20, color: sub, alignSelf: 'center', marginTop: 20 }}>→</span>
              <TimePicker label="Closes" value={closeTime} onChange={setCloseTime} isDark={isDark} />
            </div>
          </div>

          {/* Lunch break */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: lunch ? 16 : 0 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: text, margin: 0 }}>Add Lunch Break</p>
                <p style={{ fontSize: 11, color: sub, margin: '2px 0 0' }}>Block time so customers can't book during lunch</p>
              </div>
              {/* Toggle */}
              <label style={{ cursor: 'pointer', position: 'relative' }}>
                <input type="checkbox" checked={lunch} onChange={e => setLunch(e.target.checked)} style={{ opacity: 0, width: 0 }} />
                <div style={{
                  width: 44, height: 24, borderRadius: 99, transition: 'background 0.2s',
                  background: lunch ? '#7c3aed' : (isDark ? 'rgba(255,255,255,0.1)' : '#d1d5db'),
                }}>
                  <div style={{
                    position: 'absolute', top: 4, left: lunch ? 24 : 4,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                  }} />
                </div>
              </label>
            </div>

            {lunch && (
              <div style={{ animation: 's6-slide-in 0.3s ease', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <TimePicker label="Lunch from" value={lunchStart} onChange={setLunchStart} isDark={isDark} />
                  <span style={{ fontSize: 20, color: sub, alignSelf: 'center', marginTop: 20 }}>→</span>
                  <TimePicker label="Lunch to"   value={lunchEnd}   onChange={setLunchEnd}   isDark={isDark} />
                </div>
              </div>
            )}
          </div>

          {/* Preview summary */}
          <div style={{
            background: isDark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.05)',
            border: `1px solid ${isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.15)'}`,
            borderRadius: 12, padding: '10px 16px',
          }}>
            <p style={{ fontSize: 13, color: isDark ? '#c4b5fd' : '#6d28d9', margin: 0, fontWeight: 500 }}>
              📅{' '}
              <strong>{days.join(' · ') || 'No days selected'}</strong>
              {' · '}
              {formatTime12(openTime)} – {lunch ? `${formatTime12(openTime)} – ${formatTime12(lunchStart)} · Break · ${formatTime12(lunchEnd)} – ${formatTime12(closeTime)}` : formatTime12(closeTime)}
            </p>
          </div>
        </div>

        {/* Continue */}
        <button className="s6-btn s6-fu3" onClick={handleNext}
          style={{
            width: '100%', padding: '15px 24px', borderRadius: 14,
            background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
            color: '#fff', fontWeight: 700, fontSize: 16, border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
          }}>
          Continue — Upload Photos & Video <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
