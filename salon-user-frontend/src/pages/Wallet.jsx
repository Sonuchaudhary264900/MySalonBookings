import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { formatDate } from "../utils/formatters";
import { ChevronLeft, Gift, Sparkles, Store, Globe } from "lucide-react";

const SOURCE_LABEL = {
  referral: "Referral reward",
  shop_referral: "Shop referral reward",
  promo: "Promotion",
  coupon: "Coupon",
  reward: "Reward",
  admin: "Adjustment",
  booking: "Applied to booking",
  booking_refund: "Restored (cancelled booking)",
};

export default function Wallet() {
  const navigate = useNavigate();
  const [breakdown, setBreakdown] = useState({ total: 0, platform: 0, shops: [] });
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, t] = await Promise.all([
        API.get("/customer/credits"),
        API.get("/customer/credits/transactions", { params: { limit: 50 } }),
      ]);
      setBreakdown(b.data.data || { total: 0, platform: 0, shops: [] });
      setTxns(t.data.data?.transactions || []);
    } catch {
      /* keep zeros */
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const isDebit = (t) => ["redeem", "admin_remove"].includes(t.type);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Booking Credits</h1>
      </div>

      {/* Balance card */}
      <div className="m-4 rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>
        <div className="flex items-center gap-2 text-white/80 text-sm"><Gift className="w-4 h-4" /> Available Booking Credits</div>
        <div className="text-4xl font-extrabold mt-1">₹{loading ? "…" : breakdown.total}</div>
        <p className="text-white/70 text-xs mt-2">Use credits at checkout to reduce your booking cost. Credits can't be withdrawn or converted to cash.</p>
      </div>

      {/* Scope breakdown */}
      {!loading && (breakdown.platform > 0 || breakdown.shops.length > 0) && (
        <div className="mx-4 mb-4 grid grid-cols-1 gap-2">
          {breakdown.platform > 0 && (
            <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
              <Globe className="w-5 h-5 text-blue-500" />
              <div className="flex-1"><p className="text-sm font-semibold text-gray-900 dark:text-white">Any shop</p><p className="text-xs text-gray-500">Usable at any salon</p></div>
              <span className="font-bold text-gray-900 dark:text-white">₹{breakdown.platform}</span>
            </div>
          )}
          {breakdown.shops.map((s) => (
            <div key={s.salonId} className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
              <Store className="w-5 h-5 text-violet-500" />
              <div className="flex-1"><p className="text-sm font-semibold text-gray-900 dark:text-white">Shop credit</p><p className="text-xs text-gray-500">Usable only at one salon</p></div>
              <span className="font-bold text-gray-900 dark:text-white">₹{s.available}</span>
            </div>
          ))}
        </div>
      )}

      {/* How to earn */}
      <div className="mx-4 mb-4 flex items-start gap-2 bg-violet-50 dark:bg-violet-950/30 rounded-xl p-3">
        <Sparkles className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-700 dark:text-violet-300">Earn credits from referrals, promotions and rewards. They appear as an option at checkout.</p>
      </div>

      {/* History */}
      <div className="mx-4">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">History</h2>
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
        ) : txns.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No credit activity yet.</p>
        ) : (
          <div className="space-y-2">
            {txns.map((t) => (
              <div key={t._id} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{SOURCE_LABEL[t.source] || t.source}</p>
                  <p className="text-xs text-gray-400">{formatDate ? formatDate(t.createdAt) : new Date(t.createdAt).toLocaleString()}{t.scopeSalonId ? " · shop credit" : ""}</p>
                </div>
                <span className={`font-bold ${isDebit(t) ? "text-red-500" : "text-emerald-600"}`}>
                  {isDebit(t) ? "−" : "+"}₹{t.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
