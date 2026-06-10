import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, FileText, Users, Store, RotateCcw } from 'lucide-react';

const docs = [
  {
    icon: <Users size={22} color="#a78bfa" />,
    label: 'Customer',
    title: 'Privacy Policy',
    subtitle: 'For customers booking salon services',
    path: '/legal/customer-privacy',
    accent: '#7c3aed',
    accentLight: '#a78bfa',
  },
  {
    icon: <Store size={22} color="#34d399" />,
    label: 'Salon Owner',
    title: 'Privacy Policy',
    subtitle: 'For salon owners using our SaaS platform',
    path: '/legal/owner-privacy',
    accent: '#10b981',
    accentLight: '#34d399',
  },
  {
    icon: <FileText size={22} color="#60a5fa" />,
    label: 'Customer',
    title: 'Terms & Conditions',
    subtitle: 'Rules and responsibilities for customers',
    path: '/legal/customer-terms',
    accent: '#3b82f6',
    accentLight: '#60a5fa',
  },
  {
    icon: <Shield size={22} color="#f472b6" />,
    label: 'Salon Owner',
    title: 'Terms & Conditions',
    subtitle: 'Subscription, billing, and usage terms for salon owners',
    path: '/legal/owner-terms',
    accent: '#ec4899',
    accentLight: '#f472b6',
  },
  {
    icon: <RotateCcw size={22} color="#fbbf24" />,
    label: 'Customer',
    title: 'Cancellation & Refund Policy',
    subtitle: 'How booking cancellations and refunds are handled',
    path: '/legal/customer-refund-policy',
    accent: '#f59e0b',
    accentLight: '#fbbf24',
  },
];

export default function LegalIndex() {
  const navigate = useNavigate();
  return (
    <div style={{ background: '#09090f', minHeight: '100vh', padding: '64px 20px 80px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'rgba(124,58,237,0.15)',
            border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <Shield size={24} color="#a78bfa" />
          </div>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 30, margin: '0 0 8px', letterSpacing: '-0.03em' }}>Legal Documents</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, margin: 0 }}>
            Privacy Policies and Terms & Conditions for GlowLoox
          </p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 8 }}>
            Effective Date: March 26, 2025
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {docs.map((doc) => (
            <button
              key={doc.path}
              onClick={() => navigate(doc.path)}
              style={{
                background: '#111118', border: `1px solid rgba(255,255,255,0.07)`,
                borderRadius: 18, padding: '24px 20px', textAlign: 'left',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.border = `1px solid ${doc.accent}40`;
                e.currentTarget.style.boxShadow = `0 0 0 1px ${doc.accent}30, 0 8px 32px rgba(0,0,0,0.5)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: `${doc.accent}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                {doc.icon}
              </div>
              <div style={{
                display: 'inline-block', background: `${doc.accent}15`, border: `1px solid ${doc.accent}30`,
                borderRadius: 6, padding: '2px 8px', fontSize: 11, color: doc.accentLight,
                fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8,
              }}>
                {doc.label}
              </div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, margin: '0 0 4px' }}>{doc.title}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{doc.subtitle}</p>
            </button>
          ))}
        </div>

        <div style={{
          marginTop: 40, background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: '16px 20px', textAlign: 'center',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            Questions about our legal policies? Contact us at{' '}
            <a href="mailto:glowloox@gmail.com" style={{ color: '#a78bfa', textDecoration: 'none' }}>
              glowloox@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
