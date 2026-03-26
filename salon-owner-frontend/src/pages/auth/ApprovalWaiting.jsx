import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, LogOut, RefreshCw, Store } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSalon } from '../../hooks/useSalon';
import ROUTES from '../../routes';

/* ─── CSS injected once ─────────────────────────────────────────────────── */
const AW_CSS = `
  @keyframes aw-orb1 {
    0%,100%{transform:translate(0,0) scale(1)}
    33%{transform:translate(35px,-45px) scale(1.12)}
    66%{transform:translate(-25px,25px) scale(0.9)}
  }
  @keyframes aw-orb2 {
    0%,100%{transform:translate(0,0) scale(1)}
    33%{transform:translate(-35px,35px) scale(1.08)}
    66%{transform:translate(25px,-25px) scale(0.94)}
  }
  @keyframes aw-fadeup {
    from{opacity:0;transform:translateY(24px)}
    to{opacity:1;transform:translateY(0)}
  }
  @keyframes aw-spin {
    to{transform:rotate(360deg)}
  }
  @keyframes aw-pulse-ring {
    0%{transform:scale(1);opacity:0.6}
    100%{transform:scale(1.7);opacity:0}
  }
  @keyframes aw-glow {
    0%,100%{box-shadow:0 0 24px rgba(245,158,11,0.35)}
    50%{box-shadow:0 0 48px rgba(245,158,11,0.6)}
  }
  @keyframes aw-bounce {
    0%,100%{transform:translateY(0)}
    50%{transform:translateY(-6px)}
  }
  .aw-btn-primary {
    background:linear-gradient(135deg,#7c3aed,#3b82f6);
    border:none;
    border-radius:12px;
    color:#fff;
    font-weight:700;
    font-size:15px;
    padding:13px 28px;
    cursor:pointer;
    transition:transform 0.15s, box-shadow 0.15s;
    display:inline-flex;
    align-items:center;
    gap:8px;
    font-family:inherit;
    width:100%;
    justify-content:center;
  }
  .aw-btn-primary:hover:not(:disabled) {
    transform:scale(1.02);
    box-shadow:0 8px 30px rgba(124,58,237,0.4);
  }
  .aw-btn-primary:disabled { opacity:0.55; cursor:not-allowed; }
  .aw-btn-outline {
    background:rgba(255,255,255,0.06);
    border:1.5px solid rgba(255,255,255,0.14);
    border-radius:12px;
    color:#94a3b8;
    font-weight:600;
    font-size:15px;
    padding:12px 28px;
    cursor:pointer;
    transition:background 0.15s, color 0.15s;
    display:inline-flex;
    align-items:center;
    gap:8px;
    font-family:inherit;
    width:100%;
    justify-content:center;
  }
  .aw-btn-outline:hover { background:rgba(255,255,255,0.1); color:#cbd5e1; }
  .aw-step { display:flex; gap:14px; align-items:flex-start; }
  .aw-step-num {
    width:28px; height:28px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:12px; font-weight:700; flex-shrink:0;
    background:rgba(124,58,237,0.2); color:#a78bfa;
    border:1.5px solid rgba(124,58,237,0.35);
  }
`;

/* ─── Timeline steps data ───────────────────────────────────────────────── */
const TIMELINE = [
  { id:1, label:'Application Submitted', sub:'Your salon info has been received', done:true  },
  { id:2, label:'Under Review',          sub:'Our team verifies your details',     active:true },
  { id:3, label:'Decision Made',         sub:'Approval or feedback within 24–48h', done:false },
  { id:4, label:'Go Live',              sub:'Start accepting bookings',            done:false },
];

const NEXT_STEPS = [
  "Our team will verify your salon information and documents",
  "We'll check your business credentials and photos",
  "You'll receive a notification via email once approved",
  "Access your full dashboard to add services, barbers & more",
];

/* ─── Component ─────────────────────────────────────────────────────────── */
const ApprovalWaiting = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { salon, fetchSalon } = useSalon();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Auto-check on mount
  useEffect(() => {
    const checkApproval = async () => {
      setLoading(true);
      try { await fetchSalon(); } catch (e) { console.error('Error fetching salon:', e); }
      finally { setLoading(false); }
    };
    checkApproval();
  }, []);

  // Redirect when approved
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

  /* ─── Render ───────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{AW_CSS}</style>
      <div style={{
        minHeight: '100vh',
        background: '#06060f',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}>
        {/* Orbs */}
        <div style={{ position:'fixed', top:'-20%', left:'-10%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(245,158,11,0.14) 0%,transparent 70%)', animation:'aw-orb1 20s ease-in-out infinite', pointerEvents:'none', zIndex:0 }} />
        <div style={{ position:'fixed', bottom:'-20%', right:'-10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%)', animation:'aw-orb2 24s ease-in-out infinite', pointerEvents:'none', zIndex:0 }} />

        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:520, animation:'aw-fadeup 0.6s ease' }}>

          {/* ── Brand ── */}
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:38, height:38, borderRadius:9, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Store size={18} color="#fff" />
              </div>
              <span style={{ fontSize:17, fontWeight:700, color:'#f1f5f9' }}>My Salon Bookings</span>
            </div>
          </div>

          {/* ── Main card ── */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1.5px solid rgba(255,255,255,0.08)', borderRadius:22, overflow:'hidden' }}>

            {/* Header strip */}
            <div style={{
              background: isApproved ? 'linear-gradient(135deg,rgba(34,197,94,0.25),rgba(16,185,129,0.15))' : isRejected ? 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(185,28,28,0.15))' : 'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(234,88,12,0.12))',
              borderBottom: `1px solid ${isApproved ? 'rgba(34,197,94,0.2)' : isRejected ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
              padding: '32px 36px',
              textAlign: 'center',
            }}>
              {/* Animated clock icon */}
              <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                {/* Pulse rings */}
                {!isApproved && !isRejected && (
                  <>
                    <div style={{ position:'absolute', width:80, height:80, borderRadius:'50%', border:`2px solid rgba(245,158,11,0.4)`, animation:'aw-pulse-ring 2s ease-out infinite' }} />
                    <div style={{ position:'absolute', width:80, height:80, borderRadius:'50%', border:`2px solid rgba(245,158,11,0.3)`, animation:'aw-pulse-ring 2s ease-out infinite 0.5s' }} />
                  </>
                )}
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: isApproved ? 'rgba(34,197,94,0.2)' : isRejected ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.15)',
                  border: `2px solid ${isApproved ? 'rgba(34,197,94,0.5)' : isRejected ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.45)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: !isApproved && !isRejected ? 'aw-glow 2.5s ease-in-out infinite' : 'none',
                }}>
                  {isApproved ? (
                    <CheckCircle size={36} color="#4ade80" />
                  ) : isRejected ? (
                    <span style={{ fontSize:32 }}>✗</span>
                  ) : (
                    <Clock size={34} color="#fbbf24" style={{ animation:'aw-bounce 2s ease-in-out infinite' }} />
                  )}
                </div>
              </div>

              <h1 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', margin:0, marginBottom:8, letterSpacing:'-0.3px' }}>
                {isApproved ? 'Salon Approved! 🎉' : isRejected ? 'Application Rejected' : 'Application Under Review'}
              </h1>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:14, margin:0 }}>
                {isApproved
                  ? 'Your salon is live — redirecting to dashboard…'
                  : isRejected
                  ? 'Please contact support for details'
                  : "We're verifying your salon — typically 24–48 hours"}
              </p>
            </div>

            <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:22 }}>

              {/* ── Status card ── */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {[
                    { label: 'Status', value: isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending Approval',
                      color: isApproved ? '#4ade80' : isRejected ? '#f87171' : '#fbbf24' },
                    { label: 'Salon',  value: salon?.name || 'Loading…', color: '#e2e8f0' },
                    { label: 'Owner',  value: user?.name  || 'Loading…', color: '#e2e8f0' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ color:'rgba(255,255,255,0.45)', fontSize:13 }}>{label}</span>
                      <span style={{ color, fontSize:14, fontWeight:600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Timeline ── */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 16px' }}>Approval Timeline</p>
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {TIMELINE.map((item, idx) => (
                    <div key={item.id} style={{ display:'flex', gap:14 }}>
                      {/* Icon + line */}
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: item.done || (item.active && !isApproved) ? (item.done ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)') : 'rgba(255,255,255,0.05)',
                          border: `2px solid ${item.done ? 'rgba(34,197,94,0.5)' : item.active && !isApproved ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        }}>
                          {item.done ? (
                            <CheckCircle size={14} color="#4ade80" />
                          ) : item.active && !isApproved ? (
                            <Clock size={14} color="#fbbf24" style={{ animation:'aw-spin 3s linear infinite' }} />
                          ) : (
                            <div style={{ width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.2)' }} />
                          )}
                        </div>
                        {idx < TIMELINE.length - 1 && (
                          <div style={{ width:2, flex:1, minHeight:20, margin:'4px 0', background: item.done ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)', borderRadius:1 }} />
                        )}
                      </div>
                      {/* Text */}
                      <div style={{ paddingBottom: idx < TIMELINE.length - 1 ? 20 : 0 }}>
                        <p style={{ color: item.done || item.active ? '#f1f5f9' : 'rgba(255,255,255,0.35)', fontWeight: item.active ? 600 : 500, fontSize:14, margin:'4px 0 2px' }}>{item.label}</p>
                        <p style={{ color:'rgba(255,255,255,0.35)', fontSize:12, margin:0 }}>{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── What happens next ── */}
              <div style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.18)', borderRadius:14, padding:'16px 20px' }}>
                <p style={{ color:'#818cf8', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 14px' }}>What Happens Next?</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {NEXT_STEPS.map((step, idx) => (
                    <div key={idx} className="aw-step">
                      <div className="aw-step-num">{idx + 1}</div>
                      <p style={{ color:'rgba(255,255,255,0.6)', fontSize:13, margin:'4px 0 0', lineHeight:1.5 }}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Support ── */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 18px', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>💬</span>
                <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13, margin:0 }}>
                  Need help? Email us at{' '}
                  <a href="mailto:support@mysalonbookings.com" style={{ color:'#818cf8', textDecoration:'none', fontWeight:500 }}>
                    support@mysalonbookings.com
                  </a>
                </p>
              </div>

              {/* ── Buttons ── */}
              <div style={{ display:'flex', flexDirection:'column', gap:12, paddingTop:4 }}>
                <button className="aw-btn-primary" onClick={handleCheckStatus} disabled={checkingStatus || loading}>
                  {checkingStatus ? (
                    <>
                      <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'aw-spin 0.7s linear infinite' }} />
                      Checking…
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Refresh Status
                    </>
                  )}
                </button>

                <button className="aw-btn-outline" onClick={handleLogout} disabled={checkingStatus}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:12, marginTop:28 }}>
            © 2026 My Salon Bookings by Gigamind Technology Pvt Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
};

export default ApprovalWaiting;
