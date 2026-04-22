import { useState, useEffect } from 'react';
import { Code2, Plus, Trash2, Copy, Eye, EyeOff, Globe, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const PERMISSION_OPTIONS = [
  'bookings:read','bookings:write','customers:read','customers:write',
  'services:read','services:write','analytics:read',
];

const EVENT_OPTIONS = [
  'booking.created','booking.confirmed','booking.cancelled','booking.completed',
  'payment.received','review.created','customer.blocked',
];

export default function Developer() {
  const { isDark } = useTheme();
  const [apiKeys, setApiKeys]         = useState([]);
  const [webhooks, setWebhooks]       = useState([]);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyPerms, setNewKeyPerms] = useState(['bookings:read']);
  const [newWebhookUrl, setNewWebhookUrl]     = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState(['booking.created']);
  const [newWebhookLabel, setNewWebhookLabel] = useState('');
  const [createdKey, setCreatedKey]   = useState(null); // shown once after creation
  const [createdSecret, setCreatedSecret] = useState(null);
  const [showSecret, setShowSecret]   = useState(false);
  const [loading, setLoading]         = useState(false);

  const base = isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const card = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [k, w] = await Promise.all([
        api.get('/owner/developer/api-keys'),
        api.get('/owner/developer/webhooks'),
      ]);
      setApiKeys(k.data.data || []);
      setWebhooks(w.data.data || []);
    } catch {}
  };

  const createKey = async () => {
    if (!newKeyLabel.trim()) return toast.error('Label required');
    setLoading(true);
    try {
      const { data } = await api.post('/owner/developer/api-keys', {
        label: newKeyLabel, permissions: newKeyPerms,
      });
      setCreatedKey(data.data?.rawKey || '');
      setNewKeyLabel('');
      fetchAll();
      toast.success('API key created — copy it now, it will not be shown again');
    } catch { toast.error('Failed to create API key'); }
    setLoading(false);
  };

  const deleteKey = async (id) => {
    try {
      await api.delete(`/owner/developer/api-keys/${id}`);
      setApiKeys((prev) => prev.filter((k) => k._id !== id));
      toast.success('API key revoked');
    } catch { toast.error('Failed to revoke key'); }
  };

  const createWebhook = async () => {
    if (!newWebhookUrl.trim()) return toast.error('URL required');
    setLoading(true);
    try {
      const { data } = await api.post('/owner/developer/webhooks', {
        url: newWebhookUrl, events: newWebhookEvents, label: newWebhookLabel,
      });
      setCreatedSecret(data.data?.secret || '');
      setNewWebhookUrl('');
      setNewWebhookLabel('');
      fetchAll();
      toast.success('Webhook registered — copy the secret now');
    } catch { toast.error('Failed to register webhook'); }
    setLoading(false);
  };

  const deleteWebhook = async (id) => {
    try {
      await api.delete(`/owner/developer/webhooks/${id}`);
      setWebhooks((prev) => prev.filter((w) => w._id !== id));
      toast.success('Webhook deleted');
    } catch { toast.error('Failed to delete webhook'); }
  };

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  return (
    <div className={`min-h-screen p-4 md:p-6 ${base}`}>
      <div className="flex items-center gap-3 mb-6">
        <Code2 className="text-indigo-500" size={22} />
        <div>
          <h1 className="text-xl font-bold">Developer Portal</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            API keys &amp; webhooks for integrations
          </p>
        </div>
      </div>

      {/* One-time key/secret reveal */}
      {(createdKey || createdSecret) && (
        <div className="mb-6 p-4 rounded-xl border border-yellow-400 bg-yellow-50 text-yellow-900">
          <p className="font-semibold mb-2">Save this now — it will not be shown again</p>
          {createdKey && (
            <div className="flex items-center gap-2 mb-2">
              <code className="flex-1 text-xs bg-yellow-100 p-2 rounded break-all">{createdKey}</code>
              <button onClick={() => copy(createdKey)}><Copy size={15} /></button>
            </div>
          )}
          {createdSecret && (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-yellow-100 p-2 rounded break-all">
                {showSecret ? createdSecret : '•'.repeat(32)}
              </code>
              <button onClick={() => setShowSecret((v) => !v)}>{showSecret ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              <button onClick={() => copy(createdSecret)}><Copy size={15} /></button>
            </div>
          )}
          <button onClick={() => { setCreatedKey(null); setCreatedSecret(null); }}
            className="mt-3 text-xs text-yellow-700 underline">I've saved it, dismiss</button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* API Keys */}
        <div className={`rounded-2xl border p-5 ${card}`}>
          <h2 className="font-bold mb-4">API Keys</h2>

          {/* Create */}
          <div className="mb-4 space-y-2">
            <input value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="Key label (e.g. Zapier integration)"
              className={`w-full text-sm px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} />
            <div className="flex flex-wrap gap-2">
              {PERMISSION_OPTIONS.map((p) => (
                <label key={p} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input type="checkbox" checked={newKeyPerms.includes(p)}
                    onChange={(e) => setNewKeyPerms((prev) =>
                      e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)
                    )} />
                  {p}
                </label>
              ))}
            </div>
            <button onClick={createKey} disabled={loading}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm w-full justify-center">
              <Plus size={15} /> Generate Key
            </button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {apiKeys.length === 0 && <p className="text-sm text-gray-500">No API keys yet</p>}
            {apiKeys.map((k) => (
              <div key={k._id} className={`flex items-center gap-2 p-3 rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{k.label}</p>
                  <p className="text-xs text-gray-500">{k.keyPrefix}•••• · {k.permissions.join(', ')}</p>
                  <p className="text-xs text-gray-400">{k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'Never used'}</p>
                </div>
                <button onClick={() => deleteKey(k._id)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Webhooks */}
        <div className={`rounded-2xl border p-5 ${card}`}>
          <h2 className="font-bold mb-4">Webhooks</h2>

          {/* Create */}
          <div className="mb-4 space-y-2">
            <input value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)}
              placeholder="https://your-endpoint.com/webhook"
              className={`w-full text-sm px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} />
            <input value={newWebhookLabel} onChange={(e) => setNewWebhookLabel(e.target.value)}
              placeholder="Label (optional)"
              className={`w-full text-sm px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} />
            <div className="flex flex-wrap gap-2">
              {EVENT_OPTIONS.map((e) => (
                <label key={e} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input type="checkbox" checked={newWebhookEvents.includes(e)}
                    onChange={(ev) => setNewWebhookEvents((prev) =>
                      ev.target.checked ? [...prev, e] : prev.filter((x) => x !== e)
                    )} />
                  {e}
                </label>
              ))}
            </div>
            <button onClick={createWebhook} disabled={loading}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm w-full justify-center">
              <Plus size={15} /> Register Webhook
            </button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {webhooks.length === 0 && <p className="text-sm text-gray-500">No webhooks registered</p>}
            {webhooks.map((w) => (
              <div key={w._id} className={`p-3 rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-start gap-2">
                  <Globe size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{w.label || w.url}</p>
                    <p className="text-xs text-gray-500 truncate">{w.url}</p>
                    <p className="text-xs text-gray-400">{w.events.join(', ')}</p>
                    {w.failureCount > 0 && (
                      <span className="text-xs text-red-500">{w.failureCount} failures</span>
                    )}
                    {!w.isActive && <span className="text-xs text-red-600 font-semibold"> · DISABLED</span>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => api.post(`/owner/developer/webhooks/${w._id}/retry`).then(fetchAll)}
                      className="text-gray-400 hover:text-indigo-500" title="Re-enable">
                      <RefreshCw size={13} />
                    </button>
                    <button onClick={() => deleteWebhook(w._id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
