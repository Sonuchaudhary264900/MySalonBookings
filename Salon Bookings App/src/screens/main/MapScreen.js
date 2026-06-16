import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

const salonLat = (s) => s.location?.coordinates?.[1];
const salonLng = (s) => s.location?.coordinates?.[0];

export default function MapScreen() {
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation();
  const webRef = useRef(null);

  const [coords, setCoords] = useState(null);
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSalons = useCallback(async (lat, lng) => {
    try {
      const r = await api.get(`/public/salons/nearby?latitude=${lat}&longitude=${lng}`);
      setSalons(r.data.data?.salons || []);
    } catch {
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      let c = INDIA_CENTER;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          c = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        }
      } catch { /* fallback */ }
      setCoords(c);
      fetchSalons(c.lat, c.lng);
    })();
  }, [fetchSalons]);

  const openSalon = (id) => {
    navigation.navigate(isAuthenticated ? 'SalonDetails' : 'GuestSalonDetails', { salonId: id });
  };

  const onMessage = (e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'salon' && data.id) openSalon(data.id);
    } catch { /* ignore */ }
  };

  const center = coords || INDIA_CENTER;
  const pins = salons
    .filter(s => salonLat(s) != null && salonLng(s) != null)
    .map(s => ({
      id: s._id,
      lat: salonLat(s),
      lng: salonLng(s),
      name: (s.name || 'Salon').replace(/'/g, "\\'"),
      rating: s.averageRating ? Number(s.averageRating).toFixed(1) : '',
      locality: (s.locality || s.city || '').replace(/'/g, "\\'"),
    }));

  const tile = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0;background:${isDark ? '#0f172a' : '#f9fafb'}}
.uloc{width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.3)}
.spin{position:absolute;top:50%;left:50%}</style>
</head><body><div id="map"></div><script>
var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${center.lat},${center.lng}], 13);
L.tileLayer('${tile}',{maxZoom:19,subdomains:'abcd'}).addTo(map);
var uIcon = L.divIcon({className:'',html:'<div class="uloc"></div>',iconSize:[16,16],iconAnchor:[8,8]});
L.marker([${center.lat},${center.lng}],{icon:uIcon}).addTo(map);
var pins = ${JSON.stringify(pins)};
var bounds = [[${center.lat},${center.lng}]];
pins.forEach(function(p){
  var icon = L.divIcon({className:'',html:'<div style="background:#6366f1;color:#fff;border:2px solid #fff;border-radius:14px 14px 14px 2px;padding:4px 8px;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap">'+(p.rating?('★ '+p.rating):'✂')+'</div>',iconSize:[null,null],iconAnchor:[12,24]});
  var m = L.marker([p.lat,p.lng],{icon:icon}).addTo(map);
  m.bindPopup('<b>'+p.name+'</b>'+(p.locality?('<br/><span style=\\'color:#888\\'>'+p.locality+'</span>'):'')+'<br/><a href="#" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'salon\\',id:\\''+p.id+'\\'}));return false;" style="color:#6366f1;font-weight:700">View salon →</a>');
  bounds.push([p.lat,p.lng]);
});
if(pins.length>0){ try{ map.fitBounds(bounds,{padding:[50,50],maxZoom:14}); }catch(e){} }
</script></body></html>`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <AppText style={[styles.headerTitle, { color: theme.text }]}>Salons Near You</AppText>
          <AppText style={[styles.headerSub, { color: theme.subText }]}>
            {loading ? 'Locating…' : `${pins.length} salon${pins.length !== 1 ? 's' : ''} on map`}
          </AppText>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
        ) : (
          <WebView
            ref={webRef}
            source={{ html }}
            originWhitelist={['*']}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            style={{ flex: 1, backgroundColor: theme.bg }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 1 },
});
