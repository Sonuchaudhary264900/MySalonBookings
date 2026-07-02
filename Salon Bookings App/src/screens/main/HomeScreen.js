import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image, RefreshControl,
  ScrollView, Alert, Animated, Modal, Pressable, Dimensions,
} from 'react-native';
import AppText from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import api from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const { height: SCREEN_H } = Dimensions.get('window');

// ── Hero chips — mirrors web HERO_CHIPS exactly ──────────────────
const HERO_CHIPS = [
  { label: 'All',             cat: null,                   businessType: null,            icon: 'sparkles-outline' },
  { label: 'Salon',           cat: 'Hair Services',        businessType: 'salon',         icon: 'cut-outline' },
  { label: 'Barbershop',      cat: 'Beard & Grooming',     businessType: 'barbershop',    icon: 'man-outline' },
  { label: 'Spa & Wellness',  cat: 'Spa & Massage',        businessType: 'spa_wellness',  icon: 'water-outline' },
  { label: 'Makeup & Bridal', cat: 'Bridal & Events',      businessType: 'makeup_bridal', icon: 'color-palette-outline' },
  { label: 'Skin & Derma',    cat: 'Skin & Face / Beauty', businessType: 'skin_derma',    icon: 'leaf-outline' },
  { label: 'Kids',            cat: 'Kids Services',        businessType: null,            icon: 'happy-outline' },
  { label: 'At-Home',         cat: 'At-Home Services',     businessType: null,            icon: 'home-outline' },
];

const CATEGORY_ALIASES = {
  'Hair Services':        ['Hair Services', 'Hair Services (Men)', 'Hair Services (Women)'],
  'Skin & Face / Beauty': ['Skin & Face / Beauty', 'Skin & Face (Men Grooming)', 'Skin & Beauty'],
  'Spa & Massage':        ['Spa & Massage', 'Spa & Relaxation'],
};

const SORT_OPTIONS = [
  { key: 'nearby', label: 'Nearest' },
  { key: 'rated',  label: 'Top Rated' },
  { key: 'booked', label: 'Trending' },
];

const SVC_CAT_IMAGES = {
  'Hair Services':        'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=80&h=80&fit=crop&q=70',
  'Beard & Grooming':     'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=80&h=80&fit=crop&q=70',
  'Nail Services':        'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=80&h=80&fit=crop&q=70',
  'Skin & Face / Beauty': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=80&h=80&fit=crop&q=70',
  'Spa & Massage':        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=80&h=80&fit=crop&q=70',
  'Bridal & Events':      'https://images.unsplash.com/photo-1519741497674-611481863552?w=80&h=80&fit=crop&q=70',
  'Kids Services':        'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=80&h=80&fit=crop&q=70',
  'At-Home Services':     'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=80&h=80&fit=crop&q=70',
};

const getServiceImage = (svc) => {
  if (svc.photos?.[0]) return svc.photos[0];
  return SVC_CAT_IMAGES[svc.category] || null;
};

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function isOpenNow(wh) {
  if (!wh) return null;
  const h = wh[DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open || !h.close) return false;
  const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = h.open.split(':').map(Number); const [ch, cm] = h.close.split(':').map(Number);
  return nowM >= oh * 60 + om && nowM < ch * 60 + cm;
}

function getTodayHours(wh) {
  if (!wh) return null;
  const h = wh[DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open || !h.close) return null;
  return `${h.open} – ${h.close}`;
}

function getOpensAt(wh) {
  if (!wh) return null;
  const h = wh[DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open) return null;
  return h.open;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Date helpers ─────────────────────────────────────────────────
const localDate = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayStr = localDate(0);
const QBK_DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const QBK_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtBookDay = (ds) => {
  const d = new Date(ds + 'T12:00:00');
  return { day: QBK_DAYS[d.getDay()], date: d.getDate(), month: QBK_MONTHS[d.getMonth()] };
};

// ── Quick Book Sheet ─────────────────────────────────────────────
function QuickBookSheet({ salon, selectedServiceCat, preSelectedServices = [], onClose, navigation }) {
  const { theme } = useTheme();
  const s = mkQbStyles(theme);

  const [services, setServices]         = useState([]);
  const [loadingSvcs, setLoadingSvcs]   = useState(true);
  const [selectedSvcs, setSelectedSvcs] = useState(preSelectedServices);
  const [step, setStep]                 = useState(preSelectedServices.length > 0 ? 'booking' : 'services');
  const [bookDate, setBookDate]         = useState(todayStr);
  const [slot, setSlot]                 = useState('');
  const [slots, setSlots]               = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [closedDay, setClosedDay]       = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookError, setBookError]       = useState('');

  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }, []);

  const closeSheet = () => {
    Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }).start(onClose);
  };

  const totalDuration = selectedSvcs.reduce((a, x) => a + (x.duration || 30), 0);
  const totalPrice    = selectedSvcs.reduce((a, x) => a + (x.basePrice || x.price || 0), 0);

  useEffect(() => {
    api.get(`/public/salons/${salon._id}/services`)
      .then(r => {
        const all = r.data.data?.services || r.data.data || [];
        setServices(selectedServiceCat ? all.filter(sv => sv.category === selectedServiceCat) : all);
      })
      .catch(() => setServices([]))
      .finally(() => setLoadingSvcs(false));
  }, [salon._id]);

  useEffect(() => {
    if (step !== 'booking' || selectedSvcs.length === 0) return;
    setSlotsLoading(true); setSlot('');
    api.get(`/public/salons/${salon._id}/booked-slots?date=${bookDate}&duration=${Math.max(totalDuration, 30)}`)
      .then(r => {
        const data = r.data.data || {};
        setSlots(data.slots || []); setBlockedSlots(data.blockedSlots || []); setClosedDay(data.closedDay || false);
      })
      .catch(() => { setSlots([]); setBlockedSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [bookDate, step, totalDuration]);

  const toggleSvc = (svc) => setSelectedSvcs(prev =>
    prev.find(sv => sv._id === svc._id) ? prev.filter(sv => sv._id !== svc._id) : [...prev, svc]
  );

  const isPast = (sl) => {
    if (bookDate !== todayStr) return false;
    const [h, m] = sl.split(':').map(Number);
    const now = new Date();
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
  };

  const handleContinue = async () => {
    try {
      await api.get('/customer/auth/me');
    } catch (err) {
      if (err?.response?.status === 401) {
        closeSheet();
        navigation.navigate('Login');
        return;
      }
    }
    setStep('booking');
  };

  const handleConfirm = async () => {
    if (!slot) { setBookError('Please select a time slot.'); return; }
    setBookError(''); setBookingLoading(true);
    try {
      await api.post('/customer/bookings', {
        salonId: salon._id,
        serviceIds: selectedSvcs.map(sv => sv._id),
        appointmentDate: bookDate,
        appointmentTime: slot,
        paymentMethod: 'cash',
      });
      setBookingSuccess(true);
    } catch (err) {
      setBookError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const dateDays = Array.from({ length: 7 }, (_, i) => localDate(i));
  const photo = salon.photos?.[0] || salon.coverPhoto || salon.image || null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={closeSheet}>
      <View style={{ flex: 1 }}>
        <Pressable style={s.backdrop} onPress={closeSheet} />
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: theme.border }} />
          </View>

          {/* Header */}
          <View style={s.sheetHeader}>
            <View style={s.sheetAvatar}>
              {photo
                ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <AppText style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>{salon.name?.[0] || 'S'}</AppText>
              }
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: theme.text }} numberOfLines={1}>{salon.name}</AppText>
              {selectedServiceCat && <AppText style={{ fontSize: 12, color: theme.accent, fontWeight: '600', marginTop: 1 }}>{selectedServiceCat}</AppText>}
            </View>
            <TouchableOpacity onPress={closeSheet} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={theme.subText} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

            {/* Services step */}
            {!bookingSuccess && step === 'services' && (
              <View style={{ padding: 16 }}>
                {loadingSvcs ? (
                  [1,2,3].map(i => <View key={i} style={[s.skeleton, { height: 68, marginBottom: 8 }]} />)
                ) : services.length === 0 ? (
                  <AppText style={{ textAlign: 'center', color: theme.subText, paddingVertical: 32 }}>No services listed for this category.</AppText>
                ) : (
                  services.map(svc => {
                    const sel = !!selectedSvcs.find(sv => sv._id === svc._id);
                    const price = svc.basePrice || svc.price || 0;
                    return (
                      <TouchableOpacity key={svc._id} onPress={() => toggleSvc(svc)}
                        style={[s.svcRow, sel && s.svcRowSel]}>
                        <View style={[s.checkbox, sel && s.checkboxSel]}>
                          {sel && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{svc.name}</AppText>
                          <AppText style={{ fontSize: 12, color: theme.subText, marginTop: 2 }}>
                            {svc.duration ? `${svc.duration} min` : ''}
                            {svc.duration && price ? ' · ' : ''}
                            {price ? `₹${price}` : ''}
                          </AppText>
                        </View>
                        {price > 0 && (
                          <AppText style={{ fontSize: 14, fontWeight: '800', color: theme.accent }}>₹{price}</AppText>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* Booking step */}
            {!bookingSuccess && step === 'booking' && (
              <View style={{ padding: 16 }}>
                {/* Selected chips */}
                <AppText style={s.label}>Selected</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {selectedSvcs.map(sv => (
                    <View key={sv._id} style={s.selChip}>
                      <AppText style={s.selChipText}>{sv.name}</AppText>
                    </View>
                  ))}
                </View>

                {/* Date */}
                <AppText style={s.label}>Select Date</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {dateDays.map(d => {
                    const { day, date, month } = fmtBookDay(d);
                    const active = bookDate === d;
                    return (
                      <TouchableOpacity key={d} onPress={() => setBookDate(d)}
                        style={[s.dateBtn, active && s.dateBtnActive]}>
                        <AppText style={[s.dateDayText, active && { color: 'rgba(255,255,255,0.8)' }]}>{day}</AppText>
                        <AppText style={[s.dateNumText, active && { color: '#fff' }]}>{date}</AppText>
                        <AppText style={[s.dateMonthText, active && { color: 'rgba(255,255,255,0.7)' }]}>{month}</AppText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Time slots */}
                <AppText style={s.label}>Select Time</AppText>
                {slotsLoading ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {[1,2,3,4,5,6,7,8].map(i => <View key={i} style={[s.skeleton, { width: '22%', height: 40 }]} />)}
                  </View>
                ) : closedDay ? (
                  <AppText style={{ color: theme.subText, marginBottom: 16 }}>Closed on this day.</AppText>
                ) : slots.length === 0 ? (
                  <AppText style={{ color: theme.subText, marginBottom: 16 }}>No available slots for this date.</AppText>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {slots.map(sl => {
                      const blocked = blockedSlots.includes(sl);
                      const past = isPast(sl);
                      const active = slot === sl;
                      const disabled = blocked || past;
                      return (
                        <TouchableOpacity key={sl} disabled={disabled} onPress={() => !disabled && setSlot(sl)}
                          style={[s.slotBtn, active && s.slotBtnActive, disabled && { opacity: 0.35 }]}>
                          <AppText style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : theme.text }}>{sl}</AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Payment */}
                {slot && (
                  <>
                    <AppText style={[s.label, { marginTop: 4 }]}>Payment</AppText>
                    <View style={[s.slotBtn, s.slotBtnActive, { paddingVertical: 12, width: '100%', alignItems: 'center', borderRadius: 10 }]}>
                      <AppText style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Pay at Salon</AppText>
                    </View>
                  </>
                )}

                {bookError ? (
                  <AppText style={{ color: '#f87171', fontSize: 13, marginTop: 10 }}>{bookError}</AppText>
                ) : null}
              </View>
            )}

            {/* Success */}
            {bookingSuccess && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <View style={s.successIcon}>
                  <Ionicons name="checkmark-circle" size={40} color="#10b981" />
                </View>
                <AppText style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 8, marginTop: 16 }}>Booking Confirmed!</AppText>
                <AppText style={{ fontSize: 13, color: theme.subText, lineHeight: 22, textAlign: 'center', marginBottom: 24 }}>
                  {selectedSvcs.map(sv => sv.name).join(' + ')}{'\n'}at {salon.name}{'\n'}{bookDate} · {slot}
                </AppText>
                <TouchableOpacity onPress={closeSheet} style={s.confirmBtn}>
                  <AppText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Done</AppText>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>

          {/* Footer */}
          {!bookingSuccess && (
            <View style={s.footer}>
              {step === 'booking' && (
                <TouchableOpacity onPress={() => setStep('services')} style={s.backBtn}>
                  <AppText style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>Back</AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={step === 'services' ? handleContinue : handleConfirm}
                disabled={selectedSvcs.length === 0 || bookingLoading}
                style={[s.confirmBtn, { flex: 1, opacity: selectedSvcs.length === 0 ? 0.5 : 1 }]}
              >
                <AppText style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                  {bookingLoading ? 'Booking…'
                    : step === 'services'
                    ? selectedSvcs.length === 0 ? 'Select a service' : `Continue · ₹${totalPrice}`
                    : `Confirm${slot ? ` at ${slot}` : ''}`}
                </AppText>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const mkQbStyles = (t) => StyleSheet.create({
  backdrop:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_H * 0.9, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 48, elevation: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: t.border },
  sheetAvatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.border },
  label:       { fontSize: 11, fontWeight: '700', color: t.subText, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  skeleton:    { backgroundColor: t.border, borderRadius: 10 },
  svcRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: t.bg, borderWidth: 1.5, borderColor: t.border, marginBottom: 8 },
  svcRowSel:   { backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.4)' },
  checkbox:    { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSel: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  selChip:     { backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  selChipText: { fontSize: 12, fontWeight: '600', color: t.accent },
  dateBtn:     { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, minWidth: 58, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, alignItems: 'center', marginRight: 8 },
  dateBtnActive:  { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  dateDayText:    { fontSize: 11, fontWeight: '600', color: t.subText },
  dateNumText:    { fontSize: 18, fontWeight: '800', color: t.text, lineHeight: 22, marginVertical: 2 },
  dateMonthText:  { fontSize: 10, color: t.subText },
  slotBtn:        { paddingVertical: 10, paddingHorizontal: 4, width: '22%', borderRadius: 8, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, alignItems: 'center', marginBottom: 0 },
  slotBtnActive:  { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  successIcon:    { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 2, borderColor: 'rgba(16,185,129,0.3)', alignItems: 'center', justifyContent: 'center' },
  footer:         { borderTopWidth: 1, borderTopColor: t.border, padding: 12, flexDirection: 'row', gap: 10 },
  backBtn:        { paddingHorizontal: 18, paddingVertical: 13, borderRadius: 12, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  confirmBtn:     { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
});

// ── Inline salon service card (shown when service category selected) ─
function HomeSalonServiceCard({ salon, selectedCats, selectedServiceCat, cart, onAdd, onRemove, userCoords, onOpenSalon }) {
  const { theme } = useTheme();
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    api.get(`/public/salons/${salon._id}/services`)
      .then(r => {
        const all = r.data.data?.services || r.data.data || [];
        const aliases = selectedCats.flatMap(cat => CATEGORY_ALIASES[cat] || [cat]);
        const filtered = selectedServiceCat
          ? all.filter(sv => sv.category === selectedServiceCat)
          : all.filter(sv => aliases.includes(sv.category));
        setServices(filtered);
      })
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [salon._id, selectedServiceCat]);

  const km = useMemo(() => {
    if (!userCoords || !salon.location?.coordinates) return null;
    const [lng, lat] = salon.location.coordinates;
    const d = haversineKm(userCoords.lat, userCoords.lng, lat, lng);
    return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
  }, [userCoords, salon._id]);

  const minPrice = useMemo(() => {
    const prices = services.map(sv => sv.basePrice || sv.price || 0).filter(p => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [services]);

  const photo = salon.photos?.[0] || salon.coverPhoto || salon.image || null;
  const cartForSalon = cart.salon?._id === salon._id ? cart.serviceMap : {};

  return (
    <View style={{ backgroundColor: theme.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, marginBottom: 2 }}>
      {/* Salon header */}
      <TouchableOpacity onPress={() => onOpenSalon(salon)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
        <View style={{ width: 46, height: 46, borderRadius: 10, overflow: 'hidden', backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.border }}>
          {photo
            ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <AppText style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{salon.name?.[0] || 'S'}</AppText>
          }
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText style={{ fontSize: 15, fontWeight: '800', color: theme.text }} numberOfLines={1}>{salon.name}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            {km ? <AppText style={{ fontSize: 11, fontWeight: '600', color: theme.subText }}>{km} away</AppText> : null}
            {!loading && minPrice > 0
              ? <AppText style={{ fontSize: 11, fontWeight: '700', color: theme.accent }}>from ₹{minPrice}+</AppText>
              : null}
          </View>
        </View>
        {!loading && services.length > 0 && (
          <TouchableOpacity onPress={() => setExpanded(p => !p)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: theme.border }}>
            <AppText style={{ fontSize: 11, fontWeight: '700', color: theme.subText, marginRight: 3 }}>
              {expanded ? 'Hide' : 'Show'}
            </AppText>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={theme.subText} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Skeletons */}
      {loading && (
        <View style={{ padding: 12, gap: 8 }}>
          {[1,2].map(i => <View key={i} style={{ height: 72, backgroundColor: theme.border, borderRadius: 10 }} />)}
        </View>
      )}

      {!loading && services.length === 0 && (
        <View style={{ padding: 14 }}>
          <AppText style={{ fontSize: 13, color: theme.subText }}>No services listed for this category.</AppText>
        </View>
      )}

      {!loading && expanded && services.map((svc, idx) => {
        const added = !!cartForSalon[svc._id];
        const price = svc.basePrice || svc.price || 0;
        const svcImg = getServiceImage(svc);
        return (
          <View key={svc._id} style={{
            flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
            borderTopWidth: 1, borderTopColor: theme.border,
            backgroundColor: added ? 'rgba(99,102,241,0.05)' : 'transparent',
          }}>
            <View style={{ width: 76, height: 76, borderRadius: 10, overflow: 'hidden', backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border }}>
              {svcImg
                ? <Image source={{ uri: svcImg }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(99,102,241,0.08)' }}>
                    <Ionicons name="cut-outline" size={22} color={theme.accent} />
                  </View>
              }
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 4 }} numberOfLines={2}>{svc.name}</AppText>
              {svc.duration > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                  <Ionicons name="time-outline" size={10} color={theme.subText} />
                  <AppText style={{ fontSize: 11, color: theme.subText }}>{svc.duration} min</AppText>
                </View>
              )}
              {price > 0 && <AppText style={{ fontSize: 14, fontWeight: '800', color: theme.text }}>₹{price}</AppText>}
            </View>
            <TouchableOpacity
              onPress={() => added ? onRemove(salon, svc) : onAdd(salon, svc)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
                borderWidth: 1.5, borderColor: theme.accent,
                backgroundColor: added ? 'rgba(99,102,241,0.12)' : 'transparent',
              }}>
              <AppText style={{ fontSize: 13, fontWeight: '800', color: theme.accent }}>
                {added ? 'ADDED' : '+ ADD'}
              </AppText>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

// ── Salon Card ────────────────────────────────────────────────────
const SalonCard = React.memo(function SalonCard({ salon, onPress, distance, isFavorited, onToggleFavorite }) {
  const { theme } = useTheme();
  const [toggling, setToggling] = React.useState(false);
  const heartScale = React.useRef(new Animated.Value(1)).current;

  const photo         = salon.photos?.[0] || salon.coverPhoto;
  const rating        = salon.rating || salon.averageRating || 0;
  const reviewCount   = salon.reviewCount || salon.totalReviews || 0;
  const totalBookings = salon.totalBookings || 0;
  const openStatus    = isOpenNow(salon.workingHours);
  const todayHours    = getTodayHours(salon.workingHours);
  const opensAt       = getOpensAt(salon.workingHours);
  const isTopRated    = rating >= 4.5 && reviewCount >= 10;
  const isTrending    = !isTopRated && totalBookings >= 50;

  const offerLabel = salon.topOffer
    ? salon.topOffer.discountType === 'percentage'
      ? `${salon.topOffer.discountValue}% OFF${salon.topOffer.minAmount > 0 ? ` on ₹${salon.topOffer.minAmount}+` : ''}`
      : `₹${salon.topOffer.discountValue} OFF${salon.topOffer.minAmount > 0 ? ` on ₹${salon.topOffer.minAmount}+` : ''}`
    : null;

  const handleHeart = async () => {
    if (toggling) return;
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.5, useNativeDriver: true, tension: 280, friction: 4 }),
      Animated.spring(heartScale, { toValue: 1,   useNativeDriver: true, tension: 200, friction: 6 }),
    ]).start();
    setToggling(true);
    try {
      await api.post(`/customer/favorites/${salon._id}`);
      onToggleFavorite?.(salon._id, !isFavorited);
    } catch {
      Alert.alert('Error', 'Could not update favourites. Try again.');
    } finally {
      setToggling(false);
    }
  };

  const s = mkCardStyles(theme);
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.95}>
      {/* Image */}
      <View style={s.imgWrap}>
        {photo
          ? <Image source={{ uri: photo }} style={s.img} resizeMode="cover" />
          : <View style={[s.img, s.imgPlaceholder]}><Ionicons name="cut-outline" size={40} color="#93c5fd" /></View>
        }

        {/* Top-left badges */}
        <View style={s.topLeft}>
          {salon.isApproved && (
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={10} color="#fff" />
              <AppText style={s.verifiedText}>Verified</AppText>
            </View>
          )}
          {isTopRated && (
            <View style={s.topRatedBadge}>
              <Ionicons name="trophy-outline" size={10} color="#1a1200" />
              <AppText style={s.topRatedText}>Top Rated</AppText>
            </View>
          )}
          {isTrending && (
            <View style={s.trendingBadge}>
              <Ionicons name="trending-up-outline" size={10} color="#fff" />
              <AppText style={s.trendingText}>Trending</AppText>
            </View>
          )}
        </View>

        {/* Heart */}
        <TouchableOpacity style={[s.heartBtn, isFavorited && s.heartBtnActive]} onPress={handleHeart} disabled={toggling}>
          {toggling
            ? <ActivityIndicator size="small" color="#ef4444" />
            : <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={18} color={isFavorited ? '#fff' : '#94a3b8'} />
              </Animated.View>
          }
        </TouchableOpacity>

        {/* Bottom overlay row */}
        <View style={s.imgBottom}>
          <View>
            {openStatus !== null && (
              <View style={[s.openPill, { backgroundColor: openStatus ? 'rgba(16,185,129,0.92)' : 'rgba(239,68,68,0.92)' }]}>
                <View style={s.openDot} />
                <AppText style={s.openPillText}>{openStatus ? 'Open Now' : opensAt ? `Opens ${opensAt}` : 'Closed'}</AppText>
              </View>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {rating > 0 && (
              <View style={s.ratingPill}>
                <Ionicons name="star" size={11} color="#f59e0b" />
                <AppText style={s.ratingText}>{rating.toFixed(1)}</AppText>
                {reviewCount > 0 && <AppText style={s.reviewCountText}>({reviewCount})</AppText>}
              </View>
            )}
            {distance != null && (
              <View style={s.distPill}>
                <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.9)" />
                <AppText style={s.distText}>
                  {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={s.body}>
        <AppText style={s.name} numberOfLines={1}>{salon.name}</AppText>

        {/* Stars row */}
        <View style={[s.row, { marginBottom: 6 }]}>
          {[1,2,3,4,5].map(i => (
            <Ionicons key={i}
              name={rating > 0 && i <= Math.floor(rating) ? 'star'
                : rating > 0 && i === Math.ceil(rating) && rating % 1 >= 0.5 ? 'star-half'
                : 'star-outline'}
              size={13}
              color={rating > 0 && i <= Math.ceil(rating) ? '#f59e0b' : theme.border}
            />
          ))}
          <AppText style={s.ratingValue}>{rating > 0 ? rating.toFixed(1) : '—'}</AppText>
          <AppText style={s.reviewCount}>
            {reviewCount > 0 ? `(${reviewCount.toLocaleString()})` : 'No reviews'}
          </AppText>
        </View>

        {/* Address + hours */}
        <View style={[s.rowSpread, { marginBottom: 6 }]}>
          <View style={[s.row, { flex: 1, marginRight: 8 }]}>
            <Ionicons name="location-outline" size={13} color={theme.subText} />
            <AppText style={s.address} numberOfLines={1}>
              {salon.address || [salon.city, salon.state].filter(Boolean).join(', ') || 'Address not available'}
            </AppText>
          </View>
          {todayHours && (
            <View style={s.row}>
              <Ionicons name="time-outline" size={12} color={theme.subText} />
              <AppText style={s.hours}>{todayHours}</AppText>
            </View>
          )}
        </View>

        {/* Popularity + min price */}
        {(totalBookings >= 10 || salon.minPrice) && (
          <View style={[s.rowSpread, { marginBottom: 10 }]}>
            {totalBookings >= 10
              ? <View style={s.popPill}>
                  <Ionicons name="flame-outline" size={11} color="#f87171" />
                  <AppText style={s.popText}>
                    {totalBookings >= 1000 ? `${(totalBookings/1000).toFixed(1)}k` : `${totalBookings}+`} booked
                  </AppText>
                </View>
              : <View />
            }
            {salon.minPrice && (
              <AppText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>from ₹{salon.minPrice}</AppText>
            )}
          </View>
        )}

        {/* Offer */}
        {offerLabel && (
          <View style={s.offerRow}>
            <Ionicons name="pricetag-outline" size={13} color="#059669" />
            <AppText style={s.offerLabel} numberOfLines={1}>{offerLabel}</AppText>
            <View style={s.offerCode}>
              <AppText style={s.offerCodeText}>{salon.topOffer.code}</AppText>
            </View>
          </View>
        )}

        {/* Book CTA */}
        <View style={s.bookBtn}>
          <AppText style={s.bookBtnText}>Book Now</AppText>
          <Ionicons name="arrow-forward" size={15} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const mkCardStyles = (t) => StyleSheet.create({
  card:          { backgroundColor: t.card, borderRadius: 20, overflow: 'hidden', shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4, borderWidth: 1, borderColor: t.border },
  imgWrap:       { position: 'relative' },
  img:           { width: '100%', height: 190 },
  imgPlaceholder:{ backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center' },
  topLeft:       { position: 'absolute', top: 10, left: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 5, maxWidth: '75%' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.94)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  verifiedText:  { fontSize: 11, fontWeight: '800', color: '#fff' },
  topRatedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(234,179,8,0.92)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  topRatedText:  { fontSize: 10, fontWeight: '700', color: '#1a1200' },
  trendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  trendingText:  { fontSize: 10, fontWeight: '700', color: '#fff' },
  heartBtn:      { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.48)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  heartBtnActive:{ backgroundColor: 'rgba(244,63,94,0.9)' },
  imgBottom:     { position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  openPill:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  openDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  openPillText:  { fontSize: 11, fontWeight: '700', color: '#fff' },
  ratingPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.58)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  ratingText:    { fontSize: 12, fontWeight: '800', color: '#fff' },
  reviewCountText:{ fontSize: 10, color: 'rgba(255,255,255,0.65)' },
  distPill:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.58)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  distText:      { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  body:          { padding: 14 },
  name:          { fontSize: 16, fontWeight: '800', color: t.text, marginBottom: 4 },
  row:           { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowSpread:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingValue:   { fontSize: 13, fontWeight: '800', color: t.text, marginLeft: 3 },
  reviewCount:   { fontSize: 11, color: t.subText },
  address:       { fontSize: 12, color: t.subText, flex: 1 },
  hours:         { fontSize: 11, color: t.subText },
  popPill:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.09)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.18)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  popText:       { fontSize: 11, fontWeight: '600', color: '#f87171' },
  offerRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.22)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  offerLabel:    { fontSize: 12, fontWeight: '700', color: '#059669', flex: 1 },
  offerCode:     { backgroundColor: 'rgba(5,150,105,0.15)', borderWidth: 1, borderColor: 'rgba(5,150,105,0.25)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  offerCodeText: { fontSize: 10, fontWeight: '800', color: '#059669', letterSpacing: 0.5 },
  bookBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 14, backgroundColor: '#6366f1', shadowColor: '#6366f1', shadowOpacity: 0.38, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  bookBtnText:   { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
});

function SkeletonCard({ theme }) {
  return (
    <View style={{ backgroundColor: theme.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
      <View style={{ width: '100%', height: 190, backgroundColor: theme.border }} />
      <View style={{ padding: 14, gap: 9 }}>
        <View style={{ height: 14, backgroundColor: theme.border, borderRadius: 6, width: '70%' }} />
        <View style={{ height: 11, backgroundColor: theme.border, borderRadius: 6, width: '50%' }} />
        <View style={{ height: 38, backgroundColor: theme.border, borderRadius: 12, marginTop: 4 }} />
      </View>
    </View>
  );
}

// ── Main HomeScreen ───────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const { user, isAuthenticated } = useAuth();

  const [salons, setSalons]               = useState([]);
  const [allSalons, setAllSalons]         = useState([]);
  const [selectedCats, setSelectedCats]   = useState([]);
  const [sort, setSort]                   = useState('nearby');
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [searchText, setSearchText]       = useState('');
  const [searching, setSearching]         = useState(false);
  const [userCoords, setUserCoords]       = useState(null);
  const [locDenied, setLocDenied]         = useState(false);
  const [favoriteIds, setFavoriteIds]     = useState(new Set());
  const [serviceMatchLabel, setServiceMatchLabel] = useState('');
  const [openNow, setOpenNow]             = useState(false);
  const [selectedServiceCat, setSelectedServiceCat] = useState(null);
  const [upcomingCount, setUpcomingCount] = useState(0);

  // Cart
  const [cart, setCart] = useState({ salon: null, serviceMap: {} });
  const cartServices = useMemo(() => Object.values(cart.serviceMap), [cart.serviceMap]);
  const cartTotal    = useMemo(() => cartServices.reduce((s, x) => s + (x.basePrice || x.price || 0), 0), [cartServices]);

  // QuickBook sheet
  const [quickBookSalon, setQuickBookSalon] = useState(null);
  const [quickBookCat, setQuickBookCat]     = useState(null);

  const searchTimer = useRef(null);

  const addToCart = useCallback((salon, service) => {
    setCart(prev => ({
      salon,
      serviceMap: { ...(prev.salon?._id === salon._id ? prev.serviceMap : {}), [service._id]: service },
    }));
  }, []);

  const removeFromCart = useCallback((salon, service) => {
    setCart(prev => {
      if (prev.salon?._id !== salon._id) return prev;
      const { [service._id]: _, ...rest } = prev.serviceMap;
      return { salon: Object.keys(rest).length > 0 ? prev.salon : null, serviceMap: rest };
    });
  }, []);

  // On mount: show top-rated immediately, then replace with nearby if location granted
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Immediately show top-rated so users see content right away
      fetchBySort('rated', null);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') { setLocDenied(true); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserCoords(coords);
        setSort('nearby');
        fetchBySort('nearby', coords);
      } catch {
        if (!cancelled) setLocDenied(true);
      }
    })();

    api.get('/customer/favorites').then(res => {
      const data = res.data.data?.salons || res.data.data || [];
      setFavoriteIds(new Set(data.map(sv => sv._id)));
    }).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/customer/bookings').then(res => {
      const arr = res.data.data?.bookings || res.data.data || [];
      setUpcomingCount(Array.isArray(arr) ? arr.filter(b => ['pending','confirmed','in_progress'].includes(b.status)).length : 0);
    }).catch(() => {});
  }, [isAuthenticated]);

  const applyFilters = useCallback((data, cats, onlyOpen, serviceCat) => {
    let r = data;
    if (cats.length > 0) {
      r = r.filter(s => cats.some(cat => {
        const chip = HERO_CHIPS.find(c => c.cat === cat);
        if (chip?.businessType && s.businessType === chip.businessType) return true;
        const aliases = CATEGORY_ALIASES[cat] || [cat];
        return (s.offeredCategoryNames || []).some(n => aliases.includes(n));
      }));
    }
    if (serviceCat) r = r.filter(s => (s.offeredCategoryNames || []).includes(serviceCat));
    if (onlyOpen)  r = r.filter(s => isOpenNow(s.workingHours) === true);
    return r;
  }, []);

  const fetchBySort = async (sortKey, coords) => {
    setLoading(true);
    setSearchText(''); setServiceMatchLabel('');
    try {
      let data;
      if (coords) {
        const res = await api.get(`/public/salons/nearby?latitude=${coords.lat}&longitude=${coords.lng}&sort=${sortKey}`);
        data = res.data.data?.salons || res.data.data || [];
      } else {
        const res = await api.get(`/public/salons?sort=rated&limit=40`);
        data = res.data.data?.salons || res.data.data || [];
      }
      setAllSalons(data);
      setSalons(applyFilters(data, selectedCats, openNow, selectedServiceCat));
    } catch {
      setAllSalons([]); setSalons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategory = (cat) => {
    let newCats;
    if (cat === null) {
      newCats = [];
      setSelectedServiceCat(null);
      setCart({ salon: null, serviceMap: {} });
    } else {
      newCats = selectedCats.includes(cat) ? [] : [cat];
      setSelectedServiceCat(null);
    }
    setSelectedCats(newCats);
    setSalons(applyFilters(allSalons, newCats, openNow, null));
  };

  const handleServiceCat = (cat) => {
    const next = selectedServiceCat === cat ? null : cat;
    setSelectedServiceCat(next);
    setSalons(applyFilters(allSalons, selectedCats, openNow, next));
  };

  const handleOpenNow = () => {
    const next = !openNow; setOpenNow(next);
    setSalons(applyFilters(allSalons, selectedCats, next, selectedServiceCat));
  };

  const runSearch = useCallback(async (text) => {
    if (!text.trim()) return;
    setSearching(true);
    const q = text.toLowerCase();
    const local = allSalons.filter(s =>
      s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q)
    );
    if (local.length > 0) { setSalons(local); setSearching(false); return; }
    try {
      const res = await api.get(`/public/services/search?q=${encodeURIComponent(text.trim())}`);
      const d = res.data.data;
      if (d?.salons?.length > 0) { setSalons(d.salons); setServiceMatchLabel(`Salons offering "${d.matchedService}"`); }
      else setSalons([]);
    } catch { setSalons([]); }
    finally { setSearching(false); }
  }, [allSalons]);

  const handleSearch = useCallback((text) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setServiceMatchLabel('');
      setSalons(applyFilters(allSalons, selectedCats, openNow, selectedServiceCat));
      return;
    }
    searchTimer.current = setTimeout(() => runSearch(text), 400);
  }, [allSalons, selectedCats, openNow, selectedServiceCat, applyFilters, runSearch]);

  const clearAll = () => {
    setSearchText(''); setSelectedCats([]); setSelectedServiceCat(null); setOpenNow(false);
    setServiceMatchLabel(''); setSalons(allSalons);
    setCart({ salon: null, serviceMap: {} });
  };

  const getDistance = useCallback((salon) => {
    if (!userCoords || !salon.location?.coordinates) return null;
    const [lng, lat] = salon.location.coordinates;
    return haversineKm(userCoords.lat, userCoords.lng, lat, lng);
  }, [userCoords]);

  const handleToggleFavorite = useCallback((salonId, nowFavorited) => {
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (nowFavorited) next.add(salonId); else next.delete(salonId);
      return next;
    });
  }, []);

  const availableServiceCats = useMemo(() => {
    if (selectedCats.length === 0) return [];
    const set = new Set();
    applyFilters(allSalons, selectedCats, false, null).forEach(s =>
      (s.offeredCategoryNames || []).forEach(n => set.add(n))
    );
    return [...set].sort();
  }, [allSalons, selectedCats, applyFilters]);

  const isSearchActive = searchText.trim().length > 0;
  const hasActiveState = selectedCats.length > 0 || !!selectedServiceCat || openNow || isSearchActive;

  const sectionTitle = serviceMatchLabel
    || (isSearchActive ? 'Search Results'
      : sort === 'rated'  ? 'Top Rated Salons'
      : sort === 'booked' ? 'Trending Salons'
      : 'GlowSpots Near You');

  const activeChip = HERO_CHIPS.find(c => c.cat === selectedCats[0]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBySort(sort, userCoords).catch(() => {});
    setRefreshing(false);
  };

  const renderItem = useCallback(({ item }) => {
    if (selectedServiceCat) {
      return (
        <HomeSalonServiceCard
          salon={item}
          selectedCats={selectedCats}
          selectedServiceCat={selectedServiceCat}
          cart={cart}
          onAdd={addToCart}
          onRemove={removeFromCart}
          userCoords={userCoords}
          onOpenSalon={(s) => navigation.navigate('SalonDetails', { salonId: s._id })}
        />
      );
    }
    return (
      <SalonCard
        salon={item}
        distance={getDistance(item)}
        onPress={() => navigation.navigate('SalonDetails', { salonId: item._id })}
        isFavorited={favoriteIds.has(item._id)}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  }, [selectedServiceCat, selectedCats, cart, addToCart, removeFromCart, userCoords, getDistance, navigation, favoriteIds, handleToggleFavorite]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border, paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <AppText style={[styles.headerTitle, { color: theme.text }]}>
              {getGreeting()},{' '}
              <AppText style={{ color: theme.accent }}>{user?.name || user?.firstName || 'there'}</AppText>
            </AppText>
            <AppText style={[styles.headerSub, { color: theme.subText }]}>Where would you like to book today?</AppText>
          </View>
          <TouchableOpacity style={[styles.menuBtn, { backgroundColor: theme.bg }]} onPress={() => navigation.navigate('Map')}>
            <Ionicons name="map-outline" size={21} color={theme.subText} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuBtn, { backgroundColor: theme.bg }]} onPress={toggleTheme}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.subText} />
          </TouchableOpacity>
          {isAuthenticated && (
            <TouchableOpacity style={[styles.menuBtn, { backgroundColor: theme.bg }]} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={20} color={theme.subText} />
              {unreadCount > 0 && (
                <View style={[styles.notifBadge, { borderColor: theme.card }]}>
                  <AppText style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color="#6b7280" />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search salons, services, city…"
            placeholderTextColor={theme.placeholder}
            value={searchText}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {(searching || searchText.length > 0) && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              {searching
                ? <ActivityIndicator size="small" color="#6b7280" />
                : <Ionicons name="close-circle" size={18} color="#9ca3af" />}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={loading ? [1,2,3,4] : salons}
        keyExtractor={item => loading ? String(item) : item._id}
        renderItem={loading ? () => <SkeletonCard theme={theme} /> : renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110, gap: selectedServiceCat ? 10 : 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={!loading
          ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} tintColor={theme.accent} />
          : undefined}
        ListHeaderComponent={
          <View>
            {/* Hero circular chips — exactly like web */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ paddingVertical: 14 }}
              contentContainerStyle={{ paddingHorizontal: 8, gap: 0 }}>
              {HERO_CHIPS.map(chip => {
                const active = chip.cat === null ? selectedCats.length === 0 : selectedCats.includes(chip.cat);
                return (
                  <TouchableOpacity key={chip.label} onPress={() => handleCategory(chip.cat)}
                    style={{ alignItems: 'center', paddingHorizontal: 10 }} activeOpacity={0.8}>
                    <View style={[
                      styles.heroCircle,
                      { backgroundColor: theme.card, borderColor: theme.border },
                      active && styles.heroCircleActive,
                    ]}>
                      <Ionicons name={chip.icon} size={22} color={active ? '#fff' : theme.subText} />
                    </View>
                    <AppText style={[styles.heroLabel, { color: active ? theme.text : theme.subText }, active && { fontWeight: '700' }]}>
                      {chip.label}
                    </AppText>
                    {active && <View style={styles.heroActiveDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Active category banner */}
            {activeChip && (
              <View style={[styles.activeBanner, { backgroundColor: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.18)' }]}>
                <View style={styles.activeBannerIcon}>
                  <Ionicons name={activeChip.icon} size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: theme.accent, opacity: 0.8 }}>Browsing</AppText>
                  <AppText style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>{activeChip.label}</AppText>
                </View>
                {!loading && (
                  <AppText style={[styles.activeBannerCount, { color: theme.accent }]}>{salons.length} found</AppText>
                )}
                <TouchableOpacity onPress={clearAll} style={{ padding: 4, marginLeft: 4 }}>
                  <Ionicons name="close" size={18} color={theme.subText} />
                </TouchableOpacity>
              </View>
            )}

            {/* Service sub-category chips */}
            {availableServiceCats.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 8 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 24, gap: 8, paddingVertical: 4 }}>
                {availableServiceCats.map(cat => {
                  const active = selectedServiceCat === cat;
                  return (
                    <TouchableOpacity key={cat} onPress={() => handleServiceCat(cat)}
                      style={[styles.svcCatChip, { backgroundColor: theme.bg, borderColor: theme.border }, active && styles.svcCatChipActive]}>
                      <AppText style={[styles.svcCatChipText, { color: theme.text }, active && { color: '#fff' }]}>{cat}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Open Now + clear */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
              <TouchableOpacity onPress={handleOpenNow}
                style={[styles.filterChip, { backgroundColor: theme.card, borderColor: theme.border }, openNow && { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: '#10b981' }]}>
                <View style={[styles.openDot, { backgroundColor: openNow ? '#10b981' : theme.subText }]} />
                <AppText style={[styles.filterChipText, { color: openNow ? '#10b981' : theme.subText }]}>Open Now</AppText>
              </TouchableOpacity>
              {hasActiveState && (
                <TouchableOpacity onPress={clearAll} style={{ paddingHorizontal: 10, paddingVertical: 7 }}>
                  <AppText style={{ fontSize: 12, fontWeight: '600', color: theme.accent }}>Clear filters</AppText>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick nav shortcuts */}
            {isAuthenticated && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 8 }}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingRight: 24 }}>
                <TouchableOpacity onPress={() => navigation.getParent()?.navigate('BookingsTab')}
                  style={[styles.navShortcut, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="calendar-outline" size={14} color={theme.text} />
                  <AppText style={[styles.navShortcutText, { color: theme.text }]}>My Bookings</AppText>
                  {upcomingCount > 0 && (
                    <View style={[styles.navBadge, { backgroundColor: theme.accent }]}>
                      <AppText style={styles.navBadgeText}>{upcomingCount}</AppText>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.getParent()?.navigate('FavoritesTab')}
                  style={[styles.navShortcut, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="heart-outline" size={14} color={theme.text} />
                  <AppText style={[styles.navShortcutText, { color: theme.text }]}>Saved Salons</AppText>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Section header */}
            {!loading && (
              <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <AppText style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>{sectionTitle}</AppText>
                  {isSearchActive && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                      <AppText style={{ fontSize: 13, color: theme.accent, fontWeight: '600' }}>Show All</AppText>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText style={{ fontSize: 12, color: theme.subText }}>
                    {salons.length} salon{salons.length !== 1 ? 's' : ''}{openNow ? ' · open now' : ''}
                  </AppText>
                  {!isSearchActive && userCoords && (
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {SORT_OPTIONS.map(opt => (
                        <TouchableOpacity key={opt.key}
                          onPress={() => { setSort(opt.key); fetchBySort(opt.key, userCoords); }}
                          style={[styles.sortBtn, { borderColor: theme.border }, sort === opt.key && { backgroundColor: '#4f46e5', borderColor: '#4f46e5' }]}>
                          <AppText style={[{ fontSize: 11, fontWeight: '600', color: theme.subText }, sort === opt.key && { color: '#fff' }]}>
                            {opt.label}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={!loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 }}>
            <Ionicons name="search-outline" size={48} color="#d1d5db" />
            <AppText style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>No salons found</AppText>
            <AppText style={{ fontSize: 14, color: theme.subText, textAlign: 'center', lineHeight: 20 }}>
              {searchText ? 'Try a different search term' : 'No salons available yet'}
            </AppText>
          </View>
        ) : null}
      />

      {/* Floating cart bar */}
      {cartServices.length > 0 && !quickBookSalon && (
        <View style={[styles.cartBar, { bottom: insets.bottom + 70 }]}>
          <TouchableOpacity style={styles.cartBarBtn} onPress={() => setQuickBookSalon(cart.salon)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.cartBarIcon}>
                <Ionicons name="bag-outline" size={14} color="#fff" />
              </View>
              <View>
                <AppText style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>
                  {cartServices.length} service{cartServices.length > 1 ? 's' : ''} added
                </AppText>
                <AppText style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>
                  {cart.salon?.name}
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>₹{cartTotal}</AppText>
              <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.9)" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Book Sheet */}
      {quickBookSalon && (
        <QuickBookSheet
          salon={quickBookSalon}
          selectedServiceCat={quickBookCat}
          preSelectedServices={cart.salon?._id === quickBookSalon._id ? cartServices : []}
          onClose={() => { setQuickBookSalon(null); setQuickBookCat(null); }}
          navigation={navigation}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header:        { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  headerTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 4 },
  headerTitle:   { fontSize: 20, fontWeight: '800' },
  headerSub:     { fontSize: 12, marginTop: 2 },
  menuBtn:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  notifBadge:    { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5 },
  notifBadgeText:{ color: '#fff', fontSize: 9, fontWeight: '800' },
  searchBar:     { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 46, gap: 8, borderWidth: 1 },
  searchInput:   { flex: 1, fontSize: 14 },

  heroCircle:     { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginBottom: 6 },
  heroCircleActive:{ backgroundColor: '#6366f1', borderColor: '#6366f1', shadowColor: '#6366f1', shadowOpacity: 0.55, shadowRadius: 12, elevation: 6 },
  heroLabel:      { fontSize: 11, textAlign: 'center' },
  heroActiveDot:  { width: 16, height: 3, borderRadius: 999, backgroundColor: '#6366f1', marginTop: 4 },

  activeBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  activeBannerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  activeBannerCount:{ fontSize: 12, fontWeight: '700', backgroundColor: 'rgba(99,102,241,0.12)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },

  svcCatChip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  svcCatChipActive:{ backgroundColor: '#6366f1', borderColor: '#6366f1' },
  svcCatChipText:  { fontSize: 12, fontWeight: '700' },

  filterChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  openDot:        { width: 7, height: 7, borderRadius: 4 },

  navShortcut:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  navShortcutText:{ fontSize: 12, fontWeight: '600' },
  navBadge:       { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  navBadgeText:   { fontSize: 9, fontWeight: '800', color: '#fff' },

  sortBtn:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },

  cartBar:    { position: 'absolute', left: 16, right: 16 },
  cartBarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 16, backgroundColor: '#6366f1', shadowColor: '#6366f1', shadowOpacity: 0.55, shadowRadius: 16, elevation: 8 },
  cartBarIcon:{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});
