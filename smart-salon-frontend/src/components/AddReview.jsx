import { useState } from "react";
import API from "../services/api";

function AddReview({ salonId, onReviewAdded }) {
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Please write a comment.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await API.post("/reviews", { salon: salonId, rating, comment });
      setComment("");
      setRating(5);
      setSuccess(true);
      onReviewAdded();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 mb-6">
      <h3 className="font-semibold text-slate-800 mb-4">Write a Review</h3>

      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
          <span>✓</span> Review submitted! Thank you.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Star rating */}
        <div className="mb-4">
          <p className="text-sm text-slate-500 mb-2">Rating</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="star-btn text-2xl transition-colors"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
              >
                <span className={star <= (hovered || rating) ? "text-amber-400" : "text-slate-200"}>
                  ★
                </span>
              </button>
            ))}
            <span className="ml-2 text-sm font-medium text-slate-600">
              {labels[hovered || rating]}
            </span>
          </div>
        </div>

        {/* Comment */}
        <textarea
          placeholder="Share your experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="input-field resize-none mb-4"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
}

export default AddReview;
