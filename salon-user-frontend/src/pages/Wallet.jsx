import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { loadRazorpay, RAZORPAY_KEY_ID } from "../utils/razorpay";
import { formatDate } from "../utils/formatters";
import {
  ChevronLeft, Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Plus,
} from "lucide-react";

const QUICK_AMOUNTS = [100, 200, 500, 1000];

const SOURCE_LABEL = {
  recharge: "Wallet Recharge",
  booking_payment: "Booking Payment",
  booking_refund: "Booking Refund",
  booking_earning: "Booking Earning",
  admin_adjustment: "Adjustment",
};

function SkeletonRow() {
  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--t-border)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--t-input-bg)", flexShrink: 0 }} className="wl-shimmer" />
        <div style={{ flex: 1 }}>
          <div style={{ height: 13, width: "55%", borderRadius: 6, background: "var(--t-input-bg)", marginBottom: 8 }} className="wl-shimmer" />
          <div style={{ height: 11, width: "35%", borderRadius: 6, background: "var(--t-input-bg)" }} className="wl-shimmer" />
        </div>
        <div style={{ height: 13, width: 56, borderRadius: 6, background: "var(--t-input-bg)", flexShrink: 0 }} className="wl-shimmer" />
      </div>
    </div>
  );
}

export default function Wallet() {
  const navigate = useNavigate();

  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [amount, setAmount] = useState("");
  const [recharging, setRecharging] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  const loadWallet = useCallback(async () => {
    try {
      const res = await API.get("/customer/wallet");
      setBalance(res.data?.data?.balance ?? 0);
    } catch {
      // keep previous balance on transient errors
    }
  }, []);

  const loadTransactions = useCallback(async (p = 1) => {
    try {
      const res = await API.get(`/customer/wallet/transactions?page=${p}&limit=10`);
      const data = res.data?.data;
      setTransactions(prev => (p === 1 ? (data?.transactions || []) : [...prev, ...(data?.transactions || [])]));
      setHasMore((data?.pagination?.page || 1) < (data?.pagination?.totalPages || 1));
      setPage(p);
    } catch {
      // keep previous list on transient errors
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadWallet(), loadTransactions(1)]);
      setLoading(false);
    })();
    API.get("/customer/auth/me").then(res => setUser(res.data?.data || res.data)).catch(() => {});
  }, [loadWallet, loadTransactions]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadTransactions(page + 1);
    setLoadingMore(false);
  };

  const handleRecharge = async () => {
    setError("");
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setRecharging(true);
    try {
      const orderRes = await API.post("/customer/wallet/recharge/order", { amount: amt });
      const order = orderRes.data?.data?.order;
      const keyId = orderRes.data?.data?.razorpayKeyId || RAZORPAY_KEY_ID;
      if (!order?.orderId) throw new Error("Could not create payment order");
      if (!keyId) throw new Error("Payments are temporarily unavailable. Please try again later.");

      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load payment gateway. Check your connection.");

      const rzp = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "GlowLoox",
        description: "Wallet Recharge",
        prefill: {
          name: user?.name || "",
          contact: user?.phone || "",
          email: user?.email || "",
        },
        theme: { color: "#8b5cf6" },
        handler: async (response) => {
          try {
            await API.post("/customer/wallet/recharge/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setAmount("");
            await Promise.all([loadWallet(), loadTransactions(1)]);
          } catch (e) {
            setError(e.message || "Payment verification failed. Contact support if money was deducted.");
          }
        },
      });
      rzp.on("payment.failed", () => setError("Payment failed. Please try again."));
      rzp.open();
    } catch (e) {
      setError(e.message || e?.response?.data?.message || "Something went wrong");
    } finally {
      setRecharging(false);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--t-bg)",
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      paddingBottom: 80,
    }}>
      <style>{`
        @keyframes wl-shimmer { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .wl-shimmer { animation: wl-shimmer 1.4s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "var(--t-card)",
        borderBottom: "1px solid var(--t-border)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        <div style={{
          maxWidth: 640, margin: "0 auto",
          display: "flex", alignItems: "center",
          height: 54, padding: "0 8px 0 4px",
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 44, height: 44, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "none", border: "none",
              color: "var(--t-text)", cursor: "pointer",
            }}
          >
            <ChevronLeft size={24} strokeWidth={2.2} />
          </button>
          <h1 style={{ flex: 1, fontSize: 17, fontWeight: 700, color: "var(--t-text)", margin: 0, paddingLeft: 4 }}>
            Wallet
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px" }}>
        {/* Balance card */}
        <div style={{
          borderRadius: 18, padding: "22px 20px",
          background: "linear-gradient(135deg, #6d28d9, #4f46e5)",
          color: "#fff", marginBottom: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, opacity: 0.85 }}>
            <WalletIcon size={16} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              GlowLoox Wallet
            </span>
          </div>
          {loading ? (
            <div style={{ height: 34, width: 140, borderRadius: 8, background: "rgba(255,255,255,0.25)" }} className="wl-shimmer" />
          ) : (
            <p style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
              ₹{(balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
          <p style={{ fontSize: 12, marginTop: 4, opacity: 0.75 }}>Available balance</p>
        </div>

        {/* Recharge */}
        <div style={{
          borderRadius: 14, border: "1px solid var(--t-border)", background: "var(--t-card)",
          padding: 16, marginBottom: 18,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t-text)", marginBottom: 10 }}>Add Money</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {QUICK_AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: amount === String(a) ? "1.5px solid #8b5cf6" : "1px solid var(--t-border)",
                  background: amount === String(a) ? "rgba(139,92,246,0.1)" : "var(--t-input-bg)",
                  color: amount === String(a) ? "#8b5cf6" : "var(--t-text-2)",
                  cursor: "pointer",
                }}
              >
                ₹{a}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              min="1"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                flex: 1, height: 46, borderRadius: 12, padding: "0 14px",
                border: "1px solid var(--t-border)", background: "var(--t-input-bg)",
                color: "var(--t-text)", fontSize: 14, fontFamily: "inherit", outline: "none",
              }}
            />
            <button
              onClick={handleRecharge}
              disabled={recharging}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "0 18px", borderRadius: 12, fontSize: 14, fontWeight: 600,
                background: "linear-gradient(135deg, #6d28d9, #4f46e5)",
                color: "#fff", border: "none",
                cursor: recharging ? "default" : "pointer",
                opacity: recharging ? 0.7 : 1,
              }}
            >
              <Plus size={16} strokeWidth={2.2} />
              {recharging ? "..." : "Add"}
            </button>
          </div>

          {error && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 8 }}>{error}</p>}
        </div>

        {/* Transactions */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t-text)", marginBottom: 10 }}>
            Transaction History
          </p>

          <div style={{ borderRadius: 14, border: "1px solid var(--t-border)", background: "var(--t-card)", overflow: "hidden" }}>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : transactions.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--t-text-3)" }}>No transactions yet.</p>
              </div>
            ) : (
              transactions.map((txn, i) => {
                const isCredit = txn.type === "credit";
                return (
                  <div
                    key={txn._id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
                      borderBottom: i < transactions.length - 1 ? "1px solid var(--t-border)" : "none",
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isCredit ? "rgba(5,150,105,0.12)" : "rgba(220,38,38,0.12)",
                    }}>
                      {isCredit
                        ? <ArrowDownLeft size={16} strokeWidth={2.2} color="#059669" />
                        : <ArrowUpRight size={16} strokeWidth={2.2} color="#dc2626" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t-text)", margin: 0 }}>
                        {SOURCE_LABEL[txn.source] || txn.source}
                      </p>
                      <p style={{ fontSize: 11.5, color: "var(--t-text-3)", margin: "2px 0 0" }}>
                        {formatDate(txn.createdAt)}
                      </p>
                    </div>
                    <p style={{
                      fontSize: 14, fontWeight: 700, margin: 0, flexShrink: 0,
                      color: isCredit ? "#059669" : "#dc2626",
                    }}>
                      {isCredit ? "+" : "-"}₹{Number(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{
                width: "100%", marginTop: 10, padding: "12px", borderRadius: 12,
                border: "1px solid var(--t-border)", background: "var(--t-card)",
                color: "var(--t-text-2)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
