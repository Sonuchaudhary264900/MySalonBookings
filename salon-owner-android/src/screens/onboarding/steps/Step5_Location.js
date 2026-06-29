import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useOnboarding } from '../../../context/OnboardingContext';

const { width: W } = Dimensions.get('window');

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];

function buildMapHtml(lat, lng) {
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box;}html,body,#map{width:100%;height:100%;}</style>
</head><body><div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true}).setView([${lat},${lng}],17);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM',maxZoom:19}).addTo(map);
var mk=L.marker([${lat},${lng}],{draggable:true}).addTo(map);
mk.bindPopup('<b>Your Business</b><br>Drag to adjust').openPopup();
mk.on('dragend',function(){var p=mk.getLatLng();window.ReactNativeWebView.postMessage(JSON.stringify({lat:p.lat,lng:p.lng}));});
</script></body></html>`;
}

export default function Step5_Location() {
  const {
    lat, setLat, lng, setLng,
    address, setAddress,
    city, setCity,
    district, setDistrict,
    stateName, setStateName,
    pincode, setPincode,
    nextStep,
  } = useOnboarding();

  const [gpsLoading, setGpsLoading]   = useState(false);
  const [accuracy, setAccuracy]       = useState(null);
  const [showStates, setShowStates]   = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [error, setError]             = useState('');
  const webRef                        = useRef(null);

  const getGps = async () => {
    setGpsLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Location permission is required.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      setAccuracy(Math.round(loc.coords.accuracy));
      setLat(latitude);
      setLng(longitude);
      // Reverse geocode
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo && geo[0]) {
        const g = geo[0];
        if (g.street || g.name)    setAddress(`${g.name || ''} ${g.street || ''}`.trim());
        if (g.city || g.district)  setCity(g.city || g.district || '');
        if (g.subregion)            setDistrict(g.subregion);
        if (g.region)               setStateName(g.region);
        if (g.postalCode)           setPincode(g.postalCode);
      }
    } catch (e) {
      setError('Could not get location. Check GPS settings.');
    } finally { setGpsLoading(false); }
  };

  const onMapMessage = async (event) => {
    try {
      const { lat: newLat, lng: newLng } = JSON.parse(event.nativeEvent.data);
      setLat(newLat);
      setLng(newLng);
      // Reverse geocode from dragged marker
      const geo = await Location.reverseGeocodeAsync({ latitude: newLat, longitude: newLng });
      if (geo && geo[0]) {
        const g = geo[0];
        if (g.street || g.name)    setAddress(`${g.name || ''} ${g.street || ''}`.trim());
        if (g.city || g.district)  setCity(g.city || g.district || '');
        if (g.subregion)            setDistrict(g.subregion);
        if (g.region)               setStateName(g.region);
        if (g.postalCode)           setPincode(g.postalCode);
      }
    } catch {}
  };

  const handleNext = () => {
    if (!address.trim()) { setError('Please enter or detect your address'); return; }
    if (!city.trim()) { setError('Please enter your city'); return; }
    setError('');
    nextStep();
  };

  const filteredStates = INDIAN_STATES.filter(st => st.toLowerCase().includes(stateSearch.toLowerCase()));

  const accuracyColor = accuracy === null ? '#6b7280' : accuracy <= 15 ? '#22c55e' : accuracy <= 50 ? '#f59e0b' : '#ef4444';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Salon Location</Text>
        <Text style={s.sub}>Help customers find you easily</Text>

        {/* GPS Button */}
        <TouchableOpacity style={s.gpsBtn} onPress={getGps} disabled={gpsLoading} activeOpacity={0.8}>
          {gpsLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Ionicons name="locate" size={20} color="#fff" />
          }
          <Text style={s.gpsBtnText}>{gpsLoading ? 'Detecting...' : 'Detect My Location'}</Text>
          {accuracy !== null && (
            <View style={[s.accuracyBadge, { backgroundColor: accuracyColor }]}>
              <Text style={s.accuracyText}>±{accuracy}m</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Map */}
        <View style={s.mapWrap}>
          <WebView
            ref={webRef}
            source={{ html: buildMapHtml(lat, lng) }}
            style={{ flex: 1, borderRadius: 14 }}
            onMessage={onMapMessage}
            javaScriptEnabled
            scrollEnabled={false}
          />
          <View style={s.mapHint}>
            <Ionicons name="hand-left-outline" size={12} color="#94a3b8" />
            <Text style={s.mapHintText}>Drag pin to adjust exact location</Text>
          </View>
        </View>

        {/* Address fields */}
        <Field label="Street Address *" value={address} onChange={setAddress} placeholder="Building, street name" icon="location-outline" />
        <Field label="City *" value={city} onChange={setCity} placeholder="e.g. Mumbai" icon="business-outline" />
        <Field label="District" value={district} onChange={setDistrict} placeholder="e.g. Andheri West" icon="map-outline" />

        {/* State picker */}
        <View style={s.field}>
          <Text style={s.label}>State</Text>
          <TouchableOpacity style={s.row} onPress={() => setShowStates(!showStates)}>
            <Ionicons name="flag-outline" size={16} color="#818cf8" style={s.ic} />
            <Text style={[s.rowText, !stateName && { color: '#4b5563' }]}>{stateName || 'Select state...'}</Text>
            <Ionicons name={showStates ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
          </TouchableOpacity>
          {showStates && (
            <View style={s.dropdown}>
              <View style={s.searchRow}>
                <Ionicons name="search-outline" size={15} color="#6b7280" />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search state..."
                  placeholderTextColor="#4b5563"
                  value={stateSearch}
                  onChangeText={setStateSearch}
                />
              </View>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {filteredStates.map(st => (
                  <TouchableOpacity key={st} style={s.dropItem} onPress={() => { setStateName(st); setShowStates(false); setStateSearch(''); }}>
                    <Text style={[s.dropText, stateName === st && s.dropTextOn]}>{st}</Text>
                    {stateName === st && <Ionicons name="checkmark" size={14} color="#818cf8" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <Field label="Pincode" value={pincode} onChange={setPincode} placeholder="e.g. 400001" icon="barcode-outline" keyboard="number-pad" maxLength={6} />

        {!!error && <Text style={s.err}>{error}</Text>}

        <TouchableOpacity style={s.btn} onPress={handleNext} activeOpacity={0.88}>
          <Text style={s.btnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, icon, keyboard = 'default', maxLength }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.row}>
        {icon && <Ionicons name={icon} size={16} color="#818cf8" style={s.ic} />}
        <TextInput
          style={s.rowInp}
          placeholder={placeholder}
          placeholderTextColor="#4b5563"
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard}
          maxLength={maxLength}
          autoCapitalize="sentences"
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:        { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 32 },
  title:         { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 6 },
  sub:           { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  gpsBtn:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#4f46e5', borderRadius: 14, height: 50, paddingHorizontal: 18, marginBottom: 16 },
  gpsBtnText:    { flex: 1, fontSize: 14, fontWeight: '700', color: '#fff' },
  accuracyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  accuracyText:  { fontSize: 11, color: '#fff', fontWeight: '700' },
  mapWrap:       { height: W * 0.55, borderRadius: 14, overflow: 'hidden', marginBottom: 6, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  mapHint:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18, paddingHorizontal: 4 },
  mapHintText:   { fontSize: 11, color: '#475569' },
  field:         { marginBottom: 14 },
  label:         { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 7 },
  row:           { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 14, paddingHorizontal: 14, height: 50, backgroundColor: 'rgba(255,255,255,0.05)' },
  ic:            { marginRight: 10 },
  rowInp:        { flex: 1, fontSize: 15, color: '#f1f5f9' },
  rowText:       { flex: 1, fontSize: 15, color: '#f1f5f9' },
  dropdown:      { borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 12, backgroundColor: '#0f0f2b', marginTop: 4, overflow: 'hidden' },
  searchRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  searchInput:   { flex: 1, fontSize: 14, color: '#f1f5f9' },
  dropItem:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  dropText:      { fontSize: 14, color: '#cbd5e1' },
  dropTextOn:    { color: '#818cf8', fontWeight: '700' },
  err:           { fontSize: 13, color: '#f87171', marginBottom: 12, textAlign: 'center' },
  btn:           { backgroundColor: '#6366f1', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnText:       { color: '#fff', fontSize: 16, fontWeight: '800' },
});
