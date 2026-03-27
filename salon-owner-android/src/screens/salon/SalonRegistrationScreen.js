import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image as RNImage,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useSalon } from '../../context/SalonContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CATEGORIES = ['barber', 'hair_salon', 'spa', 'massage', 'other'];
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STEPS = ['Basic Info', 'Location', 'Working Hours', 'Photos'];

function addMinutes(time, delta) {
  const [h, m] = time.split(':').map(Number);
  const total = ((h * 60 + m + delta) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function TimePicker({ label, value, onChange, optional }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{optional && <Text style={{ color: '#9ca3af', fontWeight: '400' }}> (optional)</Text>}</Text>
      <View style={styles.timeRow}>
        <TouchableOpacity style={styles.timeBtn} onPress={() => onChange(addMinutes(value, 60))}>
          <Ionicons name="chevron-up" size={16} color="#2563eb" />
        </TouchableOpacity>
        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>{value}</Text>
        </View>
        <TouchableOpacity style={styles.timeBtn} onPress={() => onChange(addMinutes(value, -60))}>
          <Ionicons name="chevron-down" size={16} color="#2563eb" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.timeBtn, { marginLeft: 6 }]} onPress={() => onChange(addMinutes(value, 15))}>
          <Text style={{ fontSize: 10, color: '#2563eb', fontWeight: '700' }}>+15m</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.timeBtn} onPress={() => onChange(addMinutes(value, -15))}>
          <Text style={{ fontSize: 10, color: '#2563eb', fontWeight: '700' }}>-15m</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({ label, value, setter, placeholder, keyboard = 'default', multiline = false, editable = true }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top', paddingTop: 10 }, !editable && { backgroundColor: '#f3f4f6', color: '#9ca3af' }]}
        value={value}
        onChangeText={setter}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboard}
        autoCapitalize="none"
        multiline={multiline}
        editable={editable}
      />
    </View>
  );
}

function buildMapHtml(lat, lng) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    var marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
    marker.bindPopup('<b>Your Salon</b><br>Drag to adjust location').openPopup();
    marker.on('dragend', function() {
      var pos = marker.getLatLng();
      window.ReactNativeWebView.postMessage(JSON.stringify({ lat: pos.lat, lng: pos.lng }));
    });
  </script>
</body>
</html>`;
}

export default function SalonRegistrationScreen() {
  const { createSalon } = useSalon();
  const { user, logout } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('barber');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');

  // Step 2 — Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [locationState, setLocationState] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  // Step 3 — Working Hours
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [enableLunch, setEnableLunch] = useState(false);
  const [lunchStart, setLunchStart] = useState('13:00');
  const [lunchEnd, setLunchEnd] = useState('14:00');
  const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5, 6]); // Mon–Sat

  // Step 4 — Photos
  const [photos, setPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (raw.startsWith('+')) return raw.trim();
    return `+91${digits}`;
  };

  const toggleDay = (i) => {
    setWorkingDays((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort()
    );
  };

  // ── Location ─────────────────────────────────────────────────

  const detectLocation = async () => {
    setLocationLoading(true);
    setLocationStatus('Requesting permission…');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('Permission denied. Enter address manually.');
        return;
      }
      setLocationStatus('Detecting your location…');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);

      // Reverse geocode
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (place) {
        const parts = [place.streetNumber, place.street].filter(Boolean);
        if (!address) setAddress(parts.join(' ') || place.name || '');
        if (!locationState) setLocationState(place.region || '');
        if (!district) setDistrict(place.subregion || place.district || place.county || '');
        if (!city) setCity(place.city || '');
        if (!pincode) setPincode(place.postalCode || '');
      }
      setLocationStatus('Location detected! Verify and edit the address below.');
    } catch {
      setLocationStatus('Could not detect location. Enter address manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  const onMarkerDragEnd = async (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (place) {
        const parts = [place.streetNumber, place.street].filter(Boolean);
        setAddress(parts.join(' ') || place.name || address);
        setLocationState(place.region || locationState);
        setDistrict(place.subregion || place.district || place.county || district);
        setCity(place.city || place.subregion || city);
        setPincode(place.postalCode || pincode);
        setLocationStatus('Pin moved! Address updated below.');
      }
    } catch {
      setLocationStatus('Pin moved! Verify address below.');
    }
  };

  // ── Photos ───────────────────────────────────────────────────

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 6,
    });
    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setPhotos((prev) => [...prev, ...newUris].slice(0, 6));
    }
  };

  const uploadPhotos = async (photoUris) => {
    const formData = new FormData();
    photoUris.forEach((uri) => {
      const filename = uri.split('/').pop();
      const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
      formData.append('photos', { uri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
    });
    const res = await api.post('/owner/salon/upload-photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return res.data.data?.urls || [];
  };

  // ── Validation ───────────────────────────────────────────────

  const validateStep1 = () => {
    if (!name.trim() || name.trim().length < 3) { Alert.alert('Error', 'Salon name must be at least 3 characters'); return false; }
    if (!phone.trim()) { Alert.alert('Error', 'Phone number is required'); return false; }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { Alert.alert('Error', 'Valid email is required'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!address.trim() || address.trim().length < 5) { Alert.alert('Error', 'Full address is required (min 5 characters)'); return false; }
    if (!city.trim()) { Alert.alert('Error', 'City is required'); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (openTime >= closeTime) { Alert.alert('Error', 'Closing time must be after opening time'); return false; }
    if (workingDays.length === 0) { Alert.alert('Error', 'Select at least one working day'); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep((s) => s + 1);
  };

  // ── Submit ───────────────────────────────────────────────────

  const buildWorkingHours = () => {
    const wh = {};
    DAY_KEYS.forEach((key, i) => {
      const isClosed = !workingDays.includes(i);
      wh[key] = {
        open: isClosed ? '09:00' : openTime,
        close: isClosed ? '18:00' : closeTime,
        isClosed,
      };
    });
    return wh;
  };

  const handleSubmit = async () => {
    if (photos.length === 0) { Alert.alert('Error', 'Please add at least one salon photo'); return; }
    setLoading(true);
    try {
      setUploadingPhotos(true);
      const photoUrls = await uploadPhotos(photos);
      setUploadingPhotos(false);

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        phone: formatPhone(phone),
        email: email.trim(),
        address: address.trim(),
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        state: locationState.trim() || undefined,
        pincode: pincode.trim() || undefined,
        workingHours: buildWorkingHours(),
        photos: photoUrls,
      };
      if (latitude && longitude) {
        payload.location = { latitude, longitude };
      }
      await createSalon(payload);
    } catch (err) {
      setUploadingPhotos(false);
      Alert.alert('Error', err.message || 'Failed to register salon');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.regLogoBox}>
          <RNImage source={require('../../../assets/icon1.png')} style={styles.regLogoImg} resizeMode="contain" />
        </View>
        <Text style={styles.logo}>My Salon Bookings</Text>
        <Text style={styles.headerSub}>Register Your Salon</Text>
        <TouchableOpacity onPress={() => Alert.alert('Switch Account', 'Logout and go back to login?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: logout },
        ])} style={styles.logoutLink}>
          <Text style={styles.logoutLinkText}>Wrong account? Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {STEPS.map((label, i) => {
          const num = i + 1;
          const done = step > num;
          const active = step === num;
          return (
            <React.Fragment key={num}>
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, done && styles.stepDone, active && styles.stepActive]}>
                  {done
                    ? <Ionicons name="checkmark" size={14} color="#fff" />
                    : <Text style={[styles.stepNum, active && { color: '#2563eb' }]}>{num}</Text>}
                </View>
                <Text style={[styles.stepLabel, active && { color: '#fff', fontWeight: '700' }]} numberOfLines={1}>{label}</Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.stepLine, done && { backgroundColor: '#10b981' }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="storefront-outline" size={22} color="#2563eb" />
              <Text style={styles.cardTitle}>Basic Information</Text>
            </View>
            <Text style={styles.cardSub}>Tell us about your salon</Text>

            <Field label="Salon Name *" value={name} setter={setName} placeholder="e.g. Royal Salon" />
            <Field label="Description (optional)" value={description} setter={setDescription} placeholder="Brief description of your salon" multiline />

            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.chipsRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                    <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                      {c.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Field label="Phone Number *" value={phone} setter={setPhone} placeholder="+91 9876543210" keyboard="phone-pad" editable={!user?.phone} />
            <Field label="Email Address *" value={email} setter={setEmail} placeholder="salon@example.com" keyboard="email-address" editable={!user?.email} />
          </View>
        )}

        {/* ── Step 2: Location ── */}
        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="location-outline" size={22} color="#2563eb" />
              <Text style={styles.cardTitle}>Location</Text>
            </View>
            <Text style={styles.cardSub}>Pin your salon on the map or enter manually</Text>

            {/* GPS detect button */}
            <TouchableOpacity
              style={[styles.gpsBtn, locationLoading && { opacity: 0.6 }]}
              onPress={detectLocation}
              disabled={locationLoading}
            >
              {locationLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="navigate" size={18} color="#fff" />}
              <Text style={styles.gpsBtnText}>
                {locationLoading ? 'Detecting…' : 'Use My Current Location'}
              </Text>
            </TouchableOpacity>

            {/* Location status */}
            {!!locationStatus && (
              <View style={[
                styles.locationStatusBox,
                latitude ? { backgroundColor: '#dcfce7', borderColor: '#86efac' } : { backgroundColor: '#fef9c3', borderColor: '#fde047' },
              ]}>
                <Ionicons
                  name={latitude ? 'checkmark-circle' : 'warning-outline'}
                  size={16}
                  color={latitude ? '#16a34a' : '#d97706'}
                />
                <Text style={[styles.locationStatusText, { color: latitude ? '#15803d' : '#92400e' }]}>
                  {locationStatus}
                </Text>
              </View>
            )}

            {/* Map with draggable pin */}
            {latitude && longitude ? (
              <View style={styles.mapWrapper}>
                <WebView
                  style={styles.map}
                  originWhitelist={['*']}
                  javaScriptEnabled
                  source={{ html: buildMapHtml(latitude, longitude) }}
                  onMessage={(e) => {
                    try {
                      const { lat, lng } = JSON.parse(e.nativeEvent.data);
                      onMarkerDragEnd(lat, lng);
                    } catch {}
                  }}
                />
                <View style={styles.mapHint}>
                  <Ionicons name="move-outline" size={13} color="#6b7280" />
                  <Text style={styles.mapHintText}>Drag the pin to fine-tune your salon's exact location</Text>
                </View>
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map-outline" size={36} color="#d1d5db" />
                <Text style={styles.mapPlaceholderText}>Tap "Use My Current Location" to pin your salon on the map</Text>
              </View>
            )}

            {/* Coordinates badge */}
            {latitude && longitude && (
              <View style={styles.coordsBadge}>
                <Ionicons name="pin" size={14} color="#2563eb" />
                <Text style={styles.coordsText}>
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <Field label="Full Address *" value={address} setter={setAddress} placeholder="Street, Area, Landmark" />
            <Field label="State" value={locationState} setter={setLocationState} placeholder="Maharashtra" />
            <Field label="District" value={district} setter={setDistrict} placeholder="Mumbai Suburban" />
            <Field label="City *" value={city} setter={setCity} placeholder="Mumbai" />
            <Field label="Pincode" value={pincode} setter={setPincode} placeholder="400001" keyboard="numeric" />
          </View>
        )}

        {/* ── Step 3: Working Hours ── */}
        {step === 3 && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="time-outline" size={22} color="#2563eb" />
              <Text style={styles.cardTitle}>Working Hours</Text>
            </View>
            <Text style={styles.cardSub}>Set your salon's schedule</Text>

            <TimePicker label="Opening Time *" value={openTime} onChange={setOpenTime} />
            <TimePicker label="Closing Time *" value={closeTime} onChange={setCloseTime} />

            {/* Lunch break toggle */}
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setEnableLunch((v) => !v)}
            >
              <View style={[styles.toggle, enableLunch && styles.toggleOn]}>
                <View style={[styles.toggleThumb, enableLunch && styles.toggleThumbOn]} />
              </View>
              <Text style={styles.toggleLabel}>Enable Lunch Break</Text>
            </TouchableOpacity>

            {enableLunch && (
              <>
                <TimePicker label="Lunch Break Start" value={lunchStart} onChange={setLunchStart} optional />
                <TimePicker label="Lunch Break End" value={lunchEnd} onChange={setLunchEnd} optional />
              </>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Working Days *</Text>
              <View style={styles.daysRow}>
                {DAY_LABELS.map((d, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayChip, workingDays.includes(i) && styles.dayChipActive]}
                    onPress={() => toggleDay(i)}
                  >
                    <Text style={[styles.dayChipText, workingDays.includes(i) && styles.dayChipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── Step 4: Photos ── */}
        {step === 4 && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="camera-outline" size={22} color="#2563eb" />
              <Text style={styles.cardTitle}>Salon Photos</Text>
            </View>
            <Text style={styles.cardSub}>Add at least 1 photo · max 6</Text>

            {/* Photo grid */}
            <View style={styles.photoGrid}>
              {photos.map((uri) => (
                <View key={uri} style={styles.photoThumb}>
                  <RNImage source={{ uri }} style={styles.photoImg} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => setPhotos((prev) => prev.filter((p) => p !== uri))}
                  >
                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 6 && (
                <TouchableOpacity style={styles.photoAdd} onPress={pickPhotos}>
                  <Ionicons name="add" size={28} color="#2563eb" />
                  <Text style={styles.photoAddText}>Add Photos</Text>
                </TouchableOpacity>
              )}
            </View>

            {photos.length === 0 && (
              <View style={styles.photoHint}>
                <Ionicons name="images-outline" size={40} color="#d1d5db" />
                <Text style={styles.photoHintText}>Tap "Add Photos" to upload salon pictures</Text>
              </View>
            )}

            {/* Summary */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Registration Summary</Text>
              <SummaryRow label="Salon" value={name} />
              <SummaryRow label="Category" value={category.replace('_', ' ')} />
              <SummaryRow label="Address" value={[address, city].filter(Boolean).join(', ')} />
              <SummaryRow label="Hours" value={`${openTime} – ${closeTime}`} />
              <SummaryRow label="Days" value={`${workingDays.length} days/week`} />
              {latitude ? <SummaryRow label="Location" value={`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`} /> : null}
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
              <Text style={styles.infoText}>
                Your salon will be reviewed and approved by our team. You'll receive access once approved.
              </Text>
            </View>
          </View>
        )}

        {/* Navigation */}
        <View style={styles.navRow}>
          {step > 1 && (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnBack]}
              onPress={() => setStep((s) => s - 1)}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={16} color="#6b7280" />
              <Text style={styles.navBtnBackText}>Back</Text>
            </TouchableOpacity>
          )}
          {step < 4 ? (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnNext, step === 1 && { flex: 1 }]}
              onPress={handleNext}
            >
              <Text style={styles.navBtnNextText}>Next</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnNext, { flex: 1 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.navBtnNextText}>
                    {uploadingPhotos ? 'Uploading Photos…' : 'Submitting…'}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.navBtnNextText}>Submit for Approval</Text>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2563eb' },
  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 16, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -50 },
  decorCircle2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)', top: 10, left: -50 },
  regLogoBox: { width: 72, height: 72, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 10, shadowColor: '#1e3a8a', shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  regLogoImg: { width: 58, height: 58 },
  logo: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 2, letterSpacing: 0.3 },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginBottom: 6 },
  logoutLink: { marginTop: 4 },
  logoutLinkText: { fontSize: 12, color: '#bfdbfe', textDecorationLine: 'underline' },
  // Steps
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepDone: { backgroundColor: '#10b981' },
  stepActive: { backgroundColor: '#fff' },
  stepNum: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  stepLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 14 },
  // Body
  body: { flex: 1, backgroundColor: '#f9fafb', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 13, color: '#6b7280', marginBottom: 20 },
  // Fields
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 14, color: '#111827' },
  // Category chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, color: '#374151', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  // GPS / Location
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 13, marginBottom: 12 },
  gpsBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  locationStatusBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10 },
  locationStatusText: { fontSize: 13, flex: 1 },
  coordsBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#dbeafe', borderRadius: 8, padding: 8, marginBottom: 10 },
  coordsText: { fontSize: 12, color: '#1d4ed8', fontWeight: '600' },
  mapWrapper: { marginBottom: 10, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, overflow: 'hidden' },
  map: { height: 220 },
  mapHint: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f9fafb', paddingHorizontal: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#e5e7eb', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  mapHintText: { fontSize: 12, color: '#6b7280', flex: 1 },
  mapPlaceholder: { height: 150, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1.5, borderColor: '#d1d5db', borderStyle: 'dashed', marginBottom: 10, padding: 20 },
  mapPlaceholderText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 14 },
  // Time picker
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeDisplay: { backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, minWidth: 80, alignItems: 'center' },
  timeText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  timeBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#d1d5db', justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: '#2563eb' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  // Days
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  dayChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dayChipText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  dayChipTextActive: { color: '#fff' },
  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  photoThumb: { width: 100, height: 100, borderRadius: 10, overflow: 'visible' },
  photoImg: { width: 100, height: 100, borderRadius: 10 },
  photoRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12 },
  photoAdd: { width: 100, height: 100, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoAddText: { fontSize: 11, fontWeight: '600', color: '#2563eb' },
  photoHint: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  photoHintText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  // Summary
  summaryBox: { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#bae6fd' },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#e0f2fe' },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'right', marginLeft: 12, textTransform: 'capitalize' },
  // Info box
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#dbeafe', borderRadius: 10, padding: 12 },
  infoText: { fontSize: 13, color: '#2563eb', flex: 1, lineHeight: 18 },
  // Nav
  navRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 4, marginBottom: 16 },
  navBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 50, borderRadius: 12 },
  navBtnBack: { paddingHorizontal: 20, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff' },
  navBtnBackText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  navBtnNext: { flex: 1, backgroundColor: '#2563eb' },
  navBtnNextText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
