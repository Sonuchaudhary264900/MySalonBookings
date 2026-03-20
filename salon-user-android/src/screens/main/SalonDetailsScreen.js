import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Linking, Alert, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showError, showInfo } from '../../utils/toast';

const TABS = ['Services', 'Reviews', 'Info'];
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function StarRating({ rating, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={size} color="#f59e0b" />
      ))}
    </View>
  );
}

function WorkingHoursRow({ day, hours }) {
  const today = DAY_NAMES[new Date().getDay()];
  const isToday = day.toLowerCase() === today.toLowerCase();
  return (
    <View style={[styles.hoursRow, isToday && styles.hoursRowToday]}>
      <Text style={[styles.hoursDay, isToday && { color: '#2563eb', fontWeight: '700' }]}>{day}</Text>
      {hours?.isClosed ? (
        <Text style={styles.hoursClosed}>Closed</Text>
      ) : (
        <Text style={[styles.hoursTime, isToday && { color: '#2563eb' }]}>
          {hours?.open || '09:00'} – {hours?.close || '21:00'}
        </Text>
      )}
    </View>
  );
}

export default function SalonDetailsScreen({ route, navigation }) {
  const { salonId } = route.params;
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  const [salon, setSalon]                 = useState(null);
  const [services, setServices]           = useState([]);
  const [reviews, setReviews]             = useState([]);
  const [tab, setTab]                     = useState('Services');
  const [loading, setLoading]             = useState(true);
  const [selectedServices, setSelectedServices] = useState([]);
  const [isFavorite, setIsFavorite]       = useState(false);
  const [favLoading, setFavLoading]       = useState(false);

  useEffect(() => {
    Promise.all([loadSalon(), loadServices(), loadReviews()]).finally(() => setLoading(false));
  }, [salonId]);

  const loadSalon = async () => {
    try {
      const res = await api.get(`/public/salons/${salonId}`);
      setSalon(res.data.data || res.data.salon);
    } catch {}
  };

  const loadServices = async () => {
    try {
      const res = await api.get(`/public/salons/${salonId}/services`);
      setServices(res.data.data?.services || res.data.data || []);
    } catch {}
  };

  const loadReviews = async () => {
    try {
      const res = await api.get(`/public/salons/${salonId}/reviews`);
      setReviews(res.data.data?.reviews || res.data.data || []);
    } catch {}
  };

  const toggleService = (svc) => {
    setSelectedServices(prev =>
      prev.find(s => s._id === svc._id)
        ? prev.filter(s => s._id !== svc._id)
        : [...prev, svc]
    );
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) { showInfo('Sign In Required', 'Please sign in to save salons.'); return; }
    setFavLoading(true);
    try {
      await api.post(`/customer/favorites/${salonId}`);
      setIsFavorite(v => !v);
    } catch {} finally {
      setFavLoading(false);
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to book an appointment.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
      ]);
      return;
    }
    if (selectedServices.length === 0) {
      showError('Select Services', 'Please select at least one service to continue.');
      return;
    }
    navigation.navigate('Booking', {
      salonId,
      serviceIds: selectedServices.map(s => s._id),
    });
  };

  const totalPrice    = selectedServices.reduce((s, x) => s + (x.basePrice || x.price || 0), 0);
  const totalDuration = selectedServices.reduce((s, x) => s + (x.duration || 0), 0);

  const photo = salon?.photos?.[0] || salon?.coverPhoto;
  const rating = salon?.rating || salon?.averageRating || 0;

  if (loading) {
    return (
      <View style={[styles.loadingBox, { paddingTop: insets.top }]}>
        <View style={styles.loadingHeader} />
        <View style={{ padding: 20, gap: 12 }}>
          <View style={{ height: 22, backgroundColor: '#e5e7eb', borderRadius: 8, width: '60%' }} />
          <View style={{ height: 14, backgroundColor: '#e5e7eb', borderRadius: 6, width: '40%' }} />
          <View style={{ height: 14, backgroundColor: '#e5e7eb', borderRadius: 6, width: '50%' }} />
        </View>
        <ActivityIndicator color="#2563eb" style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (!salon) {
    return (
      <View style={[styles.loadingBox, { paddingTop: insets.top + 60, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={52} color="#d1d5db" />
        <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 12 }}>Salon not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn2}>
          <Text style={{ color: '#2563eb', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back + Favorite buttons overlay */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleBtn} onPress={toggleFavorite} disabled={favLoading}>
          {favLoading
            ? <ActivityIndicator size="small" color="#ef4444" />
            : <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#ef4444' : '#111827'} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={styles.heroWrapper}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.heroImg} />
          ) : (
            <View style={[styles.heroImg, styles.heroPlaceholder]}>
              <Ionicons name="cut" size={56} color="#93c5fd" />
            </View>
          )}
          <View style={styles.heroOverlay} />
        </View>

        {/* Salon info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.salonName}>{salon.name}</Text>
              <Text style={styles.salonCategory}>{(salon.category || '').replace('_', ' ')}</Text>
            </View>
            {rating > 0 && (
              <View style={styles.ratingBox}>
                <Text style={styles.ratingNum}>{rating.toFixed(1)}</Text>
                <Ionicons name="star" size={12} color="#f59e0b" />
                {salon.reviewCount > 0 && <Text style={styles.ratingCount}>({salon.reviewCount})</Text>}
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#6b7280" />
            <Text style={styles.metaText} numberOfLines={2}>
              {salon.address}{salon.city ? `, ${salon.city}` : ''}{salon.state ? `, ${salon.state}` : ''}
            </Text>
          </View>

          {salon.phone && (
            <TouchableOpacity style={styles.metaRow} onPress={() => Linking.openURL(`tel:${salon.phone}`)}>
              <Ionicons name="call-outline" size={14} color="#2563eb" />
              <Text style={[styles.metaText, { color: '#2563eb' }]}>{salon.phone}</Text>
            </TouchableOpacity>
          )}

          {salon.description && (
            <Text style={styles.description}>{salon.description}</Text>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: selectedServices.length > 0 ? 100 : 32 }}>

          {/* Services Tab */}
          {tab === 'Services' && (
            <View style={{ gap: 10 }}>
              {services.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Ionicons name="cut-outline" size={36} color="#d1d5db" />
                  <Text style={styles.emptyTabText}>No services listed</Text>
                </View>
              ) : services.map(svc => {
                const selected = selectedServices.some(s => s._id === svc._id);
                return (
                  <TouchableOpacity
                    key={svc._id}
                    style={[styles.serviceCard, selected && styles.serviceCardSelected]}
                    onPress={() => toggleService(svc)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.serviceTop}>
                        <Text style={[styles.serviceName, selected && { color: '#2563eb' }]}>{svc.name}</Text>
                        <Text style={styles.servicePrice}>₹{svc.basePrice || svc.price}</Text>
                      </View>
                      <View style={styles.serviceMeta}>
                        <Ionicons name="time-outline" size={12} color="#9ca3af" />
                        <Text style={styles.serviceMetaText}>{svc.duration} min</Text>
                        {svc.description && <Text style={styles.serviceDesc} numberOfLines={1}>· {svc.description}</Text>}
                      </View>
                    </View>
                    <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                      {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Reviews Tab */}
          {tab === 'Reviews' && (
            <View style={{ gap: 10 }}>
              {reviews.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Ionicons name="star-outline" size={36} color="#d1d5db" />
                  <Text style={styles.emptyTabText}>No reviews yet</Text>
                </View>
              ) : reviews.map((r, i) => (
                <View key={r._id || i} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>{(r.customerName || r.name || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewName}>{r.customerName || r.name || 'Anonymous'}</Text>
                      <StarRating rating={r.salonRating || r.rating || 0} size={12} />
                    </View>
                    {r.createdAt && (
                      <Text style={styles.reviewDate}>
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                    )}
                  </View>
                  {r.reviewText && <Text style={styles.reviewText}>{r.reviewText}</Text>}
                </View>
              ))}
            </View>
          )}

          {/* Info Tab */}
          {tab === 'Info' && (
            <View style={{ gap: 12 }}>
              {/* Contact */}
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Contact</Text>
                {salon.phone && (
                  <TouchableOpacity style={styles.infoRow2} onPress={() => Linking.openURL(`tel:${salon.phone}`)}>
                    <Ionicons name="call-outline" size={16} color="#2563eb" />
                    <Text style={[styles.infoValue, { color: '#2563eb' }]}>{salon.phone}</Text>
                  </TouchableOpacity>
                )}
                {salon.email && (
                  <View style={styles.infoRow2}>
                    <Ionicons name="mail-outline" size={16} color="#6b7280" />
                    <Text style={styles.infoValue}>{salon.email}</Text>
                  </View>
                )}
              </View>

              {/* Address */}
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Address</Text>
                <View style={styles.infoRow2}>
                  <Ionicons name="location-outline" size={16} color="#6b7280" />
                  <Text style={styles.infoValue}>
                    {[salon.address, salon.city, salon.district, salon.state, salon.pincode].filter(Boolean).join(', ')}
                  </Text>
                </View>
              </View>

              {/* Working Hours */}
              {salon.workingHours && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Working Hours</Text>
                  {DAY_NAMES.map(day => (
                    <WorkingHoursRow
                      key={day}
                      day={day}
                      hours={salon.workingHours[day.toLowerCase()]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

        </View>
      </ScrollView>

      {/* Bottom Book Bar */}
      {selectedServices.length > 0 && (
        <View style={[styles.bookBar, { paddingBottom: insets.bottom + 12 }]}>
          <View>
            <Text style={styles.bookBarCount}>{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} · {totalDuration} min</Text>
            <Text style={styles.bookBarPrice}>₹{totalPrice}</Text>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={handleBookNow}>
            <Text style={styles.bookBtnText}>Book Now</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingBox: { flex: 1, backgroundColor: '#f9fafb' },
  loadingHeader: { height: 240, backgroundColor: '#e5e7eb' },
  topBar: { position: 'absolute', left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  backBtn2: { marginTop: 16, padding: 12 },
  heroWrapper: { position: 'relative' },
  heroImg: { width: '100%', height: 240 },
  heroPlaceholder: { backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'transparent' },
  infoCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: -20, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, gap: 8, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  salonName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  salonCategory: { fontSize: 13, color: '#6b7280', textTransform: 'capitalize', marginTop: 2 },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingNum: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  ratingCount: { fontSize: 11, color: '#92400e' },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  metaText: { fontSize: 13, color: '#6b7280', flex: 1, lineHeight: 18 },
  description: { fontSize: 13, color: '#6b7280', lineHeight: 19, marginTop: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 4, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  tabBtnActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  emptyTab: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTabText: { fontSize: 14, color: '#9ca3af' },
  serviceCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  serviceCardSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  serviceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  serviceName: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  servicePrice: { fontSize: 15, fontWeight: '800', color: '#2563eb' },
  serviceMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  serviceMetaText: { fontSize: 12, color: '#9ca3af' },
  serviceDesc: { fontSize: 12, color: '#9ca3af', flex: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  reviewCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: '#f3f4f6' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  reviewName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  reviewDate: { fontSize: 11, color: '#9ca3af' },
  reviewText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  infoSection: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  infoSectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoRow2: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoValue: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 19 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  hoursRowToday: { backgroundColor: '#eff6ff', marginHorizontal: -14, paddingHorizontal: 14, borderRadius: 6 },
  hoursDay: { fontSize: 13, color: '#374151' },
  hoursTime: { fontSize: 13, color: '#374151', fontWeight: '600' },
  hoursClosed: { fontSize: 13, color: '#ef4444' },
  bookBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
  bookBarCount: { fontSize: 12, color: '#6b7280' },
  bookBarPrice: { fontSize: 20, fontWeight: '800', color: '#111827' },
  bookBtn: { backgroundColor: '#2563eb', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
