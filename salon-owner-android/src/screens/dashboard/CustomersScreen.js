import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import DrawerMenuButton from '../../components/DrawerMenuButton';
import { useTheme } from '../../context/ThemeContext';
import { formatDate } from '../../utils/helpers';

function CustomerDetailModal({ customer, visible, onClose, theme }) {
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
  const initials = customer.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Customer Details</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={theme.text} /></TouchableOpacity>
          </View>

          <ScrollView>
            {/* Profile */}
            <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customerName, { color: theme.text }]}>{customer.name}</Text>
                {customer.phone && <Text style={[styles.customerMeta, { color: theme.subText }]}>{customer.phone}</Text>}
                {customer.email && <Text style={[styles.customerMeta, { color: theme.subText }]}>{customer.email}</Text>}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'Total Visits', value: customer.totalBookings ?? bookings.length },
                { label: 'Total Spent', value: `₹${customer.totalSpent ?? 0}` },
                { label: 'Last Visit', value: customer.lastVisit ? formatDate(customer.lastVisit) : '—' },
              ].map((s) => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: theme.card }]}>
                  <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: theme.subText }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Booking history */}
            <Text style={[styles.historyTitle, { color: theme.text }]}>Booking History</Text>
            {loading ? (
              <ActivityIndicator color="#2563eb" style={{ marginTop: 16 }} />
            ) : bookings.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.subText }]}>No bookings found</Text>
            ) : (
              bookings.map((b) => (
                <View key={b._id} style={[styles.bookingRow, { backgroundColor: theme.card }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bookingService, { color: theme.text }]}>{b.serviceName}</Text>
                    <Text style={[styles.bookingDate, { color: theme.subText }]}>{formatDate(b.appointmentDate)} · {b.appointmentTime}</Text>
                  </View>
                  <Text style={[styles.bookingAmount, { color: '#10b981' }]}>₹{b.totalAmount || 0}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

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

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const onRefresh = async () => { setRefreshing(true); await fetchCustomers(); setRefreshing(false); };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => {
    const initials = item.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: theme.card }]} onPress={() => setSelected(item)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.meta, { color: theme.subText }]}>
            {item.phone || item.email || 'No contact'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={styles.visits}>{item.totalBookings ?? 0} visits</Text>
          <Text style={[styles.spent, { color: theme.subText }]}>₹{item.totalSpent ?? 0}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.subText} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Customers</Text>
          <DrawerMenuButton />
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#93c5fd" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone or email..."
            placeholderTextColor="#93c5fd"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#93c5fd" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="people-outline" size={48} color="#d1d5db" />
              <Text style={{ color: theme.subText, marginTop: 8 }}>
                {search ? 'No customers match your search' : 'No customers yet'}
              </Text>
            </View>
          }
          ListHeaderComponent={
            filtered.length > 0 ? (
              <Text style={[styles.countLabel, { color: theme.subText }]}>{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</Text>
            ) : null
          }
        />
      )}

      <CustomerDetailModal customer={selected} visible={!!selected} onClose={() => setSelected(null)} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  countLabel: { fontSize: 12, marginBottom: 8, paddingLeft: 2 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#2563eb' },
  name: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  visits: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  spent: { fontSize: 11 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  profileCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 12, gap: 12 },
  customerName: { fontSize: 15, fontWeight: '700' },
  customerMeta: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 2 },
  historyTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  emptyText: { textAlign: 'center', paddingVertical: 16, fontSize: 13 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 6 },
  bookingService: { fontSize: 13, fontWeight: '600' },
  bookingDate: { fontSize: 11, marginTop: 2 },
  bookingAmount: { fontSize: 14, fontWeight: '700' },
});
