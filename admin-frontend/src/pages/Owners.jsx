import { useEffect, useState, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, Phone, Mail, Store, Users, Scissors, Wand2, Waves, FlaskConical, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_META = {
  approved:         { label: 'Approved',         bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)'  },
  pending_approval: { label: 'Pending',           bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)'  },
  salon_registered: { label: 'Salon Registered',  bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
  mobile_verified:  { label: 'Mobile Verified',   bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: 'rgba(139,92,246,0.3)'  },
  rejected:         { label: 'Rejected',          bg: 'rgba(239,68,68,0.15)',  color: '#f87171', border: 'rgba(239,68,68,0.3)'   },
  banned:           { label: 'Banned',            bg: 'rgba(15,23,42,0.6)',    color: '#94a3b8', border: 'rgba(148,163,184,0.2)' },
};

const MakeupBrushIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 L13.5 14 L10.5 14 Z" />
    <rect x="10.5" y="14" width="3" height="3" rx="0.5" />
    <path d="M10.5 17 Q12 21 13.5 17" />
  </svg>
);

const BIZ_TYPES = [
  { key: '',              label: 'All Owners',     Icon: Users,           color: '#6366f1', grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { key: 'barbershop',    label: 'Barbershop',      Icon: Scissors,        color: '#0ea5e9', grad: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
  { key: 'salon',         label: 'Salon',           Icon: Wand2,           color: '#8b5cf6', grad: 'linear-gradient(135deg,#8b5cf6,#ec4899)' },
  { key: 'spa_wellness',  label: 'Spa & Wellness',  Icon: Waves,           color: '#10b981', grad: 'linear-gradient(135deg,#10b981,#0ea5e9)' },
  { key: 'makeup_bridal', label: 'Makeup & Bridal', Icon: MakeupBrushIcon, color: '#ec4899', grad: 'linear-gradient(135deg,#ec4899,#f59e0b)' },
  { key: 'skin_derma',    label: 'Skin & Derma',    Icon: FlaskConical,    color: '#f59e0b', grad: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
];

const glass = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 16,
};

export default function Owners() {
  const [activeType, setActiveType] = useState('');
  const [owners, setOwners]         = useState([]);
  const [counts, setCounts]         = useState({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);

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
      setOwners(r.data.data.owners);
      setTotalPages(r.data.data.pagination.pages || 1);
      setTotal(r.data.data.pagination.total || 0);
    } catch { toast.error('Failed to load owners'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    Promise.all(
      BIZ_TYPES.slice(1).map(bt =>
        api.get(`/admin/owners?page=1&limit=1&businessType=${bt.key}`)
          .then(r => ({ key: bt.key, total: r.data.data.pagination.total || 0 }))
          .catch(() => ({ key: bt.key, total: 0 }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.key] = r.total; });
      setCounts(map);
    });
    load(1, '', '');
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
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' }}>Business Owners</h1>
            <p style={{ color: '#475569', fontSize: 13, marginTop: 2 }}>
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
                border: isActive ? `1px solid ${color}55` : '1px solid rgba(255,255,255,0.07)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: isActive
                  ? `linear-gradient(135deg, ${color}22, ${color}11)`
                  : 'rgba(255,255,255,0.03)',
                color: isActive ? color : '#64748b',
                backdropFilter: 'blur(12px)',
                boxShadow: isActive ? `0 0 18px ${color}30, inset 0 0 12px ${color}08` : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={14} color={isActive ? color : '#475569'} />
              {label}
              {count !== undefined && (
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  background: isActive ? `${color}30` : 'rgba(255,255,255,0.06)',
                  color: isActive ? color : '#475569',
                  borderRadius: 99, padding: '2px 8px', marginLeft: 2,
                  border: isActive ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.07)',
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
          <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            style={{
              width: '100%', padding: '10px 14px 10px 36px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 11, fontSize: 13, outline: 'none', color: '#f1f5f9',
              backdropFilter: 'blur(12px)',
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
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${activeBiz.color}40`, borderTopColor: activeBiz.color, margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          Loading owners...
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ ...glass, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Owner', 'Contact', 'Status', 'Business Type', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '14px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {owners.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '64px 0', textAlign: 'center', color: '#334155' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>—</div>
                    No owners found
                  </td>
                </tr>
              ) : owners.map((owner, i) => {
                const sc  = STATUS_META[owner.status] || STATUS_META.pending_approval;
                const biz = BIZ_TYPES.find(b => b.key === owner.businessId?.businessType);
                const avatarGrad = ['linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#0ea5e9,#6366f1)', 'linear-gradient(135deg,#10b981,#0ea5e9)', 'linear-gradient(135deg,#ec4899,#f59e0b)'][i % 4];
                return (
                  <tr
                    key={owner._id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Owner */}
                    <td style={{ padding: '15px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 11,
                          background: avatarGrad,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, color: '#fff', fontSize: 15, flexShrink: 0,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}>
                          {owner.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>{owner.name}</div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td style={{ padding: '15px 18px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#475569' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={11} color="#6366f1" />{owner.phone}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={11} color="#8b5cf6" />{owner.email}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '15px 18px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 99,
                        background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                        letterSpacing: '0.03em',
                      }}>
                        {sc.label}
                      </span>
                    </td>

                    {/* Business Type */}
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
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: 12 }}><Store size={12} /> Registered</span>
                        )
                      ) : (
                        <span style={{ color: '#334155', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Joined */}
                    <td style={{ padding: '15px 18px', fontSize: 12, color: '#475569' }}>
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
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)',
              color: page === 1 ? '#334155' : '#94a3b8',
              cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'rgba(99,102,241,0.12)', color: '#818cf8',
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
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)',
              color: page === totalPages ? '#334155' : '#94a3b8',
              cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
