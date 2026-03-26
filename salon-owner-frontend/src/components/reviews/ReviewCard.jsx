import React, { useState } from 'react';
import { MessageSquare, Edit2, Star, CheckCircle, AlertCircle } from 'lucide-react';
import ReplyBox from './ReplyBox';
import api from '../../services/api';
import toast from 'react-hot-toast';

/* ── Star row ── */
export const StarRow = ({ rating, size = 'sm' }) => {
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`${sz} ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700'}`}
        />
      ))}
    </div>
  );
};

/* ── Avatar ── */
const Avatar = ({ name, rating }) => {
  const initials = (name || 'C')
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const gradient =
    rating <= 2 ? 'from-red-400 to-rose-500'
    : rating === 3 ? 'from-amber-400 to-orange-500'
    : 'from-indigo-500 to-violet-600';

  return (
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient}
      flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-sm`}>
      {initials}
    </div>
  );
};

/* ── Main ReviewCard ── */
const ReviewCard = ({ review, onReplied }) => {
  const [replyOpen,  setReplyOpen]  = useState(false);
  const [replyText,  setReplyText]  = useState(review.ownerResponse || '');
  const [saving,     setSaving]     = useState(false);

  const isLow        = review.salonRating <= 2;
  const hasReply     = !!review.ownerResponse;
  const dateStr      = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const handleSave = async (text) => {
    setSaving(true);
    try {
      await api.put(`/owner/reviews/${review._id}/reply`, { reply: text });
      onReplied(review._id, text);
      setReplyText(text);
      setReplyOpen(false);
      toast.success('Reply added!');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save reply');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`group bg-white dark:bg-gray-900 rounded-2xl border p-4 space-y-3
      transition-all duration-150 hover:shadow-md dark:hover:shadow-gray-900/60
      ${isLow
        ? 'border-red-200 dark:border-red-900/60 ring-1 ring-red-100 dark:ring-red-900/30'
        : 'border-gray-100 dark:border-gray-800'
      }`}>

      {/* Top row: avatar, name, stars, date, badge */}
      <div className="flex items-start gap-3">
        <Avatar name={review.customerName} rating={review.salonRating} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {review.customerName || 'Anonymous'}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <StarRow rating={review.salonRating} />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {review.salonRating}.0
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{dateStr}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isLow && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold
                  bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800">
                  <AlertCircle className="w-2.5 h-2.5" /> Low Rating
                </span>
              )}
              {hasReply ? (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold
                  bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800">
                  <CheckCircle className="w-2.5 h-2.5" /> Replied
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold
                  bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800">
                  <MessageSquare className="w-2.5 h-2.5" /> Needs Reply
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review title + text */}
      {review.title && (
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{review.title}</p>
      )}
      {review.reviewText && (
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {review.reviewText}
        </p>
      )}

      {/* Owner reply (existing) */}
      {hasReply && !replyOpen && (
        <div className="flex gap-2.5 p-3 bg-indigo-50 dark:bg-indigo-950/30
          border border-indigo-100 dark:border-indigo-900/60 rounded-xl">
          <div className="w-1 rounded-full bg-indigo-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Your reply</p>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
              {review.ownerResponse}
            </p>
          </div>
        </div>
      )}

      {/* Reply box */}
      {replyOpen && (
        <ReplyBox
          initial={replyText}
          onSave={handleSave}
          onCancel={() => setReplyOpen(false)}
          saving={saving}
        />
      )}

      {/* Reply button */}
      {!replyOpen && (
        <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setReplyOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold
              text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300
              transition-colors"
          >
            {hasReply
              ? <><Edit2 className="w-3.5 h-3.5" /> Edit Reply</>
              : <><MessageSquare className="w-3.5 h-3.5" /> Reply to Review</>
            }
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
