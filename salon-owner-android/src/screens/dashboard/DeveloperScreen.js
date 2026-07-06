import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';

const PERMISSION_OPTIONS = [
  'bookings:read', 'bookings:write', 'customers:read', 'customers:write',
  'services:read', 'services:write', 'analytics:read',
];

const EVENT_OPTIONS = [
  'booking.created', 'booking.confirmed', 'booking.cancelled', 'booking.completed',
  'payment.received', 'review.created', 'customer.blocked',
];

/* ── Multi-select checkbox row ───────────────────────────────── */
function CheckRow({ label, checked, onToggle, theme }) {
  return (
    <TouchableOpacity onPress={onToggle} style={styles.checkRow}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={18} color={checked ? '#6366f1' : theme.subText} />
      <Text style={[styles.checkLabel, { color: theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DeveloperScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();

  const [apiKeys, setApiKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyPerms, setNewKeyPerms] = useState(['bookings:read']);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookLabel, setNewWebhookLabel] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState(['booking.created']);

  const [createdKey, setCreatedKey] = useState(null);
  const [createdSecret, setCreatedSecret] = useState(null);
  const [showSecret, setShowSecret] = useState(false);

  const [waPhone, setWaPhone] = useState('');
  const [waTesting, setWaTesting] = useState(false);

  const sendWhatsAppTest = async () => {
    setWaTesting(true);
    try {
      const res = await api.get('/owner/whatsapp/test', { params: waPhone ? { phone: waPhone } : {} });
      const d = res.data || {};
      if (d.success) {
        Alert.alert('WhatsApp sent ✅', `Message accepted by Meta for ${d.to}. Check that number's WhatsApp.`);
      } else if (d.configured === false) {
        Alert.alert('Not configured', 'WhatsApp credentials are not set on the server (WHATSAPP_TOKEN / PHONE_NUMBER_ID).');
      } else {
        const err = d.result?.error;
        const msg = typeof err === 'object' ? (err.message || JSON.stringify(err)) : String(err || 'Unknown error');
        Alert.alert('WhatsApp failed', `${msg}\n\nTo: ${d.to || waPhone}`);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Request failed');
    } finally {
      setWaTesting(false);
    }
  };

  const fetchAll = useCallback(async () => {
    try {
      const [k, w] = await Promise.all([
        api.get('/owner/developer/api-keys'),
        api.get('/owner/developer/webhooks'),
      ]);
      setApiKeys(k.data.data || []);
      setWebhooks(w.data.data || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const copy = (text, label) => {
    Share.share({ message: text }).catch(() => {});
  };

  const createKey = async () => {
    if (!newKeyLabel.trim()) { showError('Label required'); return; }
    setCreating(true);
    try {
      const { data } = await api.post('/owner/developer/api-keys', { label: newKeyLabel, permissions: newKeyPerms });
      setCreatedKey(data.data?.rawKey || '');
      setNewKeyLabel('');
      fetchAll();
      showSuccess('API key created', 'Copy it now — it will not be shown again');
    } catch {
      showError('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = (id) => {
    Alert.alert('Revoke API Key', 'This cannot be undone. Apps using this key will stop working.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/developer/api-keys/${id}`);
            setApiKeys(prev => prev.filter(k => k._id !== id));
            showSuccess('API key revoked');
          } catch { showError('Failed to revoke key'); }
        },
      },
    ]);
  };

  const createWebhook = async () => {
    if (!newWebhookUrl.trim()) { showError('URL required'); return; }
    setCreating(true);
    try {
      const { data } = await api.post('/owner/developer/webhooks', {
        url: newWebhookUrl, events: newWebhookEvents, label: newWebhookLabel,
      });
      setCreatedSecret(data.data?.secret || '');
      setNewWebhookUrl('');
      setNewWebhookLabel('');
      fetchAll();
      showSuccess('Webhook registered', 'Copy the secret now');
    } catch {
      showError('Failed to register webhook');
    } finally {
      setCreating(false);
    }
  };

  const deleteWebhook = (id) => {
    Alert.alert('Delete Webhook', 'This endpoint will stop receiving events.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/developer/webhooks/${id}`);
            setWebhooks(prev => prev.filter(w => w._id !== id));
            showSuccess('Webhook deleted');
          } catch { showError('Failed to delete webhook'); }
        },
      },
    ]);
  };

  const retryWebhook = async (id) => {
    try {
      await api.post(`/owner/developer/webhooks/${id}/retry`);
      fetchAll();
      showSuccess('Webhook re-enabled');
    } catch { showError('Failed to re-enable'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.headerTitle}>Developer Portal</Text>
            <Text style={styles.headerSub}>API keys & webhooks for integrations</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
          keyboardShouldPersistTaps="handled"
        >
          {/* One-time reveal */}
          {(createdKey || createdSecret) && (
            <View style={styles.revealBox}>
              <Text style={styles.revealTitle}>Save this now — it will not be shown again</Text>
              {createdKey ? (
                <View style={styles.revealRow}>
                  <Text style={styles.revealCode} numberOfLines={1}>{createdKey}</Text>
                  <TouchableOpacity onPress={() => copy(createdKey)}><Ionicons name="share-outline" size={18} color="#92400e" /></TouchableOpacity>
                </View>
              ) : null}
              {createdSecret ? (
                <View style={styles.revealRow}>
                  <Text style={styles.revealCode} numberOfLines={1}>{showSecret ? createdSecret : '•'.repeat(28)}</Text>
                  <TouchableOpacity onPress={() => setShowSecret(v => !v)}><Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={18} color="#92400e" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => copy(createdSecret)}><Ionicons name="share-outline" size={18} color="#92400e" /></TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity onPress={() => { setCreatedKey(null); setCreatedSecret(null); setShowSecret(false); }}>
                <Text style={styles.revealDismiss}>I've saved it, dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── WhatsApp test ── */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>WhatsApp Test</Text>
            <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 10 }}>
              Send a test booking-confirmation message to check WhatsApp delivery. Leave blank to send to your own number.
            </Text>
            <TextInput
              value={waPhone}
              onChangeText={setWaPhone}
              placeholder="Phone (optional, e.g. 9876543210)"
              placeholderTextColor={theme.subText}
              keyboardType="phone-pad"
              style={{ borderWidth: 1.5, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, height: 44, color: theme.text, backgroundColor: theme.bg, marginBottom: 10 }}
            />
            <TouchableOpacity onPress={sendWhatsAppTest} disabled={waTesting}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 12, backgroundColor: '#25D366', opacity: waTesting ? 0.6 : 1 }}>
              {waTesting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="logo-whatsapp" size={18} color="#fff" />}
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{waTesting ? 'Sending…' : 'Send Test WhatsApp'}</Text>
            </TouchableOpacity>
          </View>

          {/* ── API Keys ── */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>API Keys</Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="Key label (e.g. Zapier integration)"
              placeholderTextColor={theme.placeholder}
              value={newKeyLabel}
              onChangeText={setNewKeyLabel}
            />
            <View style={styles.checkWrap}>
              {PERMISSION_OPTIONS.map(p => (
                <CheckRow
                  key={p}
                  label={p}
                  checked={newKeyPerms.includes(p)}
                  onToggle={() => setNewKeyPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  theme={theme}
                />
              ))}
            </View>
            <TouchableOpacity onPress={createKey} disabled={creating} style={styles.primaryBtn}>
              {creating ? <ActivityIndicator size="small" color="#fff" /> : (
                <><Ionicons name="add" size={16} color="#fff" /><Text style={styles.primaryBtnText}>Generate Key</Text></>
              )}
            </TouchableOpacity>

            <View style={{ marginTop: 12, gap: 8 }}>
              {apiKeys.length === 0 && <Text style={{ color: theme.subText, fontSize: 13 }}>No API keys yet</Text>}
              {apiKeys.map(k => (
                <View key={k._id} style={[styles.listItem, { borderColor: theme.border }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{k.label}</Text>
                    <Text style={{ color: theme.subText, fontSize: 11 }} numberOfLines={1}>{k.keyPrefix}•••• · {(k.permissions || []).join(', ')}</Text>
                    <Text style={{ color: theme.subText, fontSize: 10, marginTop: 2 }}>
                      {k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString('en-IN')}` : 'Never used'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteKey(k._id)} style={{ padding: 6 }}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* ── Webhooks ── */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Webhooks</Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="https://your-endpoint.com/webhook"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              keyboardType="url"
              value={newWebhookUrl}
              onChangeText={setNewWebhookUrl}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text, marginTop: 8 }]}
              placeholder="Label (optional)"
              placeholderTextColor={theme.placeholder}
              value={newWebhookLabel}
              onChangeText={setNewWebhookLabel}
            />
            <View style={styles.checkWrap}>
              {EVENT_OPTIONS.map(e => (
                <CheckRow
                  key={e}
                  label={e}
                  checked={newWebhookEvents.includes(e)}
                  onToggle={() => setNewWebhookEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])}
                  theme={theme}
                />
              ))}
            </View>
            <TouchableOpacity onPress={createWebhook} disabled={creating} style={styles.primaryBtn}>
              {creating ? <ActivityIndicator size="small" color="#fff" /> : (
                <><Ionicons name="add" size={16} color="#fff" /><Text style={styles.primaryBtnText}>Register Webhook</Text></>
              )}
            </TouchableOpacity>

            <View style={{ marginTop: 12, gap: 8 }}>
              {webhooks.length === 0 && <Text style={{ color: theme.subText, fontSize: 13 }}>No webhooks registered</Text>}
              {webhooks.map(w => (
                <View key={w._id} style={[styles.listItem, { borderColor: theme.border, alignItems: 'flex-start' }]}>
                  <Ionicons name="globe-outline" size={15} color={theme.subText} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, minWidth: 0, marginLeft: 8 }}>
                    <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{w.label || w.url}</Text>
                    <Text style={{ color: theme.subText, fontSize: 11 }} numberOfLines={1}>{w.url}</Text>
                    <Text style={{ color: theme.subText, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{(w.events || []).join(', ')}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                      {w.failureCount > 0 && <Text style={{ color: '#ef4444', fontSize: 10 }}>{w.failureCount} failures</Text>}
                      {!w.isActive && <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>DISABLED</Text>}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    <TouchableOpacity onPress={() => retryWebhook(w._id)} style={{ padding: 6 }}>
                      <Ionicons name="refresh" size={15} color={theme.subText} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteWebhook(w._id)} style={{ padding: 6 }}>
                      <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { color: '#c7d2fe', fontSize: 12, marginTop: 2 },

  revealBox: { borderWidth: 1, borderColor: '#f59e0b', backgroundColor: '#fffbeb', borderRadius: 14, padding: 14, marginBottom: 12 },
  revealTitle: { color: '#92400e', fontWeight: '700', fontSize: 13, marginBottom: 10 },
  revealRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', borderRadius: 8, padding: 8, marginBottom: 8 },
  revealCode: { flex: 1, color: '#92400e', fontSize: 12, fontFamily: 'monospace' },
  revealDismiss: { color: '#b45309', fontSize: 12, textDecorationLine: 'underline', marginTop: 2 },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  checkWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, marginBottom: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '50%', paddingVertical: 5 },
  checkLabel: { fontSize: 11 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#6366f1', borderRadius: 10, paddingVertical: 11, marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  listItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 10 },
  itemTitle: { fontSize: 13, fontWeight: '600' },
});
