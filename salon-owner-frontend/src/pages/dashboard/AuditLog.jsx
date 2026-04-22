import { useState, useEffect, useCallback } from 'react';
import { Shield, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const ACTION_LABELS = {
  'booking.status_changed': 'Booking status changed',
  'booking.created':        'Booking created',
  'booking.cancelled':      'Booking cancelled',
  'booking.completed':      'Booking completed',
  'payment.received':       'Payment received',
};

const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function AuditLog() {
  const { isDark } = useTheme();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const LIMIT = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/owner/audit?page=${page}&limit=${LIMIT}`);
      setLogs(data.data?.logs || []);
      setTotal(data.data?.total || 0);
    } catch {}
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const exportCSV = () => {
    const header = ['Date','Actor','Role','Action','Entity','Entity ID'];
    const rows   = logs.map((l) => [
      formatDate(l.createdAt), l.actorName, l.actorRole,
      ACTION_LABELS[l.action] || l.action, l.entity, l.entityId || '',
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(total / LIMIT);
  const base = isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
  const card = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const row  = isDark ? 'hover:bg-gray-750 border-gray-700' : 'hover:bg-gray-50 border-gray-100';

  return (
    <div className={`min-h-screen p-4 md:p-6 ${base}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="text-indigo-500" size={22} />
          <div>
            <h1 className="text-xl font-bold">Audit Log</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {total} events • 1-year retention
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLogs} className={`p-2 rounded-lg border ${card} border`}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left text-xs uppercase tracking-wide ${isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3">
                    <div className={`h-4 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                  </td></tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No audit events found</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} onClick={() => setSelectedLog(log)}
                    className={`cursor-pointer border-b ${row}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">{log.actorName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${log.actorRole === 'owner' ? 'bg-indigo-100 text-indigo-700'
                          : log.actorRole === 'manager' ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'}`}>
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="px-4 py-3">{ACTION_LABELS[log.action] || log.action}</td>
                    <td className="px-4 py-3 text-gray-500">{log.entity}</td>
                    <td className="px-4 py-3">
                      <button className="text-indigo-500 text-xs hover:underline">View diff</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded border disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Diff modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
          <div className={`rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-auto p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4">{ACTION_LABELS[selectedLog.action] || selectedLog.action}</h2>
            <p className="text-sm text-gray-500 mb-4">{formatDate(selectedLog.createdAt)} by {selectedLog.actorName} ({selectedLog.actorRole})</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-red-500 mb-1">BEFORE</p>
                <pre className={`text-xs p-3 rounded-lg overflow-auto max-h-60 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  {JSON.stringify(selectedLog.before, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-green-500 mb-1">AFTER</p>
                <pre className={`text-xs p-3 rounded-lg overflow-auto max-h-60 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  {JSON.stringify(selectedLog.after, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
