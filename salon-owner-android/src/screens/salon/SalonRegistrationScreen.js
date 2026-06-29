import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Image as RNImage, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useSalon } from '../../context/SalonContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const { width: W, height: H } = Dimensions.get('window');

const CATEGORIES = [
  { value: 'barber',      label: 'Barber',     icon: '✂️' },
  { value: 'hair_salon',  label: 'Hair Salon',  icon: '💇' },
  { value: 'spa',         label: 'Spa',         icon: '🧖' },
  { value: 'massage',     label: 'Massage',     icon: '💆' },
  { value: 'other',       label: 'Other',       icon: '🏪' },
];
const DAY_KEYS   = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const STEPS      = ['Basic Info','Location','Hours','Photos'];

function addMinutes(time, delta) {
  const [h, m] = time.split(':').map(Number);
  const total = ((h * 60 + m + delta) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function buildMapHtml(lat, lng) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>* { margin:0; padding:0; box-sizing:border-box; } html,body,#map { width:100%; height:100%; }</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map',{zoomControl:true}).setView([${lat},${lng}],17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);
    var marker = L.marker([${lat},${lng}],{draggable:true}).addTo(map);
    marker.bindPopup('<b>Your Business</b><br>Drag to adjust').openPopup();
    marker.on('dragend',function(){
      var p=marker.getLatLng();
      window.ReactNativeWebView.postMessage(JSON.stringify({lat:p.lat,lng:p.lng}));
    });
  </script>
</body>
</html>`;
}

function DarkField({ label, value, setter, placeholder, keyboard = 'default', multiline = false, editable = true, icon }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputRow, !editable && { opacity: 0.5 }]}>
        {icon && <Ionicons name={icon} size={17} color="#818cf8" style={s.inputIcon} />}
        <TextInput
          style={[s.input, multiline && { height: 80, textAlignVertical: 'top', paddingTop: 10, paddingBottom: 10 }]}
          value={value}
          onChangeText={setter}
          placeholder={placeholder}
          placeholderTextColor="#4b5563"
          keyboardType={keyboard}
          autoCapitalize="none"
          multiline={multiline}
          editable={editable}
        />
      </View>
    </View>
  );
}

function TimePicker({ label, value, onChange, optional }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}{optional && <Text style={{ color: '#475569', fontWeight: '400' }}> (optional)</Text>}</Text>
      <View style={s.timeRow}>
        <View style={s.timeDisplay}>
          <Text style={s.timeText}>{value}</Text>
        </View>
        <View style={s.timeControls}>
          <TouchableOpacity style={s.timeBtn} onPress={() => onChange(addMinutes(value, 60))}>
            <Ionicons name="chevron-up" size={14} color="#c4b5fd" />
          </TouchableOpacity>
          <TouchableOpacity style={s.timeBtn} onPress={() => onChange(addMinutes(value, -60))}>
            <Ionicons name="chevron-down" size={14} color="#c4b5fd" />
          </TouchableOpacity>
        </View>
        <View style={s.timeControls}>
          <TouchableOpacity style={s.timeBtnSm} onPress={() => onChange(addMinutes(value, 15))}>
            <Text style={s.timeBtnSmText}>+15m</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.timeBtnSm} onPress={() => onChange(addMinutes(value, -15))}>
            <Text style={s.timeBtnSmText}>-15m</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue}>{value || '—'}</Text>
    </View>
  );
}

export default function SalonRegistrationScreen() {
  const { createSalon }  = useSalon();
  const { user, logout } = useAuth();
  const insets           = useSafeAreaInsets();

  const [step, setStep]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Step 1
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]       = useState('barber');
  const [servedGender, setServedGender] = useState('');
  const [phone, setPhone]             = useState(user?.phone || '');
  const [email, setEmail]             = useState(user?.email || '');

  // Step 2
  const [address, setAddress]             = useState('');
  const [city, setCity]                   = useState('');
  const [district, setDistrict]           = useState('');
  const [locationState, setLocationState] = useState('');
  const [pincode, setPincode]             = useState('');
  const [latitude, setLatitude]           = useState(null);
  const [longitude, setLongitude]         = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus]   = useState('');

  // Step 3
  const [openTime, setOpenTime]       = useState('09:00');
  const [closeTime, setCloseTime]     = useState('21:00');
  const [enableLunch, setEnableLunch] = useState(false);
  const [lunchStart, setLunchStart]   = useState('13:00');
  const [lunchEnd, setLunchEnd]       = useState('14:00');
  const [workingDays, setWorkingDays] = useState([1,2,3,4,5,6]);

  // Step 4
  const [photos, setPhotos] = useState([]);

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (raw.startsWith('+')) return raw.trim();
    return `+91${digits}`;
  };

  const toggleDay = (i) =>
    setWorkingDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i].sort());

  const detectLocation = async () => {
    setLocationLoading(true);
    setLocationStatus('Requesting permission…');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationStatus('Permission denied. Enter address manually.'); return; }
      setLocationStatus('Detecting your location…');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setLatitude(lat); setLongitude(lng);
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
      setLocationStatus('Could not detect location. Enter manually.');
    } finally { setLocationLoading(false); }
  };

  const onMarkerDragEnd = async (lat, lng) => {
    setLatitude(lat); setLongitude(lng);
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (place) {
        const parts = [place.streetNumber, place.street].filter(Boolean);
        setAddress(parts.join(' ') || place.name || address);
        setLocationState(place.region || locationState);
        setDistrict(place.subregion || place.district || place.county || district);
        setCity(place.city || place.subregion || city);
        setPincode(place.postalCode || pincode);
        setLocationStatus('Pin moved! Address updated.');
      }
    } catch { setLocationStatus('Pin moved! Verify address.'); }
  };

  /* Compress a single image asset: resize to max 1920 px, re-encode JPEG 82% */
  const compressImage = async (asset) => {
    try {
      const MAX_DIM = 1920;
      const { uri, width = 0, height = 0 } = asset;
      const actions = [];
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) {
          actions.push({ resize: { width: MAX_DIM } });
        } else {
          actions.push({ resize: { height: MAX_DIM } });
        }
      }
      const result = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
      );
      return result.uri;
    } catch {
      return asset.uri; // fallback to original on error
    }
  };

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Please allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,          // pick at full quality; we compress below
      selectionLimit: 6,
      exif: false,
    });
    if (!result.canceled) {
      const slots = 6 - photos.length;
      const picked = result.assets.slice(0, slots);
      const uris = await Promise.all(picked.map(compressImage));
      setPhotos(prev => [...prev, ...uris].slice(0, 6));
    }
  };

  const uploadPhotos = async (uris) => {
    const formData = new FormData();
    uris.forEach(uri => {
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

  const buildWorkingHours = () => {
    const wh = {};
    DAY_KEYS.forEach((key, i) => {
      const isClosed = !workingDays.includes(i);
      wh[key] = { open: isClosed ? '09:00' : openTime, close: isClosed ? '18:00' : closeTime, isClosed };
    });
    return wh;
  };

  const validateStep1 = () => {
    if (!name.trim() || name.trim().length < 3) { Alert.alert('Error', 'Business name must be at least 3 characters'); return false; }
    if (!servedGender) { Alert.alert('Error', 'Please select who your business serves'); return false; }
    if (!phone.trim()) { Alert.alert('Error', 'Phone number is required'); return false; }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { Alert.alert('Error', 'Valid email is required'); return false; }
    return true;
  };
  const validateStep2 = () => {
    if (!address.trim() || address.trim().length < 5) { Alert.alert('Error', 'Full address is required'); return false; }
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
    setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (photos.length === 0) { Alert.alert('Error', 'Please add at least one business photo'); return; }
    setLoading(true);
    try {
      setUploadingPhotos(true);
      const photoUrls = await uploadPhotos(photos);
      setUploadingPhotos(false);
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        servedGender: servedGender || 'unisex',
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
      if (latitude && longitude) payload.location = { latitude, longitude };
      await createSalon(payload);
    } catch (err) {
      setUploadingPhotos(false);
      Alert.alert('Error', err.message || 'Failed to register business');
    } finally { setLoading(false); }
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      <View style={s.orb1} />
      <View style={s.orb2} />
      <View style={s.orb3} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 14 }]}>
          <View style={s.logoCircle}>
            <RNImage source={require('../../../assets/Icon-1024.png')} style={s.logoImg} resizeMode="contain" />
          </View>
          <Text style={s.appName}>GlowLoox</Text>
          <View style={s.pillBadge}>
            <View style={s.pillDot} />
            <Text style={s.pillText}>Business Registration</Text>
          </View>
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={() => Alert.alert('Switch Account', 'Logout and go back to login?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: logout },
            ])}
          >
            <Ionicons name="log-out-outline" size={13} color="#818cf8" />
            <Text style={s.logoutText}>Wrong account? Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Step indicator */}
        <View style={s.stepRow}>
          {STEPS.map((label, i) => {
            const num    = i + 1;
            const done   = step > num;
            const active = step === num;
            return (
              <React.Fragment key={num}>
                <View style={s.stepItem}>
                  <View style={[s.stepDot, done && s.stepDotDone, active && s.stepDotActive]}>
                    {done
                      ? <Ionicons name="checkmark" size={13} color="#fff" />
                      : <Text style={[s.stepNum, active && s.stepNumActive]}>{num}</Text>
                    }
                  </View>
                  <Text style={[s.stepLabel, active && s.stepLabelActive]}>{label}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={[s.stepLine, done && s.stepLineDone]} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* Body */}
        <ScrollView
          style={s.body}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <View style={s.card}>
              <View style={s.cardTitleRow}>
                <View style={s.cardIconBadge}>
                  <Ionicons name="storefront-outline" size={18} color="#818cf8" />
                </View>
                <View>
                  <Text style={s.cardTitle}>Basic Information</Text>
                  <Text style={s.cardSub}>Tell us about your business</Text>
                </View>
              </View>

              <DarkField label="Business Name *" value={name} setter={setName} placeholder="e.g. Royal Salon" icon="storefront-outline" />
              <DarkField label="Description (optional)" value={description} setter={setDescription} placeholder="Brief description of your business" multiline icon="document-text-outline" />

              <View style={s.field}>
                <Text style={s.label}>Category</Text>
                <View style={s.chipsRow}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity
                      key={c.value}
                      style={[s.chip, category === c.value && s.chipActive]}
                      onPress={() => setCategory(c.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.chipEmoji}>{c.icon}</Text>
                      <Text style={[s.chipText, category === c.value && s.chipTextActive]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* ── Who Do You Serve? ── */}
              <View style={s.serveCard}>
                <View style={s.serveTitleRow}>
                  <View style={s.serveIconBadge}>
                    <Text style={{ fontSize: 16 }}>💈</Text>
                  </View>
                  <View>
                    <Text style={s.serveTitle}>Who Do You Serve? *</Text>
                    <Text style={s.serveSub}>Select the clients your business caters to</Text>
                  </View>
                </View>
                <View style={s.serveGrid}>
                  {[
                    { value: 'male',   label: 'Male',   icon: '♂',  desc: 'Men only'   },
                    { value: 'female', label: 'Female', icon: '♀',  desc: 'Women only' },
                    { value: 'unisex', label: 'Unisex', icon: '⚥',  desc: 'Everyone'  },
                  ].map(opt => {
                    const active = servedGender === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[s.serveChip, active && s.serveChipActive]}
                        onPress={() => setServedGender(opt.value)}
                        activeOpacity={0.8}
                      >
                        {active && (
                          <View style={s.serveCheck}>
                            <Ionicons name="checkmark" size={10} color="#fff" />
                          </View>
                        )}
                        <Text style={s.serveChipIcon}>{opt.icon}</Text>
                        <Text style={[s.serveChipLabel, active && s.serveChipLabelActive]}>{opt.label}</Text>
                        <Text style={s.serveChipDesc}>{opt.desc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {servedGender !== '' && (
                  <View style={s.serveSelected}>
                    <Ionicons name="checkmark-circle" size={14} color="#818cf8" />
                    <Text style={s.serveSelectedText}>
                      Serving {servedGender === 'male' ? 'Men only' : servedGender === 'female' ? 'Women only' : 'Everyone (Unisex)'}
                    </Text>
                  </View>
                )}
              </View>

              <DarkField label="Phone Number *" value={phone} setter={setPhone} placeholder="+91 9876543210" keyboard="phone-pad" icon="call-outline" editable={!user?.phone} />
              <DarkField label="Email Address *" value={email} setter={setEmail} placeholder="business@example.com" keyboard="email-address" icon="mail-outline" editable={!user?.email} />
            </View>
          )}

          {/* ── Step 2: Location ── */}
          {step === 2 && (
            <View style={s.card}>
              <View style={s.cardTitleRow}>
                <View style={s.cardIconBadge}>
                  <Ionicons name="location-outline" size={18} color="#818cf8" />
                </View>
                <View>
                  <Text style={s.cardTitle}>Location</Text>
                  <Text style={s.cardSub}>Pin your business on the map</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[s.gpsBtn, locationLoading && { opacity: 0.6 }]}
                onPress={detectLocation}
                disabled={locationLoading}
                activeOpacity={0.85}
              >
                {locationLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="navigate" size={18} color="#fff" />
                }
                <Text style={s.gpsBtnText}>{locationLoading ? 'Detecting…' : 'Use My Current Location'}</Text>
              </TouchableOpacity>

              {!!locationStatus && (
                <View style={[s.statusBox, latitude ? s.statusBoxSuccess : s.statusBoxWarn]}>
                  <Ionicons name={latitude ? 'checkmark-circle' : 'warning-outline'} size={15} color={latitude ? '#4ade80' : '#fbbf24'} />
                  <Text style={[s.statusText, { color: latitude ? '#4ade80' : '#fbbf24' }]}>{locationStatus}</Text>
                </View>
              )}

              {latitude && longitude ? (
                <View style={s.mapWrapper}>
                  <WebView
                    style={s.map}
                    originWhitelist={['*']}
                    javaScriptEnabled
                    source={{ html: buildMapHtml(latitude, longitude) }}
                    onMessage={e => {
                      try { const { lat, lng } = JSON.parse(e.nativeEvent.data); onMarkerDragEnd(lat, lng); } catch {}
                    }}
                  />
                  <View style={s.mapHint}>
                    <Ionicons name="move-outline" size={12} color="#818cf8" />
                    <Text style={s.mapHintText}>Drag the pin to fine-tune your business's exact location</Text>
                  </View>
                </View>
              ) : (
                <View style={s.mapPlaceholder}>
                  <Ionicons name="map-outline" size={36} color="#4b5563" />
                  <Text style={s.mapPlaceholderText}>Tap "Use My Current Location" to pin your business on the map</Text>
                </View>
              )}

              {latitude && longitude && (
                <View style={s.coordsBadge}>
                  <Ionicons name="pin" size={13} color="#818cf8" />
                  <Text style={s.coordsText}>{latitude.toFixed(6)}, {longitude.toFixed(6)}</Text>
                </View>
              )}

              <View style={s.sectionDivider} />

              <DarkField label="Full Address *" value={address} setter={setAddress} placeholder="Street, Area, Landmark" icon="home-outline" />
              <DarkField label="State" value={locationState} setter={setLocationState} placeholder="Maharashtra" icon="flag-outline" />
              <DarkField label="District" value={district} setter={setDistrict} placeholder="Mumbai Suburban" icon="business-outline" />
              <DarkField label="City *" value={city} setter={setCity} placeholder="Mumbai" icon="location-outline" />
              <DarkField label="Pincode" value={pincode} setter={setPincode} placeholder="400001" keyboard="numeric" icon="barcode-outline" />
            </View>
          )}

          {/* ── Step 3: Working Hours ── */}
          {step === 3 && (
            <View style={s.card}>
              <View style={s.cardTitleRow}>
                <View style={s.cardIconBadge}>
                  <Ionicons name="time-outline" size={18} color="#818cf8" />
                </View>
                <View>
                  <Text style={s.cardTitle}>Working Hours</Text>
                  <Text style={s.cardSub}>Set your business's schedule</Text>
                </View>
              </View>

              <TimePicker label="Opening Time *" value={openTime} onChange={setOpenTime} />
              <TimePicker label="Closing Time *" value={closeTime} onChange={setCloseTime} />

              <TouchableOpacity style={s.toggleRow} onPress={() => setEnableLunch(v => !v)} activeOpacity={0.8}>
                <View style={[s.toggle, enableLunch && s.toggleOn]}>
                  <View style={[s.toggleThumb, enableLunch && s.toggleThumbOn]} />
                </View>
                <Text style={s.toggleLabel}>Enable Lunch Break</Text>
              </TouchableOpacity>

              {enableLunch && (
                <>
                  <TimePicker label="Lunch Start" value={lunchStart} onChange={setLunchStart} optional />
                  <TimePicker label="Lunch End" value={lunchEnd} onChange={setLunchEnd} optional />
                </>
              )}

              <View style={s.field}>
                <Text style={s.label}>Working Days *</Text>
                <View style={s.daysRow}>
                  {DAY_LABELS.map((d, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.dayChip, workingDays.includes(i) && s.dayChipActive]}
                      onPress={() => toggleDay(i)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.dayChipText, workingDays.includes(i) && s.dayChipTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ── Step 4: Photos ── */}
          {step === 4 && (
            <View style={s.card}>
              <View style={s.cardTitleRow}>
                <View style={s.cardIconBadge}>
                  <Ionicons name="camera-outline" size={18} color="#818cf8" />
                </View>
                <View>
                  <Text style={s.cardTitle}>Business Photos</Text>
                  <Text style={s.cardSub}>At least 1 photo · max 6</Text>
                </View>
              </View>

              <View style={s.photoGrid}>
                {photos.map(uri => (
                  <View key={uri} style={s.photoThumb}>
                    <RNImage source={{ uri }} style={s.photoImg} />
                    <TouchableOpacity
                      style={s.photoRemove}
                      onPress={() => setPhotos(prev => prev.filter(p => p !== uri))}
                    >
                      <Ionicons name="close-circle" size={22} color="#f87171" />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 6 && (
                  <TouchableOpacity style={s.photoAdd} onPress={pickPhotos} activeOpacity={0.8}>
                    <Ionicons name="add" size={28} color="#818cf8" />
                    <Text style={s.photoAddText}>Add Photos</Text>
                  </TouchableOpacity>
                )}
              </View>

              {photos.length === 0 && (
                <View style={s.photoEmptyHint}>
                  <Ionicons name="images-outline" size={40} color="#374151" />
                  <Text style={s.photoEmptyText}>Tap "Add Photos" to upload business pictures</Text>
                </View>
              )}

              <View style={s.summaryBox}>
                <Text style={s.summaryTitle}>Registration Summary</Text>
                <SummaryRow label="Business" value={name} />
                <SummaryRow label="Category" value={category.replace('_', ' ')} />
                <SummaryRow label="Address" value={[address, city].filter(Boolean).join(', ')} />
                <SummaryRow label="Hours" value={`${openTime} – ${closeTime}`} />
                <SummaryRow label="Days open" value={`${workingDays.length} days / week`} />
                {latitude ? <SummaryRow label="Coordinates" value={`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`} /> : null}
              </View>

              <View style={s.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color="#818cf8" />
                <Text style={s.infoText}>
                  Your salon will be reviewed by our team. You'll receive full access once approved.
                </Text>
              </View>
            </View>
          )}

          {/* Navigation */}
          <View style={s.navRow}>
            {step > 1 && (
              <TouchableOpacity style={s.navBtnBack} onPress={() => setStep(prev => prev - 1)} disabled={loading} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={16} color="#818cf8" />
                <Text style={s.navBtnBackText}>Back</Text>
              </TouchableOpacity>
            )}
            {step < 4 ? (
              <TouchableOpacity style={[s.navBtnNext, step === 1 && { flex: 1 }]} onPress={handleNext} activeOpacity={0.88}>
                <Text style={s.navBtnNextText}>Next</Text>
                <View style={s.navArrow}>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[s.navBtnNext, { flex: 1 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.88}>
                {loading ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={[s.navBtnNextText, { marginLeft: 10 }]}>
                      {uploadingPhotos ? 'Uploading Photos…' : 'Submitting…'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={s.navBtnNextText}>Submit for Approval</Text>
                    <View style={s.navArrow}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07071a', overflow: 'hidden' },

  orb1: {
    position: 'absolute', width: W * 0.85, height: W * 0.85,
    borderRadius: W * 0.425, backgroundColor: '#4f46e5',
    top: -W * 0.3, left: -W * 0.18, opacity: 0.35,
  },
  orb2: {
    position: 'absolute', width: W * 0.6, height: W * 0.6,
    borderRadius: W * 0.3, backgroundColor: '#7c3aed',
    top: H * 0.05, right: -W * 0.2, opacity: 0.22,
  },
  orb3: {
    position: 'absolute', width: W * 0.5, height: W * 0.5,
    borderRadius: W * 0.25, backgroundColor: '#2563eb',
    bottom: H * 0.1, left: -W * 0.15, opacity: 0.12,
  },

  header: { alignItems: 'center', paddingBottom: 14, paddingHorizontal: 20 },
  logoCircle: {
    width: W * 0.20, height: W * 0.20, borderRadius: W * 0.10,
    backgroundColor: '#0d0d2b', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 8,
    borderWidth: 2, borderColor: 'rgba(56,189,248,0.5)',
    shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  logoImg: { width: W * 0.45, height: W * 0.45 },
  appName: { fontSize: 17, fontWeight: '800', color: '#f1f5f9', letterSpacing: 0.3, marginBottom: 8 },
  pillBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, marginBottom: 10,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#a78bfa' },
  pillText: { fontSize: 11, fontWeight: '700', color: '#c4b5fd', letterSpacing: 1, textTransform: 'uppercase' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  logoutText: { fontSize: 12, color: '#818cf8', fontWeight: '500' },

  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 12 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(99,102,241,0.08)', marginBottom: 4,
  },
  stepDotActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  stepDotDone:   { backgroundColor: '#10b981', borderColor: '#10b981' },
  stepNum: { fontSize: 12, fontWeight: '800', color: '#475569' },
  stepNumActive: { color: '#fff' },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(99,102,241,0.18)', marginBottom: 18 },
  stepLineDone: { backgroundColor: '#10b981' },
  stepLabel: { fontSize: 10, color: '#475569', fontWeight: '500', textAlign: 'center' },
  stepLabelActive: { color: '#a78bfa', fontWeight: '700' },

  body: { flex: 1 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, padding: 22, marginBottom: 16,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  cardIconBadge: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#f1f5f9' },
  cardSub:   { fontSize: 12, color: '#64748b', marginTop: 1 },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 7 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 12, paddingHorizontal: 14, minHeight: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#f1f5f9' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.25)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: { backgroundColor: 'rgba(99,102,241,0.25)', borderColor: '#6366f1' },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  chipTextActive: { color: '#c4b5fd', fontWeight: '700' },

  /* ── Who Do You Serve card ── */
  serveCard: {
    backgroundColor: 'rgba(99,102,241,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.28)',
    borderRadius: 16, padding: 18, marginBottom: 4,
  },
  serveTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  serveIconBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  serveTitle: { fontSize: 15, fontWeight: '700', color: '#e0e7ff' },
  serveSub:   { fontSize: 12, color: '#6b7280', marginTop: 1 },
  serveGrid:  { flexDirection: 'row', gap: 10 },
  serveChip: {
    flex: 1, borderWidth: 2, borderColor: 'rgba(99,102,241,0.25)',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 6,
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)',
    position: 'relative',
  },
  serveChipActive: {
    backgroundColor: 'rgba(99,102,241,0.22)', borderColor: '#6366f1',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  serveCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#6366f1',
    alignItems: 'center', justifyContent: 'center',
  },
  serveChipIcon:  { fontSize: 28, marginBottom: 6 },
  serveChipLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  serveChipLabelActive: { color: '#a5b4fc' },
  serveChipDesc:  { fontSize: 10, color: '#4b5563', marginTop: 2 },
  serveSelected: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, backgroundColor: 'rgba(99,102,241,0.12)',
    borderRadius: 8, padding: 9, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
  },
  serveSelectedText: { fontSize: 13, color: '#818cf8', fontWeight: '600' },

  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#6366f1', borderRadius: 13,
    paddingVertical: 14, marginBottom: 12,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 6,
  },
  gpsBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statusBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10,
  },
  statusBoxSuccess: { backgroundColor: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.3)' },
  statusBoxWarn:    { backgroundColor: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.3)' },
  statusText: { fontSize: 12, flex: 1, lineHeight: 17 },
  mapWrapper: {
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 14, overflow: 'hidden', marginBottom: 10,
  },
  map: { height: 210 },
  mapHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(99,102,241,0.08)',
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(99,102,241,0.2)',
  },
  mapHintText: { fontSize: 11, color: '#818cf8', flex: 1 },
  mapPlaceholder: {
    height: 130, alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14, borderWidth: 1.5,
    borderColor: 'rgba(99,102,241,0.2)', borderStyle: 'dashed', marginBottom: 10,
  },
  mapPlaceholderText: { fontSize: 13, color: '#4b5563', textAlign: 'center', lineHeight: 20 },
  coordsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderRadius: 8, padding: 8, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
  },
  coordsText: { fontSize: 12, color: '#a78bfa', fontWeight: '600' },
  sectionDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 14 },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeDisplay: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)',
    minWidth: 90, alignItems: 'center',
  },
  timeText: { fontSize: 22, fontWeight: '800', color: '#c4b5fd' },
  timeControls: { gap: 4 },
  timeBtn: {
    width: 36, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  timeBtnSm: {
    paddingHorizontal: 8, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  timeBtnSmText: { fontSize: 10, color: '#a78bfa', fontWeight: '700' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', paddingHorizontal: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  toggleOn:      { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  toggleThumb:   { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleLabel:   { fontSize: 14, fontWeight: '600', color: '#cbd5e1' },

  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.25)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dayChipActive:     { backgroundColor: 'rgba(99,102,241,0.3)', borderColor: '#6366f1' },
  dayChipText:       { fontSize: 11, fontWeight: '600', color: '#64748b' },
  dayChipTextActive: { color: '#c4b5fd' },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  photoThumb:  { width: 100, height: 100, borderRadius: 12, overflow: 'visible' },
  photoImg:    { width: 100, height: 100, borderRadius: 12 },
  photoRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: '#07071a', borderRadius: 12 },
  photoAdd: {
    width: 100, height: 100, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  photoAddText:   { fontSize: 11, fontWeight: '600', color: '#818cf8' },
  photoEmptyHint: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  photoEmptyText: { fontSize: 13, color: '#4b5563', textAlign: 'center' },

  summaryBox: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
  },
  summaryTitle: {
    fontSize: 11, fontWeight: '800', color: '#818cf8',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderTopWidth: 1, borderTopColor: 'rgba(99,102,241,0.15)',
  },
  summaryLabel: { fontSize: 13, color: '#64748b' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#e2e8f0', flex: 1, textAlign: 'right', marginLeft: 12, textTransform: 'capitalize' },

  infoBox: {
    flexDirection: 'row', gap: 10,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
  },
  infoText: { fontSize: 13, color: '#94a3b8', flex: 1, lineHeight: 19 },

  navRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  navBtnBack: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 52, paddingHorizontal: 20, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  navBtnBackText: { fontSize: 14, fontWeight: '600', color: '#818cf8' },
  navBtnNext: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 14, backgroundColor: '#6366f1',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 8,
  },
  navBtnNextText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.3, flex: 1, textAlign: 'center' },
  navArrow: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
});
