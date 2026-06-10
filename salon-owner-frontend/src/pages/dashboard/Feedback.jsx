import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bug, Lightbulb, MessageSquare, Image as ImageIcon, X, RotateCcw, Send,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';

const TYPES = [
  { key: 'bug',        label: 'Bug',        Icon: Bug },
  { key: 'suggestion', label: 'Suggestion', Icon: Lightbulb },
  { key: 'feedback',   label: 'Feedback',   Icon: MessageSquare },
];

const SEVERITIES = [
  { key: 'low',      label: 'Low',      cls: 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700' },
  { key: 'medium',   label: 'Medium',   cls: 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800' },
  { key: 'high',     label: 'High',     cls: 'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800' },
  { key: 'critical', label: 'Critical', cls: 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-800' },
];

const STATUS_META = {
  open:      { label: 'Open',      cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  in_review: { label: 'In Review', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
  resolved:  { label: 'Resolved',  cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  closed:    { label: 'Closed',    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

const TYPE_META = {
  bug:        { label: 'Bug',        Icon: Bug },
  suggestion: { label: 'Suggestion', Icon: Lightbulb },
  feedback:   { label: 'Feedback',   Icon: MessageSquare },
};

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl ${className}`} />
);

export default function Feedback() {
  const fileRef = useRef(null);

  const [type, setType] = useState('feedback');
  const [severity, setSeverity] = useState('low');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reopeningId, setReopeningId] = useState(null);

  const loadFeedback = useCallback((p = 1) => {
    setLoading(true);
    api.get(`/owner/feedback?page=${p}&limit=10`)
      .then(res => {
        const data = res.data?.data || [];
        const pagination = res.data?.pagination || {};
        setItems(data);
        setPage(pagination.page || p);
        setPages(pagination.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadFeedback(1); }, [loadFeedback]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return; }
    setError('');
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      setError('Please fill in both subject and description');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('severity', type === 'bug' ? severity : 'low');
      fd.append('subject', subject.trim());
      fd.append('description', description.trim());
      fd.append('platform', 'web');
      if (screenshot) fd.append('screenshot', screenshot);

      await api.post('/owner/feedback', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Thanks! Your submission has been received.');
      setSubject('');
      setDescription('');
      setSeverity('low');
      removeScreenshot();
      loadFeedback(1);
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async (id) => {
    setReopeningId(id);
    try {
      await api.patch(`/owner/feedback/${id}/reopen`);
      loadFeedback(page);
    } catch {} finally {
      setReopeningId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Help & Feedback</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Report a bug or share feedback with our team</p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map(({ key, label, Icon }) => {
              const active = type === key;
              return (
                <button
                  key={key}
                  onClick={() => setType(key)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-colors ${
                    active
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Severity (bug only) */}
          {type === 'bug' && (
            <div className="flex flex-wrap gap-2">
              {SEVERITIES.map(({ key, label, cls }) => {
                const active = severity === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSeverity(key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      active ? cls + ' bg-opacity-10' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                    } ${active ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief summary of the issue or idea"
              maxLength={120}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell us more — what happened, what you expected, steps to reproduce..."
              rows={5}
              maxLength={2000}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y"
            />
          </div>

          {/* Screenshot */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Screenshot (optional)</label>
            {screenshotPreview ? (
              <div className="relative inline-block">
                <img src={screenshotPreview} alt="Screenshot preview" className="max-w-full max-h-44 rounded-xl border border-gray-200 dark:border-gray-700" />
                <button
                  onClick={removeScreenshot}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
              >
                <ImageIcon className="w-4.5 h-4.5" />
                Add a screenshot
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transition-colors disabled:opacity-70"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>

        {/* My submissions */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">My Submissions</h2>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <>
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-1/2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                  </div>
                ))}
              </>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">No submissions yet</p>
              </div>
            ) : (
              items.map(item => {
                const meta = TYPE_META[item.type] || TYPE_META.feedback;
                const status = STATUS_META[item.status] || STATUS_META.open;
                const Icon = meta.Icon;
                return (
                  <div key={item._id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.subject}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          {item.type === 'bug' && item.severity ? ` · ${item.severity.charAt(0).toUpperCase()}${item.severity.slice(1)}` : ''}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${status.cls}`}>{status.label}</span>
                    </div>
                    {item.status === 'resolved' && (
                      <button
                        onClick={() => handleReopen(item._id)}
                        disabled={reopeningId === item._id}
                        className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {reopeningId === item._id ? 'Reopening...' : 'Reopen'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                onClick={() => loadFeedback(page - 1)}
                disabled={page <= 1}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500">Page {page} of {pages}</span>
              <button
                onClick={() => loadFeedback(page + 1)}
                disabled={page >= pages}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
