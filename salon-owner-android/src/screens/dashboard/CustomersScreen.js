import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Modal,
  ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { formatDate } from '../../utils/helpers';

/* ── helpers ─────────────────────────────────────────────────── */
function maskPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const prefix = phone.startsWith('+') ? phone.slice(0, 3) + ' ' : '';
  const local = phone.startsWith('+') ? digits.slice(2) : digits;
  if (local.length <= 4) return prefix + '****';
  return prefix + local.slice(0, 2) + '****' + local.slice(-2);
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ── customer tag ─────────────────────────────────────────────── */
function getTag(c) {
  const visits = c.totalBookings ?? 0;
  const spent  = c.totalSpent   ?? 0;
  if (visits >= 10 || spent >= 2000)
    return { label: 'VIP',     bg: '#fef3c7', text: '#b45309', darkBg: 'rgba(180,83,9,0.15)',  darkText: '#fbbf24' };
  if (visits >= 3)
    return { label: 'Regular', bg: '#e0e7ff', text: '#4338ca', darkBg: 'rgba(99,102,241,0.2)', darkText: '#818cf8' };
  return   { label: 'New',     bg: '#d1fae5', text: '#065f46', darkBg: 'rgba(5,150,105,0.2)',  darkText: '#34d399' };
}

const STATUS_COLORS = {
  confirmed:   { bg: '#e0e7ff', text: '#4338ca' },
  pending:     { bg: '#fef3c7', text: '#b45309' },
  completed:   { bg: '#d1fae5', text: '#065f46' },
  cancelled:   { bg: '#fee2e2', text: '#b91c1c' },
  in_progress: { bg: '#ede9fe', text: '#6d28d9' },
};

/* ── Add/Edit Customer Modal ─────────────────────────────────── */
function CustomerFormModal({ customer, visible, onClose, onSaved, theme, isDark }) {
  const isEdit = !!customer;
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm({
        name:  customer?.name  || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
        notes: customer?.notes || '',
      });
      setErrors({});
    }
  }, [visible, customer]);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Name is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/owner/customers/${customer._id}`, form);
      } else {
        await api.post('/owner/customers', form);
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.modalBox, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.modalIconWrap, { backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff' }]}>
                <Ionicons name="person-add-outline" size={16} color="#6366f1" />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{isEdit ? 'Edit Customer' : 'Add Customer'}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, borderColor: errors.name ? '#ef4444' : theme.inputBorder, color: theme.text }]}
                placeholder="Customer name"
                placeholderTextColor={theme.placeholder}
                value={form.name}
                onChangeText={v => { setForm(p => ({ ...p, name: v })); setErrors(p => ({ ...p, name: '' })); }}
              />
              {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Phone *</Text>
              <View style={[styles.inputWithIcon, { backgroundColor: theme.input, borderColor: errors.phone ? '#ef4444' : theme.inputBorder }]}>
                <Ionicons name="call-outline" size={15} color={theme.subText} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.inputInner, { color: theme.text }]}
                  placeholder="9876543210"
                  placeholderTextColor={theme.placeholder}
                  keyboardType="phone-pad"
                  value={form.phone}
                  onChangeText={v => { setForm(p => ({ ...p, phone: v })); setErrors(p => ({ ...p, phone: '' })); }}
                />
              </View>
              {errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Email <Text style={{ color: theme.subText }}>(optional)</Text></Text>
              <View style={[styles.inputWithIcon, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
                <Ionicons name="mail-outline" size={15} color={theme.subText} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.inputInner, { color: theme.text }]}
                  placeholder="customer@email.com"
                  placeholderTextColor={theme.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={v => setForm(p => ({ ...p, email: v }))}
                />
              </View>
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Notes <Text style={{ color: theme.subText }}>(optional)</Text></Text>
              <TextInput
                style={[styles.input, styles.textarea, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Any notes about this customer…"
                placeholderTextColor={theme.placeholder}
                value={form.notes}
                onChangeText={v => setForm(p => ({ ...p, notes: v }))}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Actions */}
            <View style={styles.formActions}>
              <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { borderColor: theme.border }]}>
                <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmit} style={styles.saveBtn} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                  <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Customer'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ── Customer Detail Modal ────────────────────────────────────── */
function CustomerDetailModal({ customer, visible, onClose, onEdit, onBlock, onDelete, isBlocked, blockLoading, theme, isDark }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !customer) return;
    setLoading(true);
    api.get(`/owner/customers/${customer._id}/bookings`)
      .then(res => {
        const d = res.data.data;
        setBookings(Array.isArray(d) ? d : (d?.bookings || []));
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [visible, customer]);

  if (!customer) return null;
  const ini = initials(customer.name);
  const tag = getTag(customer);
  const tagStyle = { bg: isDark ? tag.darkBg : tag.bg, text: isDark ? tag.darkText : tag.text };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.modalBox, styles.detailBox, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Customer Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Avatar + name */}
            <View style={[styles.profileHero, { backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : '#f5f5ff', borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarText}>{ini}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <Text style={[styles.detailName, { color: theme.text }]}>{customer.name}</Text>
                    <View style={[styles.tagBadge, { backgroundColor: tagStyle.bg }]}>
                      <Text style={[styles.tagText, { color: tagStyle.text }]}>{tag.label}</Text>
                    </View>
                  </View>
                  {customer.phone && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Ionicons name="call-outline" size={12} color="#6366f1" />
                      <Text style={{ color: '#6366f1', fontSize: 13 }}>{customer.phone}</Text>
                    </View>
                  )}
                  {customer.email && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Ionicons name="mail-outline" size={12} color={theme.subText} />
                      <Text style={{ color: theme.subText, fontSize: 12 }}>{customer.email}</Text>
                    </View>
                  )}
                  {customer.notes && (
                    <Text style={{ color: theme.subText, fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>"{customer.notes}"</Text>
                  )}
                </View>
              </View>

              {/* Action buttons */}
              {!customer.isWalkIn && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  <TouchableOpacity onPress={onEdit} style={[styles.actionBtn, { borderColor: theme.border }]}>
                    <Ionicons name="create-outline" size={14} color={theme.text} />
                    <Text style={[styles.actionBtnText, { color: theme.text }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onBlock(customer._id, isBlocked)}
                    disabled={!!blockLoading}
                    style={[styles.actionBtn, {
                      borderColor: isBlocked ? '#10b981' : '#ef4444',
                      backgroundColor: isBlocked ? (isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4') : (isDark ? 'rgba(239,68,68,0.08)' : '#fff5f5'),
                    }]}
                  >
                    {blockLoading ? (
                      <ActivityIndicator size="small" color={isBlocked ? '#10b981' : '#ef4444'} />
                    ) : (
                      <>
                        <Ionicons name={isBlocked ? 'shield-checkmark-outline' : 'ban-outline'} size={14} color={isBlocked ? '#10b981' : '#ef4444'} />
                        <Text style={[styles.actionBtnText, { color: isBlocked ? '#10b981' : '#ef4444' }]}>{isBlocked ? 'Unblock' : 'Block'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Delete Customer', 'This cannot be undone.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => { onClose(); onDelete(customer._id); } },
                    ])}
                    style={[styles.actionBtn, { borderColor: '#ef4444', backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : '#fff5f5' }]}
                  >
                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
              {customer.isWalkIn && (
                <View style={[styles.walkInBadge, { backgroundColor: isDark ? 'rgba(217,119,6,0.15)' : '#fffbeb', borderColor: isDark ? 'rgba(217,119,6,0.3)' : '#fde68a' }]}>
                  <Ionicons name="walk-outline" size={12} color="#d97706" />
                  <Text style={{ color: '#d97706', fontSize: 11, fontWeight: '600', marginLeft: 4 }}>Walk-in Customer</Text>
                </View>
              )}
            </View>

            {/* Stats row */}
            <View style={[styles.detailStats, { borderBottomColor: theme.border }]}>
              {[
                { label: 'Total Visits', value: customer.totalBookings ?? 0,    icon: 'calendar-outline', color: '#6366f1', bg: isDark ? 'rgba(99,102,241,0.15)' : '#e0e7ff' },
                { label: 'Total Spent',  value: `₹${customer.totalSpent ?? 0}`, icon: 'cash-outline',     color: '#10b981', bg: isDark ? 'rgba(16,185,129,0.15)' : '#d1fae5' },
                { label: 'Last Visit',   value: customer.lastVisit ? formatDate(customer.lastVisit) : '—', icon: 'time-outline', color: theme.subText, bg: isDark ? '#1e293b' : '#f3f4f6' },
              ].map(s => (
                <View key={s.label} style={[styles.detailStatItem, { backgroundColor: isDark ? '#0f172a' : '#f9fafb' }]}>
                  <View style={[styles.detailStatIcon, { backgroundColor: s.bg }]}>
                    <Ionicons name={s.icon} size={14} color={s.color} />
                  </View>
                  <Text style={[styles.detailStatValue, { color: theme.text }]}>{s.value}</Text>
                  <Text style={[styles.detailStatLabel, { color: theme.subText }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Booking history */}
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Ionicons name="trending-up-outline" size={15} color="#6366f1" />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Booking History</Text>
              </View>
              {loading ? (
                <ActivityIndicator color="#6366f1" style={{ marginTop: 16 }} />
              ) : bookings.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Ionicons name="calendar-outline" size={32} color={theme.subText} />
                  <Text style={{ color: theme.subText, marginTop: 6, fontSize: 13 }}>No bookings yet</Text>
                </View>
              ) : (
                bookings.map(b => {
                  const sc = STATUS_COLORS[b.status] || { bg: '#f3f4f6', text: '#374151' };
                  return (
                    <View key={b._id} style={[styles.historyRow, { backgroundColor: isDark ? '#0f172a' : '#f9fafb', borderColor: theme.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.historyService, { color: theme.text }]} numberOfLines={1}>{b.serviceName || '—'}</Text>
                        <Text style={[styles.historyDate, { color: theme.subText }]}>{formatDate(b.appointmentDate)} · {b.appointmentTime}</Text>
                      </View>
                      <View style={[styles.historyStatus, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.historyStatusText, { color: sc.text }]}>{b.status?.replace('_', ' ')}</Text>
                      </View>
                      <Text style={[styles.historyAmount, { color: '#10b981' }]}>₹{b.totalAmount || 0}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ── Main screen ─────────────────────────────────────────────── */
export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();

  const [customers,    setCustomers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [search,       setSearch]       = useState('');
  const [filter,       setFilter]       = useState('all');
  const [sortField,    setSortField]    = useState('totalBookings');
  const [sortDir,      setSortDir]      = useState('desc');
  const [selected,     setSelected]     = useState(null);
  const [editing,      setEditing]      = useState(null);  // null | customer | 'new'
  const [blockedIds,   setBlockedIds]   = useState(new Set());
  const [blockLoading, setBlockLoading] = useState(null);
  const [showAdd,      setShowAdd]      = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get('/owner/customers');
      const d = res.data.data;
      setCustomers(Array.isArray(d) ? d : (d?.customers || []));
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBlocked = useCallback(async () => {
    try {
      const res = await api.get('/owner/blocked-customers');
      const ids = new Set(
        (res.data.data?.blockedCustomers || [])
          .map(bc => String(bc.customerId?._id || bc.customerId))
          .filter(Boolean)
      );
      setBlockedIds(ids);
    } catch {}
  }, []);

  useEffect(() => { fetchCustomers(); fetchBlocked(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchCustomers(), fetchBlocked()]);
    setRefreshing(false);
  };

  const handleBlock = async (customerId, currentlyBlocked) => {
    setBlockLoading(customerId);
    try {
      if (currentlyBlocked) {
        await api.delete(`/owner/customers/${customerId}/block`);
        setBlockedIds(prev => { const n = new Set(prev); n.delete(String(customerId)); return n; });
      } else {
        await api.post(`/owner/customers/${customerId}/block`, { reason: 'Blocked by owner' });
        setBlockedIds(prev => new Set([...prev, String(customerId)]));
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update');
    } finally {
      setBlockLoading(null);
    }
  };

  const handleDelete = async (customerId) => {
    try {
      await api.delete(`/owner/customers/${customerId}`);
      setCustomers(prev => prev.filter(c => c._id !== customerId));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete customer');
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  /* Derived: search → filter → sort */
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const processed = useMemo(() => {
    let list = filter === 'all' ? searchFiltered
      : searchFiltered.filter(c => getTag(c).label.toLowerCase() === filter);
    return [...list].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [searchFiltered, filter, sortField, sortDir]);

  /* Stats */
  const stats = useMemo(() => ({
    total:      customers.length,
    vip:        customers.filter(c => getTag(c).label === 'VIP').length,
    visits:     customers.reduce((s, c) => s + (c.totalBookings ?? 0), 0),
    revenue:    customers.reduce((s, c) => s + (c.totalSpent ?? 0), 0),
  }), [customers]);

  /* Filter pills */
  const FILTERS = [
    { id: 'all',     label: 'All',     count: searchFiltered.length },
    { id: 'vip',     label: 'VIP',     count: searchFiltered.filter(c => getTag(c).label === 'VIP').length },
    { id: 'regular', label: 'Regular', count: searchFiltered.filter(c => getTag(c).label === 'Regular').length },
    { id: 'new',     label: 'New',     count: searchFiltered.filter(c => getTag(c).label === 'New').length },
  ];

  const renderItem = ({ item }) => {
    const ini = initials(item.name);
    const tag = getTag(item);
    const tagStyle = { bg: isDark ? tag.darkBg : tag.bg, text: isDark ? tag.darkText : tag.text };
    const isBlocked = blockedIds.has(String(item._id));
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card }]}
        onPress={() => setSelected(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{ini}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
            <View style={[styles.tagBadge, { backgroundColor: tagStyle.bg }]}>
              <Text style={[styles.tagText, { color: tagStyle.text }]}>{tag.label}</Text>
            </View>
            {isBlocked && (
              <View style={[styles.tagBadge, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2' }]}>
                <Text style={[styles.tagText, { color: '#ef4444' }]}>Blocked</Text>
              </View>
            )}
          </View>
          <Text style={[styles.meta, { color: theme.subText }]}>
            {item.phone ? maskPhone(item.phone) : (item.email || 'No contact')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.visits}>{item.totalBookings ?? 0} visits</Text>
          <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '600' }}>₹{item.totalSpent ?? 0}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.subText} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total',    value: stats.total,              accent: '#6366f1', bg: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff' },
          { label: 'VIP',      value: stats.vip,                accent: '#d97706', bg: isDark ? 'rgba(217,119,6,0.12)' : '#fffbeb' },
          { label: 'Visits',   value: stats.visits,             accent: '#7c3aed', bg: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff' },
          { label: 'Revenue',  value: `₹${stats.revenue}`,      accent: '#059669', bg: isDark ? 'rgba(5,150,105,0.12)' : '#ecfdf5' },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
            <Text style={[styles.statLabel, { color: s.accent }]}>{s.label}</Text>
            <Text style={[styles.statValue, { color: s.accent }]} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
          </View>
        ))}
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[styles.filterPill, filter === f.id && styles.filterPillActive, { borderColor: filter === f.id ? '#6366f1' : theme.border }]}
          >
            <Text style={[styles.filterPillText, { color: filter === f.id ? '#6366f1' : theme.subText }]}>
              {f.label}
            </Text>
            <View style={[styles.filterCount, { backgroundColor: filter === f.id ? '#6366f1' : (isDark ? '#334155' : '#f3f4f6') }]}>
              <Text style={[styles.filterCountText, { color: filter === f.id ? '#fff' : theme.subText }]}>{f.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort row */}
      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: theme.subText }]}>{processed.length} customer{processed.length !== 1 ? 's' : ''}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[
            { field: 'totalBookings', label: 'Visits' },
            { field: 'totalSpent',    label: 'Spent' },
          ].map(s => {
            const active = sortField === s.field;
            return (
              <TouchableOpacity
                key={s.field}
                onPress={() => toggleSort(s.field)}
                style={[styles.sortBtn, active && styles.sortBtnActive, { borderColor: active ? '#6366f1' : theme.border }]}
              >
                <Text style={[styles.sortBtnText, { color: active ? '#6366f1' : theme.subText }]}>{s.label}</Text>
                {active && (
                  <Ionicons name={sortDir === 'asc' ? 'chevron-up' : 'chevron-down'} size={11} color="#6366f1" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 4, marginTop: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customers</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addHeaderBtn}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 3 }}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#c7d2fe" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone or email..."
            placeholderTextColor="#c7d2fe"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#c7d2fe" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          data={processed}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="people-outline" size={48} color="#d1d5db" />
              <Text style={{ color: theme.subText, marginTop: 8, textAlign: 'center' }}>
                {search ? `No customers match "${search}"` : 'No customers yet'}
              </Text>
            </View>
          }
        />
      )}

      {/* Detail modal */}
      <CustomerDetailModal
        customer={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
        onEdit={() => { setEditing(selected); setSelected(null); }}
        onBlock={handleBlock}
        onDelete={handleDelete}
        isBlocked={selected ? blockedIds.has(String(selected._id)) : false}
        blockLoading={blockLoading === selected?._id}
        theme={theme}
        isDark={isDark}
      />

      {/* Add customer modal */}
      <CustomerFormModal
        customer={null}
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={fetchCustomers}
        theme={theme}
        isDark={isDark}
      />

      {/* Edit customer modal */}
      <CustomerFormModal
        customer={editing}
        visible={!!editing}
        onClose={() => setEditing(null)}
        onSaved={fetchCustomers}
        theme={theme}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', flex: 1, marginLeft: 8 },
  addHeaderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '600', opacity: 0.8 },
  statValue: { fontSize: 17, fontWeight: '800', marginTop: 2 },

  filterScroll: { marginBottom: 10 },
  filterContent: { paddingRight: 4, gap: 6 },
  filterPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, gap: 6 },
  filterPillActive: { backgroundColor: 'rgba(99,102,241,0.08)' },
  filterPillText: { fontSize: 13, fontWeight: '600' },
  filterCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 99, minWidth: 20, alignItems: 'center' },
  filterCountText: { fontSize: 10, fontWeight: '700' },

  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sortLabel: { fontSize: 12 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  sortBtnActive: { backgroundColor: 'rgba(99,102,241,0.08)' },
  sortBtnText: { fontSize: 11, fontWeight: '600' },

  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#6366f1' },
  name: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  visits: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
  tagBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  tagText: { fontSize: 10, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  detailBox: { maxHeight: '92%', paddingTop: 16, paddingHorizontal: 0, padding: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  fieldError: { color: '#ef4444', fontSize: 11, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  textarea: { height: 80, textAlignVertical: 'top' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  inputInner: { flex: 1, fontSize: 14 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Detail
  profileHero: { padding: 16, borderBottomWidth: 1 },
  detailAvatar: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  detailAvatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  detailName: { fontSize: 16, fontWeight: '800' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  walkInBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  detailStats: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1 },
  detailStatItem: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  detailStatIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  detailStatValue: { fontSize: 14, fontWeight: '800' },
  detailStatLabel: { fontSize: 9, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  historyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1 },
  historyService: { fontSize: 13, fontWeight: '600' },
  historyDate: { fontSize: 11, marginTop: 1 },
  historyStatus: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, marginHorizontal: 8 },
  historyStatusText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  historyAmount: { fontSize: 13, fontWeight: '700', minWidth: 40, textAlign: 'right' },
});
