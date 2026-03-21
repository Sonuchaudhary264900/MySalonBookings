import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { showError } from '../../utils/toast';
import { useTheme } from '../../context/ThemeContext';

const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const today = localDate(0);

const addMinutes = (t, m) => {
  const [h, min] = t.split(':').map(Number);
  const total = h * 60 + min + m;
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
};

const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const isPastSlot = (date, slot) => {
  if (date !== today) return false;
  const now = new Date();
  return timeToMinutes(slot) <= now.getHours() * 60 + now.getMinutes();
};

const formatDay = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return { day: dayNames[d.getDay()], date: d.getDate() };
};

export default function BookingScreen({ route, navigation }) {
  const { salonId, serviceIds = [] } = route.params || {};
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [salon, setSalon]           = useState(null);
  const [services, setServices]     = useState([]);
  const [barbers, setBarbers]       = useState([]);
  const [barberId, setBarberId]     = useState('');
  const [date, setDate]             = useState(today);
  const [slot, setSlot]             = useState('');
  const [slots, setSlots]           = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay]   = useState(false);
  const [bookingMode, setBookingMode] = useState('flexible');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [slotAlert, setSlotAlert]   = useState(''); // 'past' | 'booked'
  const [success, setSuccess]       = useState(false);
  const [bookingStatus, setBookingStatus] = useState('confirmed');
  const [bookingDetail, setBookingDetail] = useState(null);

  const advanceDays = salon?.advanceBookingDays ?? 7;
  const totalDuration = services.reduce((s, x) => s + (x.duration || 0), 0);
  const totalPrice    = services.reduce((s, x) => s + (x.basePrice || x.price || 0), 0);
  const finalPrice    = Math.max(0, totalPrice - couponDiscount);

  // Generate scrollable date chips (today + advanceDays)
  const dateDays = Array.from({ length: Math.max(advanceDays + 1, 8) }, (_, i) => localDate(i));

  useEffect(() => {
    const load = async () => {
      setDataLoading(true);
      try {
        const [salonRes, svcRes, barberRes] = await Promise.all([
          api.get(`/public/salons/${salonId}`),
          api.get(`/public/salons/${salonId}/services`),
          api.get(`/public/salons/${salonId}/barbers`).catch(() => ({ data: { data: { barbers: [] } } })),
        ]);
        setSalon(salonRes.data.data || salonRes.data.salon);
        const all = svcRes.data.data?.services || svcRes.data.data || [];
        setServices(serviceIds.length ? all.filter(s => serviceIds.includes(s._id)) : all);
        setBarbers(barberRes.data.data?.barbers || []);
      } catch {} finally {
        setDataLoading(false);
      }
    };
    if (salonId) load();
  }, [salonId]);

  useEffect(() => {
    if (!totalDuration || !salonId) return;
    setSlot('');
    setSlots([]);
    setBlockedSlots([]);
    setClosedDay(false);
    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await api.get(`/public/salons/${salonId}/booked-slots?date=${date}&duration=${totalDuration}`);
        const data = res.data.data || {};
        setBookingMode(data.bookingMode || 'flexible');
        setSlots(data.slots || []);
        setBlockedSlots(data.blockedSlots || []);
        setClosedDay(data.closedDay || false);
        if ((data.bookingMode || 'flexible') === 'sequential' && data.slots?.length === 1) {
          setSlot(data.slots[0]);
        }
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [date, salonId, totalDuration]);

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      const res = await api.post('/customer/coupons/validate', {
        code: couponInput.trim().toUpperCase(),
        salonId,
        totalAmount: totalPrice,
      });
      const { coupon, discount } = res.data.data;
      setAppliedCoupon(coupon);
      setCouponDiscount(discount);
    } catch (err) {
      setCouponError(err?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
      setCouponDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput('');
    setCouponError('');
  };

  const handleConfirm = async () => {
    if (!slot) { showError('Select Time', 'Please select a time slot to continue.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/customer/bookings', {
        salonId,
        serviceIds,
        barberId: barberId || undefined,
        appointmentDate: date,
        appointmentTime: slot,
        paymentMethod: 'cash',
        couponCode: appliedCoupon?.code || undefined,
      });
      const booking = res.data.data?.booking || res.data.data;
      const status  = booking?.status || 'confirmed';
      setBookingStatus(status);
      setBookingDetail(booking);
      setSuccess(true);
    } catch (err) {
      showError('Booking Failed', err?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ color: theme.subText, marginTop: 12, fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  if (success) {
    const isPending = bookingStatus === 'pending';
    return (
      <View style={[styles.successBox, { paddingTop: insets.top }]}>
        <View style={styles.successCard}>
          <View style={[styles.successIcon, { backgroundColor: isPending ? '#fef3c7' : '#dcfce7' }]}>
            <Ionicons name={isPending ? 'time-outline' : 'checkmark-circle'} size={52} color={isPending ? '#d97706' : '#16a34a'} />
          </View>
          <Text style={styles.successTitle}>{isPending ? 'Booking Received!' : 'Booking Confirmed!'}</Text>
          {isPending && (
            <View style={styles.pendingNote}>
              <Text style={styles.pendingNoteText}>Awaiting salon confirmation. You'll be notified once approved.</Text>
            </View>
          )}
          <View style={styles.successDetails}>
            <Text style={styles.successSalon}>{salon?.name}</Text>
            <Text style={styles.successService}>{services.map(s => s.name).join(' + ')}</Text>
            <View style={styles.successRow}>
              <Ionicons name="calendar-outline" size={14} color="#6b7280" />
              <Text style={styles.successMeta}>{date}</Text>
              <Ionicons name="time-outline" size={14} color="#6b7280" style={{ marginLeft: 12 }} />
              <Text style={styles.successMeta}>{slot}</Text>
            </View>
            <View style={styles.successRow}>
              <Ionicons name="cash-outline" size={14} color="#6b7280" />
              <Text style={styles.successMeta}>₹{finalPrice} · Pay at salon</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.successBtn} onPress={() => navigation.getParent()?.navigate('BookingsTab')}>
            <Text style={styles.successBtnText}>View My Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.successBtnOutline} onPress={() => navigation.getParent()?.navigate('HomeTab')}>
            <Text style={styles.successBtnOutlineText}>Browse More Salons</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Salon + Services Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{salon?.name || 'Loading...'}</Text>
          {services.map(s => (
            <View key={s._id} style={styles.summaryRow}>
              <Text style={styles.summaryService}>{s.name} · {s.duration} min</Text>
              <Text style={styles.summaryPrice}>₹{s.basePrice || s.price}</Text>
            </View>
          ))}
          {services.length > 1 && (
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginTop: 4 }]}>
              <Text style={styles.summaryTotal}>Total · {totalDuration} min</Text>
              <Text style={[styles.summaryPrice, { fontSize: 16 }]}>₹{totalPrice}</Text>
            </View>
          )}
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {dateDays.map(d => {
              const { day, date: dateNum } = formatDay(d);
              const active = date === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.dateChip, active && styles.dateChipActive]}
                  onPress={() => setDate(d)}
                >
                  <Text style={[styles.dateChipDay, active && styles.dateChipTextActive]}>{day}</Text>
                  <Text style={[styles.dateChipNum, active && styles.dateChipTextActive]}>{dateNum}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Barber Selection */}
        {barbers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Barber <Text style={{ fontWeight: '400', color: '#9ca3af' }}>(optional)</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                style={[styles.barberChip, barberId === '' && styles.barberChipActive]}
                onPress={() => setBarberId('')}
              >
                <View style={styles.barberAvatar}><Ionicons name="people-outline" size={18} color={barberId === '' ? '#fff' : '#6b7280'} /></View>
                <Text style={[styles.barberName, barberId === '' && styles.barberNameActive]}>Any</Text>
              </TouchableOpacity>
              {barbers.map(b => (
                <TouchableOpacity
                  key={b._id}
                  style={[styles.barberChip, barberId === b._id && styles.barberChipActive]}
                  onPress={() => setBarberId(b._id)}
                >
                  <View style={styles.barberAvatar}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: barberId === b._id ? '#fff' : '#2563eb' }}>
                      {b.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.barberName, barberId === b._id && styles.barberNameActive]}>{b.name}</Text>
                  {b.experience > 0 && <Text style={styles.barberExp}>{b.experience}yr</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Time Slots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Select Time {totalDuration > 0 && <Text style={{ fontWeight: '400', color: '#9ca3af' }}>({totalDuration} min)</Text>}
          </Text>
          {slotsLoading ? (
            <View style={styles.slotsLoading}>
              <ActivityIndicator color="#2563eb" size="small" />
              <Text style={{ color: '#6b7280', fontSize: 13 }}>Loading slots...</Text>
            </View>
          ) : closedDay ? (
            <View style={styles.closedDay}>
              <Ionicons name="lock-closed-outline" size={20} color="#d97706" />
              <Text style={styles.closedDayText}>Salon is closed on this date. Try another day.</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.noSlots}>
              <Text style={styles.noSlotsText}>No available slots for this date.</Text>
            </View>
          ) : bookingMode === 'sequential' ? (
            <View style={styles.seqSlot}>
              <Ionicons name="flash-outline" size={16} color="#7c3aed" />
              <Text style={styles.seqText}>Auto-assigned: <Text style={{ fontWeight: '800' }}>{slots[0]} – {addMinutes(slots[0], totalDuration)}</Text></Text>
            </View>
          ) : (
            <>
              <View style={styles.slotLegend}>
                {[['#e5e7eb','Past'],['#fecaca','Booked'],['#2563eb','Selected'],['#f3f4f6','Available']].map(([c, l]) => (
                  <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} />
                    <Text style={{ fontSize: 10, color: '#6b7280' }}>{l}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.slotsGrid}>
                {slots.map(s => {
                  const past    = isPastSlot(date, s);
                  const blocked = !past && blockedSlots.includes(s);
                  const selected = slot === s;
                  const end     = addMinutes(s, totalDuration);
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.slotBtn,
                        past    ? styles.slotPast :
                        blocked ? styles.slotBooked :
                        selected ? styles.slotSelected :
                        styles.slotAvailable,
                      ]}
                      onPress={() => {
                        if (past)    { setSlotAlert('past');   return; }
                        if (blocked) { setSlotAlert('booked'); return; }
                        setSlot(s);
                      }}
                    >
                      <Text style={[styles.slotTime, selected && { color: '#fff' }, (past || blocked) && { color: '#9ca3af' }]}>{s}</Text>
                      <Text style={[styles.slotEnd, selected && { color: '#bfdbfe' }, (past || blocked) && { color: '#d1d5db' }]}>–{end}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* Coupon — only shown if salon has active coupons */}
        {slot && salon?.hasCoupons && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coupon Code</Text>
            {appliedCoupon ? (
              <View style={styles.couponApplied}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                <Text style={styles.couponAppliedText}>{appliedCoupon.code} — ₹{couponDiscount} off</Text>
                <TouchableOpacity onPress={removeCoupon}>
                  <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.couponRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter coupon code"
                  placeholderTextColor="#9ca3af"
                  value={couponInput}
                  onChangeText={t => { setCouponInput(t.toUpperCase()); setCouponError(''); }}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.couponBtn, (!couponInput.trim() || couponLoading) && { opacity: 0.5 }]}
                  onPress={applyCoupon}
                  disabled={!couponInput.trim() || couponLoading}
                >
                  {couponLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.couponBtnText}>Apply</Text>}
                </TouchableOpacity>
              </View>
            )}
            {!!couponError && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{couponError}</Text>}
          </View>
        )}

        {/* Price Summary */}
        {slot && (
          <View style={styles.priceSummary}>
            <Text style={styles.priceSummaryTitle}>Booking Summary</Text>
            {services.map(s => (
              <View key={s._id} style={styles.priceRow}>
                <Text style={styles.priceLabel}>{s.name}</Text>
                <Text style={styles.priceVal}>₹{s.basePrice || s.price}</Text>
              </View>
            ))}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Date & Time</Text>
              <Text style={styles.priceVal}>{date} · {slot}</Text>
            </View>
            {couponDiscount > 0 && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: '#16a34a' }]}>Discount</Text>
                <Text style={[styles.priceVal, { color: '#16a34a' }]}>−₹{couponDiscount}</Text>
              </View>
            )}
            <View style={[styles.priceRow, { borderTopWidth: 1, borderTopColor: '#dbeafe', paddingTop: 8, marginTop: 4 }]}>
              <Text style={styles.priceTotalLabel}>Total (Pay at salon)</Text>
              <Text style={styles.priceTotalVal}>₹{finalPrice}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, (!slot || loading) && { opacity: 0.5 }]}
          onPress={handleConfirm}
          disabled={!slot || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.confirmBtnText}>Confirm Booking</Text></>
          )}
        </TouchableOpacity>
      </View>

      {/* Slot Alert Modal */}
      <Modal transparent visible={!!slotAlert} animationType="fade" onRequestClose={() => setSlotAlert('')}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: slotAlert === 'past' ? '#f3f4f6' : '#fee2e2' }]}>
              <Ionicons name={slotAlert === 'past' ? 'time-outline' : 'ban-outline'} size={36} color={slotAlert === 'past' ? '#374151' : '#ef4444'} />
            </View>
            <Text style={styles.modalTitle}>{slotAlert === 'past' ? 'Time Has Passed' : 'Slot Already Booked'}</Text>
            <Text style={styles.modalText}>
              {slotAlert === 'past' ? 'This time slot has already passed. Please choose an upcoming slot.' : 'This slot is taken. Please choose another available slot.'}
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setSlotAlert('')}>
              <Text style={styles.modalBtnText}>Choose Another Slot</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 14, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -30 },
  decorCircle2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  body: { flex: 1 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: t.text },
  summaryCard: { backgroundColor: t.card, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: t.text, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryService: { fontSize: 13, color: t.subText },
  summaryPrice: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  summaryTotal: { fontSize: 14, fontWeight: '700', color: t.text },
  dateChip: { width: 52, height: 62, borderRadius: 12, backgroundColor: t.card, borderWidth: 1.5, borderColor: t.border, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dateChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dateChipDay: { fontSize: 11, color: t.subText, fontWeight: '600' },
  dateChipNum: { fontSize: 18, color: t.text, fontWeight: '800' },
  dateChipTextActive: { color: '#fff' },
  barberChip: { alignItems: 'center', gap: 6, backgroundColor: t.card, borderRadius: 12, borderWidth: 1.5, borderColor: t.border, padding: 12, minWidth: 72 },
  barberChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  barberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  barberName: { fontSize: 12, fontWeight: '600', color: t.text },
  barberNameActive: { color: '#fff' },
  barberExp: { fontSize: 10, color: t.subText },
  slotsLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  closedDay: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', borderRadius: 10, padding: 12 },
  closedDayText: { fontSize: 13, color: '#92400e', flex: 1 },
  noSlots: { backgroundColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  noSlotsText: { fontSize: 13, color: t.subText },
  seqSlot: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f5f3ff', borderRadius: 10, padding: 12 },
  seqText: { fontSize: 13, color: '#6d28d9', flex: 1 },
  slotLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: { width: '30%', borderRadius: 10, paddingVertical: 9, alignItems: 'center', borderWidth: 1.5 },
  slotAvailable: { backgroundColor: t.card, borderColor: t.inputBorder },
  slotSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  slotPast: { backgroundColor: t.border, borderColor: t.border },
  slotBooked: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  slotTime: { fontSize: 13, fontWeight: '700', color: t.text },
  slotEnd: { fontSize: 10, color: t.subText, marginTop: 1 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, borderWidth: 1.5, borderColor: t.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 14, color: t.text, letterSpacing: 1 },
  couponBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 16, height: 46, alignItems: 'center', justifyContent: 'center' },
  couponBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  couponApplied: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  couponAppliedText: { flex: 1, fontSize: 13, color: '#16a34a', fontWeight: '600' },
  priceSummary: { backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  priceSummaryTitle: { fontSize: 13, fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: 13, color: t.text },
  priceVal: { fontSize: 13, fontWeight: '600', color: t.text },
  priceTotalLabel: { fontSize: 14, fontWeight: '700', color: '#1d4ed8' },
  priceTotalVal: { fontSize: 16, fontWeight: '800', color: '#1d4ed8' },
  footer: { backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border, paddingHorizontal: 16, paddingTop: 12 },
  confirmBtn: { backgroundColor: '#2563eb', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successBox: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 20 },
  successCard: { backgroundColor: t.card, borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  successIcon: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  successTitle: { fontSize: 22, fontWeight: '800', color: t.text },
  pendingNote: { backgroundColor: '#fef3c7', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#fde68a' },
  pendingNoteText: { fontSize: 13, color: '#92400e', textAlign: 'center', lineHeight: 18 },
  successDetails: { backgroundColor: t.bg, borderRadius: 12, padding: 14, width: '100%', gap: 6 },
  successSalon: { fontSize: 15, fontWeight: '700', color: t.text, textAlign: 'center' },
  successService: { fontSize: 13, color: t.subText, textAlign: 'center' },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  successMeta: { fontSize: 13, color: t.text },
  successBtn: { backgroundColor: '#2563eb', borderRadius: 12, height: 48, width: '100%', alignItems: 'center', justifyContent: 'center' },
  successBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successBtnOutline: { borderWidth: 1.5, borderColor: t.border, borderRadius: 12, height: 48, width: '100%', alignItems: 'center', justifyContent: 'center' },
  successBtnOutlineText: { color: t.text, fontWeight: '600', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: t.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center', gap: 12 },
  modalIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: t.text },
  modalText: { fontSize: 13, color: t.subText, textAlign: 'center', lineHeight: 20 },
  modalBtn: { backgroundColor: '#2563eb', borderRadius: 12, height: 46, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
