import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Alert, FlatList, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import DrawerMenuButton from '../../components/DrawerMenuButton';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';
import { useSalon } from '../../context/SalonContext';
import { localDate, formatDate, formatTime, STATUS_COLORS } from '../../utils/helpers';

const today = localDate(0);
const maxDate = localDate(30);
const PAGE_SIZE = 10;
const UPCOMING_STATUSES = ['pending', 'confirmed', 'in_progress'];
const UPCOMING_FILTERS  = ['all', 'pending', 'confirmed', 'in_progress'];
const ALL_STATUS_FILTERS = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

// ── WalkIn Modal ─────────────────────────────────────────────────
function WalkInModal({ visible, onClose, salonId, services, onSuccess }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState('');
  const [slots, setSlots] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [closedDay, setClosedDay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showServices, setShowServices] = useState(false);

  const selectedService = services.find((s) => s._id === serviceId);

  const timeToMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const isPastSlot = (s) => {
    if (date !== today) return false;
    const now = new Date();
    return timeToMinutes(s) <= now.getHours() * 60 + now.getMinutes();
  };

  useEffect(() => {
    if (!selectedService || !date || !salonId) return;
    setSlot(''); setSlots([]); setBlockedSlots([]); setClosedDay(false);
    setSlotsLoading(true);
    api.get(`/public/salons/${salonId}/booked-slots?date=${date}&duration=${selectedService.duration}`)
      .then((res) => {
        const d = res.data.data;
        setSlots(d?.slots || []);
        setBlockedSlots(d?.blockedSlots || []);
        setClosedDay(d?.closedDay || false);
      })
      .catch(() => { setSlots([]); setBlockedSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [serviceId, date, salonId]);

  const reset = () => {
    setName(''); setPhone(''); setServiceId(''); setDate(today);
    setSlot(''); setSlots([]); setError('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Customer name is required'); return; }
    if (!phone.trim()) { setError('Customer phone is required'); return; }
    if (!serviceId) { setError('Please select a service'); return; }
    if (!slot) { setError('Please select a time slot'); return; }
    setError(''); setSubmitting(true);
    try {
      await onSuccess({ customerName: name.trim(), customerPhone: phone.trim(), serviceId, appointmentDate: date, appointmentTime: slot });
      reset(); onClose();
    } catch (err) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { reset(); onClose(); }}>
      <View style={mStyles.container}>
        <View style={mStyles.header}>
          <Text style={mStyles.title}>Add Walk-in Customer</Text>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <ScrollView style={mStyles.body} keyboardShouldPersistTaps="handled">
          {!!error && <View style={mStyles.errorBox}><Text style={mStyles.errorText}>{error}</Text></View>}

          {[
            { label: 'Customer Name', value: name, setter: setName, placeholder: 'Enter name', keyboard: 'default' },
            { label: 'Mobile Number', value: phone, setter: setPhone, placeholder: '9876543210', keyboard: 'phone-pad' },
          ].map((f) => (
            <View style={mStyles.field} key={f.label}>
              <Text style={mStyles.label}>{f.label}</Text>
              <TextInput style={mStyles.input} placeholder={f.placeholder} placeholderTextColor="#9ca3af" keyboardType={f.keyboard} value={f.value} onChangeText={f.setter} />
            </View>
          ))}

          <View style={mStyles.field}>
            <Text style={mStyles.label}>Service</Text>
            <TouchableOpacity style={mStyles.select} onPress={() => setShowServices(!showServices)}>
              <Text style={[mStyles.selectText, !serviceId && { color: '#9ca3af' }]}>
                {selectedService ? `${selectedService.name} — ${selectedService.duration}min — ₹${selectedService.basePrice}` : 'Select a service…'}
              </Text>
              <Ionicons name={showServices ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
            </TouchableOpacity>
            {showServices && (
              <View style={mStyles.dropdown}>
                {services.map((s) => (
                  <TouchableOpacity key={s._id} style={mStyles.dropdownItem} onPress={() => { setServiceId(s._id); setShowServices(false); }}>
                    <Text style={mStyles.dropdownText}>{s.name} — {s.duration}min — ₹{s.basePrice}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={mStyles.field}>
            <Text style={mStyles.label}>Date</Text>
            <View style={mStyles.dateNav}>
              {[-1, 0, 1, 2, 3, 4, 5, 6].map((d) => {
                const dt = localDate(d);
                if (dt < today || dt > maxDate) return null;
                const dayLabel = d === 0 ? 'Today' : d === 1 ? 'Tmrw' : new Date(dt + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
                return (
                  <TouchableOpacity key={d} style={[mStyles.dateChip, date === dt && mStyles.dateChipActive]} onPress={() => setDate(dt)}>
                    <Text style={[mStyles.dateChipText, date === dt && mStyles.dateChipActiveText]}>{dayLabel}</Text>
                    <Text style={[mStyles.dateChipNum, date === dt && mStyles.dateChipActiveText]}>{new Date(dt + 'T12:00:00').getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {serviceId && (
            <View style={mStyles.field}>
              <Text style={mStyles.label}>Time Slot {selectedService && <Text style={{ color: '#9ca3af', fontWeight: '400' }}>({selectedService.duration} min)</Text>}</Text>
              {slotsLoading ? (
                <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 8 }} />
              ) : closedDay ? (
                <Text style={{ color: '#d97706', fontSize: 13 }}>Salon is closed on this day.</Text>
              ) : slots.length === 0 ? (
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>No slots available for this date.</Text>
              ) : (
                <View style={mStyles.slotsGrid}>
                  {slots.map((s) => {
                    const past = isPastSlot(s);
                    const blocked = !past && blockedSlots.includes(s);
                    const selected = slot === s;
                    const [h, m] = s.split(':').map(Number);
                    const endMin = h * 60 + m + (selectedService?.duration || 30);
                    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[mStyles.slot, past ? mStyles.slotPast : blocked ? mStyles.slotBlocked : selected ? mStyles.slotSelected : mStyles.slotFree]}
                        onPress={() => { if (!past && !blocked) setSlot(s); }}
                        disabled={past || blocked}
                      >
                        <Text style={[mStyles.slotText, selected && { color: '#fff' }, (past || blocked) && { color: '#9ca3af' }]}>{s}</Text>
                        <Text style={[mStyles.slotEnd, selected && { color: '#bfdbfe' }, (past || blocked) && { color: '#c4c9d2' }]}>–{endTime}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {slot && selectedService && (
            <View style={mStyles.summary}>
              <Text style={mStyles.summaryTitle}>Booking Summary</Text>
              <View style={mStyles.summaryRow}><Text style={mStyles.summaryKey}>Customer</Text><Text style={mStyles.summaryVal}>{name || '—'}</Text></View>
              <View style={mStyles.summaryRow}><Text style={mStyles.summaryKey}>Service</Text><Text style={mStyles.summaryVal}>{selectedService.name}</Text></View>
              <View style={mStyles.summaryRow}><Text style={mStyles.summaryKey}>Slot</Text><Text style={mStyles.summaryVal}>{slot}</Text></View>
              <View style={[mStyles.summaryRow, { borderTopWidth: 1, borderTopColor: '#bfdbfe', paddingTop: 8, marginTop: 4 }]}>
                <Text style={[mStyles.summaryKey, { fontWeight: '700' }]}>Total</Text>
                <Text style={[mStyles.summaryVal, { fontWeight: '800', color: '#1e40af' }]}>₹{selectedService.basePrice}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={[mStyles.submitBtn, (submitting || !slot) && { opacity: 0.5 }]} onPress={handleSubmit} disabled={submitting || !slot}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={mStyles.submitText}>Confirm Walk-in Booking</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main Bookings Screen ─────────────────────────────────────────
export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { salon } = useSalon();

  // View mode: 'upcoming' (default) or 'all'
  const [viewMode, setViewMode] = useState('upcoming');

  // Upcoming mode state (date-based)
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);

  // All mode state (paginated)
  const [allBookings, setAllBookings] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [blocking, setBlocking] = useState(null);
  const [actionSheet, setActionSheet] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Fetch upcoming bookings by date
  const fetchBookings = useCallback(async (date) => {
    try {
      const res = await api.get(`/owner/bookings?date=${date}`);
      const data = res.data.data;
      setBookings(Array.isArray(data) ? data : (data?.bookings || []));
    } catch { setBookings([]); } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all bookings with pagination
  const fetchAllBookings = useCallback(async (p = 1, statusFilter = 'all', isRefresh = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const res = await api.get(`/owner/bookings?page=${p}&limit=${PAGE_SIZE}${statusParam}`);
      const data = res.data.data;
      const list = Array.isArray(data) ? data : (data?.bookings || []);
      if (p === 1 || isRefresh) setAllBookings(list);
      else setAllBookings(prev => [...prev, ...list]);
      setHasMore(list.length === PAGE_SIZE);
      setPage(p);
    } catch {
      if (p === 1) setAllBookings([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get('/owner/services');
      const d = res.data.data;
      setServices(Array.isArray(d) ? d : (d?.services || []));
    } catch { /* silent */ }
  }, []);

  const fetchBlockedIds = useCallback(async () => {
    try {
      const res = await api.get('/owner/blocked-customers');
      const ids = new Set((res.data.data?.blockedCustomers || [])
        .map((bc) => String(bc.customerId?._id || bc.customerId))
        .filter(Boolean));
      setBlockedIds(ids);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchBookings(selectedDate), fetchServices(), fetchBlockedIds()]);
  }, []);

  useEffect(() => {
    if (viewMode === 'upcoming') {
      setLoading(true);
      fetchBookings(selectedDate);
    } else {
      setPage(1);
      setHasMore(true);
      fetchAllBookings(1, filter);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'upcoming') fetchBookings(selectedDate);
  }, [selectedDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (viewMode === 'upcoming') {
      await Promise.all([fetchBookings(selectedDate), fetchServices(), fetchBlockedIds()]);
    } else {
      await fetchAllBookings(1, filter, true);
    }
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && viewMode === 'all') {
      fetchAllBookings(page + 1, filter);
    }
  };

  const switchViewMode = (mode) => {
    setViewMode(mode);
    setFilter('all');
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdating(bookingId);
    try {
      await api.put(`/owner/bookings/${bookingId}`, { status: newStatus });
      setBookings((prev) => prev.map((b) => b._id === bookingId ? { ...b, status: newStatus } : b));
    } catch (err) {
      showError('Error', err.message || 'Something went wrong');
    } finally {
      setUpdating(null);
    }
  };

  const doToggleBlock = async (customerId, isBlocked) => {
    setBlocking(customerId);
    try {
      if (isBlocked) {
        await api.delete(`/owner/customers/${customerId}/block`);
        setBlockedIds((prev) => { const n = new Set(prev); n.delete(String(customerId)); return n; });
      } else {
        await api.post(`/owner/customers/${customerId}/block`, { reason: 'Blocked by owner' });
        setBlockedIds((prev) => new Set([...prev, String(customerId)]));
      }
    } catch (err) {
      showError('Error', err.message || 'Something went wrong');
    } finally {
      setBlocking(null);
    }
  };

  const handleToggleBlock = (customerId, customerName, isBlocked) => {
    setActionSheet(null);
    setConfirm({
      title: isBlocked ? `Unblock ${customerName}?` : `Block ${customerName}?`,
      message: isBlocked
        ? `${customerName} will be able to book appointments again.`
        : `${customerName} will no longer be able to book appointments at your salon.`,
      danger: !isBlocked,
      confirmLabel: isBlocked ? 'Yes, Unblock' : 'Yes, Block',
      onConfirm: () => { setConfirm(null); doToggleBlock(customerId, isBlocked); },
    });
  };

  const confirmStatusChange = (booking, newStatus) => {
    setActionSheet(null);
    const labels = { confirmed: 'Confirm', in_progress: 'Start', completed: 'Complete', cancelled: 'Cancel' };
    const messages = {
      confirmed: `Confirm booking for ${booking.customerName || 'this customer'}?`,
      in_progress: `Start the service for ${booking.customerName || 'this customer'} now?`,
      completed: `Mark ${booking.customerName || 'this customer'}'s booking as completed?`,
      cancelled: `Cancel ${booking.customerName || 'this customer'}'s booking? This cannot be undone.`,
    };
    setConfirm({
      title: `${labels[newStatus] || newStatus} Booking`,
      message: messages[newStatus] || `Change status to ${newStatus}?`,
      danger: newStatus === 'cancelled',
      confirmLabel: labels[newStatus] || 'Confirm',
      onConfirm: () => { setConfirm(null); handleStatusChange(booking._id, newStatus); },
    });
  };

  const createWalkIn = async (data) => {
    await api.post('/owner/bookings/walk-in', data);
    await fetchBookings(selectedDate);
  };

  const shiftDate = (days) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const shifted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (shifted >= today && shifted <= maxDate) setSelectedDate(shifted);
  };

  const isToday = selectedDate === today;
  const displayLabel = isToday ? 'Today' : formatDate(selectedDate + 'T12:00:00');

  const filtered = viewMode === 'upcoming'
    ? bookings.filter((b) => {
        const matchStatus = filter === 'all'
          ? UPCOMING_STATUSES.includes(b.status)
          : b.status === filter;
        return matchStatus;
      })
    : allBookings.filter((b) => filter === 'all' ? true : b.status === filter);

  const getNextStatuses = (status) => {
    const transitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    return transitions[status] || [];
  };

  const renderBooking = ({ item: b }) => {
    const colors = STATUS_COLORS[b.status] || { bg: '#f3f4f6', text: '#374151' };
    const isBlocked = b.customerId && blockedIds.has(String(b.customerId));
    const isUpdating = updating === b._id;
    const nextStatuses = getNextStatuses(b.status);

    return (
      <View style={[bStyles.card, { backgroundColor: theme.card }]}>
        {/* Top row */}
        <View style={bStyles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[bStyles.customerName, { color: theme.text }]}>{b.customerName || '—'}</Text>
            {b.customerPhone && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="call-outline" size={12} color="#9ca3af" />
                <Text style={bStyles.meta}>{b.customerPhone}</Text>
              </View>
            )}
          </View>
          <View style={[bStyles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[bStyles.statusText, { color: colors.text }]}>{b.status?.replace('_', ' ')}</Text>
          </View>
          <TouchableOpacity
            style={bStyles.gearBtn}
            onPress={() => setActionSheet(b)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.subText} />
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={bStyles.details}>
          {[
            { icon: 'cut-outline', text: b.serviceName },
            { icon: 'time-outline', text: formatTime(b.appointmentTime) },
            { icon: 'calendar-outline', text: formatDate(b.appointmentDate) },
            b.totalAmount ? { icon: 'cash-outline', text: `₹${b.totalAmount}` } : null,
            b.isWalkIn ? { icon: 'walk-outline', text: 'Walk-in' } : null,
          ].filter(Boolean).map((d, i) => (
            <View key={i} style={bStyles.detailRow}>
              <Ionicons name={d.icon} size={13} color={theme.subText} />
              <Text style={[bStyles.detailText, { color: theme.subText }]}>{d.text}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        {nextStatuses.length > 0 && (
          <View style={bStyles.actions}>
            {isUpdating || blocking === String(b.customerId) ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              nextStatuses.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[bStyles.actionBtn, s === 'cancelled' ? bStyles.actionBtnDanger : bStyles.actionBtnPrimary]}
                  onPress={() => confirmStatusChange(b, s)}
                >
                  <Text style={[bStyles.actionBtnText, s === 'cancelled' && { color: '#dc2626' }]}>
                    {s === 'confirmed' ? 'Confirm' : s === 'in_progress' ? 'Start' : s === 'completed' ? 'Complete' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={[bStyles.header, { paddingTop: 12 + insets.top }]}>
        <View style={bStyles.headerTop}>
          <DrawerMenuButton style={{ marginRight: 4 }} />
          <Text style={bStyles.headerTitle}>Bookings</Text>
          <TouchableOpacity style={bStyles.walkInBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={bStyles.walkInBtnText}>Walk-in</Text>
          </TouchableOpacity>
        </View>

        {/* View mode toggle */}
        <View style={bStyles.modeRow}>
          {['upcoming', 'all'].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[bStyles.modeBtn, viewMode === mode && bStyles.modeBtnActive]}
              onPress={() => switchViewMode(mode)}
            >
              <Text style={[bStyles.modeBtnText, viewMode === mode && bStyles.modeBtnTextActive]}>
                {mode === 'upcoming' ? 'Upcoming' : 'All Bookings'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date nav — only in upcoming mode */}
        {viewMode === 'upcoming' && (
          <View style={bStyles.dateRow}>
            <TouchableOpacity style={bStyles.navBtn} onPress={() => shiftDate(-1)}>
              <Ionicons name="chevron-back" size={16} color="#6b7280" />
            </TouchableOpacity>
            <Text style={bStyles.dateLabel}>{displayLabel}</Text>
            <TouchableOpacity style={[bStyles.navBtn, isToday && { opacity: 0.4 }]} onPress={() => shiftDate(1)} disabled={isToday}>
              <Ionicons name="chevron-forward" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={bStyles.filterRow}>
          {(viewMode === 'upcoming' ? UPCOMING_FILTERS : ALL_STATUS_FILTERS).map((f) => (
            <TouchableOpacity
              key={f}
              style={[bStyles.filterChip, filter === f && bStyles.filterChipActive]}
              onPress={() => {
                setFilter(f);
                if (viewMode === 'all') fetchAllBookings(1, f, true);
              }}
            >
              <Text style={[bStyles.filterChipText, filter === f && bStyles.filterChipTextActive]}>
                {f === 'all' ? 'All' : f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderBooking}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
              <Text style={{ color: '#9ca3af', marginTop: 8, fontSize: 14 }}>
                {viewMode === 'upcoming'
                  ? `No upcoming bookings for ${displayLabel}`
                  : 'No bookings found'}
              </Text>
            </View>
          }
          ListFooterComponent={
            viewMode === 'all' ? (
              hasMore ? (
                <TouchableOpacity
                  style={[bStyles.loadMoreBtn, { borderColor: theme.border || '#e5e7eb' }]}
                  onPress={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? <ActivityIndicator size="small" color="#2563eb" />
                    : (
                      <>
                        <Ionicons name="chevron-down" size={16} color="#2563eb" />
                        <Text style={bStyles.loadMoreText}>Load More</Text>
                      </>
                    )}
                </TouchableOpacity>
              ) : filtered.length > 0 ? (
                <Text style={[bStyles.endText, { color: theme.subText }]}>All bookings loaded</Text>
              ) : null
            ) : null
          }
        />
      )}

      <WalkInModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        salonId={salon?._id}
        services={services.filter((s) => s.isActive !== false)}
        onSuccess={createWalkIn}
      />

      {/* ── Action Sheet ── */}
      <Modal visible={!!actionSheet} transparent animationType="slide" onRequestClose={() => setActionSheet(null)}>
        <Pressable style={bStyles.modalOverlay} onPress={() => setActionSheet(null)}>
          <Pressable style={[bStyles.sheetBox, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={bStyles.sheetHandle} />
            <View style={bStyles.sheetHeader}>
              <View style={bStyles.sheetAvatar}>
                <Text style={bStyles.sheetAvatarText}>{actionSheet?.customerName?.charAt(0)?.toUpperCase() || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[bStyles.sheetName, { color: theme.text }]}>{actionSheet?.customerName || '—'}</Text>
                <Text style={[bStyles.sheetMeta, { color: theme.subText }]}>{actionSheet?.serviceName}  ·  {formatTime(actionSheet?.appointmentTime)}</Text>
                {actionSheet?.customerPhone ? <Text style={[bStyles.sheetMeta, { color: theme.subText }]}>{actionSheet.customerPhone}</Text> : null}
              </View>
            </View>
            <View style={bStyles.sheetDivider} />
            {actionSheet?.customerId && !actionSheet?.isWalkIn && (
              <TouchableOpacity
                style={bStyles.sheetOption}
                onPress={() => handleToggleBlock(
                  String(actionSheet.customerId),
                  actionSheet.customerName,
                  blockedIds.has(String(actionSheet.customerId))
                )}
              >
                <View style={[bStyles.sheetOptionIcon, { backgroundColor: blockedIds.has(String(actionSheet?.customerId)) ? '#fef3c7' : '#fee2e2' }]}>
                  <Ionicons
                    name={blockedIds.has(String(actionSheet?.customerId)) ? 'shield-checkmark-outline' : 'shield-off-outline'}
                    size={20}
                    color={blockedIds.has(String(actionSheet?.customerId)) ? '#d97706' : '#dc2626'}
                  />
                </View>
                <Text style={[bStyles.sheetOptionText, { color: blockedIds.has(String(actionSheet?.customerId)) ? '#d97706' : '#dc2626' }]}>
                  {blockedIds.has(String(actionSheet?.customerId)) ? 'Unblock Customer' : 'Block Customer'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={bStyles.sheetOption} onPress={() => setActionSheet(null)}>
              <View style={[bStyles.sheetOptionIcon, { backgroundColor: '#374151' }]}>
                <Ionicons name="close-outline" size={20} color="#9ca3af" />
              </View>
              <Text style={[bStyles.sheetOptionText, { color: '#9ca3af' }]}>Dismiss</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Confirm Modal ── */}
      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={bStyles.confirmOverlay}>
          <View style={bStyles.confirmBox}>
            <View style={[bStyles.confirmIcon, { backgroundColor: confirm?.danger ? '#fee2e2' : '#dbeafe' }]}>
              <Ionicons name={confirm?.danger ? 'warning-outline' : 'help-circle-outline'} size={28} color={confirm?.danger ? '#dc2626' : '#2563eb'} />
            </View>
            <Text style={bStyles.confirmTitle}>{confirm?.title}</Text>
            <Text style={bStyles.confirmMsg}>{confirm?.message}</Text>
            <View style={bStyles.confirmBtns}>
              <TouchableOpacity style={[bStyles.confirmBtn, { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' }]} onPress={() => setConfirm(null)}>
                <Text style={[bStyles.confirmBtnText, { color: '#f1f5f9' }]}>No, Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[bStyles.confirmBtn, { backgroundColor: confirm?.danger ? '#dc2626' : '#2563eb' }]} onPress={confirm?.onConfirm}>
                <Text style={[bStyles.confirmBtnText, { color: '#fff' }]}>{confirm?.confirmLabel || 'Yes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const bStyles = StyleSheet.create({
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modeRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 3, marginBottom: 10 },
  modeBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  modeBtnActive: { backgroundColor: '#fff' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  modeBtnTextActive: { color: '#2563eb' },
  loadMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, marginBottom: 24, paddingVertical: 12, borderWidth: 1, borderRadius: 12 },
  loadMoreText: { color: '#2563eb', fontWeight: '700', fontSize: 14 },
  endText: { textAlign: 'center', fontSize: 12, paddingVertical: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  walkInBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, gap: 4 },
  walkInBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 },
  navBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  dateLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  filterRow: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterChipText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  filterChipTextActive: { color: '#2563eb', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  gearBtn: { padding: 4, marginLeft: 4 },
  customerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  details: { gap: 4, marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#6b7280' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  actionBtnPrimary: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  actionBtnDanger: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  actionBtnWarning: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  actionBtnGray: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#2563eb', textTransform: 'capitalize' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#475569', alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sheetAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  sheetAvatarText: { fontSize: 20, fontWeight: '800', color: '#2563eb' },
  sheetName: { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  sheetMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  sheetDivider: { height: 1, backgroundColor: '#334155', marginBottom: 12 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  sheetOptionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sheetOptionText: { fontSize: 15, fontWeight: '600' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center' },
  confirmBox: { marginHorizontal: 32, borderRadius: 20, padding: 24, alignItems: 'center', backgroundColor: '#1e293b', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  confirmIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: '#f1f5f9', textAlign: 'center', marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700' },
});

const mStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  body: { flex: 1, padding: 16 },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: '#111827' },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  selectText: { fontSize: 14, color: '#111827', flex: 1, marginRight: 8 },
  dropdown: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownText: { fontSize: 14, color: '#374151' },
  dateNav: { flexDirection: 'row', gap: 8 },
  dateChip: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  dateChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dateChipText: { fontSize: 10, color: '#6b7280', fontWeight: '500' },
  dateChipNum: { fontSize: 14, color: '#374151', fontWeight: '700', marginTop: 2 },
  dateChipActiveText: { color: '#fff' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, minWidth: 70, alignItems: 'center' },
  slotFree: { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  slotSelected: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  slotBlocked: { borderColor: '#fca5a5', backgroundColor: '#fee2e2' },
  slotPast: { borderColor: '#e5e7eb', backgroundColor: '#f3f4f6' },
  slotText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  slotEnd: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  summary: { backgroundColor: '#dbeafe', borderRadius: 12, padding: 14, marginBottom: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryKey: { fontSize: 13, color: '#2563eb' },
  summaryVal: { fontSize: 13, color: '#1e40af', fontWeight: '600' },
  submitBtn: { backgroundColor: '#2563eb', borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
