import React, { useState, useEffect, useMemo } from 'react';
import { Star, MessageSquare, CheckCircle, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ReviewCard, { StarRow } from '../../components/reviews/ReviewCard';
import api from '../../services/api';

/* ── Skeleton card ── */
const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded-full w-1/3" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-1/2" />
      </div>
    </div>
    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-3/4" />
    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-full" />
  </div>
);

/* ── Stat card ── */
const StatCard = ({ icon: Icon, label, value, sub, color, bg }) => (
  <div className={`${bg} rounded-2xl p-4 border border-white/50 dark:border-gray-800`}>
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white/60 dark:bg-gray-900/60`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
    </div>
  </div>
);

/* ── Rating distribution bar ── */
const RatingBar = ({ reviews }) => {
  if (!reviews.length) return null;
  const counts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.salonRating === star).length,
    pct: Math.round((reviews.filter(r => r.salonRating === star).length / reviews.length) * 100),
  }));

  const barColor = (star) =>
    star >= 4 ? 'bg-emerald-500'
    : star === 3 ? 'bg-amber-400'
    : 'bg-red-400';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Rating Distribution</h3>
      </div>
      <div className="space-y-1.5">
        {counts.map(({ star, count, pct }) => (
          <div key={star} className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 w-14 shrink-0">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-3 text-right">{star}</span>
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            </div>
            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(star)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 w-6 text-right shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Top reviews strip ── */
const TopReviews = ({ reviews }) => {
  const top = reviews
    .filter(r => r.salonRating === 5 && r.reviewText)
    .slice(0, 3);
  if (!top.length) return null;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20
      rounded-2xl border border-amber-100 dark:border-amber-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Top Reviews</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60
          text-amber-700 dark:text-amber-400 font-semibold ml-auto">
          5 ★ only
        </span>
      </div>
      <div className="space-y-2">
        {top.map(r => (
          <div key={r._id} className="flex items-start gap-2.5 p-3 bg-white/70 dark:bg-gray-900/60
            rounded-xl border border-amber-100 dark:border-amber-900/30">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
                "{r.reviewText}"
              </p>
              <p className="text-[10px] text-gray-400 mt-1">— {r.customerName || 'Customer'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Filter pill ── */
const FilterPill = ({ label, count, active, onClick, alert }) => (
  <button onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
      active
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700'
    }`}>
    {alert && !active && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
    {label}
    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
      active ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
    }`}>{count}</span>
  </button>
);

/* ── Sort select ── */
const SortSelect = ({ value, onChange }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="px-3 py-1.5 rounded-xl text-xs font-semibold
      bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
      text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40
      transition-all cursor-pointer"
  >
    <option value="newest">Newest First</option>
    <option value="oldest">Oldest First</option>
    <option value="highest">Highest Rating</option>
    <option value="lowest">Lowest Rating</option>
  </select>
);

/* ─── Main Reviews page ──────────────────────────────────────── */
export default function Reviews() {
  const [reviews,  setReviews]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');   // all | unreplied | replied
  const [sort,     setSort]     = useState('newest');
  useEffect(() => { document.title = 'Reviews — GlowLoox'; }, []);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/owner/reviews');
      setReviews(res.data?.data?.reviews || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleReplied = (id, reply) => {
    setReviews(prev => prev.map(r => r._id === id ? { ...r, ownerResponse: reply } : r));
  };

  /* ── Stats ── */
  const stats = useMemo(() => {
    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + r.salonRating, 0) / reviews.length).toFixed(1)
      : '—';
    const replied    = reviews.filter(r => r.ownerResponse).length;
    const unreplied  = reviews.filter(r => !r.ownerResponse).length;
    const lowRatings = reviews.filter(r => r.salonRating <= 2).length;
    return { avg, replied, unreplied, lowRatings };
  }, [reviews]);

  /* ── Filtered + sorted ── */
  const displayed = useMemo(() => {
    let list = reviews;
    if (filter === 'unreplied') list = reviews.filter(r => !r.ownerResponse);
    if (filter === 'replied')   list = reviews.filter(r => !!r.ownerResponse);

    return [...list].sort((a, b) => {
      if (sort === 'newest')  return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === 'oldest')  return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === 'highest') return b.salonRating - a.salonRating;
      if (sort === 'lowest')  return a.salonRating - b.salonRating;
      return 0;
    });
  }, [reviews, filter, sort]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500
                  flex items-center justify-center shadow-md shadow-amber-500/30">
                  <Star className="w-5 h-5 text-white fill-white" />
                </div>
                Reviews
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-0.5">
                Manage customer feedback and ratings
              </p>
            </div>
            <button onClick={() => load()} disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 self-start" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={Star} label="Total Reviews" value={loading ? '—' : reviews.length}
              color="text-amber-600 dark:text-amber-400"
              bg="bg-amber-50 dark:bg-amber-950/40"
            />
            <StatCard
              icon={TrendingUp} label="Avg Rating" value={loading ? '—' : stats.avg}
              sub={!loading && reviews.length ? `${reviews.length} reviews` : undefined}
              color="text-indigo-600 dark:text-indigo-400"
              bg="bg-indigo-50 dark:bg-indigo-950/40"
            />
            <StatCard
              icon={CheckCircle} label="Replied" value={loading ? '—' : stats.replied}
              color="text-emerald-600 dark:text-emerald-400"
              bg="bg-emerald-50 dark:bg-emerald-950/40"
            />
            <StatCard
              icon={AlertCircle} label="Needs Reply" value={loading ? '—' : stats.unreplied}
              sub={!loading && stats.lowRatings ? `${stats.lowRatings} low ratings` : undefined}
              color="text-red-600 dark:text-red-400"
              bg="bg-red-50 dark:bg-red-950/40"
            />
          </div>

          {/* ── Two-column layout: left = reviews, right = charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

            {/* ── Left: filter tabs + list ── */}
            <div className="space-y-4">
              {/* Filter + sort row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <FilterPill
                    label="All" count={reviews.length}
                    active={filter === 'all'} onClick={() => setFilter('all')}
                  />
                  <FilterPill
                    label="Needs Reply" count={stats.unreplied} alert={stats.unreplied > 0}
                    active={filter === 'unreplied'} onClick={() => setFilter('unreplied')}
                  />
                  <FilterPill
                    label="Replied" count={stats.replied}
                    active={filter === 'replied'} onClick={() => setFilter('replied')}
                  />
                </div>
                {reviews.length > 1 && (
                  <SortSelect value={sort} onChange={setSort} />
                )}
              </div>

              {/* Reviews list */}
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                </div>

              ) : reviews.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mb-4">
                      <Star className="w-8 h-8 text-amber-300 dark:text-amber-600" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No reviews yet</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                      Customer reviews will appear here after bookings are completed
                    </p>
                  </div>
                </div>

              ) : displayed.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 py-16 text-center">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">All reviews replied!</p>
                  <p className="text-xs text-gray-400 mt-1">Great job keeping up with customer feedback</p>
                </div>

              ) : (
                <div className="space-y-3">
                  {displayed.map(r => (
                    <ReviewCard key={r._id} review={r} onReplied={handleReplied} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Right: sidebar charts ── */}
            {!loading && reviews.length > 0 && (
              <div className="space-y-4">
                {/* Average rating hero */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30
                  rounded-2xl border border-amber-100 dark:border-amber-900/40 p-5 text-center">
                  <p className="text-5xl font-black text-gray-900 dark:text-white">{stats.avg}</p>
                  <div className="flex justify-center mt-2 mb-1">
                    <StarRow rating={Math.round(parseFloat(stats.avg))} size="lg" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <RatingBar reviews={reviews} />
                <TopReviews reviews={reviews} />
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
