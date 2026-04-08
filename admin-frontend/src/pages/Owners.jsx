import { useEffect, useState, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, Phone, Mail, Store, Users, Scissors, Wand2, Waves, FlaskConical, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';

const STATUS_META = {
  approved:         { label: 'Approved',         color: '#10b981' },
  pending_approval: { label: 'Pending',           color: '#f59e0b' },
  salon_registered: { label: 'Salon Registered',  color: '#3b82f6' },
  mobile_verified:  { label: 'Mobile Verified',   color: '#8b5cf6' },
  rejected:         { label: 'Rejected',          color: '#ef4444' },
  banned:           { label: 'Banned',            color: '#94a3b8' },
};

const MakeupBrushIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 L13.5 14 L10.5 14 Z" />
    <rect x="10.5" y="14" width="3" height="3" rx="0.5" />
    <path d="M10.5 17 Q12 21 13.5 17" />
  </svg>
);

const OWNER_TYPE_TO_BIZ_KEY = {
  BARBERSHOP_OWNER:    'barbershop',
  SALON_OWNER:         'salon',
  SPA_WELLNESS_OWNER:  'spa_wellness',
  MAKEUP_BRIDAL_OWNER: 'makeup_bridal',
  SKIN_DERMA_OWNER:    'skin_derma',
};

const BIZ_TYPES = [
  { key: '',              label: 'All Owners',     Icon: Users,           color: '#6366f1', grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { key: 'barbershop',    label: 'Barbershop',      Icon: Scissors,        color: '#0ea5e9', grad: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
  { key: 'salon',         label: 'Salon',           Icon: Wand2,           color: '#8b5cf6', grad: 'linear-gradient(135deg,#8b5cf6,#ec4899)' },
  { key: 'spa_wellness',  label: 'Spa & Wellness',  Icon: Waves,           color: '#10b981', grad: 'linear-gradient(135deg,#10b981,#0ea5e9)' },
  { key: 'makeup_bridal', label: 'Makeup & Bridal', Icon: MakeupBrushIcon, color: '#ec4899', grad: 'linear-gradient(135deg,#ec4899,#f59e0b)' },
  { key: 'skin_derma',    label: 'Skin & Derma',    Icon: FlaskConical,    color: '#f59e0b', grad: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
];

export default function Owners() {
  const [activeType, setActiveType] = useState('');
  const [owners, setOwners]         = useState([]);
  const [counts, setCounts]         = useState({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);

  // Phone-only section state
  const [phoneOwners, setPhoneOwners]         = useState([]);
  const [phoneLoading, setPhoneLoading]       = useState(true);
  const [phonePage, setPhonePage]             = useState(1);
  const [phoneTotalPages, setPhoneTotalPages] = useState(1);
  const [phoneTotal, setPhoneTotal]           = useState(0);

  const searchRef     = useRef('');
  const activeTypeRef = useRef('');
  useEffect(() => { searchRef.current = search; },     [search]);
  useEffect(() => { activeTypeRef.current = activeType; }, [activeType]);

  const load = async (p, s, btype) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 10 });
      if (s)     params.set('search', s);
      if (btype) params.set('businessType', btype);
      const r = await api.get(`/admin/owners?${params}`);
      const t = r.data.data.pagination.total || 0;
      setOwners(r.data.data.owners);
      setTotalPages(r.data.data.pagination.pages || 1);
      setTotal(t);
      // Update the count badge for this business type
      if (btype) {
        setCounts(prev => ({ ...prev, [btype]: t }));
      }
    } catch { toast.error('Failed to load owners'); }
    finally { setLoading(false); }
  };

  const loadPhoneOnly = async (p = 1) => {
    setPhoneLoading(true);
    try {
      const r = await api.get(`/admin/owners?page=${p}&limit=10&status=mobile_verified`);
      setPhoneOwners(r.data.data.owners);
      setPhoneTotalPages(r.data.data.pagination.pages || 1);
      setPhoneTotal(r.data.data.pagination.total || 0);
    } catch { toast.error('Failed to load phone-only owners'); }
    finally { setPhoneLoading(false); }
  };

  useEffect(() => {
    // Fetch counts for each business type
    BIZ_TYPES.slice(1).forEach(bt => {
      api.get(`/admin/owners?page=1&limit=1&businessType=${bt.key}`)
        .then(r => {
          const t = r.data.data.pagination.total || 0;
          setCounts(prev => ({ ...prev, [bt.key]: t }));
        })
        .catch(() => {});
    });
    load(1, '', '');
    loadPhoneOnly(1);
  }, []);

  const handleTabChange = (key) => {
    setActiveType(key);
    setSearch('');
    setPage(1);
    load(1, '', key);
  };

  const handlePageChange = (p) => {
    setPage(p);
    load(p, searchRef.current, activeTypeRef.current);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search, activeTypeRef.current);
  };

  const handlePhonePageChange = (p) => {
    setPhonePage(p);
    loadPhoneOnly(p);
  };

  const activeBiz = BIZ_TYPES.find(b => b.key === activeType) || BIZ_TYPES[0];

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{
            background: activeBiz.grad,
            borderRadius: 14,
            padding: 10,
            boxShadow: `0 0 24px ${activeBiz.color}55`,
          }}>
            <activeBiz.Icon size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>Business Owners</h1>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
              <span style={{ color: activeBiz.color, fontWeight: 700 }}>{total}</span> {activeBiz.label.toLowerCase()} registered on the platform
            </p>
          </div>
        </div>
      </div>

      {/* Business type tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {BIZ_TYPES.map(({ key, label, Icon, color, grad }) => {
          const isActive = activeType === key;
          const count = key === '' ? undefined : counts[key];
          return (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 17px', borderRadius: 12,
                border: isActive ? `1px solid ${color}55` : '1px solid var(--border)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: isActive
                  ? `linear-gradient(135deg, ${color}22, ${color}11)`
                  : 'var(--surface)',
                color: isActive ? color : 'var(--text2)',
                boxShadow: isActive ? `0 0 18px ${color}30` : 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={14} color={isActive ? color : 'var(--text3)'} />
              {label}
              {count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  background: isActive ? `${color}30` : 'var(--surface2)',
                  color: isActive ? color : 'var(--text2)',
                  borderRadius: 99, padding: '2px 8px', marginLeft: 2,
                  border: isActive ? `1px solid ${color}40` : '1px solid var(--border)',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 24, maxWidth: 440 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            style={{
              width: '100%', padding: '10px 14px 10px 36px',
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              borderRadius: 11, fontSize: 13, outline: 'none',
              color: 'var(--text)',
              transition: 'border-color 0.2s ease',
            }}
          />
        </div>
        <button type="submit" style={{
          padding: '10px 18px',
          background: `linear-gradient(135deg, ${activeBiz.color}, ${activeBiz.color}bb)`,
          color: '#fff', border: 'none', borderRadius: 11, cursor: 'pointer', fontWeight: 600, fontSize: 13,
          boxShadow: `0 0 16px ${activeBiz.color}40`,
          transition: 'all 0.2s',
        }}>
          Search
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid var(--border)`, borderTopColor: activeBiz.color, margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <span style={{ color: 'var(--text2)', fontSize: 14 }}>Loading owners...</span>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                {['Owner', 'Contact', 'Status', 'Business Type', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '14px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {owners.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '64px 0', textAlign: 'center', color: 'var(--text3)' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>—</div>
                    No owners found
                  </td>
                </tr>
              ) : owners.map((owner, i) => {
                const sc  = STATUS_META[owner.status] || STATUS_META.pending_approval;
                const bizKey = owner.businessId?.businessType || OWNER_TYPE_TO_BIZ_KEY[owner.ownerType];
                const biz = BIZ_TYPES.find(b => b.key === bizKey);
                const avatarGrads = ['linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#0ea5e9,#6366f1)', 'linear-gradient(135deg,#10b981,#0ea5e9)', 'linear-gradient(135deg,#ec4899,#f59e0b)'];
                const avatarGrad = avatarGrads[i % 4];
                return (
                  <tr
                    key={owner._id}
                    style={{ borderBottom: '1px solid var(--border2)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '15px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 11,
                          background: avatarGrad,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, color: '#fff', fontSize: 15, flexShrink: 0,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        }}>
                          {owner.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{owner.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '15px 18px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text2)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={11} color="var(--accent)" />{owner.phone}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={11} color="#8b5cf6" />{owner.email}</span>
                      </div>
                    </td>
                    <td style={{ padding: '15px 18px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 99,
                        background: `${sc.color}22`, color: sc.color, border: `1px solid ${sc.color}44`,
                        letterSpacing: '0.03em',
                      }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '15px 18px' }}>
                      {owner.businessId ? (
                        biz ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                            background: `${biz.color}18`, color: biz.color,
                            border: `1px solid ${biz.color}35`,
                          }}>
                            <biz.Icon size={11} color={biz.color} /> {biz.label}
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text2)', fontSize: 12 }}><Store size={12} /> Registered</span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '15px 18px', fontSize: 12, color: 'var(--text2)' }}>
                      {owner.createdAt ? new Date(owner.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }}>
          <button
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 16px', borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: page === 1 ? 'var(--text4)' : 'var(--text2)',
              cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500,
              opacity: page === 1 ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'rgba(99,102,241,0.12)', color: 'var(--accent)',
            border: '1px solid rgba(99,102,241,0.25)',
          }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => handlePageChange(page + 1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 16px', borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: page === totalPages ? 'var(--text4)' : 'var(--text2)',
              cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500,
              opacity: page === totalPages ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── Phone Verified Only Section ── */}
      <div style={{ marginTop: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            borderRadius: 12, padding: 9,
            boxShadow: '0 0 20px rgba(139,92,246,0.4)',
          }}>
            <Smartphone size={18} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
              Phone Verified Only
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{phoneTotal}</span> owners who registered their phone but haven't set up a business yet
            </p>
          </div>
        </div>

        {phoneLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#8b5cf6', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>Loading...</span>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(139,92,246,0.08)', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
                  {['Owner', 'Phone', 'Email', 'Joined'].map(h => (
                    <th key={h} style={{ padding: '13px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {phoneOwners.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '56px 0', textAlign: 'center', color: 'var(--text3)' }}>
                      <Smartphone size={32} color="var(--text4)" style={{ margin: '0 auto 10px', display: 'block' }} />
                      No phone-only owners found
                    </td>
                  </tr>
                ) : phoneOwners.map((owner, i) => {
                  const avatarGrads = ['linear-gradient(135deg,#8b5cf6,#6366f1)', 'linear-gradient(135deg,#6366f1,#a78bfa)', 'linear-gradient(135deg,#7c3aed,#8b5cf6)', 'linear-gradient(135deg,#a78bfa,#6366f1)'];
                  const avatarGrad = avatarGrads[i % 4];
                  return (
                    <tr
                      key={owner._id}
                      style={{ borderBottom: '1px solid var(--border2)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: avatarGrad,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, color: '#fff', fontSize: 14, flexShrink: 0,
                            boxShadow: '0 3px 10px rgba(139,92,246,0.3)',
                          }}>
                            {owner.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{owner.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)' }}>
                          <Phone size={11} color="#8b5cf6" /> {owner.phone || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text2)' }}>
                        {owner.email ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Mail size={11} color="#6366f1" /> {owner.email}
                          </span>
                        ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text2)' }}>
                        {owner.createdAt ? new Date(owner.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {phoneTotalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
            <button
              disabled={phonePage === 1}
              onClick={() => handlePhonePageChange(phonePage - 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 16px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: phonePage === 1 ? 'var(--text4)' : 'var(--text2)',
                cursor: phonePage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500,
                opacity: phonePage === 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span style={{
              padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
              border: '1px solid rgba(139,92,246,0.25)',
            }}>
              {phonePage} / {phoneTotalPages}
            </span>
            <button
              disabled={phonePage === phoneTotalPages}
              onClick={() => handlePhonePageChange(phonePage + 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 16px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: phonePage === phoneTotalPages ? 'var(--text4)' : 'var(--text2)',
                cursor: phonePage === phoneTotalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500,
                opacity: phonePage === phoneTotalPages ? 0.5 : 1,
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
