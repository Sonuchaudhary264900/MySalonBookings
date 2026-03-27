function ReviewCard({ review }) {
  const rating = review.salonRating || parseInt(review.rating) || 5;
  const name = review.customerName || review.user?.name || "Anonymous";
  const initials = name.charAt(0).toUpperCase();
  const text = review.reviewText || review.comment || "";

  const AVATAR_COLORS = [
    { bg: "rgba(99,102,241,0.18)",  color: "#818cf8" },
    { bg: "rgba(139,92,246,0.18)",  color: "#a78bfa" },
    { bg: "rgba(16,185,129,0.18)",  color: "#34d399" },
    { bg: "rgba(245,158,11,0.18)",  color: "#fbbf24" },
    { bg: "rgba(239,68,68,0.18)",   color: "#f87171" },
  ];
  const av = AVATAR_COLORS[initials.charCodeAt(0) % AVATAR_COLORS.length];

  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div
      className="rounded-xl p-4 transition-all duration-200 fade-in"
      style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)', boxShadow: 'var(--t-shadow)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
            style={{ background: av.bg, color: av.color }}
          >
            {initials}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--t-text)' }}>{name}</p>
            {date && <p className="text-xs" style={{ color: 'var(--t-text-3)' }}>{date}</p>}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className="text-base" style={{ color: star <= rating ? '#fbbf24' : 'var(--t-border)' }}>★</span>
          ))}
        </div>
      </div>
      {text && (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--t-text-2)' }}>{text}</p>
      )}
      {review.ownerResponse && (
        <div
          className="mt-3 px-3 py-2.5 rounded-r-lg border-l-4"
          style={{ background: 'rgba(99,102,241,0.08)', borderLeftColor: 'var(--t-accent)' }}
        >
          <p className="text-xs font-bold mb-1" style={{ color: 'var(--t-accent)' }}>Owner's Reply</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-2)' }}>{review.ownerResponse}</p>
        </div>
      )}
    </div>
  );
}

export default ReviewCard;
