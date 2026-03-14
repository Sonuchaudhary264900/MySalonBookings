function ReviewCard({ review }) {
  const rating = parseInt(review.rating) || 5;
  const initials = (review.user?.name || "U").charAt(0).toUpperCase();

  const colors = ["bg-indigo-100 text-indigo-600", "bg-violet-100 text-violet-600", "bg-emerald-100 text-emerald-600", "bg-amber-100 text-amber-600", "bg-rose-100 text-rose-600"];
  const color = colors[initials.charCodeAt(0) % colors.length];

  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-shadow fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
            {initials}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{review.user?.name || "Anonymous"}</p>
            {date && <p className="text-xs text-slate-400">{date}</p>}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={`text-base ${star <= rating ? "text-amber-400" : "text-slate-200"}`}>★</span>
          ))}
        </div>
      </div>
      {review.comment && (
        <p className="mt-3 text-slate-600 text-sm leading-relaxed">{review.comment}</p>
      )}
    </div>
  );
}

export default ReviewCard;
