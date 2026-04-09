import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Star } from "lucide-react";
import API from "../services/api";

const CAT_THEMES = {
  barbershop:    { p: '#6366f1' },
  salon:         { p: '#8b5cf6' },
  spa_wellness:  { p: '#06b6d4' },
  makeup_bridal: { p: '#a78bfa' },
  skin_derma:    { p: '#818cf8' },
};
const DEFAULT_THEME = CAT_THEMES.salon;

const dm = {
  bg:      '#050509',
  card:    '#0d0d18',
  cardBrd: 'rgba(99,102,241,0.12)',
  fg:      '#f1f1f5',
  fg75:    'rgba(241,241,245,0.75)',
  fg35:    'rgba(241,241,245,0.35)',
  fg30:    'rgba(241,241,245,0.30)',
  b04:     'rgba(255,255,255,0.06)',
};

const avatarColors = ['#e94560', '#8b5cf6', '#10b981', '#f59e0b', '#38bdf8'];

export default function SalonReviews() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [salon, setSalon]     = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get(`/public/salons/${id}`).catch(() => null),
      API.get(`/public/salons/${id}/reviews`).catch(() => null),
    ]).then(([sRes, rRes]) => {
      if (sRes) setSalon(sRes.data.data || sRes.data);
      if (rRes) setReviews(rRes.data.data?.reviews || rRes.data.data || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const theme = (salon?.businessType && CAT_THEMES[salon.businessType]) || DEFAULT_THEME;
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + (r.salonRating || r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const goBack = () => navigate(-1);

  return (
    <div style={{ minHeight: '100vh', background: dm.bg, color: dm.fg }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5,5,9,0.92)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${dm.b04}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 clamp(20px,5vw,48px)', display: 'flex', alignItems: 'center', gap: 16, height: 60 }}>
          <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: dm.fg75, padding: '6px 0' }}>
            <ArrowLeft style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 14 }}>Back</span>
          </button>
          {salon && (
            <p style={{ fontSize: 15, fontWeight: 700, color: dm.fg, marginLeft: 8 }}>{salon.name}</p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,5vw,48px)' }}>
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.p, marginBottom: 10, fontWeight: 600 }}>
            Client Reviews
          </p>
          <h1 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 800, color: dm.fg, marginBottom: 8 }}>
            {loading ? 'Loading…' : avgRating ? (
              <><span style={{ color: theme.p }}>{avgRating}</span> out of 5</>
            ) : 'What clients say'}
          </h1>
          {!loading && (
            <p style={{ fontSize: 14, color: dm.fg35 }}>
              {reviews.length} verified review{reviews.length !== 1 ? 's' : ''}
            </p>
          )}
        </motion.div>

        {/* Reviews list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: dm.card, border: `1px solid ${dm.cardBrd}`, borderRadius: 16, padding: 'clamp(24px,3vw,36px)', height: 140 }} />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80, color: dm.fg35 }}>
            <p style={{ fontSize: 15 }}>No reviews yet for this salon.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reviews.map((r, i) => {
              const starRating = Math.round(r.salonRating || r.rating || 5);
              const name = r.customerId?.name || r.customerName || 'Guest';
              return (
                <motion.div key={r._id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.5 }}
                  style={{ background: dm.card, border: `1px solid ${dm.cardBrd}`, borderRadius: 16, padding: 'clamp(24px,3vw,36px)' }}>
                  {/* Stars */}
                  <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} style={{ fontSize: 15, color: s <= starRating ? '#fbbf24' : 'rgba(255,255,255,0.12)' }}>★</span>
                    ))}
                    <span style={{ fontSize: 13, fontWeight: 700, color: dm.fg, marginLeft: 6 }}>{starRating}.0</span>
                  </div>
                  {/* Comment */}
                  {r.reviewText && (
                    <p style={{ fontSize: 'clamp(14px,1.5vw,16px)', lineHeight: 1.75, color: dm.fg75, marginBottom: 20 }}>
                      &ldquo;{r.reviewText}&rdquo;
                    </p>
                  )}
                  {r.comment && !r.reviewText && (
                    <p style={{ fontSize: 'clamp(14px,1.5vw,16px)', lineHeight: 1.75, color: dm.fg75, marginBottom: 20 }}>
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  )}
                  {/* Avatar + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14, flexShrink: 0 }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: dm.fg }}>{name}</p>
                      <p style={{ fontSize: 11, color: dm.fg30, letterSpacing: '0.04em' }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                        {r.serviceId?.name && ` · ${r.serviceId.name}`}
                      </p>
                    </div>
                  </div>
                  {/* Owner reply */}
                  {r.ownerResponse && (
                    <div style={{ marginTop: 18, padding: '14px 18px', background: 'rgba(99,102,241,0.08)', borderLeft: `3px solid ${theme.p}`, borderRadius: 8 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: theme.p, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Owner Reply</p>
                      <p style={{ fontSize: 13, color: dm.fg75, lineHeight: 1.65 }}>{r.ownerResponse}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
