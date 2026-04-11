import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Crown, Clock, CheckCircle, XCircle, Hourglass, MapPin, ArrowRight, RefreshCw } from "lucide-react";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import API from "../services/api";

const STATUS_CONFIG = {
  active:   { label: "Active",   color: "#10b981", bg: "rgba(16,185,129,0.1)",  Icon: CheckCircle },
  pending:  { label: "Pending",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  Icon: Hourglass   },
  expired:  { label: "Expired",  color: "#9ca3af", bg: "rgba(156,163,175,0.1)", Icon: Clock       },
  rejected: { label: "Rejected", color: "#ef4444", bg: "rgba(239,68,68,0.1)",   Icon: XCircle     },
};

function fmt(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function PurchaseCard({ p }) {
  const st = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
  const StatusIcon = st.Icon;
  const pkg = p.packageId || {};
  const isPackage = pkg.type === "package" || p.type === "package";

  return (
    <div style={{
      background: "var(--t-card)",
      border: "1px solid var(--t-border)",
      borderRadius: 18,
      padding: "18px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: "rgba(99,102,241,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
        }}>
          {pkg.icon || (isPackage ? "🎁" : "💳")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--t-text)", margin: 0 }}>
              {p.packageName || pkg.name || (isPackage ? "Package" : "Membership")}
            </p>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 700,
              color: st.color, background: st.bg,
              padding: "3px 9px", borderRadius: 99,
            }}>
              <StatusIcon size={10} strokeWidth={2.5} />
              {st.label}
            </span>
          </div>
          {p.salonName && (
            <p style={{ fontSize: 12, color: "var(--t-text-3)", margin: "3px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={11} />
              {p.salonName}
            </p>
          )}
        </div>
      </div>

      {/* Details */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {p.purchaseDate && (
          <span style={{ fontSize: 11, color: "var(--t-text-3)", background: "var(--t-input-bg)", padding: "4px 10px", borderRadius: 99, border: "1px solid var(--t-border)" }}>
            Purchased {fmt(p.purchaseDate || p.createdAt)}
          </span>
        )}
        {p.endDate && p.status === "active" && (
          <span style={{ fontSize: 11, color: "var(--t-text-3)", background: "var(--t-input-bg)", padding: "4px 10px", borderRadius: 99, border: "1px solid var(--t-border)" }}>
            Expires {fmt(p.endDate)}
          </span>
        )}
        {pkg.discountPercent > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", background: "rgba(99,102,241,0.08)", padding: "4px 10px", borderRadius: 99 }}>
            {pkg.discountPercent}% off
          </span>
        )}
      </div>

      {/* Benefits */}
      {pkg.benefits?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {pkg.benefits.slice(0, 3).map((b, i) => (
            <span key={i} style={{ fontSize: 11, color: "var(--t-text-2)", background: "var(--t-input-bg)", padding: "3px 10px", borderRadius: 99, border: "1px solid var(--t-border)" }}>
              {b}
            </span>
          ))}
          {pkg.benefits.length > 3 && (
            <span style={{ fontSize: 11, color: "var(--t-text-3)", padding: "3px 8px" }}>
              +{pkg.benefits.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Pending note */}
      {p.status === "pending" && (
        <p style={{ fontSize: 12, color: "#f59e0b", background: "rgba(245,158,11,0.08)", padding: "8px 12px", borderRadius: 10, margin: 0 }}>
          Awaiting confirmation from the salon owner.
        </p>
      )}
    </div>
  );
}

export default function MySubscription() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const token = localStorage.getItem("customerToken");

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get("/customer/my-packages");
      setPurchases(res.data?.data?.purchases || []);
    } catch {
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) load(); else setLoading(false); }, []);

  const filtered = filter === "all" ? purchases : purchases.filter(p => p.status === filter);

  const FILTERS = [
    { key: "all",     label: "All"      },
    { key: "active",  label: "Active"   },
    { key: "pending", label: "Pending"  },
    { key: "expired", label: "Expired"  },
  ];

  return (
    <div style={{ background: "var(--t-bg)", minHeight: "100vh", fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 16px 100px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 18px rgba(99,102,241,0.3)",
            }}>
              <Crown size={18} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--t-text)", margin: 0, letterSpacing: "-0.02em" }}>My Subscription</h1>
              <p style={{ fontSize: 12, color: "var(--t-text-3)", margin: 0 }}>Packages & memberships you've purchased</p>
            </div>
          </div>
          {token && (
            <button onClick={load} disabled={loading} style={{
              width: 36, height: 36, borderRadius: 10, border: "1px solid var(--t-border)",
              background: "var(--t-input-bg)", color: "var(--t-text-3)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <RefreshCw size={14} strokeWidth={2} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
            </button>
          )}
        </div>

        {/* Not logged in */}
        {!token && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Crown size={40} style={{ color: "rgba(99,102,241,0.3)", margin: "0 auto 16px", display: "block" }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--t-text)", marginBottom: 8 }}>Sign in to view your subscriptions</p>
            <p style={{ fontSize: 13, color: "var(--t-text-3)", marginBottom: 24 }}>Log in to see packages and memberships you've purchased from salons.</p>
            <Link to="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "11px 24px", borderRadius: 12,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff", fontWeight: 700, fontSize: 14,
              textDecoration: "none", boxShadow: "0 0 20px rgba(99,102,241,0.3)",
            }}>
              Sign In <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Logged in */}
        {token && (
          <>
            {/* Filter chips */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                  background: filter === f.key ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)",
                  color: filter === f.key ? "#fff" : "var(--t-text-2)",
                  border: filter === f.key ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--t-border)",
                }}>
                  {f.label}
                  {f.key !== "all" && purchases.filter(p => p.status === f.key).length > 0 && (
                    <span style={{ marginLeft: 5, opacity: 0.7 }}>
                      {purchases.filter(p => p.status === f.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ height: 130, borderRadius: 18, background: "var(--t-card)", border: "1px solid var(--t-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <Crown size={40} style={{ color: "rgba(99,102,241,0.2)", margin: "0 auto 16px", display: "block" }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--t-text)", marginBottom: 8 }}>
                  {filter === "all" ? "No packages yet" : `No ${filter} packages`}
                </p>
                <p style={{ fontSize: 13, color: "var(--t-text-3)", marginBottom: 24 }}>
                  Browse salons and subscribe to packages or memberships to save more.
                </p>
                <Link to="/" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "11px 24px", borderRadius: 12,
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff", fontWeight: 700, fontSize: 14,
                  textDecoration: "none",
                }}>
                  Explore Salons <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* List */}
            {!loading && filtered.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filtered.map(p => <PurchaseCard key={p._id} p={p} />)}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
