import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, LogOut, RefreshCw, Store, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSalon } from '../../hooks/useSalon';
import { useTheme } from '../../context/ThemeContext';
import ROUTES from '../../routes';

/* ─── CSS ──────────────────────────────────────────────────────────────────── */
const AW_CSS = `
  @keyframes aw-orb1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(35px,-45px) scale(1.12)}66%{transform:translate(-25px,25px) scale(0.9)}}
  @keyframes aw-orb2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-35px,35px) scale(1.08)}66%{transform:translate(25px,-25px) scale(0.94)}}
  @keyframes aw-fadeup{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes aw-spin{to{transform:rotate(360deg)}}
  @keyframes aw-pulse-ring{0%{transform:scale(1);opacity:0.6}100%{transform:scale(1.7);opacity:0}}
  @keyframes aw-glow{0%,100%{box-shadow:0 0 24px rgba(245,158,11,0.35)}50%{box-shadow:0 0 48px rgba(245,158,11,0.6)}}
  @keyframes aw-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}

  .aw-btn-primary{
    background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:12px;color:#fff;
    font-weight:700;font-size:15px;padding:14px 28px;cursor:pointer;
    transition:transform 0.15s,box-shadow 0.15s;display:inline-flex;align-items:center;gap:8px;
    font-family:inherit;width:100%;justify-content:center;
  }
  .aw-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 28px rgba(99,102,241,0.4);}
  .aw-btn-primary:disabled{opacity:0.5;cursor:not-allowed;}

  .aw-btn-outline{
    background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.15);border-radius:12px;
    color:#94a3b8;font-weight:600;font-size:15px;padding:13px 28px;cursor:pointer;
    transition:background 0.15s,border-color 0.15s,color 0.15s;display:inline-flex;align-items:center;gap:8px;
    font-family:inherit;width:100%;justify-content:center;
  }
  .aw-btn-outline:hover{background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.25);color:#e2e8f0;}

  [data-lm] .aw-btn-outline{background:#fff;border:1.5px solid #d1d5db;color:#374151;}
  [data-lm] .aw-btn-outline:hover{background:#f5f3ff;border-color:#6366f1;color:#4f46e5;}
`;

/* ─── Data ──────────────────────────────────────────────────────────────────── */
const TIMELINE = [
  { id:1, label:'Application Submitted', sub:'Your salon info has been received',    done:true   },
  { id:2, label:'Under Review',          sub:'Our team verifies your details',        active:true },
  { id:3, label:'Decision Made',         sub:'Approval or feedback within 24–48h',   done:false  },
  { id:4, label:'Go Live',              sub:'Start accepting bookings',              done:false  },
];

const NEXT_STEPS = [
  'Our team will verify your salon information and documents',
  "We'll check your business credentials and photos",
  "You'll receive a notification via email once approved",
  'Access your full dashboard to add services, staff & more',
];

/* ─── Component ─────────────────────────────────────────────────────────── */
const ApprovalWaiting = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { salon, fetchSalon } = useSalon();
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading]           = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [redirecting, setRedirecting]   = useState(false);

  useEffect(() => {
    const check = async () => {
      setLoading(true);
      try { await fetchSalon(); } catch (e) { console.error('Error fetching salon:', e); }
      finally { setLoading(false); }
    };
    check();
  }, []);

  useEffect(() => {
    if (salon?.approvalStatus === 'approved' && !redirecting) {
      setRedirecting(true);
      refreshUser().then(() => navigate(ROUTES.DASHBOARD));
    }
  }, [salon?.approvalStatus, navigate, refreshUser, redirecting]);

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try { await fetchSalon(); } catch (e) { console.error('Error checking status:', e); }
    finally { setCheckingStatus(false); }
  };

  const handleLogout = () => { logout(); navigate(ROUTES.LOGIN); };

  const isApproved = salon?.approvalStatus === 'approved';
  const isRejected = salon?.approvalStatus === 'rejected';

  /* ── Theme tokens ── */
  const bg          = isDark ? '#07071a' : '#f1f4ff';
  const cardBg      = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const cardBorder  = isDark ? '1.5px solid rgba(255,255,255,0.09)' : '1.5px solid #e5e7eb';
  const cardShadow  = isDark ? 'none' : '0 20px 60px rgba(99,102,241,0.1), 0 4px 16px rgba(0,0,0,0.06)';
  const innerBg     = isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb';
  const innerBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textMuted   = isDark ? 'rgba(255,255,255,0.5)'  : '#6b7280';
  const textFaint   = isDark ? 'rgba(255,255,255,0.32)' : '#9ca3af';
  const labelColor  = isDark ? 'rgba(255,255,255,0.42)' : '#6b7280';
  const sectionHd   = isDark ? 'rgba(255,255,255,0.38)' : '#9ca3af';
  const tlConnector = isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const tlInactive  = isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6';
  const tlInactiveBorder = isDark ? 'rgba(255,255,255,0.1)' : '#d1d5db';
  const tlInactiveDot    = isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db';
  const nextBg      = isDark ? 'rgba(99,102,241,0.07)' : '#eef2ff';
  const nextBorder  = isDark ? 'rgba(99,102,241,0.2)'  : '#c7d2fe';
  const nextHd      = isDark ? '#818cf8' : '#4f46e5';
  const nextText    = isDark ? 'rgba(255,255,255,0.65)' : '#374151';
  const nextNumBg   = isDark ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.12)';
  const nextNumColor = isDark ? '#a5b4fc' : '#4f46e5';
  const nextNumBorder = isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)';
  const supportBg   = isDark ? 'rgba(255,255,255,0.03)' : '#f8faff';
  const supportBorder = isDark ? 'rgba(255,255,255,0.07)' : '#e0e7ff';
  const supportText  = isDark ? 'rgba(255,255,255,0.45)' : '#4b5563';
  const footerColor  = isDark ? 'rgba(255,255,255,0.18)' : '#9ca3af';
  const headerTextPrimary = isApproved || isRejected || !isDark ? textPrimary : '#f8fafc';
  const headerTextMuted   = !isDark ? textMuted : 'rgba(255,255,255,0.55)';

  /* ─── Render ───────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{AW_CSS}</style>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        type="button"
        aria-label="Toggle theme"
        style={{
          position:'fixed', top:16, right:16, zIndex:9999,
          width:40, height:40, borderRadius:'50%',
          background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
          border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid #e5e7eb',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(8px)', transition:'all 0.2s ease',
          boxShadow: isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        {isDark ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#6366f1" />}
      </button>

      <div
        data-lm={isDark ? undefined : '1'}
        style={{
          minHeight:'calc(var(--vh, 1vh) * 100)', background:bg, position:'relative', overflow:'hidden',
          fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
          display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 16px',
          transition:'background 0.3s ease',
        }}
      >
        {/* Ambient orbs */}
        <div style={{ position:'fixed', top:'-20%', left:'-10%', width:600, height:600, borderRadius:'50%', background:`radial-gradient(circle,${isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.1)'} 0%,transparent 70%)`, animation:'aw-orb1 20s ease-in-out infinite', pointerEvents:'none', zIndex:0 }} />
        <div style={{ position:'fixed', bottom:'-20%', right:'-10%', width:500, height:500, borderRadius:'50%', background:`radial-gradient(circle,${isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.1)'} 0%,transparent 70%)`, animation:'aw-orb2 24s ease-in-out infinite', pointerEvents:'none', zIndex:0 }} />

        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:520, animation:'aw-fadeup 0.6s ease' }}>

          {/* ── Brand ── */}
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:9, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 18px rgba(99,102,241,0.35)' }}>
                <Store size={18} color="#fff" />
              </div>
              <span style={{ fontSize:17, fontWeight:700, color:textPrimary }}>GlowLoox</span>
            </div>
          </div>

          {/* ── Main card ── */}
          <div style={{ background:cardBg, border:cardBorder, borderRadius:22, overflow:'hidden', boxShadow:cardShadow, transition:'background 0.2s,border-color 0.2s,box-shadow 0.3s' }}>

            {/* Header strip */}
            <div style={{
              background: isApproved
                ? (isDark ? 'linear-gradient(135deg,rgba(34,197,94,0.22),rgba(16,185,129,0.14))' : 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(16,185,129,0.08))')
                : isRejected
                ? (isDark ? 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(185,28,28,0.14))' : 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(185,28,28,0.06))')
                : (isDark ? 'linear-gradient(135deg,rgba(245,158,11,0.18),rgba(234,88,12,0.1))' : 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(234,88,12,0.06))'),
              borderBottom: `1px solid ${isApproved ? (isDark ? 'rgba(34,197,94,0.2)' : '#bbf7d0') : isRejected ? (isDark ? 'rgba(239,68,68,0.2)' : '#fecaca') : (isDark ? 'rgba(245,158,11,0.2)' : '#fde68a')}`,
              padding:'32px 36px', textAlign:'center',
            }}>
              {/* Animated status icon */}
              <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                {!isApproved && !isRejected && (
                  <>
                    <div style={{ position:'absolute', width:80, height:80, borderRadius:'50%', border:'2px solid rgba(245,158,11,0.4)', animation:'aw-pulse-ring 2s ease-out infinite' }} />
                    <div style={{ position:'absolute', width:80, height:80, borderRadius:'50%', border:'2px solid rgba(245,158,11,0.3)', animation:'aw-pulse-ring 2s ease-out infinite 0.5s' }} />
                  </>
                )}
                <div style={{
                  width:72, height:72, borderRadius:'50%',
                  background: isApproved ? (isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)') : isRejected ? (isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)') : (isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.12)'),
                  border: `2px solid ${isApproved ? 'rgba(34,197,94,0.5)' : isRejected ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.5)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  animation: !isApproved && !isRejected ? 'aw-glow 2.5s ease-in-out infinite' : 'none',
                }}>
                  {isApproved ? (
                    <CheckCircle size={36} color="#22c55e" />
                  ) : isRejected ? (
                    <span style={{ fontSize:32, color:'#ef4444' }}>✗</span>
                  ) : (
                    <Clock size={34} color="#f59e0b" style={{ animation:'aw-bounce 2s ease-in-out infinite' }} />
                  )}
                </div>
              </div>

              <h1 style={{ fontSize:22, fontWeight:800, color:textPrimary, margin:0, marginBottom:8, letterSpacing:'-0.3px' }}>
                {isApproved ? 'Salon Approved! 🎉' : isRejected ? 'Application Rejected' : 'Application Under Review'}
              </h1>
              <p style={{ color:textMuted, fontSize:14, margin:0 }}>
                {isApproved
                  ? 'Your salon is live — redirecting to dashboard…'
                  : isRejected
                  ? 'Please contact support for details'
                  : "We're verifying your salon — typically 24–48 hours"}
              </p>
            </div>

            <div style={{ padding:'28px 28px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* ── Status info card ── */}
              <div style={{ background:innerBg, border:innerBorder, borderRadius:14, padding:'16px 20px', transition:'background 0.2s,border-color 0.2s' }}>
                <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:sectionHd, margin:'0 0 14px' }}>Application Status</p>
                {!salon && !loading ? (
                  /* Salon not found — likely phone-conflict 409 navigated here incorrectly */
                  <div style={{ textAlign:'center', padding:'12px 0' }}>
                    <p style={{ color: isDark ? '#f87171' : '#dc2626', fontSize:13, fontWeight:600, margin:'0 0 8px' }}>
                      ⚠️ Salon data not found for your account
                    </p>
                    <p style={{ color:textMuted, fontSize:12, margin:'0 0 12px', lineHeight:1.5 }}>
                      Your salon may not have been registered yet, or there was a phone number conflict during registration. Please go back and register again.
                    </p>
                    <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                      <button
                        onClick={handleCheckStatus}
                        style={{ background:'none', border:`1.5px solid ${isDark ? 'rgba(99,102,241,0.5)' : '#6366f1'}`, borderRadius:8, color: isDark ? '#a5b4fc' : '#4f46e5', fontSize:13, fontWeight:600, padding:'7px 16px', cursor:'pointer', fontFamily:'inherit' }}
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => navigate(ROUTES.SALON_REGISTER)}
                        style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:600, padding:'7px 16px', cursor:'pointer', fontFamily:'inherit' }}
                      >
                        Register Salon →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
                    {[
                      {
                        label:'Status',
                        value: isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending Approval',
                        color: isApproved ? '#22c55e' : isRejected ? '#ef4444' : '#f59e0b',
                      },
                      { label:'Salon', value: loading ? 'Loading…' : (salon?.name || '—'), color: textPrimary },
                      { label:'Owner', value: user?.name || '—', color: textPrimary },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                        <span style={{ color:labelColor, fontSize:13, fontWeight:500 }}>{label}</span>
                        <span style={{ color, fontSize:14, fontWeight:600, textAlign:'right' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Timeline ── */}
              <div style={{ background:innerBg, border:innerBorder, borderRadius:14, padding:'16px 20px', transition:'background 0.2s,border-color 0.2s' }}>
                <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:sectionHd, margin:'0 0 16px' }}>Approval Timeline</p>
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {TIMELINE.map((item, idx) => (
                    <div key={item.id} style={{ display:'flex', gap:14 }}>
                      {/* Icon + connector */}
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                        <div style={{
                          width:32, height:32, borderRadius:'50%', flexShrink:0,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          background: item.done
                            ? (isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.12)')
                            : (item.active && !isApproved)
                            ? (isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.12)')
                            : tlInactive,
                          border: `2px solid ${item.done ? 'rgba(34,197,94,0.55)' : item.active && !isApproved ? 'rgba(245,158,11,0.55)' : tlInactiveBorder}`,
                        }}>
                          {item.done ? (
                            <CheckCircle size={14} color="#22c55e" />
                          ) : item.active && !isApproved ? (
                            <Clock size={14} color="#f59e0b" style={{ animation:'aw-spin 3s linear infinite' }} />
                          ) : (
                            <div style={{ width:8, height:8, borderRadius:'50%', background:tlInactiveDot }} />
                          )}
                        </div>
                        {idx < TIMELINE.length - 1 && (
                          <div style={{ width:2, flex:1, minHeight:20, margin:'4px 0', background: item.done ? 'rgba(34,197,94,0.4)' : tlConnector, borderRadius:1 }} />
                        )}
                      </div>
                      {/* Text */}
                      <div style={{ paddingBottom: idx < TIMELINE.length - 1 ? 20 : 0, paddingTop:4 }}>
                        <p style={{
                          color: item.done || item.active ? textPrimary : textFaint,
                          fontWeight: item.active ? 600 : 500, fontSize:14, margin:'0 0 2px',
                        }}>{item.label}</p>
                        <p style={{ color:textFaint, fontSize:12, margin:0, lineHeight:1.4 }}>{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── What happens next ── */}
              <div style={{ background:nextBg, border:`1px solid ${nextBorder}`, borderRadius:14, padding:'16px 20px', transition:'background 0.2s,border-color 0.2s' }}>
                <p style={{ color:nextHd, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 14px' }}>What Happens Next?</p>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {NEXT_STEPS.map((step, idx) => (
                    <div key={idx} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                      <div style={{
                        width:26, height:26, borderRadius:'50%', flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        background:nextNumBg, color:nextNumColor,
                        border:`1.5px solid ${nextNumBorder}`, fontSize:12, fontWeight:700,
                      }}>{idx + 1}</div>
                      <p style={{ color:nextText, fontSize:13, margin:'4px 0 0', lineHeight:1.5 }}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Support ── */}
              <div style={{ background:supportBg, border:`1px solid ${supportBorder}`, borderRadius:12, padding:'12px 18px', display:'flex', alignItems:'center', gap:10, transition:'background 0.2s' }}>
                <span style={{ fontSize:18, flexShrink:0 }}>💬</span>
                <p style={{ color:supportText, fontSize:13, margin:0, lineHeight:1.5 }}>
                  Need help? Email us at{' '}
                  <a href="mailto:glowloox@gmail.com" style={{ color: isDark ? '#818cf8' : '#4f46e5', textDecoration:'none', fontWeight:600 }}>
                    glowloox@gmail.com
                  </a>
                </p>
              </div>

              {/* ── Action buttons ── */}
              <div style={{ display:'flex', flexDirection:'column', gap:10, paddingTop:4 }}>
                <button className="aw-btn-primary" onClick={handleCheckStatus} disabled={checkingStatus || loading}>
                  {checkingStatus ? (
                    <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'aw-spin 0.7s linear infinite' }} />Checking…</>
                  ) : (
                    <><RefreshCw size={16} />Refresh Status</>
                  )}
                </button>
                <button className="aw-btn-outline" onClick={handleLogout} disabled={checkingStatus}>
                  <LogOut size={16} />Logout
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p style={{ textAlign:'center', color:footerColor, fontSize:12, marginTop:24 }}>
            © 2026 GlowLoox by Gigamind Technology Pvt Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
};

export default ApprovalWaiting;
