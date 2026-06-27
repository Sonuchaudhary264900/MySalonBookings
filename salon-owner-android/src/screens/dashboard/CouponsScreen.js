import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Modal,
  Switch, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';

function CouponModal({ visible, coupon, onClose, onSaved, theme }) {
  const editing = !!coupon?._id;
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (coupon) {
      setCode(coupon.code || '');
      setDiscountType(coupon.discountType || 'percentage');
      setDiscountValue(String(coupon.discountValue || ''));
      setMinOrderAmount(coupon.minOrderAmount ? String(coupon.minOrderAmount) : '');
      setMaxUses(coupon.maxUses ? String(coupon.maxUses) : '');
      setExpiryDate(coupon.expiryDate ? coupon.expiryDate.slice(0, 10) : '');
    } else {
      setCode(''); setDiscountType('percentage'); setDiscountValue('');
      setMinOrderAmount(''); setMaxUses(''); setExpiryDate('');
    }
  }, [coupon, visible]);

  const handleSave = async () => {
    if (!code.trim()) { showError('Required', 'Please enter a coupon code'); return; }
    if (!discountValue || isNaN(Number(discountValue))) { showError('Required', 'Please enter a valid discount value'); return; }
    setSaving(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
        maxUses: maxUses ? Number(maxUses) : null,
        expiryDate: expiryDate || null,
      };
      if (editing) {
        await api.put(`/owner/coupons/${coupon._id}`, payload);
        showSuccess('Updated', 'Coupon updated successfully');
      } else {
        await api.post('/owner/coupons', payload);
        showSuccess('Created', 'Coupon created successfully');
      }
      onSaved();
      onClose();
    } catch (err) {
      showError('Error', err.response?.data?.message || `Failed to ${editing ? 'update' : 'create'} coupon`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Edit Coupon' : 'Create Coupon'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={theme.text} /></TouchableOpacity>
          </View>
          <ScrollView>
            <TextInput
              style={[styles.input, { borderColor: theme.border || '#e5e7eb', color: theme.text, backgroundColor: theme.card }]}
              placeholder="Coupon code (e.g. SAVE20)"
              placeholderTextColor={theme.subText}
              value={code}
              onChangeText={t => setCode(t.toUpperCase())}
              autoCapitalize="characters"
            />

            <Text style={[styles.fieldLabel, { color: theme.subText }]}>Discount Type</Text>
            <View style={styles.typeRow}>
              {['percentage', 'fixed'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, discountType === t && styles.typeBtnActive]}
                  onPress={() => setDiscountType(t)}
                >
                  <Text style={[styles.typeBtnText, { color: discountType === t ? '#fff' : theme.text }]}>
                    {t === 'percentage' ? '% Percentage' : '₹ Fixed Amount'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { borderColor: theme.border || '#e5e7eb', color: theme.text, backgroundColor: theme.card }]}
              placeholder={discountType === 'percentage' ? 'Discount % (e.g. 20)' : 'Discount amount ₹'}
              placeholderTextColor={theme.subText}
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { borderColor: theme.border || '#e5e7eb', color: theme.text, backgroundColor: theme.card }]}
              placeholder="Minimum order amount ₹ (optional)"
              placeholderTextColor={theme.subText}
              value={minOrderAmount}
              onChangeText={setMinOrderAmount}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { borderColor: theme.border || '#e5e7eb', color: theme.text, backgroundColor: theme.card }]}
              placeholder="Max uses (optional, blank = unlimited)"
              placeholderTextColor={theme.subText}
              value={maxUses}
              onChangeText={setMaxUses}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { borderColor: theme.border || '#e5e7eb', color: theme.text, backgroundColor: theme.card }]}
              placeholder="Expiry date YYYY-MM-DD (optional)"
              placeholderTextColor={theme.subText}
              value={expiryDate}
              onChangeText={setExpiryDate}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Create Coupon'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AnalyticsModal({ visible, coupon, onClose, theme }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !coupon?._id) return;
    setLoading(true);
    api.get(`/owner/coupons/${coupon._id}/analytics`)
      .then(r => setData(r.data?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [visible, coupon?._id]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text, letterSpacing: 2 }]}>{coupon?.code}</Text>
              <Text style={{ fontSize: 11, color: theme.subText }}>Usage Analytics</Text>
            </View>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={theme.text} /></TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color="#6366f1" style={{ paddingVertical: 40 }} />
          ) : !data ? (
            <Text style={{ textAlign: 'center', color: theme.subText, paddingVertical: 40 }}>Failed to load analytics</Text>
          ) : (
            <ScrollView>
              <View style={styles.statsRow}>
                <View style={[styles.statBox, { backgroundColor: '#eef2ff' }]}>
                  <Text style={[styles.statVal, { color: '#6366f1' }]}>{data.usageCount}</Text>
                  <Text style={styles.statLbl}>Times Used</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#ecfdf5' }]}>
                  <Text style={[styles.statVal, { color: '#059669' }]}>₹{data.totalDiscount}</Text>
                  <Text style={styles.statLbl}>Total Discount</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#f5f3ff' }]}>
                  <Text style={[styles.statVal, { color: '#7c3aed' }]}>{data.remaining !== null && data.remaining !== undefined ? data.remaining : '∞'}</Text>
                  <Text style={styles.statLbl}>Remaining</Text>
                </View>
              </View>
              <Text style={[styles.fieldLabel, { color: theme.subText, marginTop: 16 }]}>USAGE HISTORY</Text>
              {(!data.history || data.history.length === 0) ? (
                <Text style={{ textAlign: 'center', color: theme.subText, paddingVertical: 20 }}>No usage history yet</Text>
              ) : data.history.map((h, i) => (
                <View key={i} style={[styles.histRow, { backgroundColor: theme.card }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }} numberOfLines={1}>{h.customer}</Text>
                    {h.phone ? <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>{h.phone}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#059669' }}>-₹{h.discountApplied}</Text>
                    <Text style={{ fontSize: 10, color: theme.subText, marginTop: 2 }}>
                      {new Date(h.usedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function CouponsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [analyticsCoupon, setAnalyticsCoupon] = useState(null);
  const [broadcasting, setBroadcasting] = useState(null);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await api.get('/owner/coupons');
      const d = res.data.data;
      setCoupons(Array.isArray(d) ? d : (d?.coupons || []));
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);
  const onRefresh = async () => { setRefreshing(true); await fetchCoupons(); setRefreshing(false); };

  const toggleActive = async (coupon) => {
    try {
      await api.put(`/owner/coupons/${coupon._id}`, { isActive: !coupon.isActive });
      setCoupons(prev => prev.map(c => c._id === coupon._id ? { ...c, isActive: !c.isActive } : c));
    } catch {
      showError('Error', 'Failed to update coupon');
    }
  };

  const deleteCoupon = (coupon) => {
    Alert.alert('Delete Coupon', `Delete "${coupon.code}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/coupons/${coupon._id}`);
            setCoupons(prev => prev.filter(c => c._id !== coupon._id));
            showSuccess('Deleted', 'Coupon deleted');
          } catch {
            showError('Error', 'Failed to delete coupon');
          }
        }
      },
    ]);
  };

  const handleBroadcast = async (coupon) => {
    setBroadcasting(coupon._id);
    try {
      const res = await api.post('/owner/coupons/broadcast', { couponId: coupon._id });
      const { sent, total } = res.data?.data || {};
      if (sent > 0) showSuccess('Sent', `Sent to ${sent} of ${total} customers!`);
      else showSuccess('Broadcast', 'No customers with push notifications enabled yet.');
    } catch {
      showError('Error', 'Failed to send notification');
    } finally {
      setBroadcasting(null);
    }
  };

  const renderItem = ({ item }) => {
    const expired = item.expiryDate && new Date(item.expiryDate) < new Date();
    return (
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.cardTop}>
          <View style={[styles.codeBox, { backgroundColor: item.isActive && !expired ? '#e0e7ff' : '#f3f4f6' }]}>
            <Text style={[styles.code, { color: item.isActive && !expired ? '#6366f1' : '#9ca3af' }]}>{item.code}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.discountText, { color: theme.text }]}>
              {item.discountType === 'percentage' ? `${item.discountValue}% OFF` : `₹${item.discountValue} OFF`}
            </Text>
            {item.minOrderAmount > 0 && (
              <Text style={[styles.meta, { color: theme.subText }]}>Min order: ₹{item.minOrderAmount}</Text>
            )}
            {item.expiryDate && (
              <Text style={[styles.meta, { color: expired ? '#ef4444' : theme.subText }]}>
                {expired ? 'Expired' : `Expires: ${item.expiryDate.slice(0, 10)}`}
              </Text>
            )}
            <Text style={[styles.meta, { color: theme.subText }]}>
              Used: {item.usedCount ?? 0}{item.maxUses ? ` / ${item.maxUses}` : ''}
            </Text>
          </View>
          <Switch
            value={item.isActive && !expired}
            onValueChange={() => toggleActive(item)}
            disabled={expired}
            trackColor={{ false: '#d1d5db', true: '#c7d2fe' }}
            thumbColor={item.isActive && !expired ? '#6366f1' : '#9ca3af'}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
          <TouchableOpacity style={styles.editBtn} onPress={() => { setEditingCoupon(item); setShowModal(true); }}>
            <Ionicons name="create-outline" size={14} color="#6366f1" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => setAnalyticsCoupon(item)}>
            <Ionicons name="bar-chart-outline" size={14} color="#7c3aed" />
            <Text style={[styles.editBtnText, { color: '#7c3aed' }]}>Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => handleBroadcast(item)} disabled={broadcasting === item._id}>
            {broadcasting === item._id
              ? <ActivityIndicator size="small" color="#0891b2" />
              : <Ionicons name="megaphone-outline" size={14} color="#0891b2" />}
            <Text style={[styles.editBtnText, { color: '#0891b2' }]}>Notify</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteCoupon(item)}>
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 4, marginTop: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Coupons</Text>
        </View>
        <Text style={styles.headerSub}>Create and manage discount codes</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          data={coupons}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="pricetag-outline" size={48} color="#d1d5db" />
              <Text style={{ color: theme.subText, marginTop: 8 }}>No coupons yet</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => { setEditingCoupon(null); setShowModal(true); }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <CouponModal
        visible={showModal}
        coupon={editingCoupon}
        onClose={() => { setShowModal(false); setEditingCoupon(null); }}
        onSaved={fetchCoupons}
        theme={theme}
      />

      <AnalyticsModal
        visible={!!analyticsCoupon}
        coupon={analyticsCoupon}
        onClose={() => setAnalyticsCoupon(null)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#c7d2fe', marginTop: 2 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  codeBox: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  code: { fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  discountText: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  editBtnText: { fontSize: 12, color: '#6366f1', fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  deleteBtnText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  typeBtnText: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginBottom: 10 },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Analytics
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  histRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8 },
});
