import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import api from "../../services/api";
import * as salonService from "../../services/salonService";
import { TrendingUp, Users, Calendar, IndianRupee, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, formatTime } from "../../utils/exportHelpers";

const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const STATUS_STYLES = {
  confirmed:   "bg-green-100 text-green-700",
  pending:     "bg-yellow-100 text-yellow-700",
  completed:   "bg-blue-100 text-blue-700",
  cancelled:   "bg-red-100 text-red-700",
  in_progress: "bg-purple-100 text-purple-700",
};

const Dashboard = () => {
  const today = localDate(0);

  // ── Stats ──
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Recent Bookings ──
  const [selectedDate, setSelectedDate]     = useState(today);
  const [bookings, setBookings]             = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get("/owner/analytics/dashboard");
      setStats(response.data.data);
    } catch (error) {
      console.error("Failed to load dashboard analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async (date) => {
    setBookingsLoading(true);
    try {
      const res = await salonService.getBookings({ date });
      setBookings(res.data || []);
    } catch {
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => { fetchDashboardStats(); }, []);
  useEffect(() => { fetchBookings(selectedDate); }, [selectedDate]);

  const shiftDate = (days) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + days);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (next <= today) setSelectedDate(next);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Loader fullscreen />
      </DashboardLayout>
    );
  }

  const dashboardStats = [
    { title: "Total Revenue",    value: `₹${stats?.totalRevenue || 0}`,    change: "+0%", icon: IndianRupee },
    { title: "Total Bookings",   value: stats?.totalBookings || 0,          change: "+0%", icon: Calendar },
    { title: "Active Customers", value: stats?.activeCustomers || 0,        change: "+0%", icon: Users },
    { title: "Growth Rate",      value: `${stats?.growthRate || 0}%`,       change: "+0%", icon: TrendingUp },
  ];

  const isToday = selectedDate === today;
  const displayLabel = isToday ? "Today" : formatDate(selectedDate + "T12:00:00");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your salon's performance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardStats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <Icon className="w-8 h-8 text-blue-600" />
                  <span className="text-green-600 text-sm font-semibold">{stat.change}</span>
                </div>
                <h3 className="text-gray-600 text-sm mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Header with date controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Recent Bookings</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {bookings.length} booking{bookings.length !== 1 ? "s" : ""} · {displayLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftDate(-1)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <button
                onClick={() => shiftDate(1)}
                disabled={isToday}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {bookingsLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Loading bookings…
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              No bookings on {displayLabel}.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {bookings.map((booking) => (
                <div key={booking._id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{booking.customerName || "—"}</p>
                    <p className="text-sm text-gray-500">
                      {booking.serviceName} · {formatTime(booking.appointmentTime)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[booking.status] || "bg-gray-100 text-gray-600"}`}>
                      {booking.status?.replace("_", " ")}
                    </span>
                    {booking.totalAmount ? (
                      <p className="text-xs text-gray-500 mt-0.5">₹{booking.totalAmount}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
