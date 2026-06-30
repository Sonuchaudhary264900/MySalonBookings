import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, BarChart2, Users, Calendar, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import ROUTES from '../../routes';
import PhoneOtpForm from '../../components/auth/PhoneOtpForm';
import ConfirmModal from '../../components/common/ConfirmModal';

const LOGIN_CSS = `
  @keyframes lgn-orb1{0%,100%{transform:translate(0,0) scale(1);}40%{transform:translate(50px,-60px) scale(1.08);}70%{transform:translate(-30px,40px) scale(0.94);}}
  @keyframes lgn-orb2{0%,100%{transform:translate(0,0) scale(1);}35%{transform:translate(-55px,35px) scale(1.06);}65%{transform:translate(35px,-25px) scale(0.96);}}
  @keyframes lgn-orb3{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(25px,45px) scale(1.05);}}
  @keyframes lgn-fadeup{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
  @keyframes lgn-shimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}
  .lgn-orb1{animation:lgn-orb1 18s ease-in-out infinite;}
  .lgn-orb2{animation:lgn-orb2 22s ease-in-out infinite;}
  .lgn-orb3{animation:lgn-orb3 14s ease-in-out infinite;}
  .lgn-fu1{animation:lgn-fadeup .6s .0s ease both;}
  .lgn-fu2{animation:lgn-fadeup .6s .1s ease both;}
  .lgn-fu3{animation:lgn-fadeup .6s .2s ease both;}
  .lgn-fu4{animation:lgn-fadeup .6s .3s ease both;}
  .lgn-fu5{animation:lgn-fadeup .6s .4s ease both;}
  .lgn-shimmer{background:linear-gradient(90deg,#a78bfa,#60a5fa,#c4b5fd,#a78bfa);background-size:300% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:lgn-shimmer 5s linear infinite;}
  .lgn-link{color:#a78bfa;font-weight:600;text-decoration:none;transition:color .2s;}
  .lgn-link:hover{color:#c4b5fd;}
  .lgn-hero-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px 18px;display:flex;align-items:center;gap:14px;transition:transform .3s,border-color .3s;}
  .lgn-hero-card:hover{transform:translateX(5px);border-color:rgba(139,92,246,0.4);}
  @media(max-width:480px){.lgn-card{padding:24px 20px 20px!important;}.lgn-form-panel{padding:20px 14px!important;}}
  [data-lm] .lgn-hero-card{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.1);}
  [data-lm] .lgn-hero-card:hover{border-color:rgba(199,210,254,0.5);}
  [data-lm] .lgn-link{color:#7c3aed;}
  [data-lm] .lgn-link:hover{color:#6d28d9;}
`;

const HERO_FEATURES = [
  { icon: Calendar,  color: '#818cf8', label: 'Smart Booking Management'   },
  { icon: BarChart2, color: '#6ee7b7', label: 'Real-time Revenue Analytics' },
  { icon: Users,     color: '#fcd34d', label: 'Customer Relationship Tools' },
  { icon: Scissors,  color: '#f9a8d4', label: 'Service & Staff Control'     },
];

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showNoAccountModal, setShowNoAccountModal] = useState(false);
  const [noAccountMsg, setNoAccountMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role === 'staff') { navigate(ROUTES.DASHBOARD, { replace: true }); return; }
    if (user.status === 'mobile_verified') navigate(ROUTES.ONBOARDING, { replace: true });
    else if (user.status === 'pending_approval' || user.status === 'salon_registered') navigate(ROUTES.APPROVAL_WAITING, { replace: true });
    else navigate(ROUTES.DASHBOARD, { replace: true });
  }, [user, navigate]);

  const handleVerified = async (firebaseToken, phone) => {
    try {
      const response = await login(firebaseToken, phone);
      toast.success('Welcome back!');
      // Staff go directly to dashboard — no owner status checks needed
      const staffData = response?.data?.staff;
      if (staffData) { navigate(ROUTES.DASHBOARD, { replace: true }); return; }
      const status = response?.data?.owner?.status;
      if (status === 'mobile_verified') navigate(ROUTES.ONBOARDING, { replace: true });
      else if (status === 'pending_approval' || status === 'salon_registered') navigate(ROUTES.APPROVAL_WAITING, { replace: true });
      else navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('no glowloox') || msg.toLowerCase().includes('not found')) {
        setNoAccountMsg(msg);
        setShowNoAccountModal(true);
      } else {
        throw err;
      }
    }
  };

  const c = isDark;

  return (
    <>
      <style>{LOGIN_CSS}</style>

      <button onClick={toggleTheme} type="button" title={isDark ? 'Light mode' : 'Dark mode'}
        style={{ position:'fixed', top:16, right:16, zIndex:9999, width:40, height:40, borderRadius:'50%',
          background: c ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
          border: c ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.1)',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(8px)', transition:'all 0.2s',
        }}>
        {isDark ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#475569" />}
      </button>

      <div data-lm={c ? undefined : '1'} style={{ minHeight:'100vh', background: c ? '#06060f' : '#f4f6fb', display:'flex', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", position:'relative', overflow:'hidden' }}>

        <div className="lgn-orb1" style={{ position:'absolute', top:'-10%', left:'-5%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.2) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="lgn-orb2" style={{ position:'absolute', bottom:'-10%', right:'-8%', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.16) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="lgn-orb3" style={{ position:'absolute', top:'40%', left:'40%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)', pointerEvents:'none' }} />

        {/* Left hero panel */}
        <div className="hidden lg:flex" style={{ width:'46%', flexDirection:'column', justifyContent:'center', padding:'60px 56px', position:'relative', zIndex:1, background: c ? 'transparent' : 'linear-gradient(160deg,#1e1b4b 0%,#2d1f6e 100%)' }}>
          <div className="lgn-fu1" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:56 }}>
            <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow:'0 0 22px rgba(124,58,237,0.5)' }}><svg viewBox="0 0 512 512" width="58%" height="58%" fill="none"><path d="M256,150 C270,210 310,240 370,256 C310,272 270,300 256,360 C242,300 202,272 142,256 C202,240 242,210 256,150 Z" fill="white"/></svg></div>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' }}>GlowLoox</div>
              <div style={{ fontSize:11, color:'#475569', fontWeight:500 }}>GlowLoox Partner</div>
            </div>
          </div>
          <div className="lgn-fu2" style={{ marginBottom:16 }}>
            <h1 style={{ fontSize:'clamp(2rem,3.5vw,3rem)', fontWeight:800, color:'#f8fafc', lineHeight:1.1, letterSpacing:'-1.5px', margin:0 }}>
              Your business,<br /><span className="lgn-shimmer">fully in control.</span>
            </h1>
          </div>
          <p className="lgn-fu3" style={{ fontSize:15, color:'#475569', lineHeight:1.75, marginBottom:44, maxWidth:380 }}>
            One dashboard to manage bookings, track revenue, handle customers, and grow your beauty business.
          </p>
          <div className="lgn-fu4" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {HERO_FEATURES.map(({ icon: Icon, color, label }) => (
              <div key={label} className="lgn-hero-card">
                <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={17} color={color} />
                </div>
                <span style={{ fontSize:13.5, color:'#94a3b8', fontWeight:500 }}>{label}</span>
              </div>
            ))}
          </div>
          <p className="lgn-fu5" style={{ marginTop:44, fontSize:12, color:'#1e293b' }}>
            Trusted by <strong style={{ color:'#334155' }}>500+ GlowLoox partners</strong> across India
          </p>
        </div>

        {/* Right form panel */}
        <div className="lgn-form-panel" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 24px', position:'relative', zIndex:1 }}>
          <div style={{ width:'100%', maxWidth:440 }}>

            {/* Mobile logo */}
            <div className="flex lg:hidden lgn-fu1 items-center gap-3 justify-center mb-8">
              <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 0 18px rgba(124,58,237,0.5)' }}><svg viewBox="0 0 512 512" width="58%" height="58%" fill="none"><path d="M256,150 C270,210 310,240 370,256 C310,272 270,300 256,360 C242,300 202,272 142,256 C202,240 242,210 256,150 Z" fill="white"/></svg></div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color: c ? '#f1f5f9' : '#0f172a' }}>GlowLoox</div>
                <div style={{ fontSize:11, color:'#64748b' }}>GlowLoox Partner</div>
              </div>
            </div>

            <div className="lgn-fu2 lgn-card" style={{ background: c ? 'rgba(255,255,255,0.04)' : '#ffffff', backdropFilter:'blur(24px)', border:`1px solid ${c ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`, borderRadius:24, padding:'36px 36px 32px', boxShadow: c ? '0 32px 80px rgba(0,0,0,0.5),0 0 60px rgba(124,58,237,0.08)' : '0 32px 80px rgba(0,0,0,0.1)' }}>

              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: c ? '#f1f5f9' : '#0f172a', letterSpacing: '-0.6px', marginBottom: 6 }}>Sign in</h2>
                <p style={{ fontSize: 14, color: c ? '#475569' : '#64748b', margin: 0 }}>Sign in to your GlowLoox Partner dashboard</p>
              </div>

              <PhoneOtpForm
                recaptchaId="lgn-recaptcha"
                isDark={isDark}
                submitLabel="Verify & Sign In"
                onVerified={handleVerified}
                footerSlot={
                  <p style={{ textAlign: 'center', fontSize: 13, color: c ? '#475569' : '#64748b', margin: 0 }}>
                    New here?{' '}
                    <a href={ROUTES.REGISTER} style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>Create an account</a>
                  </p>
                }
              />


            </div>

            <div className="lgn-fu3" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:'6px 20px', marginTop:24 }}>
              <a href={ROUTES.OWNER_TERMS}   className="lgn-link" style={{ fontSize:12 }}>Terms &amp; Conditions</a>
              <span style={{ color: c ? '#1e293b' : '#94a3b8', fontSize:12 }}>·</span>
              <a href={ROUTES.OWNER_PRIVACY} className="lgn-link" style={{ fontSize:12 }}>Privacy Policy</a>
              <span style={{ color: c ? '#1e293b' : '#94a3b8', fontSize:12 }}>·</span>
              <a href="mailto:glowloox@gmail.com" className="lgn-link" style={{ fontSize:12 }}>Contact Support</a>
            </div>
            <p style={{ textAlign:'center', fontSize:11.5, color: c ? '#1e293b' : '#94a3b8', marginTop:14 }}>
              © 2026 GlowLoox by Gigamind Technology Pvt Ltd
            </p>

          </div>
        </div>
      </div>

      {showNoAccountModal && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
          onClick={() => setShowNoAccountModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: isDark ? '#1e293b' : '#fff', borderRadius:20, padding:'28px 28px 24px', maxWidth:400, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,0.35)', border:`1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}` }}>
            <div style={{ fontSize:17, fontWeight:800, color: isDark ? '#f1f5f9' : '#0f172a', marginBottom:10 }}>Number not registered</div>
            <p style={{ fontSize:13.5, color: isDark ? '#94a3b8' : '#475569', lineHeight:1.65, margin:'0 0 8px' }}>
              {noAccountMsg.toLowerCase().includes('staff')
                ? 'Your salon owner hasn\'t added this number to their team yet. Ask them to add you in the Team section of their dashboard.'
                : 'No GlowLoox Partner account found for this number.'}
            </p>
            {!noAccountMsg.toLowerCase().includes('staff') && (
              <p style={{ fontSize:13, color: isDark ? '#64748b' : '#6b7280', margin:'0 0 20px' }}>
                Are you a salon owner? Register to create your account.
              </p>
            )}
            {noAccountMsg.toLowerCase().includes('staff') && (
              <p style={{ fontSize:13, color: isDark ? '#64748b' : '#6b7280', margin:'0 0 20px' }}>
                Once your owner adds your number, you can log in immediately.
              </p>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setShowNoAccountModal(false)}
                style={{ padding:'9px 18px', borderRadius:10, border:`1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db'}`, background:'transparent', color: isDark ? '#94a3b8' : '#374151', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Close
              </button>
              {!noAccountMsg.toLowerCase().includes('staff') && (
                <button onClick={() => navigate(ROUTES.REGISTER, { replace: true })}
                  style={{ padding:'9px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  Register
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
