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

function CouponModal({ visible, onClose, onSaved, theme }) {
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage'); // percentage | fixed
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setCode(''); setDiscountType('percentage'); setDiscountValue(''); setMinOrderAmount(''); setMaxUses(''); setExpiryDate(''); };

  const handleSave = async () => {
    if (!code.trim()) { showError('Required', 'Please enter a coupon code'); return; }
    if (!discountValue || isNaN(Number(discountValue))) { showError('Required', 'Please enter a valid discount value'); return; }
    setSaving(true);
    try {
      await api.post('/owner/coupons', {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
        maxUses: maxUses ? Number(maxUses) : null,
        expiryDate: expiryDate || null,
      });
      showSuccess('Created', 'Coupon created successfully');
      reset();
      onSaved();
      onClose();
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Create Coupon</Text>
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
                : <Text style={styles.saveBtnText}>Create Coupon</Text>}
            </TouchableOpacity>
          </ScrollView>
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

  const renderItem = ({ item }) => {
    const expired = item.expiryDate && new Date(item.expiryDate) < new Date();
    return (
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.cardTop}>
          <View style={[styles.codeBox, { backgroundColor: item.isActive && !expired ? '#dbeafe' : '#f3f4f6' }]}>
            <Text style={[styles.code, { color: item.isActive && !expired ? '#2563eb' : '#9ca3af' }]}>{item.code}</Text>
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
            trackColor={{ false: '#d1d5db', true: '#bfdbfe' }}
            thumbColor={item.isActive && !expired ? '#2563eb' : '#9ca3af'}
          />
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteCoupon(item)}>
          <Ionicons name="trash-outline" size={14} color="#ef4444" />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
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
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
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
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <CouponModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSaved={fetchCoupons}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  codeBox: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  code: { fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  discountText: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  deleteBtnText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  typeBtnText: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginBottom: 10 },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
