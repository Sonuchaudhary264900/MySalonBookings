import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SalonProvider } from './context/SalonContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import ROUTES from './routes';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import api from './services/api';

// ── Eagerly loaded (critical path — shown immediately) ─────────
import Login from './pages/auth/Login';

// ── Lazily loaded (split into separate chunks) ─────────────────
const Register         = lazy(() => import('./pages/auth/Register'));
const ApprovalWaiting  = lazy(() => import('./pages/auth/ApprovalWaiting'));
const SalonRegistration = lazy(() => import('./pages/salon/SalonRegistration'));
const Dashboard        = lazy(() => import('./pages/dashboard/Dashboard'));
const Services         = lazy(() => import('./pages/dashboard/Services'));
const Bookings         = lazy(() => import('./pages/dashboard/Bookings'));
const Reports          = lazy(() => import('./pages/dashboard/Reports'));
const Reviews          = lazy(() => import('./pages/dashboard/Reviews'));
const Profile          = lazy(() => import('./pages/dashboard/Profile'));
const Settings         = lazy(() => import('./pages/dashboard/Settings'));
const Notifications    = lazy(() => import('./pages/dashboard/Notifications'));
const Gallery          = lazy(() => import('./pages/dashboard/Gallery'));
const CalendarPage     = lazy(() => import('./pages/dashboard/CalendarPage'));
const Customers        = lazy(() => import('./pages/dashboard/Customers'));
const Coupons          = lazy(() => import('./pages/dashboard/Coupons'));
const Billing          = lazy(() => import('./pages/dashboard/Billing'));
const PrivacyPolicy        = lazy(() => import('./pages/PrivacyPolicy'));
const TermsAndConditions   = lazy(() => import('./pages/TermsAndConditions'));
const LegalIndex           = lazy(() => import('./pages/legal/LegalIndex'));
const CustomerPrivacyPolicy = lazy(() => import('./pages/legal/CustomerPrivacyPolicy'));
const OwnerPrivacyPolicy   = lazy(() => import('./pages/legal/OwnerPrivacyPolicy'));
const CustomerTerms        = lazy(() => import('./pages/legal/CustomerTerms'));
const OwnerTerms           = lazy(() => import('./pages/legal/OwnerTerms'));

// ── Page loading fallback ──────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    </div>
  );
}

// ── Error Boundary ─────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-8 max-w-sm w-full text-center shadow-sm">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-5">An unexpected error occurred.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Pending booking alert modal (mandatory accept/reject) ──────
function BookingAlertModal() {
  const { pendingBooking, clearPendingBooking } = useNotifications();
  const [saving, setSaving] = useState(false);

  if (!pendingBooking) return null;
  const b = pendingBooking;

  const act = async (status) => {
    setSaving(true);
    try {
      await api.put(`/owner/bookings/${b._id}`, { status });
    } catch { /* silent */ } finally {
      setSaving(false);
      clearPendingBooking();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Red top bar */}
        <div className="bg-red-600 px-5 py-4">
          <p className="text-white font-bold text-base">New Booking Request</p>
          <p className="text-red-200 text-xs mt-0.5">Action required — accept or reject</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Customer', value: b.customerName || '—' },
              { label: 'Service',  value: b.serviceName  || '—' },
              { label: 'Date',     value: b.appointmentDate ? new Date(b.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
              { label: 'Time',     value: b.appointmentTime || '—' },
              { label: 'Amount',   value: b.totalAmount ? `₹${b.totalAmount}` : '—' },
              { label: 'Phone',    value: b.customerPhone || '—' },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => act('cancelled')}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => act('confirmed')}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Landing page ───────────────────────────────────────────────
const LANDING_CSS = `
  @keyframes msb-orb1 {
    0%,100%{transform:translate(0,0) scale(1);}
    40%{transform:translate(60px,-50px) scale(1.08);}
    70%{transform:translate(-30px,30px) scale(0.94);}
  }
  @keyframes msb-orb2 {
    0%,100%{transform:translate(0,0) scale(1);}
    35%{transform:translate(-60px,40px) scale(1.06);}
    65%{transform:translate(40px,-25px) scale(0.96);}
  }
  @keyframes msb-fadeup {
    from{opacity:0;transform:translateY(22px);}
    to{opacity:1;transform:translateY(0);}
  }
  @keyframes msb-float {
    0%,100%{transform:translateY(0);}
    50%{transform:translateY(-10px);}
  }
  @keyframes msb-shimmer {
    0%{background-position:200% center;}
    100%{background-position:-200% center;}
  }
  .msb-orb1{animation:msb-orb1 16s ease-in-out infinite;}
  .msb-orb2{animation:msb-orb2 20s ease-in-out infinite;}
  .msb-fu1{animation:msb-fadeup .65s .0s ease both;}
  .msb-fu2{animation:msb-fadeup .65s .12s ease both;}
  .msb-fu3{animation:msb-fadeup .65s .24s ease both;}
  .msb-fu4{animation:msb-fadeup .65s .36s ease both;}
  .msb-fu5{animation:msb-fadeup .65s .48s ease both;}
  .msb-fu6{animation:msb-fadeup .65s .6s ease both;}
  .msb-float{animation:msb-float 5s ease-in-out infinite;}
  .msb-shimmer{
    background:linear-gradient(90deg,#a78bfa,#60a5fa,#c4b5fd,#a78bfa);
    background-size:300% auto;
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
    animation:msb-shimmer 5s linear infinite;
  }
  .msb-feat{transition:transform .3s ease,box-shadow .3s ease,background .3s ease,border-color .3s ease;}
  .msb-feat:hover{
    transform:translateY(-7px);
    background:rgba(255,255,255,0.065)!important;
    border-color:rgba(139,92,246,0.45)!important;
    box-shadow:0 24px 56px rgba(139,92,246,0.22);
  }
  .msb-stat{transition:transform .3s ease,border-color .3s ease,box-shadow .3s ease;}
  .msb-stat:hover{transform:translateY(-4px);border-color:rgba(139,92,246,0.4)!important;box-shadow:0 16px 40px rgba(139,92,246,0.18);}
  .msb-price{transition:transform .3s ease,box-shadow .3s ease;}
  .msb-price:hover{transform:translateY(-7px);}
  .msb-btn-p{transition:transform .22s ease,box-shadow .22s ease;}
  .msb-btn-p:hover{transform:scale(1.04);box-shadow:0 0 40px rgba(124,58,237,0.65)!important;}
  .msb-btn-s{transition:background .22s ease,transform .22s ease;}
  .msb-btn-s:hover{background:rgba(255,255,255,0.11)!important;transform:scale(1.02);}
  .msb-link{transition:color .2s ease;}
  .msb-link:hover{color:#a78bfa!important;}
`;

const FEATURES_DATA = [
  { icon:'📅', color:'#818cf8', bg:'rgba(99,102,241,0.13)',  title:'Smart Bookings',    desc:'Real-time slot management with instant confirmations and zero double-bookings.' },
  { icon:'📊', color:'#a78bfa', bg:'rgba(139,92,246,0.13)', title:'Live Analytics',     desc:'Revenue trends, peak hours, and customer insights updated in real time.'        },
  { icon:'✂',  color:'#67e8f9', bg:'rgba(6,182,212,0.13)',  title:'Service Menu',       desc:'Manage pricing, duration, and categories — all from one clean interface.'       },
  { icon:'🔔', color:'#fcd34d', bg:'rgba(245,158,11,0.13)', title:'Auto Notifications', desc:'Push alerts for new bookings, cancellations, and upcoming appointments.'        },
  { icon:'📈', color:'#6ee7b7', bg:'rgba(16,185,129,0.13)', title:'Reports & Export',   desc:'Download earnings, booking history, and customer data instantly.'               },
  { icon:'⚙️', color:'#f9a8d4', bg:'rgba(236,72,153,0.13)', title:'Salon Settings',     desc:'Working hours, holidays, staff, and profile — fully customizable.'             },
];

const PRICING_PLANS = [
  {
    name: 'Free Trial', price: '₹0', period: '/30 days',
    desc: 'Try everything free. No credit card needed.',
    highlight: false,
    features: ['Full platform access','Unlimited bookings','Live dashboard','Customer management','Push notifications','Cancel anytime'],
    cta: 'Start Free Trial',
    badge: null,
  },
  {
    name: 'Starter', price: '₹150', period: '/month',
    desc: 'Fixed monthly cost — great for busy salons.',
    highlight: true,
    features: ['Unlimited bookings','Live dashboard & analytics','Customer management','Service & gallery management','Push notifications','Priority support'],
    cta: 'Choose Starter',
    badge: '✦ MOST POPULAR',
  },
  {
    name: 'Per Booking', price: '₹1', period: '/booking',
    desc: 'Pay only for what you use — billed monthly.',
    highlight: false,
    features: ['Pay per confirmed booking','Full platform access','Live dashboard & analytics','Customer management','Push notifications','No monthly commitment'],
    cta: 'Choose Per Booking',
    badge: null,
  },
];

/* Dashboard preview mock – pure CSS/JSX, no images */
const DashboardMock = () => (
  <div className="msb-float mx-auto" style={{ maxWidth: 820, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 48px 120px rgba(0,0,0,0.65), 0 0 80px rgba(124,58,237,0.18)', background: 'rgba(10,10,22,0.95)' }}>
    {/* Window chrome */}
    <div style={{ background: 'rgba(255,255,255,0.035)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
      <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
      <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
      <span style={{ fontSize: 11, color: '#334155', marginLeft: 14, letterSpacing: 0.3 }}>My Salon Bookings — Owner Dashboard</span>
    </div>
    <div style={{ display: 'flex', minHeight: 360 }}>
      {/* Sidebar */}
      <div style={{ width: 186, background: 'rgba(0,0,0,0.35)', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '18px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 22, padding: '0 6px' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✂</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>My Salon</span>
        </div>
        {[['🏠','Dashboard',true],['📅','Bookings',false],['✂','Services',false],['👥','Customers',false],['📊','Analytics',false],['💳','Billing',false],['⚙️','Settings',false]].map(([icon,label,active]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 9px', borderRadius:9, marginBottom:3, background: active ? 'rgba(124,58,237,0.2)' : 'transparent', color: active ? '#a78bfa' : '#475569', fontSize:11, fontWeight: active ? 700 : 400 }}>
            <span style={{ fontSize:13 }}>{icon}</span>{label}
          </div>
        ))}
      </div>
      {/* Main */}
      <div style={{ flex:1, padding:'18px 22px', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>Overview · Today</div>
          <div style={{ fontSize:10, color:'#334155', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'4px 10px' }}>Thu, 26 Mar 2026</div>
        </div>
        {/* Stat cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:9, marginBottom:16 }}>
          {[['Bookings','24','#818cf8'],['Revenue','₹4.2K','#6ee7b7'],['Customers','18','#fcd34d'],['Rating','4.9 ★','#f9a8d4']].map(([label,val,color]) => (
            <div key={label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:11, padding:'11px 11px', border:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize:9, color:'#475569', marginBottom:5, fontWeight:600, letterSpacing:0.5 }}>{label}</div>
              <div style={{ fontSize:16, fontWeight:800, color }}>{val}</div>
            </div>
          ))}
        </div>
        {/* Bookings table */}
        <div style={{ background:'rgba(255,255,255,0.025)', borderRadius:12, border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden' }}>
          <div style={{ padding:'9px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'grid', gridTemplateColumns:'1fr 1fr 70px 72px', gap:8, fontSize:9, fontWeight:700, color:'#334155', letterSpacing:0.6 }}>
            <span>CUSTOMER</span><span>SERVICE</span><span>TIME</span><span>STATUS</span>
          </div>
          {[['Rahul S.','Hair Cut','10:00','Confirmed','#22c55e'],['Priya M.','Spa Facial','11:30','Pending','#f59e0b'],['Arjun K.','Beard Trim','12:00','Confirmed','#22c55e'],['Sneha P.','Hair Color','14:00','Completed','#818cf8']].map(([name,svc,time,status,sc]) => (
            <div key={name} style={{ padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)', display:'grid', gridTemplateColumns:'1fr 1fr 70px 72px', gap:8, alignItems:'center', fontSize:10 }}>
              <span style={{ color:'#cbd5e1', fontWeight:600 }}>{name}</span>
              <span style={{ color:'#475569' }}>{svc}</span>
              <span style={{ color:'#64748b' }}>{time}</span>
              <span style={{ color:sc, fontSize:9, fontWeight:700 }}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const LandingPage = () => (
  <>
    <style>{LANDING_CSS}</style>
    <div style={{ background:'#06060f', color:'#e2e8f0', minHeight:'100vh', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif" }}>

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav style={{ position:'sticky', top:0, zIndex:50, background:'rgba(6,6,15,0.8)', backdropFilter:'blur(18px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width:36, height:36, borderRadius:11, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, boxShadow:'0 0 18px rgba(124,58,237,0.5)' }}>✂</div>
            <span style={{ fontWeight:700, fontSize:17, color:'#f1f5f9', letterSpacing:'-0.3px' }}>My Salon Bookings</span>
            <span style={{ fontSize:10, background:'rgba(124,58,237,0.18)', color:'#a78bfa', border:'1px solid rgba(124,58,237,0.3)', borderRadius:20, padding:'2px 9px', fontWeight:700, letterSpacing:0.3 }}>OWNER</span>
          </div>
          <div className="flex items-center gap-2">
            <a href={ROUTES.LOGIN} className="msb-link px-4 py-2 text-sm font-medium" style={{ color:'#64748b' }}>Sign In</a>
            <a href={ROUTES.REGISTER} className="msb-btn-p px-5 py-2.5 text-sm font-bold rounded-xl" style={{ background:'linear-gradient(135deg,#7c3aed,#3b82f6)', color:'#fff', boxShadow:'0 0 22px rgba(124,58,237,0.4)' }}>
              Start Free Trial →
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{ position:'relative', overflow:'hidden', padding:'100px 24px 80px', textAlign:'center' }}>
        {/* Animated orbs */}
        <div className="msb-orb1" style={{ position:'absolute', top:-120, left:'8%', width:550, height:550, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.22) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="msb-orb2" style={{ position:'absolute', top:-40, right:'4%', width:620, height:620, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.18) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:'80%', height:1, background:'linear-gradient(90deg,transparent,rgba(139,92,246,0.35),transparent)', pointerEvents:'none' }} />

        <div className="max-w-4xl mx-auto relative" style={{ zIndex:1 }}>
          {/* Trust badge */}
          <div className="msb-fu1 inline-flex items-center gap-2.5 mb-8" style={{ background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.28)', borderRadius:99, padding:'6px 18px', fontSize:12.5, color:'#a78bfa', fontWeight:600 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#7c3aed', display:'inline-block', boxShadow:'0 0 8px #7c3aed' }} />
            Trusted by 500+ salon owners across India · 30-Day Free Trial
          </div>

          {/* Headline */}
          <h1 className="msb-fu2" style={{ fontSize:'clamp(2.6rem,6.5vw,4.8rem)', fontWeight:800, lineHeight:1.07, letterSpacing:'-2px', color:'#f8fafc', marginBottom:22 }}>
            Manage Your Salon<br />
            <span className="msb-shimmer">Smarter, Faster.</span>
          </h1>

          {/* Subheading */}
          <p className="msb-fu3 mx-auto" style={{ fontSize:'clamp(1rem,2.5vw,1.18rem)', color:'#64748b', lineHeight:1.75, maxWidth:540, marginBottom:44 }}>
            One powerful dashboard for bookings, analytics, services,<br className="hidden sm:block" />
            and customer management — built for Indian salons.
          </p>

          {/* CTA Buttons */}
          <div className="msb-fu4 flex flex-wrap gap-4 justify-center mb-4">
            <a href={ROUTES.REGISTER} className="msb-btn-p px-9 py-4 font-bold rounded-xl text-[15px]" style={{ background:'linear-gradient(135deg,#7c3aed,#3b82f6)', color:'#fff', boxShadow:'0 0 32px rgba(124,58,237,0.5)', display:'inline-flex', alignItems:'center', gap:8 }}>
              🚀&nbsp; Start Free Trial
            </a>
            <a href={ROUTES.LOGIN} className="msb-btn-s px-9 py-4 font-semibold rounded-xl text-[15px]" style={{ background:'rgba(255,255,255,0.055)', border:'1px solid rgba(255,255,255,0.12)', color:'#cbd5e1', display:'inline-flex', alignItems:'center', gap:8 }}>
              Login to Dashboard →
            </a>
          </div>
          <p className="msb-fu5" style={{ fontSize:12, color:'#334155', marginBottom:72 }}>
            ✓ No credit card &nbsp;·&nbsp; ✓ 30-day free trial &nbsp;·&nbsp; ✓ Setup in 5 minutes &nbsp;·&nbsp; ✓ Cancel anytime
          </p>

          {/* Dashboard preview */}
          <div className="msb-fu6"><DashboardMock /></div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section style={{ background:'rgba(255,255,255,0.018)', borderTop:'1px solid rgba(255,255,255,0.055)', borderBottom:'1px solid rgba(255,255,255,0.055)', padding:'52px 24px' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { icon:'✂',  value:'500+',  label:'Salons Onboarded', color:'#818cf8' },
            { icon:'📅', value:'50K+',  label:'Bookings Managed', color:'#6ee7b7' },
            { icon:'⚡', value:'99.9%', label:'Platform Uptime',  color:'#fcd34d' },
            { icon:'⭐', value:'4.9',   label:'Owner Rating',     color:'#f9a8d4' },
          ].map(({ icon, value, label, color }) => (
            <div key={label} className="msb-stat" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:'28px 20px', textAlign:'center' }}>
              <div style={{ fontSize:26, marginBottom:10 }}>{icon}</div>
              <div style={{ fontSize:32, fontWeight:800, color, marginBottom:5, letterSpacing:'-1.2px' }}>{value}</div>
              <div style={{ fontSize:12, color:'#475569', fontWeight:500 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section style={{ padding:'100px 24px' }}>
        <div className="max-w-6xl mx-auto">
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <div style={{ display:'inline-block', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', borderRadius:99, padding:'4px 16px', fontSize:11, color:'#a78bfa', fontWeight:700, letterSpacing:1.2, marginBottom:18 }}>FEATURES</div>
            <h2 style={{ fontSize:'clamp(1.9rem,4.5vw,3rem)', fontWeight:800, color:'#f1f5f9', letterSpacing:'-1px', marginBottom:14 }}>All Tools. One Dashboard.</h2>
            <p style={{ color:'#475569', fontSize:16, maxWidth:460, margin:'0 auto', lineHeight:1.7 }}>No juggling between apps — manage everything from one powerful place.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES_DATA.map(({ icon, color, bg, title, desc }) => (
              <div key={title} className="msb-feat" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:22, padding:'30px 26px', cursor:'default' }}>
                <div style={{ width:54, height:54, borderRadius:16, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, marginBottom:20, boxShadow:`0 0 28px ${color}35` }}>
                  {icon}
                </div>
                <h3 style={{ fontSize:16.5, fontWeight:700, color:'#f1f5f9', marginBottom:9 }}>{title}</h3>
                <p style={{ fontSize:13.5, color:'#475569', lineHeight:1.72 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────── */}
      <section style={{ padding:'100px 24px', background:'rgba(255,255,255,0.012)', borderTop:'1px solid rgba(255,255,255,0.055)' }}>
        <div className="max-w-5xl mx-auto">
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <div style={{ display:'inline-block', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', borderRadius:99, padding:'4px 16px', fontSize:11, color:'#a78bfa', fontWeight:700, letterSpacing:1.2, marginBottom:18 }}>PRICING</div>
            <h2 style={{ fontSize:'clamp(1.9rem,4.5vw,3rem)', fontWeight:800, color:'#f1f5f9', letterSpacing:'-1px', marginBottom:14 }}>Simple, Transparent Pricing</h2>
            <p style={{ color:'#475569', fontSize:16 }}>Start with a 30-day free trial. Pick the plan that fits your salon.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PRICING_PLANS.map(({ name, price, period, desc, highlight, features, cta, badge }) => (
              <div key={name} className="msb-price" style={{
                background: highlight ? 'linear-gradient(145deg,rgba(124,58,237,0.18),rgba(59,130,246,0.12))' : 'rgba(255,255,255,0.03)',
                border: highlight ? '1px solid rgba(124,58,237,0.45)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius:26, padding:'38px 30px', position:'relative',
                boxShadow: highlight ? '0 0 70px rgba(124,58,237,0.22)' : 'none',
              }}>
                {badge && (
                  <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#7c3aed,#3b82f6)', borderRadius:99, padding:'5px 18px', fontSize:11, fontWeight:700, color:'#fff', whiteSpace:'nowrap', boxShadow:'0 0 20px rgba(124,58,237,0.5)' }}>
                    {badge}
                  </div>
                )}
                <div style={{ fontSize:11, fontWeight:700, color: highlight ? '#a78bfa' : '#475569', letterSpacing:1.2, marginBottom:14 }}>{name.toUpperCase()}</div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:4, marginBottom:8 }}>
                  <span style={{ fontSize:44, fontWeight:800, color:'#f1f5f9', letterSpacing:'-2px' }}>{price}</span>
                  <span style={{ color:'#475569', fontSize:14, paddingBottom:9 }}>{period}</span>
                </div>
                <p style={{ fontSize:13, color:'#475569', marginBottom:28, lineHeight:1.6 }}>{desc}</p>
                <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:26, marginBottom:30 }}>
                  {features.map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, fontSize:13, color:'#94a3b8' }}>
                      <span style={{ color: highlight ? '#a78bfa' : '#6ee7b7', fontWeight:700, fontSize:14, flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <a href={ROUTES.REGISTER} className={highlight ? 'msb-btn-p' : 'msb-btn-s'} style={{
                  display:'block', textAlign:'center', padding:'14px 0', borderRadius:14,
                  ...(highlight
                    ? { background:'linear-gradient(135deg,#7c3aed,#3b82f6)', color:'#fff', fontWeight:700, fontSize:14.5, boxShadow:'0 0 28px rgba(124,58,237,0.45)' }
                    : { background:'transparent', border:'1px solid rgba(255,255,255,0.12)', color:'#cbd5e1', fontWeight:600, fontSize:14.5 }),
                }}>
                  {cta}
                </a>
              </div>
            ))}
          </div>
          <p style={{ textAlign:'center', marginTop:36, fontSize:13, color:'#334155' }}>
            Start with a <strong style={{ color:'#a78bfa' }}>30-day free trial</strong> — full access, no credit card. Switch plans anytime from your dashboard.
          </p>
        </div>
      </section>

      {/* ── MID-PAGE CTA ──────────────────────────────────────── */}
      <section style={{ padding:'96px 24px', position:'relative', overflow:'hidden', borderTop:'1px solid rgba(255,255,255,0.055)' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 50%,rgba(124,58,237,0.18) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'60%', height:1, background:'linear-gradient(90deg,transparent,rgba(139,92,246,0.4),transparent)', pointerEvents:'none' }} />
        <div className="max-w-2xl mx-auto text-center relative" style={{ zIndex:1 }}>
          <h2 style={{ fontSize:'clamp(1.9rem,4.5vw,2.8rem)', fontWeight:800, color:'#f1f5f9', letterSpacing:'-1px', marginBottom:16, lineHeight:1.15 }}>
            Start managing your salon<br />smarter today
          </h2>
          <p style={{ color:'#475569', fontSize:16, marginBottom:40, lineHeight:1.7 }}>
            Join 500+ salon owners across India growing their business with My Salon Bookings.
          </p>
          <a href={ROUTES.REGISTER} className="msb-btn-p px-12 py-4 font-bold rounded-xl inline-flex items-center gap-3" style={{ background:'linear-gradient(135deg,#7c3aed,#3b82f6)', color:'#fff', boxShadow:'0 0 48px rgba(124,58,237,0.55)', fontSize:17 }}>
            🚀&nbsp; Start Free Trial
          </a>
          <p style={{ fontSize:12, color:'#1e293b', marginTop:20 }}>
            ✓ Free 30 days &nbsp;·&nbsp; ✓ No card needed &nbsp;·&nbsp; ✓ Cancel anytime
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'36px 24px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✂</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#94a3b8' }}>My Salon Bookings</div>
                <div style={{ fontSize:11, color:'#1e293b' }}>by Gigamind Technology Pvt Ltd</div>
              </div>
            </div>
            <div style={{ fontSize:12, color:'#1e293b', textAlign:'center' }}>
              © 2026 My Salon Bookings by Gigamind Technology Pvt Ltd. All rights reserved.
            </div>
            <div className="flex items-center gap-6" style={{ fontSize:12 }}>
              <a href={ROUTES.OWNER_PRIVACY} className="msb-link" style={{ color:'#334155' }}>Privacy Policy</a>
              <a href={ROUTES.OWNER_TERMS}   className="msb-link" style={{ color:'#334155' }}>Terms &amp; Conditions</a>
              <a href="mailto:support@mysalonbookings.com" className="msb-link" style={{ color:'#334155' }}>Contact</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  </>
);

// ── App ────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <ErrorBoundary>
        <ThemeProvider>
        <LanguageProvider>
        <AuthProvider>
          <SalonProvider>
            <NotificationProvider>
              <Toaster position="top-right" />
              <BookingAlertModal />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route element={<PublicRoute />}>
                    <Route path={ROUTES.HOME}     element={<LandingPage />} />
                    <Route path={ROUTES.LOGIN}    element={<Login />} />
                    <Route path={ROUTES.REGISTER} element={<Register />} />
                  </Route>

                  {/* Legal pages — fully public */}
                  <Route path={ROUTES.PRIVACY} element={<PrivacyPolicy />} />
                  <Route path={ROUTES.TERMS}   element={<TermsAndConditions />} />
                  <Route path={ROUTES.LEGAL}            element={<LegalIndex />} />
                  <Route path={ROUTES.CUSTOMER_PRIVACY} element={<CustomerPrivacyPolicy />} />
                  <Route path={ROUTES.OWNER_PRIVACY}    element={<OwnerPrivacyPolicy />} />
                  <Route path={ROUTES.CUSTOMER_TERMS}   element={<CustomerTerms />} />
                  <Route path={ROUTES.OWNER_TERMS}      element={<OwnerTerms />} />

                  {/* Semi-protected */}
                  <Route path={ROUTES.SALON_REGISTER}  element={<SalonRegistration />} />
                  <Route path={ROUTES.APPROVAL_WAITING} element={<ApprovalWaiting />} />

                  {/* Protected dashboard routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path={ROUTES.DASHBOARD}     element={<Dashboard />} />
                    <Route path={ROUTES.SERVICES}      element={<Services />} />
                    <Route path={ROUTES.BOOKINGS}      element={<Bookings />} />
                    <Route path={ROUTES.ANALYTICS}     element={<Reports />} />
                    <Route path={ROUTES.REVIEWS}       element={<Reviews />} />
                    <Route path={ROUTES.PROFILE}       element={<Profile />} />
                    <Route path={ROUTES.SETTINGS}      element={<Settings />} />
                    <Route path={ROUTES.NOTIFICATIONS} element={<Notifications />} />
                    <Route path={ROUTES.GALLERY}       element={<Gallery />} />
                    <Route path={ROUTES.CALENDAR}      element={<CalendarPage />} />
                    <Route path={ROUTES.CUSTOMERS}     element={<Customers />} />
                    <Route path={ROUTES.COUPONS}       element={<Coupons />} />
                    <Route path={ROUTES.BILLING}       element={<Billing />} />
                  </Route>

                  {/* 404 */}
                  <Route path="*" element={
                    <div className="min-h-screen flex items-center justify-center bg-slate-50">
                      <div className="text-center">
                        <h1 className="text-6xl font-bold text-slate-900 mb-4">404</h1>
                        <p className="text-slate-500 mb-8">Page not found</p>
                        <a href={ROUTES.HOME} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
                          Go Home
                        </a>
                      </div>
                    </div>
                  } />
                </Routes>
              </Suspense>
            </NotificationProvider>
          </SalonProvider>
        </AuthProvider>
        </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
