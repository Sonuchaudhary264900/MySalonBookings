import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, Eye, Heart, MessageCircle, Lightbulb } from 'lucide-react';

export default function AIInsightsBar({ photos = [], analytics = [] }) {
  const insights = useMemo(() => {
    // Best performing reel category by engagement score
    const catScore = {};
    analytics.forEach(reel => {
      (reel.categories || []).forEach(cat => {
        if (!catScore[cat]) catScore[cat] = { views: 0, likes: 0 };
        catScore[cat].views += reel.viewCount || 0;
        catScore[cat].likes += reel.likeCount || 0;
      });
    });
    const bestCatEntry = Object.entries(catScore)
      .sort((a, b) => (b[1].views + b[1].likes * 2) - (a[1].views + a[1].likes * 2))[0];

    // Best photo tag
    const tagCounts = {};
    photos.forEach(p => (p.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    const bestTagEntry = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];

    // Totals
    const totalViews    = analytics.reduce((s, r) => s + (r.viewCount    || 0), 0);
    const totalLikes    = analytics.reduce((s, r) => s + (r.likeCount    || 0), 0);
    const totalComments = analytics.reduce((s, r) => s + (r.commentCount || 0), 0);

    // Smart suggestion
    const reelCount = analytics.length;
    const hasCover  = photos.some(p => p.isCover);
    let suggestion;
    if (reelCount === 0)        suggestion = 'Upload videos and mark them as reels to boost engagement';
    else if (reelCount < 3)     suggestion = 'Post more reels — salons with 3+ reels see 2× more profile visits';
    else if (!hasCover)         suggestion = 'Set a cover photo to make your salon stand out in search results';
    else if (totalViews < 50)   suggestion = 'Add trending categories like Hair Styling to attract more views';
    else                        suggestion = `Keep posting — your ${bestCatEntry?.[0] ?? 'content'} reels are leading in engagement`;

    return { bestCat: bestCatEntry?.[0], bestTag: bestTagEntry?.[0], totalViews, totalLikes, totalComments, suggestion };
  }, [photos, analytics]);

  if (!photos.length) return null;

  const fmt = n => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-200/50 dark:border-indigo-500/20
      bg-gradient-to-r from-indigo-50/90 via-violet-50/60 to-purple-50/80
      dark:from-indigo-950/50 dark:via-violet-950/30 dark:to-purple-950/40 p-4">

      {/* Ambient glows */}
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-indigo-400/10 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 left-16 w-36 h-36 rounded-full bg-violet-400/10 dark:bg-violet-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">

        {/* Label */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
            flex items-center justify-center shadow-md shadow-indigo-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
            AI Insights
          </span>
        </div>

        {/* Stats chips */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">

          {insights.bestCat && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
              bg-white/70 dark:bg-white/5 border border-indigo-200/60 dark:border-indigo-500/20 backdrop-blur-sm">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{insights.bestCat}</span>
              <span className="text-[10px] text-gray-400">top category</span>
            </div>
          )}

          {insights.totalViews > 0 && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl
              bg-white/70 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 backdrop-blur-sm">
              <span className="flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-300">
                <Eye className="w-3.5 h-3.5 text-gray-400" />
                {fmt(insights.totalViews)}
              </span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="flex items-center gap-1 text-xs font-bold text-red-500">
                <Heart className="w-3.5 h-3.5 fill-red-500" />
                {fmt(insights.totalLikes)}
              </span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="flex items-center gap-1 text-xs font-bold text-indigo-500">
                <MessageCircle className="w-3.5 h-3.5" />
                {fmt(insights.totalComments)}
              </span>
            </div>
          )}

          {/* Suggestion */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs text-gray-500 dark:text-gray-400 italic">{insights.suggestion}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
