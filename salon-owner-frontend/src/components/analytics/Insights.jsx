import React from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Star, Zap, BarChart3, Users } from 'lucide-react';

const generateInsights = ({
  totalRevenue,
  totalBookings,
  growthRate,
  topServices,
  dailyRevenue,
  completedBookings,
  activeCustomers,
}) => {
  const list = [];

  if (typeof growthRate === 'number' && growthRate !== 0) {
    const up = growthRate > 0;
    list.push({
      icon:  up ? TrendingUp : TrendingDown,
      color: up ? 'text-emerald-700 dark:text-emerald-300'  : 'text-red-700 dark:text-red-300',
      bg:    up ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40'
                : 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40',
      iconColor: up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500',
      text: up
        ? `Bookings grew by ${growthRate}% compared to the previous period — great momentum!`
        : `Bookings dropped by ${Math.abs(growthRate)}% — consider a promotion to boost demand.`,
    });
  }

  if (topServices?.length > 0) {
    list.push({
      icon:  Star,
      color: 'text-amber-700 dark:text-amber-300',
      bg:    'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40',
      iconColor: 'text-amber-500',
      text: `"${topServices[0].name}" is your top service with ${topServices[0].bookings} bookings and ₹${(topServices[0].revenue || 0).toLocaleString()} revenue.`,
    });
  }

  if (totalBookings > 0) {
    const avg = Math.round(totalRevenue / totalBookings);
    list.push({
      icon:  Zap,
      color: 'text-indigo-700 dark:text-indigo-300',
      bg:    'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      text: `Average revenue per booking is ₹${avg.toLocaleString()} — ${avg > 300 ? 'excellent per-visit value!' : 'upsell premium services to increase this.'}`,
    });
  }

  if (totalBookings > 0 && completedBookings >= 0) {
    const rate = Math.round((completedBookings / totalBookings) * 100);
    list.push({
      icon:  BarChart3,
      color: 'text-blue-700 dark:text-blue-300',
      bg:    'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
      text: `${rate}% completion rate — ${rate >= 80 ? 'excellent! Most customers are being served.' : 'follow up on pending bookings to improve this.'}`,
    });
  }

  if (dailyRevenue?.length > 0) {
    const best = dailyRevenue.reduce((a, b) => (b.revenue > a.revenue ? b : a), dailyRevenue[0]);
    if (best.revenue > 0) {
      list.push({
        icon:  TrendingUp,
        color: 'text-violet-700 dark:text-violet-300',
        bg:    'bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/40',
        iconColor: 'text-violet-600 dark:text-violet-400',
        text: `Best day was ${best.date} with ₹${best.revenue.toLocaleString()} revenue from ${best.bookings} booking${best.bookings !== 1 ? 's' : ''}.`,
      });
    }
  }

  if (activeCustomers > 0) {
    list.push({
      icon:  Users,
      color: 'text-teal-700 dark:text-teal-300',
      bg:    'bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/40',
      iconColor: 'text-teal-600 dark:text-teal-400',
      text: `${activeCustomers} unique customer${activeCustomers !== 1 ? 's' : ''} visited in this period — ${activeCustomers > 20 ? 'strong repeat business!' : 'grow your loyal customer base with follow-ups.'}`,
    });
  }

  return list.slice(0, 4);
};

const Insights = (props) => {
  const items = generateInsights(props);
  if (!items.length) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Smart Insights</h3>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold">
          AI-powered
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className={`${item.bg} rounded-xl p-3.5 flex items-start gap-3 border`}>
              <div className="w-7 h-7 rounded-lg bg-white/70 dark:bg-gray-900/70 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
              </div>
              <p className={`text-xs leading-relaxed ${item.color}`}>{item.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Insights;
