import { useState, useEffect } from "react";
import API from "../../services/api";
import DashboardLayout from "../../components/layout/DashboardLayout";

const STARS = [1, 2, 3, 4, 5];

function StarRow({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {STARS.map(n => (
        <span key={n} className={n <= rating ? "text-amber-400" : "text-gray-200"}>★</span>
      ))}
    </span>
  );
}

function ReviewCard({ review, onReplied }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState(review.ownerResponse || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!replyText.trim()) return;
    setSaving(true);
    setError("");
    try {
      await API.put(`/owner/reviews/${review._id}/reply`, { reply: replyText.trim() });
      onReplied(review._id, replyText.trim());
      setReplyOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save reply");
    } finally {
      setSaving(false);
    }
  };

  const dateStr = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StarRow rating={review.salonRating} />
            <span className="text-sm font-semibold text-slate-700">{review.salonRating}/5</span>
          </div>
          <p className="text-xs text-slate-400">{review.customerName || "Customer"} · {dateStr}</p>
        </div>
        {!replyOpen && (
          <button
            onClick={() => setReplyOpen(true)}
            className="text-xs text-indigo-600 font-semibold hover:underline shrink-0"
          >
            {review.ownerResponse ? "Edit Reply" : "Reply"}
          </button>
        )}
      </div>

      {review.title && <p className="font-semibold text-slate-800 mb-1">{review.title}</p>}
      {review.reviewText && <p className="text-sm text-slate-600">{review.reviewText}</p>}

      {review.ownerResponse && !replyOpen && (
        <div className="mt-3 px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-sm">
          <p className="text-xs text-indigo-400 font-semibold mb-1">Your reply</p>
          <p className="text-indigo-700">{review.ownerResponse}</p>
        </div>
      )}

      {replyOpen && (
        <div className="mt-3 space-y-2">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={3}
            placeholder="Write a reply to this review…"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !replyText.trim()}
              className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? "Saving…" : "Save Reply"}
            </button>
            <button
              onClick={() => { setReplyOpen(false); setReplyText(review.ownerResponse || ""); }}
              className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | replied | unreplied

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get("/owner/reviews");
        setReviews(res.data.data?.reviews || []);
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleReplied = (reviewId, reply) => {
    setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, ownerResponse: reply } : r));
  };

  const filtered = reviews.filter(r => {
    if (filter === "replied") return !!r.ownerResponse;
    if (filter === "unreplied") return !r.ownerResponse;
    return true;
  });

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.salonRating, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Customer Reviews</h1>
          <p className="text-slate-500 mt-1">Read and respond to customer feedback.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Reviews", value: reviews.length },
            { label: "Avg Rating", value: avgRating },
            { label: "Replied", value: reviews.filter(r => r.ownerResponse).length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{loading ? "—" : value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-100 mb-5">
          {[["all", "All"], ["unreplied", "Needs Reply"], ["replied", "Replied"]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${filter === val ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">⭐</div>
            <p className="text-slate-500 text-sm">
              {filter === "unreplied" ? "All reviews have been replied to!" : "No reviews yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <ReviewCard key={r._id} review={r} onReplied={handleReplied} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
