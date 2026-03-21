import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Alert, Switch, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';

const CATEGORIES = ['haircut', 'beard_trim', 'coloring', 'treatment', 'styling', 'shaving', 'nail', 'other'];

function ServiceModal({ visible, service, onClose, onSaved }) {
  const editing = !!service?._id;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [category, setCategory] = useState('haircut');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setDescription(service.description || '');
      setBasePrice(String(service.basePrice || ''));
      setDuration(String(service.duration || '30'));
      setCategory(service.category || 'haircut');
      setIsActive(service.isActive !== false);
    } else {
      setName(''); setDescription(''); setBasePrice(''); setDuration('30'); setCategory('haircut'); setIsActive(true);
    }
    setError('');
  }, [service, visible]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Service name is required'); return; }
    if (!basePrice || isNaN(Number(basePrice))) { setError('Enter a valid price'); return; }
    if (!duration || isNaN(Number(duration))) { setError('Enter a valid duration in minutes'); return; }
    setError(''); setLoading(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), basePrice: Number(basePrice), duration: Number(duration), category, isActive };
      if (editing) {
        await api.put(`/owner/services/${service._id}`, payload);
      } else {
        await api.post('/owner/services', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{editing ? 'Edit Service' : 'Add Service'}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          {[
            { label: 'Service Name *', value: name, setter: setName, placeholder: 'e.g. Haircut', keyboard: 'default' },
            { label: 'Description', value: description, setter: setDescription, placeholder: 'Brief description…', keyboard: 'default' },
            { label: 'Price (₹) *', value: basePrice, setter: setBasePrice, placeholder: '0', keyboard: 'numeric' },
            { label: 'Duration (minutes) *', value: duration, setter: setDuration, placeholder: '30', keyboard: 'numeric' },
          ].map((f) => (
            <View style={styles.field} key={f.label}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor="#9ca3af" keyboardType={f.keyboard} value={f.value} onChangeText={f.setter} />
            </View>
          ))}

          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipsRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Active</Text>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: '#d1d5db', true: '#60a5fa' }} thumbColor={isActive ? '#2563eb' : '#9ca3af'} />
          </View>

          <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Add Service'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [search, setSearch] = useState('');

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get('/owner/services');
      const d = res.data.data;
      setServices(Array.isArray(d) ? d : (d?.services || []));
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchServices(); setRefreshing(false); };

  const handleDelete = (service) => {
    Alert.alert('Delete Service', `Are you sure you want to delete "${service.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/services/${service._id}`);
            setServices((prev) => prev.filter((s) => s._id !== service._id));
          } catch (err) {
            showError('Error', err.message || 'Something went wrong');
          }
        },
      },
    ]);
  };

  const handleToggleActive = async (service) => {
    try {
      await api.put(`/owner/services/${service._id}`, { isActive: !service.isActive });
      setServices((prev) => prev.map((s) => s._id === service._id ? { ...s, isActive: !s.isActive } : s));
    } catch (err) {
      showError('Error', err.message || 'Something went wrong');
    }
  };

  const displayed = search.trim()
    ? services.filter((s) =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase())
      )
    : services;

  const renderService = ({ item: s }) => (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.serviceName, { color: theme.text }]}>{s.name}</Text>
            <View style={[styles.badge, { backgroundColor: s.isActive ? '#dcfce7' : '#f3f4f6' }]}>
              <Text style={[styles.badgeText, { color: s.isActive ? '#16a34a' : '#9ca3af' }]}>
                {s.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          {s.description ? <Text style={[styles.serviceDesc, { color: theme.subText }]} numberOfLines={2}>{s.description}</Text> : null}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={13} color={theme.subText} />
              <Text style={[styles.metaText, { color: theme.subText }]}>₹{s.basePrice}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color={theme.subText} />
              <Text style={[styles.metaText, { color: theme.subText }]}>{s.duration} min</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={13} color={theme.subText} />
              <Text style={[styles.metaText, { color: theme.subText }]}>{s.category}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={[styles.cardActions, { borderTopColor: theme.rowBorder }]}>
        <Switch
          value={s.isActive !== false}
          onValueChange={() => handleToggleActive(s)}
          trackColor={{ false: '#d1d5db', true: '#60a5fa' }}
          thumbColor={s.isActive !== false ? '#2563eb' : '#9ca3af'}
        />
        <TouchableOpacity style={styles.editBtn} onPress={() => { setEditingService(s); setModalVisible(true); }}>
          <Ionicons name="create-outline" size={16} color="#2563eb" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(s)}>
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: 14 + insets.top }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 4, marginTop: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Services</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingService(null); setModalVisible(true); }}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Service</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color="#93c5fd" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services…"
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
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item._id}
          renderItem={renderService}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="cut-outline" size={48} color="#d1d5db" />
              <Text style={{ color: '#9ca3af', marginTop: 8, fontSize: 14 }}>
              {search.trim() ? 'No services match your search.' : 'No services yet. Add your first service!'}
            </Text>
            </View>
          }
        />
      )}

      <ServiceModal
        visible={modalVisible}
        service={editingService}
        onClose={() => { setModalVisible(false); setEditingService(null); }}
        onSaved={fetchServices}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, fontSize: 14, color: '#fff' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, gap: 4 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTop: { marginBottom: 10 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  serviceDesc: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6b7280' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#93c5fd' },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { flex: 1, padding: 16 },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: '#111827' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, color: '#374151', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
