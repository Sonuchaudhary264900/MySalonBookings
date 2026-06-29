import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import CommandPalette from './components/CommandPalette';
import {
  Calendar, BarChart2, Sparkles, Bell, Users, Image as LucideImage, Target, UserCheck,
  Clock, CreditCard, Shield, Bot, PhoneCall, UserX, TrendingDown, Zap, RotateCcw,
  FileText, Smartphone, TrendingUp, MapPin, Search, QrCode, Star, BellOff, DollarSign,
  Gift, Cake, Rocket, PlayCircle, ClipboardList, HelpCircle, AlertTriangle
} from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { GalleryUploadProvider } from './context/GalleryUploadContext';
import FloatingUploadBar from './components/gallery/FloatingUploadBar';
import { SalonProvider } from './context/SalonContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ROUTES from './routes';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

const OwnerOnlyRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'staff') return <Navigate to={ROUTES.DASHBOARD} replace />;
  return <Outlet />;
};
import api from './services/api';

// ── Eagerly loaded (critical path — shown immediately) ─────────
import Login from './pages/auth/Login';

// ── Chunk-load resilience ──────────────────────────────────────
// After a new deploy, hashed chunk filenames change. A browser holding an old
// index bundle will 404 on the old chunk names. Detect that failed dynamic
// import and force a one-time full reload to fetch the fresh build.
const lazyRetry = (factory) =>
  lazy(() =>
    factory().catch((err) => {
      const alreadyReloaded = sessionStorage.getItem('chunk-reloaded');
      if (!alreadyReloaded) {
        sessionStorage.setItem('chunk-reloaded', '1');
        window.location.reload();
        // Return a never-resolving promise so React doesn't render the error
        // before the reload kicks in.
        return new Promise(() => {});
      }
      throw err;
    })
  );

// Clear the reload guard once a navigation succeeds (next tick after load).
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => sessionStorage.removeItem('chunk-reloaded'));
}

// ── Lazily loaded (split into separate chunks) ─────────────────
const Onboarding       = lazyRetry(() => import('./pages/onboarding/OnboardingPage'));
const Register         = lazyRetry(() => import('./pages/auth/Register'));
const ApprovalWaiting  = lazyRetry(() => import('./pages/auth/ApprovalWaiting'));
const SalonRegistration = lazyRetry(() => import('./pages/salon/SalonRegistration'));
const SalonSetup        = lazyRetry(() => import('./pages/salon/SalonSetup'));
const Dashboard        = lazyRetry(() => import('./pages/dashboard/Dashboard'));
const Services         = lazyRetry(() => import('./pages/dashboard/Services'));
const Bookings         = lazyRetry(() => import('./pages/dashboard/Bookings'));
const Reports          = lazyRetry(() => import('./pages/dashboard/Reports'));
const Reviews          = lazyRetry(() => import('./pages/dashboard/Reviews'));
const Profile          = lazyRetry(() => import('./pages/dashboard/Profile'));
const Settings         = lazyRetry(() => import('./pages/dashboard/Settings'));
const Notifications    = lazyRetry(() => import('./pages/dashboard/Notifications'));
const Gallery          = lazyRetry(() => import('./pages/dashboard/Gallery'));
const CalendarPage     = lazyRetry(() => import('./pages/dashboard/CalendarPage'));
const Customers        = lazyRetry(() => import('./pages/dashboard/Customers'));
const Coupons          = lazyRetry(() => import('./pages/dashboard/Coupons'));
const Packages         = lazyRetry(() => import('./pages/dashboard/Packages'));
const Billing          = lazyRetry(() => import('./pages/dashboard/Billing'));
const Promotions       = lazyRetry(() => import('./pages/dashboard/Promotions'));
const Messages         = lazyRetry(() => import('./pages/dashboard/Messages'));
const GlowLooxProfile  = lazyRetry(() => import('./pages/dashboard/GlowLooxProfile'));
const Team             = lazyRetry(() => import('./pages/dashboard/Team'));
const PrivacyPolicy        = lazyRetry(() => import('./pages/PrivacyPolicy'));
const TermsAndConditions   = lazyRetry(() => import('./pages/TermsAndConditions'));
const LegalIndex           = lazyRetry(() => import('./pages/legal/LegalIndex'));
const CustomerPrivacyPolicy = lazyRetry(() => import('./pages/legal/CustomerPrivacyPolicy'));
const OwnerPrivacyPolicy   = lazyRetry(() => import('./pages/legal/OwnerPrivacyPolicy'));
const CustomerTerms        = lazyRetry(() => import('./pages/legal/CustomerTerms'));
const CustomerRefundPolicy = lazyRetry(() => import('./pages/legal/CustomerRefundPolicy'));
const OwnerTerms           = lazyRetry(() => import('./pages/legal/OwnerTerms'));
const AuditLog             = lazyRetry(() => import('./pages/dashboard/AuditLog'));
const Developer            = lazyRetry(() => import('./pages/dashboard/Developer'));
const QueuePage            = lazyRetry(() => import('./pages/dashboard/QueuePage'));
const Feedback             = lazyRetry(() => import('./pages/dashboard/Feedback'));
const Wallet               = lazyRetry(() => import('./pages/dashboard/Wallet'));

// ── Page loading fallback (shimmer skeleton) ───────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="animate-pulse max-w-5xl mx-auto space-y-5">
        <div className="h-7 w-1/3 rounded-lg bg-slate-200" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
        </div>
        <div className="h-64 w-full rounded-2xl bg-slate-200" />
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
            <div className="flex justify-center mb-4"><AlertTriangle size={44} className="text-amber-500" /></div>
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
    40%{transform:translate(70px,-60px) scale(1.1);}
    70%{transform:translate(-40px,35px) scale(0.92);}
  }
  @keyframes msb-orb2 {
    0%,100%{transform:translate(0,0) scale(1);}
    35%{transform:translate(-70px,50px) scale(1.08);}
    65%{transform:translate(50px,-30px) scale(0.94);}
  }
  @keyframes msb-fadeup {
    from{opacity:0;transform:translateY(28px);}
    to{opacity:1;transform:translateY(0);}
  }
  @keyframes msb-float {
    0%,100%{transform:translateY(0) rotate(-1deg);}
    50%{transform:translateY(-14px) rotate(1deg);}
  }
  @keyframes msb-shimmer {
    0%{background-position:200% center;}
    100%{background-position:-200% center;}
  }
  @keyframes msb-pulse-dot {
    0%,100%{opacity:1;transform:scale(1);}
    50%{opacity:.5;transform:scale(1.5);}
  }
  @keyframes msb-bar {
    from{height:0;}
    to{height:var(--h);}
  }
  .msb-orb1{animation:msb-orb1 18s ease-in-out infinite;}
  .msb-orb2{animation:msb-orb2 22s ease-in-out infinite;}
  .msb-fu1{animation:msb-fadeup .7s .0s ease both;}
  .msb-fu2{animation:msb-fadeup .7s .1s ease both;}
  .msb-fu3{animation:msb-fadeup .7s .2s ease both;}
  .msb-fu4{animation:msb-fadeup .7s .3s ease both;}
  .msb-fu5{animation:msb-fadeup .7s .42s ease both;}
  .msb-fu6{animation:msb-fadeup .7s .56s ease both;}
  .msb-float{animation:msb-float 6s ease-in-out infinite;}
  .msb-pulse-dot{animation:msb-pulse-dot 2s ease-in-out infinite;}
  .msb-shimmer{
    background:linear-gradient(90deg,#c4b5fd,#818cf8,#67e8f9,#c4b5fd);
    background-size:300% auto;
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
    animation:msb-shimmer 6s linear infinite;
  }
  .msb-feat{transition:transform .28s ease,box-shadow .28s ease,border-color .28s ease;}
  .msb-feat:hover{transform:translateY(-6px);border-color:rgba(139,92,246,0.5)!important;box-shadow:0 20px 50px rgba(139,92,246,0.2);}
  .msb-step{transition:transform .28s ease,box-shadow .28s ease;}
  .msb-step:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,0.4)!important;}
  .msb-price{transition:transform .28s ease,box-shadow .28s ease;}
  .msb-price:hover{transform:translateY(-8px);}
  .msb-review{transition:transform .28s ease,border-color .28s ease;}
  .msb-review:hover{transform:translateY(-4px);border-color:rgba(139,92,246,0.35)!important;}
  .msb-btn-p{transition:transform .2s ease,box-shadow .2s ease;}
  .msb-btn-p:hover{transform:scale(1.04);box-shadow:0 0 44px rgba(124,58,237,0.7)!important;}
  .msb-btn-s{transition:background .2s ease,transform .2s ease,border-color .2s ease;}
  .msb-btn-s:hover{background:rgba(255,255,255,0.1)!important;transform:scale(1.02);border-color:rgba(255,255,255,0.25)!important;}
  .msb-link{transition:color .18s ease;}
  .msb-link:hover{color:#a78bfa!important;}
  .msb-bar{animation:msb-bar 1.4s ease both;}
  .msb-pain{transition:transform .28s ease,border-color .28s ease,box-shadow .28s ease;}
  .msb-pain:hover{transform:translateY(-4px);border-color:rgba(239,68,68,0.35)!important;box-shadow:0 16px 40px rgba(239,68,68,0.1);}
  .msb-result{transition:transform .3s ease,border-color .3s ease,box-shadow .3s ease;}
  .msb-result:hover{transform:translateY(-6px);border-color:rgba(99,102,241,0.5)!important;box-shadow:0 24px 60px rgba(99,102,241,0.15);}
  .msb-ai{transition:transform .28s ease,border-color .28s ease;}
  .msb-ai:hover{transform:translateY(-4px);border-color:rgba(139,92,246,0.5)!important;}
  @keyframes msb-ticker{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
  .msb-ticker{animation:msb-ticker 28s linear infinite;display:flex;gap:48px;width:max-content;}
  .msb-ticker:hover{animation-play-state:paused;}
`;

const FEATURES_DATA = [
  { Icon: Calendar,      color:'#818cf8', bg:'rgba(99,102,241,0.15)',  title:'Smart Bookings',        desc:'Real-time slot management with instant confirmations. Zero double-bookings, zero phone calls.' },
  { Icon: BarChart2,     color:'#a78bfa', bg:'rgba(139,92,246,0.15)', title:'Live Analytics',         desc:'Revenue trends, peak hours, and top services — updated live so you always know what\'s working.' },
  { Icon: Sparkles,      color:'#67e8f9', bg:'rgba(6,182,212,0.15)',  title:'Service & Pricing Menu', desc:'Manage services, create combos, and set dynamic pricing for peak vs off-peak hours.' },
  { Icon: Bell,          color:'#fcd34d', bg:'rgba(245,158,11,0.15)', title:'Instant Alerts',         desc:'Push notifications for every new booking, cancellation, and reminder. Never miss a customer again.' },
  { Icon: Users,         color:'#6ee7b7', bg:'rgba(16,185,129,0.15)', title:'Customer CRM',           desc:'Full visit history, preferences, and loyalty tracking. One-click rebooking for returning customers.' },
  { Icon: LucideImage,   color:'#f9a8d4', bg:'rgba(236,72,153,0.15)', title:'Gallery & Coupons',      desc:'Showcase your work and run discount campaigns — festival offers, birthday deals, and loyalty rewards.' },
  { Icon: Target,        color:'#fb923c', bg:'rgba(249,115,22,0.15)', title:'Marketing Automation',   desc:'Auto-send Diwali offers, birthday discounts, and win-back campaigns for inactive customers — zero manual effort.' },
  { Icon: UserCheck,     color:'#34d399', bg:'rgba(52,211,153,0.15)', title:'Staff Management',       desc:'Track each team member\'s bookings, performance, and earnings contribution. Optimize your team during peak hours.' },
  { Icon: Clock,         color:'#60a5fa', bg:'rgba(59,130,246,0.15)', title:'Digital Queue',          desc:'Customers join a live queue digitally. No more "abhi aa raha hoon" chaos — everyone knows exactly when they\'re next.' },
  { Icon: CreditCard,    color:'#c084fc', bg:'rgba(192,132,252,0.15)', title:'Payments & Billing',    desc:'Accept UPI, cards, and cash. Auto-generate invoices and track daily, weekly, and monthly earnings effortlessly.' },
  { Icon: Shield,        color:'#94a3b8', bg:'rgba(148,163,184,0.15)', title:'Security & Backup',    desc:'Encrypted customer data with cloud backup — no data loss ever. Role-based access for owner vs staff.' },
  { Icon: Bot,           color:'#f472b6', bg:'rgba(244,114,182,0.15)', title:'AI Smart Suggestions',  desc:'Predict busy days, suggest services based on history, and auto-upsell — "Customers also booked this."' },
];

const PRICING_PLANS = [
  {
    name: 'Free', price: '₹0', period: '/forever',
    desc: 'Everything you need to run your business — completely free. No credit card, no hidden charges. Customers pay at your salon.',
    highlight: true,
    features: [
      'Full platform access',
      'Unlimited bookings',
      'Live dashboard & analytics',
      'Customer management',
      'Service & gallery management',
      'Staff & live queue management',
      'Push notifications',
      'No commission, no hidden fees',
    ],
    cta: 'Register Now — It’s Free',
    badge: null,
  },
];

const REVIEWS = [
  { name:'Rakesh Sharma', salon:'Sharma Cuts, Pune', rating:5, text:'My bookings doubled in the first month. The dashboard is incredibly easy to use — I manage everything from my phone.' },
  { name:'Priya Nair', salon:'Glam Studio, Kochi', rating:5, text:'No more missed appointments. Clients love booking online and I get instant notifications. And it’s completely free.' },
  { name:'Mohammed Farhan', salon:'Style Hub, Hyderabad', rating:5, text:'The analytics show me which services earn the most. Everything I need to run my salon, in one free dashboard.' },
];

/* Dashboard preview mock */
const DashboardMock = () => {
  const { isDark } = useTheme();
  const m = {
    frame:      isDark ? 'rgba(8,8,20,0.97)'             : '#f1f5f9',
    frameBorder:isDark ? 'rgba(255,255,255,0.08)'         : 'rgba(0,0,0,0.12)',
    chrome:     isDark ? 'rgba(255,255,255,0.03)'         : 'rgba(0,0,0,0.04)',
    chromeBorder:isDark? 'rgba(255,255,255,0.06)'         : 'rgba(0,0,0,0.08)',
    urlBar:     isDark ? 'rgba(255,255,255,0.04)'         : 'rgba(0,0,0,0.06)',
    urlText:    isDark ? '#334155'                        : '#94a3b8',
    sidebar:    isDark ? 'rgba(0,0,0,0.4)'               : 'rgba(0,0,0,0.04)',
    sidebarBorder:isDark?'rgba(255,255,255,0.05)'         : 'rgba(0,0,0,0.08)',
    sidebarText:isDark ? '#e2e8f0'                        : '#0f172a',
    sidebarSub: isDark ? '#334155'                        : '#94a3b8',
    navInactive:isDark ? '#475569'                        : '#64748b',
    heading:    isDark ? '#e2e8f0'                        : '#0f172a',
    sub:        isDark ? '#475569'                        : '#94a3b8',
    card:       isDark ? 'rgba(255,255,255,0.025)'        : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.06)'         : 'rgba(0,0,0,0.08)',
    rowBorder:  isDark ? 'rgba(255,255,255,0.03)'         : 'rgba(0,0,0,0.05)',
    rowText:    isDark ? '#cbd5e1'                        : '#1e293b',
    rowSub:     isDark ? '#475569'                        : '#64748b',
    barInactive:isDark ? 'rgba(139,92,246,0.25)'          : 'rgba(139,92,246,0.18)',
    shadow:     isDark ? '0 56px 130px rgba(0,0,0,0.7),0 0 90px rgba(124,58,237,0.16)' : '0 32px 80px rgba(0,0,0,0.12),0 0 50px rgba(124,58,237,0.08)',
  };
  return (
  <div className="msb-float mx-auto" style={{ maxWidth:840, borderRadius:22, overflow:'hidden', border:`1px solid ${m.frameBorder}`, boxShadow:m.shadow, background:m.frame }}>
    {/* Window chrome */}
    <div style={{ background:m.chrome, borderBottom:`1px solid ${m.chromeBorder}`, padding:'10px 16px', display:'flex', alignItems:'center', gap:7 }}>
      <span style={{ width:11, height:11, borderRadius:'50%', background:'#ef4444', display:'inline-block' }} />
      <span style={{ width:11, height:11, borderRadius:'50%', background:'#f59e0b', display:'inline-block' }} />
      <span style={{ width:11, height:11, borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />
      <span style={{ flex:1, height:22, background:m.urlBar, borderRadius:6, marginLeft:12, display:'flex', alignItems:'center', paddingLeft:10 }}>
        <span style={{ fontSize:10, color:m.urlText }}>glowloox.com/dashboard</span>
      </span>
    </div>
    <div style={{ display:'flex', minHeight:380 }}>
      {/* Sidebar */}
      <div style={{ width:190, background:m.sidebar, borderRight:`1px solid ${m.sidebarBorder}`, padding:'18px 12px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:24, padding:'0 6px' }}>
          <div style={{ width:30, height:30, borderRadius:9, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✂</div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:m.sidebarText }}>GlowLoox</div>
            <div style={{ fontSize:9, color:m.sidebarSub }}>Owner Dashboard</div>
          </div>
        </div>
        {[['🏠','Dashboard',true],['📅','Bookings',false],['✂','Services',false],['👥','Customers',false],['📊','Analytics',false],['🖼','Gallery',false],['💳','Billing',false]].map(([icon,label,active]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 9px', borderRadius:9, marginBottom:2, background: active ? 'rgba(124,58,237,0.22)' : 'transparent', color: active ? '#a78bfa' : m.navInactive, fontSize:11, fontWeight: active ? 700 : 400 }}>
            <span style={{ fontSize:12 }}>{icon}</span>{label}
          </div>
        ))}
      </div>
      {/* Main content */}
      <div style={{ flex:1, padding:'18px 20px', overflow:'hidden' }}>
        {/* Header row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:m.heading }}>Good morning, Rahul! ☀️</div>
            <div style={{ fontSize:10, color:m.sub }}>Friday, 27 Mar 2026 · Sharma Cuts</div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <div style={{ background:'rgba(16,185,129,0.15)', color:'#6ee7b7', fontSize:9, fontWeight:700, padding:'3px 9px', borderRadius:99, border:'1px solid rgba(16,185,129,0.25)' }}>● LIVE</div>
          </div>
        </div>
        {/* Stat cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
          {[['Today','24 Bookings','#818cf8','rgba(99,102,241,0.12)'],['Revenue','₹4,200','#6ee7b7','rgba(16,185,129,0.12)'],['Queue','6 Waiting','#fcd34d','rgba(245,158,11,0.12)'],['Rating','4.9 ⭐','#f9a8d4','rgba(236,72,153,0.12)']].map(([label,val,color,bg]) => (
            <div key={label} style={{ background:bg, borderRadius:11, padding:'10px 11px', border:`1px solid ${color}25` }}>
              <div style={{ fontSize:9, color:m.sub, marginBottom:4, fontWeight:600 }}>{label}</div>
              <div style={{ fontSize:14, fontWeight:800, color }}>{val}</div>
            </div>
          ))}
        </div>
        {/* Mini chart + bookings */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:8 }}>
          {/* Bar chart */}
          <div style={{ background:m.card, borderRadius:12, border:`1px solid ${m.cardBorder}`, padding:'10px 12px' }}>
            <div style={{ fontSize:9, color:m.sub, fontWeight:700, marginBottom:10 }}>WEEKLY REVENUE</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:52 }}>
              {[28,42,35,58,45,70,62].map((h,i) => (
                <div key={i} style={{ flex:1, height:`${h}%`, borderRadius:'3px 3px 0 0', background: i===5 ? 'linear-gradient(180deg,#7c3aed,#3b82f6)' : m.barInactive }} />
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
              {['M','T','W','T','F','S','S'].map((d,i) => (
                <div key={i} style={{ flex:1, textAlign:'center', fontSize:8, color:m.sub }}>{d}</div>
              ))}
            </div>
          </div>
          {/* Bookings list */}
          <div style={{ background:m.card, borderRadius:12, border:`1px solid ${m.cardBorder}`, overflow:'hidden' }}>
            <div style={{ padding:'7px 12px', borderBottom:`1px solid ${m.rowBorder}`, display:'grid', gridTemplateColumns:'1fr 80px 56px', gap:6, fontSize:8, fontWeight:700, color:m.sub, letterSpacing:0.6 }}>
              <span>CUSTOMER</span><span>SERVICE</span><span>STATUS</span>
            </div>
            {[['Rahul S.','Hair Cut','#22c55e','Done'],['Priya M.','Facial','#f59e0b','Next'],['Arjun K.','Beard','#818cf8','Conf.'],['Sneha P.','Color','#64748b','Later']].map(([n,s,c,st]) => (
              <div key={n} style={{ padding:'6px 12px', borderBottom:`1px solid ${m.rowBorder}`, display:'grid', gridTemplateColumns:'1fr 80px 56px', gap:6, alignItems:'center' }}>
                <span style={{ fontSize:10, color:m.rowText, fontWeight:600 }}>{n}</span>
                <span style={{ fontSize:9, color:m.rowSub }}>{s}</span>
                <span style={{ fontSize:8, color:c, fontWeight:700 }}>{st}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

/* Responsive wrapper — scales the fixed-width mock to fit any screen */
const DashboardMockWrapper = () => {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const MOCK_W = 840;
  const MOCK_H = 430; // approximate rendered height

  useEffect(() => {
    const update = () => {
      if (wrapRef.current) {
        const w = wrapRef.current.offsetWidth;
        setScale(Math.min(1, w / MOCK_W));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div ref={wrapRef} style={{ width: '100%', overflow: 'hidden', height: MOCK_H * scale, borderRadius: 22 }}>
      <div style={{ width: MOCK_W, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <DashboardMock />
      </div>
    </div>
  );
};

const LandingPage = () => {
  const { isDark, toggleTheme } = useTheme();

  const c = {
    bg:           isDark ? '#050510'                  : '#f8fafc',
    nav:          isDark ? 'rgba(5,5,16,0.88)'        : 'rgba(248,250,252,0.94)',
    text:         isDark ? '#e2e8f0'                  : '#0f172a',
    heading:      isDark ? '#f1f5f9'                  : '#0f172a',
    card:         isDark ? 'rgba(255,255,255,0.03)'   : '#ffffff',
    card2:        isDark ? 'rgba(255,255,255,0.04)'   : 'rgba(0,0,0,0.025)',
    shadow:       isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.07)',
    border:       isDark ? 'rgba(255,255,255,0.07)'   : 'rgba(0,0,0,0.09)',
    section:      isDark ? 'rgba(255,255,255,0.015)'  : 'rgba(0,0,0,0.025)',
    sectionAlt:   isDark ? 'rgba(255,255,255,0.012)'  : 'rgba(0,0,0,0.018)',
    divider:      isDark ? 'rgba(255,255,255,0.06)'   : 'rgba(0,0,0,0.08)',
    dividerFaint: isDark ? 'rgba(255,255,255,0.04)'   : 'rgba(0,0,0,0.05)',
    muted:        isDark ? '#94a3b8'                  : '#64748b',
    subtle:       isDark ? '#475569'                  : '#64748b',
    watermark:    isDark ? 'rgba(255,255,255,0.04)'   : 'rgba(0,0,0,0.06)',
    btnSecBg:     isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(0,0,0,0.04)',
    btnSecBorder: isDark ? 'rgba(255,255,255,0.13)'   : 'rgba(0,0,0,0.13)',
    btnBorder:    isDark ? 'rgba(255,255,255,0.12)'   : 'rgba(0,0,0,0.12)',
  };

  return (
  <>
    <style>{LANDING_CSS}</style>
    <div style={{ background:c.bg, color:c.text, minHeight:'100vh', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", overflowX:'hidden' }}>

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, background:c.nav, WebkitBackdropFilter:'blur(20px)', backdropFilter:'blur(20px)', borderBottom:`1px solid ${c.border}` }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#7c3aed,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 0 22px rgba(124,58,237,0.55)', flexShrink:0 }}>✨</div>
            <div className="hidden sm:flex flex-col">
              <span style={{ fontWeight:800, fontSize:16, color:c.heading, letterSpacing:'-0.4px', lineHeight:1.1 }}>GlowLoox</span>
              <span style={{ fontSize:9, color:c.subtle, fontWeight:500, letterSpacing:0.5 }}>PARTNER PLATFORM</span>
            </div>
            <span className="sm:hidden" style={{ fontWeight:800, fontSize:15, color:c.heading }}>GlowLoox</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:36, height:36, borderRadius:10, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', border:`1px solid ${c.border}`, cursor:'pointer', fontSize:16, transition:'all .2s ease', flexShrink:0 }}
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={c.muted} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={c.muted} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                </svg>
              )}
            </button>
            <a href={ROUTES.LOGIN} className="msb-link hidden sm:block px-4 py-2 text-sm font-medium rounded-xl" style={{ color:'#64748b' }}>Sign In</a>
            <a href={ROUTES.REGISTER} className="msb-btn-p px-5 py-2.5 text-sm font-bold rounded-xl" style={{ background:'linear-gradient(135deg,#7c3aed,#2563eb)', color:'#fff', boxShadow:'0 0 24px rgba(124,58,237,0.45)' }}>
              Register →
            </a>
          </div>
        </div>
      </nav>
      {/* Spacer to push content below fixed navbar */}
      <div style={{ height: 64 }} />

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{ position:'relative', overflow:'hidden', padding:'clamp(52px,8vh,96px) 20px clamp(44px,6vh,76px)', textAlign:'center' }}>
        <div className="msb-orb1" style={{ position:'absolute', top:-140, left:'5%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.2) 0%,transparent 68%)', pointerEvents:'none' }} />
        <div className="msb-orb2" style={{ position:'absolute', top:-60, right:'2%', width:680, height:680, borderRadius:'50%', background:'radial-gradient(circle,rgba(37,99,235,0.16) 0%,transparent 68%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 50% at 50% 0%,rgba(124,58,237,0.08) 0%,transparent 70%)', pointerEvents:'none' }} />

        <div className="max-w-4xl mx-auto relative" style={{ zIndex:1 }}>
          {/* Live badge */}
          <div className="msb-fu1 inline-flex items-center gap-2 mb-7" style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.22)', borderRadius:99, padding:'5px 16px', fontSize:12, color:'#6ee7b7', fontWeight:600 }}>
            <span className="msb-pulse-dot" style={{ width:7, height:7, borderRadius:'50%', background:'#10b981', display:'inline-block' }} />
            500+ businesses live across India
          </div>

          {/* Headline */}
          <h1 className="msb-fu2" style={{ fontSize:'clamp(1.9rem,6vw,4.6rem)', fontWeight:900, lineHeight:1.15, letterSpacing:'-1.5px', color:c.heading, marginBottom:20 }}>
            Grow Your Business Online.<br />
            Get More Clients.<br />
            <span className="msb-shimmer">Earn More Revenue.</span>
          </h1>

          {/* Subheading */}
          <p className="msb-fu3 mx-auto" style={{ fontSize:'clamp(1rem,2.4vw,1.15rem)', color:c.muted, lineHeight:1.8, maxWidth:520, marginBottom:40 }}>
            Bookings, analytics, staff, payments & customers —<br className="hidden sm:block" />
            all in one dashboard built for Indian beauty & wellness businesses.
          </p>

          {/* CTA row */}
          <div className="msb-fu4 flex flex-wrap gap-3 justify-center mb-3">
            <a href={ROUTES.REGISTER} className="msb-btn-p px-8 py-4 font-bold rounded-2xl text-base" style={{ background:'linear-gradient(135deg,#7c3aed,#2563eb)', color:'#fff', boxShadow:'0 0 36px rgba(124,58,237,0.55)', display:'inline-flex', alignItems:'center', gap:10 }}>
              <Sparkles size={18} /> Register Now — It's Free
            </a>
            <a href={ROUTES.LOGIN} className="msb-btn-s px-8 py-4 font-semibold rounded-2xl text-base" style={{ background:c.btnSecBg, border:`1px solid ${c.btnSecBorder}`, color:c.muted, display:'inline-flex', alignItems:'center', gap:8 }}>
              Owner Login →
            </a>
          </div>
          <p className="msb-fu5" style={{ fontSize:11.5, color:c.subtle, marginBottom:48 }}>
            ✓ No credit card &nbsp;·&nbsp; ✓ Full access from day 1 &nbsp;·&nbsp; ✓ 5-minute setup &nbsp;·&nbsp; ✓ Cancel anytime
          </p>

          {/* Dashboard preview */}
          <div className="msb-fu6 px-0 sm:px-4"><DashboardMockWrapper /></div>
        </div>
      </section>

      {/* ── TRUST TICKER ──────────────────────────────────────── */}
      <div style={{ background: isDark ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.04)', borderTop:`1px solid ${c.divider}`, borderBottom:`1px solid ${c.divider}`, padding:'12px 0', overflow:'hidden' }}>
        <div className="msb-ticker">
          {['Free to start', '5-minute setup', 'Works on mobile & desktop', 'Real-time notifications', 'Live revenue analytics', 'Secure & encrypted', 'Built for India', 'UPI & card payments', 'Customer CRM included', 'Automated marketing',
            'Free to start', '5-minute setup', 'Works on mobile & desktop', 'Real-time notifications', 'Live revenue analytics', 'Secure & encrypted', 'Built for India', 'UPI & card payments', 'Customer CRM included', 'Automated marketing',
          ].map((item, i) => (
            <span key={i} style={{ fontSize:12.5, color:c.muted, fontWeight:600, whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:8 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#7c3aed', display:'inline-block', opacity:0.7 }} />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <section style={{ background:c.section, borderTop:`1px solid ${c.divider}`, borderBottom:`1px solid ${c.divider}`, padding:'48px 20px' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value:'500+',  label:'Business Owners',  sub:'across India',  color:'#818cf8', glow:'rgba(99,102,241,0.3)' },
            { value:'50K+',  label:'Bookings Managed', sub:'and counting',  color:'#6ee7b7', glow:'rgba(16,185,129,0.3)' },
            { value:'99.9%', label:'Platform Uptime',  sub:'guaranteed',    color:'#fcd34d', glow:'rgba(245,158,11,0.3)' },
            { value:'4.9★',  label:'Average Rating',   sub:'by owners',     color:'#f9a8d4', glow:'rgba(236,72,153,0.3)' },
          ].map(({ value, label, sub, color, glow }) => (
            <div key={label} style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:20, padding:'24px 20px', textAlign:'center', transition:'transform .3s ease,border-color .3s ease', cursor:'default' }}
              onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.borderColor=`${color}40`; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.borderColor=c.border; }}>
              <div style={{ fontSize:30, fontWeight:900, color, letterSpacing:'-1.5px', textShadow:`0 0 30px ${glow}`, marginBottom:4 }}>{value}</div>
              <div style={{ fontSize:12.5, color:c.muted, fontWeight:600, marginBottom:2 }}>{label}</div>
              <div style={{ fontSize:10, color:c.subtle }}>{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PAIN POINTS ─────────────────────────────────────── */}
      <section style={{ padding:'96px 20px 80px' }}>
        <div className="max-w-5xl mx-auto">
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:99, padding:'4px 16px', fontSize:11, color:'#fca5a5', fontWeight:700, letterSpacing:1.5, marginBottom:18 }}>SOUND FAMILIAR?</div>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, color:c.heading, letterSpacing:'-1px', marginBottom:12 }}>Every beauty business faces these problems</h2>
            <p style={{ color:c.subtle, fontSize:15, lineHeight:1.7 }}>We built GlowLoox to solve every single one of them.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { pain:'"Abhi aa raha hoon" — customers arrive late or not at all',   fix:'Automated reminders & digital queue eliminate no-shows', Icon: UserX },
              { pain:'Phone rings all day while you\'re with a client',              fix:'Clients self-book online 24/7 — your phone stays silent', Icon: PhoneCall },
              { pain:'No idea which services actually make you money',               fix:'Live analytics show top earners, peak days, and growth trends', Icon: TrendingDown },
              { pain:'Peak hour chaos — everyone wants the same slot',              fix:'Smart slot system distributes load and shows wait times', Icon: AlertTriangle },
              { pain:'Repeat customers forget to come back',                        fix:'Automated follow-ups and offers bring them back automatically', Icon: RotateCcw },
              { pain:'Staff performance is a guessing game',                        fix:'Track each stylist\'s bookings, revenue, and productivity live', Icon: ClipboardList },
            ].map(({ pain, fix, Icon }) => (
              <div key={pain} className="msb-pain" style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:20, padding:'22px 20px', cursor:'default' }}>
                <div style={{ marginBottom:12 }}><Icon size={26} color='#ef4444' strokeWidth={1.8} /></div>
                <p style={{ fontSize:13, color:'#ef4444', fontWeight:600, lineHeight:1.6, marginBottom:12, fontStyle:'italic' }}>"{pain}"</p>
                <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                  <span style={{ color:'#6ee7b7', fontWeight:800, fontSize:14, flexShrink:0, marginTop:1 }}>✓</span>
                  <p style={{ fontSize:12.5, color:c.muted, lineHeight:1.65 }}>{fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section style={{ padding:'96px 20px' }}>
        <div className="max-w-5xl mx-auto">
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{ display:'inline-block', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', borderRadius:99, padding:'4px 16px', fontSize:11, color:'#a78bfa', fontWeight:700, letterSpacing:1.5, marginBottom:18 }}>HOW IT WORKS</div>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, color:c.heading, letterSpacing:'-1px', marginBottom:12 }}>Up and running in minutes</h2>
            <p style={{ color:c.subtle, fontSize:15, lineHeight:1.7 }}>No technical skills needed — just sign up and go.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { step:'01', Icon: FileText,   title:'Create Your Account', desc:'Register your business in under 5 minutes. Add your services, pricing, and working hours.', color:'#818cf8' },
              { step:'02', Icon: Smartphone,  title:'Share Your Profile', desc:'Clients discover your business on the GlowLoox app, pick a service, and book an available slot instantly.', color:'#a78bfa' },
              { step:'03', Icon: TrendingUp,  title:'Grow Your Revenue', desc:'Track earnings, manage bookings, get paid — all from your phone or browser.', color:'#67e8f9' },
            ].map(({ step, Icon, title, desc, color }) => (
              <div key={step} className="msb-step" style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:22, padding:'30px 26px', position:'relative', overflow:'hidden', boxShadow:c.shadow }}>
                <div style={{ position:'absolute', top:16, right:18, fontSize:52, fontWeight:900, color:c.watermark, lineHeight:1, userSelect:'none' }}>{step}</div>
                <div style={{ width:52, height:52, borderRadius:16, background:`${color}18`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, boxShadow:`0 0 24px ${color}25` }}><Icon size={22} color={color} strokeWidth={1.8} /></div>
                <h3 style={{ fontSize:16, fontWeight:700, color:c.heading, marginBottom:10 }}>{title}</h3>
                <p style={{ fontSize:13.5, color:c.subtle, lineHeight:1.75 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW CUSTOMERS FIND YOU ────────────────────────────── */}
      <section style={{ padding:'0 20px 96px' }}>
        <div className="max-w-5xl mx-auto">
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{ display:'inline-block', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:99, padding:'4px 16px', fontSize:11, color:'#6ee7b7', fontWeight:700, letterSpacing:1.5, marginBottom:18 }}>FOR CUSTOMERS</div>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, color:c.heading, letterSpacing:'-1px', marginBottom:12 }}>4 ways clients discover &amp; book your business</h2>
            <p style={{ color:c.subtle, fontSize:15, maxWidth:480, margin:'0 auto', lineHeight:1.7 }}>Your business is visible to thousands of clients on the GlowLoox app — for free.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                num:'01', Icon: MapPin, title:'Nearby Search',
                desc:'Clients open the app and instantly see businesses close to them. Your profile appears automatically based on location — no ads or extra cost needed.',
                color:'#6ee7b7', bg:'rgba(16,185,129,0.13)', highlight:false,
              },
              {
                num:'02', Icon: Search, title:'Search by Service',
                desc:'When a client searches "hair cut", "facial", or "beard trim", your business appears if you offer that service. The more services you list, the more you get found.',
                color:'#818cf8', bg:'rgba(99,102,241,0.13)', highlight:false,
              },
              {
                num:'03', Icon: QrCode, title:'QR Code & Direct Link',
                desc:'Every business gets a unique QR code and booking link. Place the QR on your counter, business cards, or WhatsApp status — clients scan and land straight on your booking page.',
                color:'#a78bfa', bg:'rgba(139,92,246,0.15)', border:'rgba(139,92,246,0.35)', highlight:true,
              },
              {
                num:'04', Icon: Star, title:'Ratings & Categories',
                desc:'Top-rated businesses appear higher in results. Clients filter by Men / Women / Unisex and by category. Better reviews and a complete profile = more bookings.',
                color:'#fcd34d', bg:'rgba(245,158,11,0.13)', highlight:false,
              },
            ].map(({ num, Icon, title, desc, color, bg, highlight }) => (
              <div key={num} className="msb-step" style={{
                background: highlight ? 'linear-gradient(145deg,rgba(139,92,246,0.1),rgba(99,102,241,0.06))' : c.card,
                border: highlight ? '1px solid rgba(139,92,246,0.35)' : `1px solid ${c.border}`,
                borderRadius:22, padding:'28px 26px', position:'relative', overflow:'hidden',
                boxShadow: highlight ? '0 0 50px rgba(139,92,246,0.15)' : c.shadow,
              }}>
                <div style={{ position:'absolute', top:14, right:20, fontSize:56, fontWeight:900, color:c.watermark, lineHeight:1, userSelect:'none', letterSpacing:'-3px' }}>{num}</div>
                <div style={{ width:52, height:52, borderRadius:16, background:bg, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18, boxShadow:`0 0 24px ${color}25` }}><Icon size={22} color={color} strokeWidth={1.8} /></div>
                <h3 style={{ fontSize:16.5, fontWeight:700, color:c.heading, marginBottom:10 }}>{title}</h3>
                <p style={{ fontSize:13.5, color:c.subtle, lineHeight:1.78, marginBottom: highlight ? 18 : 0 }}>{desc}</p>
                {highlight && (
                  <a href={ROUTES.REGISTER} className="msb-link inline-flex items-center gap-1.5" style={{ fontSize:13, color:'#a78bfa', fontWeight:600 }}>
                    Generate your QR free →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section style={{ padding:'0 20px 96px' }}>
        <div className="max-w-6xl mx-auto">
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{ display:'inline-block', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', borderRadius:99, padding:'4px 16px', fontSize:11, color:'#a78bfa', fontWeight:700, letterSpacing:1.5, marginBottom:18 }}>FEATURES</div>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, color:c.heading, letterSpacing:'-1px', marginBottom:12 }}>Everything your business needs</h2>
            <p style={{ color:c.subtle, fontSize:15, maxWidth:440, margin:'0 auto', lineHeight:1.7 }}>One platform replaces all the apps and notebooks you currently use.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES_DATA.map(({ Icon, color, bg, title, desc }) => (
              <div key={title} className="msb-feat" style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:22, padding:'28px 24px', cursor:'default' }}>
                <div style={{ width:52, height:52, borderRadius:15, background:bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18, boxShadow:`0 0 26px ${color}30` }}><Icon size={22} color={color} strokeWidth={1.8} /></div>
                <h3 style={{ fontSize:16, fontWeight:700, color:c.heading, marginBottom:8 }}>{title}</h3>
                <p style={{ fontSize:13.5, color:c.subtle, lineHeight:1.75 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESULTS — WHAT YOU GET ────────────────────────── */}
      <section style={{ padding:'96px 20px', background:c.section, borderTop:`1px solid ${c.divider}`, borderBottom:`1px solid ${c.divider}` }}>
        <div className="max-w-5xl mx-auto">
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:99, padding:'4px 16px', fontSize:11, color:'#6ee7b7', fontWeight:700, letterSpacing:1.5, marginBottom:18 }}>RESULTS</div>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, color:c.heading, letterSpacing:'-1px', marginBottom:12 }}>What happens in your first 30 days</h2>
            <p style={{ color:c.subtle, fontSize:15, lineHeight:1.7, maxWidth:460, margin:'0 auto' }}>Business owners consistently report these outcomes in their first month on the platform.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {[
              { value:'2×', label:'More Bookings',      sub:'vs phone-only businesses',  color:'#818cf8', glow:'rgba(99,102,241,0.35)',  Icon: TrendingUp },
              { value:'40%', label:'Fewer No-Shows',   sub:'with automated reminders', color:'#6ee7b7', glow:'rgba(16,185,129,0.35)', Icon: BellOff },
              { value:'3×', label:'Faster Check-in',   sub:'with digital queue',    color:'#fcd34d', glow:'rgba(245,158,11,0.35)',  Icon: Zap },
              { value:'₹0', label:'Extra Marketing Cost', sub:'customers find you free', color:'#f9a8d4', glow:'rgba(236,72,153,0.35)', Icon: DollarSign },
            ].map(({ value, label, sub, color, glow, Icon }) => (
              <div key={label} className="msb-result" style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:22, padding:'28px 22px', textAlign:'center', cursor:'default' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}><Icon size={28} color={color} strokeWidth={1.8} /></div>
                <div style={{ fontSize:44, fontWeight:900, color, letterSpacing:'-2px', lineHeight:1, textShadow:`0 0 40px ${glow}`, marginBottom:8 }}>{value}</div>
                <div style={{ fontSize:13, color:c.muted, fontWeight:700, marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:11, color:c.subtle }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Before / After table */}
          <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:22, overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', background:c.card2, borderBottom:`1px solid ${c.divider}`, padding:'14px 24px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:c.subtle, letterSpacing:1.2 }}>WHAT YOU DO NOW</div>
              <div style={{ fontSize:11, fontWeight:700, color:c.subtle, letterSpacing:1.2, textAlign:'center' }}>→</div>
              <div style={{ fontSize:11, fontWeight:700, color:'#6ee7b7', letterSpacing:1.2, textAlign:'right' }}>WITH GLOWLOOX ✨</div>
            </div>
            {[
              ['Phone calls for every booking',        'Online self-booking 24/7'],
              ['Handwritten appointment book',          'Live dashboard on any device'],
              ['Guess which services make money',       'Real-time revenue analytics'],
              ['Manually remind customers',             'Automated reminders sent for you'],
              ['Paper bills and manual accounting',     'Auto-invoices and earnings reports'],
              ['No idea who your loyal customers are',  'Full CRM with visit history'],
            ].map(([before, after], i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', padding:'13px 24px', borderBottom: i < 5 ? `1px solid ${c.dividerFaint}` : 'none', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:12.5, color:c.subtle, display:'flex', alignItems:'center', gap:8 }}><span style={{ color:'#ef4444', fontWeight:700 }}>✗</span> {before}</div>
                <div />
                <div style={{ fontSize:12.5, color:c.muted, display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>{after} <span style={{ color:'#6ee7b7', fontWeight:700 }}>✓</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GROWTH ENGINE ─────────────────────────────────── */}
      <section style={{ padding:'96px 20px' }}>
        <div className="max-w-5xl mx-auto">
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', background:'rgba(249,115,22,0.1)', border:'1px solid rgba(249,115,22,0.25)', borderRadius:99, padding:'4px 16px', fontSize:11, color:'#fb923c', fontWeight:700, letterSpacing:1.5, marginBottom:18 }}>GROWTH ENGINE</div>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, color:c.heading, letterSpacing:'-1px', marginBottom:12 }}>Marketing that runs while you sleep</h2>
            <p style={{ color:c.subtle, fontSize:15, lineHeight:1.7, maxWidth:480, margin:'0 auto' }}>Automated campaigns that bring customers back — without you lifting a finger.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            {[
              { Icon: Gift,       color:'#fb923c', title:'Festival Campaigns',     desc:'Auto-send Diwali, Holi, Eid, and Christmas offers to your entire customer list with one click. Increase bookings during high-demand periods.' },
              { Icon: Cake,       color:'#f472b6', title:'Birthday & Anniversary', desc:'Delight customers on their special day with automatic discount messages. Personal touch = loyal customers who keep coming back.' },
              { Icon: RotateCcw,  color:'#818cf8', title:'Win-Back Campaigns',     desc:'Customers who haven\'t visited in 30+ days get an automatic "We miss you" offer. Recover lost revenue on autopilot.' },
              { Icon: Bot,        color:'#a78bfa', title:'AI Smart Upselling',     desc:'When a customer books a service, the app suggests "Customers also booked this." Smart suggestions increase your average bill.' },
            ].map(({ Icon, color, title, desc }) => (
              <div key={title} className="msb-ai" style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:20, padding:'26px 24px', display:'flex', gap:18, cursor:'default' }}>
                <div style={{ width:52, height:52, borderRadius:15, background:`${color}18`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 0 24px ${color}20` }}><Icon size={22} color={color} strokeWidth={1.8} /></div>
                <div>
                  <h3 style={{ fontSize:15, fontWeight:700, color:c.heading, marginBottom:8 }}>{title}</h3>
                  <p style={{ fontSize:13, color:c.subtle, lineHeight:1.7 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          {/* AI coming soon pill */}
          <div style={{ textAlign:'center' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.22)', borderRadius:99, padding:'8px 22px', fontSize:13, color:'#c4b5fd', fontWeight:600 }}>
              <span style={{ fontSize:16 }}>🚀</span>
              Coming soon: AI predicts your busiest days and auto-adjusts offers to fill slow hours
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ───────────────────────────────────────────── */}
      <section style={{ padding:'0 20px 96px' }}>
        <div className="max-w-5xl mx-auto">
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', borderRadius:99, padding:'4px 16px', fontSize:11, color:'#a78bfa', fontWeight:700, letterSpacing:1.5, marginBottom:18 }}>REVIEWS</div>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, color:c.heading, letterSpacing:'-1px', marginBottom:12 }}>Loved by business owners</h2>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:8 }}>
              <span style={{ color:'#fcd34d', fontSize:18, letterSpacing:2 }}>★★★★★</span>
              <span style={{ color:c.muted, fontSize:14, fontWeight:600 }}>4.9 / 5 · 500+ reviews</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {REVIEWS.map(({ name, salon, rating, text }) => (
              <div key={name} className="msb-review" style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:20, padding:'24px 22px', position:'relative' }}>
                <div style={{ position:'absolute', top:18, right:18, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:99, padding:'2px 9px', fontSize:9.5, color:'#6ee7b7', fontWeight:700, letterSpacing:0.6 }}>✓ VERIFIED</div>
                <div style={{ color:'#fcd34d', fontSize:15, marginBottom:14, letterSpacing:2 }}>{'★'.repeat(rating)}</div>
                <p style={{ fontSize:13.5, color:c.muted, lineHeight:1.75, marginBottom:18, fontStyle:'italic' }}>"{text}"</p>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', flexShrink:0 }}>
                    {name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:c.text }}>{name}</div>
                    <div style={{ fontSize:11, color:c.subtle }}>{salon}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────── */}
      <section style={{ background:c.sectionAlt, borderTop:`1px solid ${c.divider}`, padding:'96px 20px' }}>
        <div className="max-w-5xl mx-auto">
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{ display:'inline-block', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', borderRadius:99, padding:'4px 16px', fontSize:11, color:'#a78bfa', fontWeight:700, letterSpacing:1.5, marginBottom:18 }}>PRICING</div>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, color:c.heading, letterSpacing:'-1px', marginBottom:12 }}>Free for every business</h2>
            <p style={{ color:c.subtle, fontSize:15 }}>No subscription. No commission. No credit card. Customers simply pay at your salon.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 items-start max-w-md mx-auto">
            {PRICING_PLANS.map(({ name, price, period, desc, highlight, features, cta, badge }) => (
              <div key={name} className="msb-price" style={{
                background: highlight ? 'linear-gradient(155deg,rgba(124,58,237,0.16),rgba(37,99,235,0.1))' : c.card,
                border: highlight ? '1px solid rgba(124,58,237,0.5)' : `1px solid ${c.border}`,
                borderRadius:26, padding:'36px 28px', position:'relative',
                boxShadow: highlight ? '0 0 80px rgba(124,58,237,0.2),inset 0 1px 0 rgba(255,255,255,0.07)' : 'none',
              }}>
                {highlight && <div style={{ position:'absolute', inset:0, borderRadius:26, background:'radial-gradient(ellipse 80% 60% at 50% 0%,rgba(124,58,237,0.12) 0%,transparent 70%)', pointerEvents:'none' }} />}
                {badge && (
                  <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#7c3aed,#2563eb)', borderRadius:99, padding:'5px 18px', fontSize:10.5, fontWeight:700, color:'#fff', whiteSpace:'nowrap', boxShadow:'0 0 24px rgba(124,58,237,0.55)' }}>
                    {badge}
                  </div>
                )}
                <div style={{ fontSize:10.5, fontWeight:700, color: highlight ? '#a78bfa' : c.subtle, letterSpacing:1.4, marginBottom:12, position:'relative' }}>{name.toUpperCase()}</div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:4, marginBottom:6, position:'relative' }}>
                  <span style={{ fontSize:46, fontWeight:900, color:c.heading, letterSpacing:'-2.5px', lineHeight:1 }}>{price}</span>
                  <span style={{ color:c.subtle, fontSize:13.5, paddingBottom:8 }}>{period}</span>
                </div>
                <p style={{ fontSize:13, color:c.subtle, marginBottom:26, lineHeight:1.65, position:'relative' }}>{desc}</p>
                <div style={{ borderTop:`1px solid ${c.border}`, paddingTop:22, marginBottom:28, position:'relative' }}>
                  {features.map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:11, fontSize:13, color:c.muted }}>
                      <span style={{ color: highlight ? '#a78bfa' : '#6ee7b7', fontWeight:800, fontSize:13, flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <a href={ROUTES.REGISTER} className={highlight ? 'msb-btn-p' : 'msb-btn-s'} style={{
                  display:'block', textAlign:'center', padding:'13px 0', borderRadius:14, position:'relative',
                  ...(highlight
                    ? { background:'linear-gradient(135deg,#7c3aed,#2563eb)', color:'#fff', fontWeight:700, fontSize:14, boxShadow:'0 0 30px rgba(124,58,237,0.5)' }
                    : { background:'transparent', border:`1px solid ${c.btnBorder}`, color:c.muted, fontWeight:600, fontSize:14 }),
                }}>
                  {cta}
                </a>
              </div>
            ))}
          </div>
          <p style={{ textAlign:'center', marginTop:32, fontSize:13, color:c.subtle }}>
            All plans include the <strong style={{ color:'#a78bfa' }}>GlowLoox app</strong> and full platform access. No hidden fees.
          </p>
        </div>
      </section>

      {/* ── APP DOWNLOAD ──────────────────────────────────────── */}
      <section style={{ padding:'80px 20px', borderTop:`1px solid ${c.divider}`, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 60% at 50% 100%,rgba(37,99,235,0.1) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="max-w-4xl mx-auto text-center relative" style={{ zIndex:1 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}><Smartphone size={48} color='#818cf8' strokeWidth={1.5} /></div>
          <h2 style={{ fontSize:'clamp(1.6rem,3.5vw,2.4rem)', fontWeight:800, color:c.heading, letterSpacing:'-1px', marginBottom:12 }}>
            Manage your business on the go
          </h2>
          <p style={{ color:c.subtle, fontSize:15, lineHeight:1.75, maxWidth:440, margin:'0 auto 32px' }}>
            GlowLoox lets you accept bookings, track revenue, and manage your team — right from your phone.
          </p>
          <a
            href="https://play.google.com/store/apps/details?id=com.mysalonbookings.owner"
            target="_blank"
            rel="noopener noreferrer"
            className="msb-btn-p inline-flex items-center gap-3 px-7 py-4 rounded-2xl font-bold text-sm"
            style={{ background: isDark ? 'linear-gradient(135deg,#1a1a2e,#16213e)' : 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', border:`1px solid ${c.btnBorder}`, color:c.heading, boxShadow:'0 0 30px rgba(37,99,235,0.3)', display:'inline-flex' }}
          >
            <PlayCircle size={26} color={c.heading} strokeWidth={1.6} />
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:9, fontWeight:500, color:c.subtle, letterSpacing:0.5 }}>GET IT ON</div>
              <div style={{ fontSize:15, fontWeight:800, color:c.heading, marginTop:1 }}>Google Play</div>
            </div>
          </a>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section style={{ padding:'96px 20px', position:'relative', overflow:'hidden', borderTop:`1px solid ${c.divider}` }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 70% at 50% 50%,rgba(124,58,237,0.16) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'70%', height:1, background:'linear-gradient(90deg,transparent,rgba(139,92,246,0.45),transparent)', pointerEvents:'none' }} />
        <div className="max-w-2xl mx-auto text-center relative" style={{ zIndex:1 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}><Sparkles size={44} color='#a78bfa' strokeWidth={1.4} /></div>
          <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:900, color:c.heading, letterSpacing:'-1.2px', marginBottom:14, lineHeight:1.15 }}>
            Stop losing bookings.<br />Start growing today.
          </h2>
          <p style={{ color:c.subtle, fontSize:15.5, marginBottom:36, lineHeight:1.75, maxWidth:400, margin:'0 auto 36px' }}>
            500+ business owners across India run smarter, earn more, and stress less — with GlowLoox. Join them for free.
          </p>
          <a href={ROUTES.REGISTER} className="msb-btn-p px-10 py-4 font-bold rounded-2xl inline-flex items-center gap-3" style={{ background:'linear-gradient(135deg,#7c3aed,#2563eb)', color:'#fff', boxShadow:'0 0 52px rgba(124,58,237,0.6)', fontSize:16 }}>
            <Rocket size={18} /> Register Now — It's Free
          </a>
          <p style={{ fontSize:12, color:c.subtle, marginTop:18 }}>
            ✓ No credit card &nbsp;·&nbsp; ✓ Full access &nbsp;·&nbsp; ✓ Cancel anytime
          </p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section style={{ padding:'96px 20px', background:c.section, borderTop:`1px solid ${c.divider}` }}>
        <div className="max-w-3xl mx-auto">
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', borderRadius:99, padding:'4px 16px', fontSize:11, color:'#a78bfa', fontWeight:700, letterSpacing:1.5, marginBottom:18 }}>FAQ</div>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, color:c.heading, letterSpacing:'-1px', marginBottom:12 }}>Common questions</h2>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { q:'Is GlowLoox free to use?', a:'Yes — GlowLoox is completely free for business owners. No subscription, no commission, no credit card. You get full dashboard access from day one to manage bookings, services, staff, customers and your walk-in queue. Customers simply pay at your salon.' },
              { q:'What types of businesses can use GlowLoox?', a:'GlowLoox works for all beauty and wellness businesses — hair salons, beauty parlours, spas, grooming studios, nail salons, makeup studios, tattoo parlours, and any service-based business that takes appointments.' },
              { q:'How do clients book appointments?', a:'Clients discover your business on the GlowLoox app, select a service, and pick an available time slot. You get an instant push notification and can accept or decline from the app or dashboard.' },
              { q:'Does GlowLoox have a mobile app?', a:'Yes. The GlowLoox Partner app for business owners is available on Android. Manage bookings, track revenue, and receive notifications — all from your phone.' },
              { q:'Does GlowLoox support UPI payments?', a:'Yes. GlowLoox supports UPI, credit/debit cards, and cash. It auto-generates invoices and provides daily, weekly, and monthly earnings reports.' },
              { q:'How quickly can I set up my business on GlowLoox?', a:'Most owners complete setup in under 5 minutes. You add your services, set your hours, and your booking page is live — ready to accept clients the same day.' },
            ].map(({ q, a }, i) => (
              <details key={i} style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:16, overflow:'hidden', cursor:'pointer' }}>
                <summary style={{ padding:'18px 22px', fontSize:14.5, fontWeight:700, color:c.heading, listStyle:'none', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                  {q}
                  <span style={{ color:c.subtle, flexShrink:0, fontSize:18, lineHeight:1 }}>+</span>
                </summary>
                <div style={{ padding:'0 22px 18px', fontSize:13.5, color:c.subtle, lineHeight:1.8 }}>{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer style={{ borderTop:`1px solid ${c.divider}`, padding:'40px 20px', background:c.bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>✨</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:c.muted }}>GlowLoox</div>
                  <div style={{ fontSize:10, color:c.subtle }}>by Gigamind Technology Pvt Ltd</div>
                </div>
              </div>
              <p style={{ fontSize:12.5, color:c.subtle, lineHeight:1.75 }}>India's leading beauty &amp; wellness booking platform for modern business owners.</p>
            </div>
            {/* Links */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:c.subtle, letterSpacing:1.2, marginBottom:14 }}>PRODUCT</div>
              {[['Features','#features'],['Pricing','#pricing'],['GlowLoox App','https://play.google.com/store/apps/details?id=com.mysalonbookings.owner'],['Sign In', ROUTES.LOGIN]].map(([label,href]) => (
                <div key={label} style={{ marginBottom:9 }}>
                  <a href={href} className="msb-link" style={{ fontSize:13, color:c.muted }}>{label}</a>
                </div>
              ))}
            </div>
            {/* Legal */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:c.subtle, letterSpacing:1.2, marginBottom:14 }}>LEGAL & SUPPORT</div>
              {[[`Privacy Policy`, ROUTES.OWNER_PRIVACY],[`Terms of Service`, ROUTES.OWNER_TERMS],[`Contact Us`,'mailto:glowloox@gmail.com']].map(([label,href]) => (
                <div key={label} style={{ marginBottom:9 }}>
                  <a href={href} className="msb-link" style={{ fontSize:13, color:c.muted }}>{label}</a>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:`1px solid ${c.dividerFaint}`, paddingTop:20, textAlign:'center', fontSize:12, color:c.subtle }}>
            © 2026 GlowLoox by Gigamind Technology Pvt Ltd. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  </>
  );
};

// ── App ────────────────────────────────────────────────────────
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <ThemeProvider>
        <LanguageProvider>
        <AuthProvider>
          <SalonProvider>
            <GalleryUploadProvider>
            <NotificationProvider>
              <Toaster position="top-right" />
              <CommandPalette />
              <BookingAlertModal />
              <FloatingUploadBar />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Landing page — always public, never redirects */}
                  <Route path={ROUTES.HOME} element={<LandingPage />} />

                  {/* Public auth routes — redirect away if already logged in */}
                  <Route element={<PublicRoute />}>
                    <Route path={ROUTES.LOGIN}    element={<Login />} />
                    <Route path={ROUTES.REGISTER} element={<Register />} />
                  </Route>

                  {/* New unified onboarding — accessible to guests AND mobile_verified owners */}
                  <Route path={ROUTES.ONBOARDING} element={<Onboarding />} />

                  {/* Legal pages — fully public */}
                  <Route path={ROUTES.PRIVACY} element={<PrivacyPolicy />} />
                  <Route path={ROUTES.TERMS}   element={<TermsAndConditions />} />
                  <Route path={ROUTES.LEGAL}            element={<LegalIndex />} />
                  <Route path={ROUTES.CUSTOMER_PRIVACY} element={<CustomerPrivacyPolicy />} />
                  <Route path={ROUTES.OWNER_PRIVACY}    element={<OwnerPrivacyPolicy />} />
                  <Route path={ROUTES.CUSTOMER_TERMS}   element={<CustomerTerms />} />
                  <Route path={ROUTES.OWNER_TERMS}      element={<OwnerTerms />} />
                  <Route path={ROUTES.CUSTOMER_REFUND_POLICY} element={<CustomerRefundPolicy />} />

                  {/* Semi-protected */}
                  <Route path={ROUTES.SALON_REGISTER}  element={<SalonRegistration />} />
                  <Route path={ROUTES.APPROVAL_WAITING} element={<ApprovalWaiting />} />
                  <Route path={ROUTES.SALON_SETUP}      element={<SalonSetup />} />

                  {/* Protected dashboard routes */}
                  <Route element={<ProtectedRoute />}>
                    {/* Staff can only access dashboard (renders StaffDashboard internally) */}
                    <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />

                    {/* Owner-only routes — staff are redirected to dashboard */}
                    <Route element={<OwnerOnlyRoute />}>
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
                      <Route path={ROUTES.PACKAGES}      element={<Packages />} />
                      <Route path={ROUTES.BILLING}       element={<Billing />} />
                      <Route path={ROUTES.PROMOTIONS}    element={<Promotions />} />
                      <Route path={ROUTES.MESSAGES}      element={<Messages />} />
                      <Route path={ROUTES.GLOWLOOX}      element={<GlowLooxProfile />} />
                      <Route path={ROUTES.TEAM}          element={<Team />} />
                      <Route path={ROUTES.AUDIT}         element={<AuditLog />} />
                      <Route path={ROUTES.DEVELOPER}     element={<Developer />} />
                      <Route path={ROUTES.QUEUE}         element={<QueuePage />} />
                      <Route path={ROUTES.FEEDBACK}      element={<Feedback />} />
                      <Route path={ROUTES.WALLET}        element={<Wallet />} />
                    </Route>
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
            </GalleryUploadProvider>
          </SalonProvider>
        </AuthProvider>
        </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
