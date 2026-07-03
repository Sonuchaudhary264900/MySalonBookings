import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, Image, Linking, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

const salonLat = (s) => s.location?.coordinates?.[1];
const salonLng = (s) => s.location?.coordinates?.[0];

function fmtDist(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`; }
function fmtDur(sec) {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} hr ${min % 60} min`;
}

function bizDist(s, userLat, userLng) {
  if (typeof s.distance === 'number') return s.distance;
  if (!userLat || !salonLat(s)) return null;
  const R = 6371000;
  const dLat = (salonLat(s) - userLat) * Math.PI / 180;
  const dLng = (salonLng(s) - userLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(salonLat(s) * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getOpenStatus(salon) {
  const wh = salon.workingHours;
  if (!wh) return null;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const h = wh[today];
  if (!h || h.closed || h.isClosed) return { open: false, label: 'Closed today' };
  const toMin = (t) => { const [hh, mm] = (t || '00:00').split(':').map(Number); return hh * 60 + mm; };
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const openMin = toMin(h.open || h.openTime);
  const closeMin = toMin(h.close || h.closeTime || h.end);
  if (nowMin >= openMin && nowMin < closeMin) {
    const ch = Math.floor(closeMin / 60); const cm = closeMin % 60;
    const ampm = ch >= 12 ? 'PM' : 'AM';
    return { open: true, label: `Open · closes ${ch % 12 || 12}:${String(cm).padStart(2, '0')} ${ampm}` };
  }
  return { open: false, label: 'Closed now' };
}

function StarRow({ rating }) {
  const stars = Math.round(rating || 0);
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons key={i} name={i <= stars ? 'star' : 'star-outline'} size={12} color="#fbbf24" />
      ))}
    </View>
  );
}

export default function MapScreen() {
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const webRef = useRef(null);
  const coordsRef = useRef(null);
  const headingSubRef = useRef(null);
  const posSubRef = useRef(null);
  const autoRoutedRef = useRef(false);
  const mapReadyFlag = useRef(false);

  const [coords, setCoords] = useState(null);
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [followMode, setFollowMode] = useState(false);
  const [compassActive, setCompassActive] = useState(false);
  const [selected, setSelected] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const readyTimerRef = useRef(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const inject = useCallback((js) => {
    webRef.current?.injectJavaScript(js + '; true;');
  }, []);

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

  // Initial location + live GPS watch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let c = INDIA_CENTER;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          c = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          // Live position updates → feed the map
          posSubRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 1500, distanceInterval: 3 },
            (p) => {
              if (cancelled) return;
              const nc = { lat: p.coords.latitude, lng: p.coords.longitude };
              coordsRef.current = nc;
              setCoords(nc);
              webRef.current?.injectJavaScript(
                `window.updateUser && updateUser(${nc.lat},${nc.lng},${p.coords.accuracy || 0}); true;`
              );
            }
          );
        }
      } catch { /* fallback */ }
      if (cancelled) return;
      coordsRef.current = c;
      setCoords(c);
      fetchSalons(c.lat, c.lng);
    })();
    return () => {
      cancelled = true;
      posSubRef.current?.remove();
      headingSubRef.current?.remove();
    };
  }, [fetchSalons]);

  // Compass toggle → live heading cone
  const toggleCompass = useCallback(async () => {
    if (compassActive) {
      headingSubRef.current?.remove();
      headingSubRef.current = null;
      setCompassActive(false);
      inject('window.setHeading && setHeading(null)');
      return;
    }
    try {
      headingSubRef.current = await Location.watchHeadingAsync((h) => {
        const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        webRef.current?.injectJavaScript(`window.setHeading && setHeading(${deg}); true;`);
      });
      setCompassActive(true);
    } catch { /* no sensor */ }
  }, [compassActive, inject]);

  // Follow mode: center on user, keep centered on updates
  const handleLocate = useCallback(() => {
    const c = coordsRef.current;
    if (!c) return;
    setFollowMode(true);
    inject(`window.setFollow && setFollow(true); map.setView([${c.lat},${c.lng}], 16, {animate:true})`);
  }, [inject]);

  const openSalon = (id) => {
    navigation.navigate(isAuthenticated ? 'SalonDetails' : 'GuestSalonDetails', { salonId: id });
  };

  // OSRM in-map routing (same as web, Google Maps fallback)
  const fetchRoute = useCallback(async (salon) => {
    const from = coordsRef.current;
    const toLat = salonLat(salon); const toLng = salonLng(salon);
    if (!from || toLat == null) return;
    setRouteLoading(true);
    setRouteData(null);
    setSelected(null);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${toLng},${toLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const json = await res.json();
      const r = json.routes?.[0];
      if (!r) throw new Error('no route');
      const polyline = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      setRouteData({ distance: r.distance, duration: r.duration, salonName: salon.name, destLat: toLat, destLng: toLng });
      inject(`window.drawRoute && drawRoute(${JSON.stringify(polyline)}, ${toLat}, ${toLng})`);
    } catch {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${toLat},${toLng}&travelmode=driving`);
    } finally {
      setRouteLoading(false);
    }
  }, [inject]);

  const clearRoute = useCallback(() => {
    setRouteData(null);
    inject('window.clearRoute && clearRoute()');
  }, [inject]);

  // Auto-route when opened with a destination (e.g. from SalonDetails directions)
  useEffect(() => {
    const { destLat, destLng, salonName } = route.params || {};
    if (autoRoutedRef.current || !mapReady || !coords || destLat == null) return;
    autoRoutedRef.current = true;
    fetchRoute({ name: salonName || 'Destination', location: { coordinates: [destLng, destLat] } });
  }, [mapReady, coords, route.params, fetchRoute]);

  const onMessage = (e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'salon' && data.id) {
        const s = salons.find(x => x._id === data.id);
        if (s) setSelected(s);
      } else if (data.type === 'dragged') {
        setFollowMode(false);
      } else if (data.type === 'ready') {
        clearTimeout(readyTimerRef.current);
        mapReadyFlag.current = true;
        setMapReady(true);
        setMapError(false);
      } else if (data.type === 'error') {
        clearTimeout(readyTimerRef.current);
        setMapError(true);
      }
    } catch { /* ignore */ }
  };

  const retryMap = useCallback(() => {
    setMapError(false);
    setMapReady(false);
    mapReadyFlag.current = false;
    autoRoutedRef.current = false;
    setReloadKey(k => k + 1);
  }, []);

  // If the map hasn't signalled "ready" within 9s (CDN/tile failure, blocked network), show retry
  useEffect(() => {
    if (loading) return;
    mapReadyFlag.current = false;
    setMapReady(false);
    clearTimeout(readyTimerRef.current);
    readyTimerRef.current = setTimeout(() => {
      if (!mapReadyFlag.current) setMapError(true);
    }, 9000);
    return () => clearTimeout(readyTimerRef.current);
  }, [loading, reloadKey]);

  // Smooth spring entrance for the bottom sheet (salon card / route banner)
  const sheetVisible = !!((selected && !routeData && !routeLoading) || routeData || routeLoading);
  useEffect(() => {
    Animated.spring(sheetAnim, {
      toValue: sheetVisible ? 1 : 0,
      useNativeDriver: true,
      speed: 16,
      bounciness: 6,
    }).start();
  }, [sheetVisible, sheetAnim]);

  const center = coords || INDIA_CENTER;
  const pins = salons
    .filter(s => salonLat(s) != null && salonLng(s) != null)
    .map(s => ({
      id: s._id,
      lat: salonLat(s),
      lng: salonLng(s),
      name: s.name || 'Salon',
      photo: s.coverPhoto || s.photos?.[0] || s.logo || s.profilePhoto || '',
    }));

  // Single well-known OSM tile source (no dependence on CartoDB); dark mode is
  // achieved with a CSS filter so we never rely on a second, less-reliable host.
  const tile = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // JSON.stringify does not escape "</script>", which (if present in a
  // salon name) would truncate the inline <script> tag and leave a blank
  // page with no error. Escape defensively before inlining.
  const safeJson = (v) => JSON.stringify(v).replace(/</g, '\u003c');

  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" onerror="window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}))"></script>
<style>
html,body,#map{height:100%;margin:0;padding:0;background:${isDark ? '#0f172a' : '#f9fafb'}}
${isDark ? '.leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.92) saturate(0.85);}' : ''}
@keyframes gpsRing{0%{transform:scale(0.8);opacity:0.6}100%{transform:scale(3.2);opacity:0}}
@keyframes mvPulse{0%{transform:scale(0.85);opacity:0.8}70%{transform:scale(1.35);opacity:0}100%{transform:scale(1.35);opacity:0}}
.uwrap{position:relative;width:64px;height:64px;pointer-events:none}
.uring{position:absolute;top:50%;left:50%;margin:-9px 0 0 -9px;width:18px;height:18px;border-radius:50%;background:rgba(66,133,244,0.22);animation:gpsRing 2.6s ease-out infinite}
.udot{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#4285f4,#1a73e8);border:3.5px solid #fff;box-shadow:0 3px 14px rgba(66,133,244,0.7);z-index:2}
.ucone{position:absolute;top:0;left:0;overflow:visible;display:none}
.spin{width:34px;height:34px;border-radius:50%;overflow:hidden;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(99,102,241,0.35),0 1px 3px rgba(0,0,0,0.2);background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:13px}
.spin img{width:100%;height:100%;object-fit:cover;display:block}
.spin-active{width:46px;height:46px;border:3px solid #6366f1;box-shadow:0 4px 16px rgba(99,102,241,0.7),0 1px 4px rgba(0,0,0,0.2);font-size:17px}
.pulse1{position:absolute;inset:-7px;border-radius:50%;border:2.5px solid rgba(99,102,241,0.5);animation:mvPulse 1.6s ease-out infinite;pointer-events:none}
.pulse2{position:absolute;inset:-14px;border-radius:50%;border:2px solid rgba(99,102,241,0.22);animation:mvPulse 1.6s ease-out 0.5s infinite;pointer-events:none}
.slabel{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.25);white-space:nowrap;margin-bottom:4px;max-width:100px;overflow:hidden;text-overflow:ellipsis;text-align:center}
.destpin{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ea4335,#c0392b);border:3px solid #fff;box-shadow:0 4px 14px rgba(234,67,53,0.55);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px}
</style>
</head><body><div id="map"></div><script>
window.onerror = function(){ try{ window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'})); }catch(e){} return true; };
if (typeof L === 'undefined') { window.onerror(); throw new Error('leaflet failed to load'); }
var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${center.lat},${center.lng}], 13);
L.tileLayer('${tile}',{maxZoom:19,subdomains:'abc'}).addTo(map);
var RN = window.ReactNativeWebView;
var follow = false;
window.setFollow = function(v){ follow = v; };
map.on('dragstart', function(){ follow = false; RN.postMessage(JSON.stringify({type:'dragged'})); });

/* User marker: dot + accuracy ring + pulsing GPS ring + heading cone */
var coneSvg = '<svg class="ucone" id="ucone" width="64" height="64"><defs><radialGradient id="cg" cx="50%" cy="100%" r="110%"><stop offset="0%" stop-color="rgba(66,133,244,0.6)"/><stop offset="100%" stop-color="rgba(66,133,244,0.02)"/></radialGradient></defs><g id="conegroup" transform="rotate(0,32,32)"><path d="M32,32 L20,7 Q32,0 44,7 Z" fill="url(#cg)"/></g></svg>';
var uIcon = L.divIcon({className:'',html:'<div class="uwrap"><div class="uring"></div>'+coneSvg+'<div class="udot"></div></div>',iconSize:[64,64],iconAnchor:[32,32]});
var userMarker = L.marker([${center.lat},${center.lng}],{icon:uIcon,zIndexOffset:1000}).addTo(map);
var accCircle = L.circle([${center.lat},${center.lng}],{radius:0,color:'#4285f4',weight:1,opacity:0.35,fillColor:'#4285f4',fillOpacity:0.08}).addTo(map);

window.updateUser = function(lat,lng,acc){
  userMarker.setLatLng([lat,lng]);
  accCircle.setLatLng([lat,lng]);
  if(acc) accCircle.setRadius(acc);
  if(follow) map.panTo([lat,lng],{animate:true});
};
window.setHeading = function(deg){
  var el = document.getElementById('ucone');
  var g  = document.getElementById('conegroup');
  if(!el || !g) return;
  if(deg === null){ el.style.display = 'none'; return; }
  el.style.display = 'block';
  g.setAttribute('transform','rotate('+deg+',32,32)');
};

/* Salon photo pins */
var pins = ${safeJson(pins)};
var markers = {};
var activeId = null;
function pinHtml(p, active){
  var inner = p.photo ? '<img src="'+p.photo+'"/>' : p.name.charAt(0).toUpperCase();
  var label = active ? '<div class="slabel">'+(p.name.length>14?p.name.slice(0,13)+'…':p.name)+'</div>' : '';
  var pulses = active ? '<div class="pulse1"></div><div class="pulse2"></div>' : '';
  return '<div style="display:flex;flex-direction:column;align-items:center">'+label+
    '<div style="position:relative">'+pulses+'<div class="spin'+(active?' spin-active':'')+'">'+inner+'</div></div></div>';
}
function makeIcon(p, active){
  var s = active ? 46 : 34;
  return L.divIcon({className:'',html:pinHtml(p,active),iconSize:[s,s+(active?22:0)],iconAnchor:[s/2,s]});
}
pins.forEach(function(p){
  var m = L.marker([p.lat,p.lng],{icon:makeIcon(p,false)}).addTo(map);
  m.on('click', function(){
    if(activeId && markers[activeId]) markers[activeId].m.setIcon(makeIcon(markers[activeId].p,false));
    activeId = p.id;
    m.setIcon(makeIcon(p,true));
    RN.postMessage(JSON.stringify({type:'salon',id:p.id}));
  });
  markers[p.id] = {m:m,p:p};
});
window.deselect = function(){
  if(activeId && markers[activeId]) markers[activeId].m.setIcon(makeIcon(markers[activeId].p,false));
  activeId = null;
};
var bounds = [[${center.lat},${center.lng}]];
pins.forEach(function(p){ bounds.push([p.lat,p.lng]); });
if(pins.length>0){ try{ map.fitBounds(bounds,{paddingTopLeft:[30,140],paddingBottomRight:[30,60],maxZoom:14}); }catch(e){} }

/* Route drawing */
var routeLine = null, routeCasing = null, destMarker = null;
window.drawRoute = function(poly, dlat, dlng){
  clearRoute();
  routeCasing = L.polyline(poly,{color:'#1a56c4',weight:9,opacity:0.9}).addTo(map);
  routeLine   = L.polyline(poly,{color:'#4285f4',weight:5,opacity:1}).addTo(map);
  destMarker  = L.marker([dlat,dlng],{icon:L.divIcon({className:'',html:'<div class="destpin">⌂</div>',iconSize:[36,36],iconAnchor:[18,36]})}).addTo(map);
  follow = false;
  try{ map.fitBounds(routeLine.getBounds(),{paddingTopLeft:[40,140],paddingBottomRight:[40,220]}); }catch(e){}
};
window.clearRoute = function(){
  if(routeLine){ map.removeLayer(routeLine); routeLine=null; }
  if(routeCasing){ map.removeLayer(routeCasing); routeCasing=null; }
  if(destMarker){ map.removeLayer(destMarker); destMarker=null; }
};
RN.postMessage(JSON.stringify({type:'ready'}));
</script></body></html>`;

  const dist = selected ? bizDist(selected, coords?.lat, coords?.lng) : null;
  const openStatus = selected ? getOpenStatus(selected) : null;
  const selPhoto = selected ? (selected.coverPhoto || selected.photos?.[0] || selected.logo) : null;
  const selAddress = selected
    ? [selected.locality, selected.address, selected.city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')
    : '';

  const sheetTranslate = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Edge-to-edge map fills the whole screen */}
      <View style={StyleSheet.absoluteFill}>
        {loading ? (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }]}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <WebView
            key={reloadKey}
            ref={webRef}
            source={{ html }}
            originWhitelist={['*']}
            onMessage={onMessage}
            onError={() => setMapError(true)}
            onHttpError={() => setMapError(true)}
            onRenderProcessGone={() => setMapError(true)}
            javaScriptEnabled
            domStorageEnabled
            androidLayerType="hardware"
            style={{ flex: 1, backgroundColor: theme.bg }}
          />
        )}

        {/* Load failure — CDN/tile network blocked, WebView crashed, etc. */}
        {!loading && !mapReady && mapError && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }]}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="cloud-offline-outline" size={36} color="#ef4444" />
            </View>
            <AppText style={{ fontSize: 17, fontWeight: '800', color: theme.text, textAlign: 'center' }}>
              Map couldn't load
            </AppText>
            <AppText style={{ fontSize: 13, color: theme.subText, textAlign: 'center', maxWidth: 260, lineHeight: 19 }}>
              Check your internet connection and try again.
            </AppText>
            <TouchableOpacity onPress={retryMap} style={styles.retryBtn} activeOpacity={0.85}>
              <Ionicons name="refresh" size={15} color="#fff" />
              <AppText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Retry</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Still connecting */}
        {!loading && !mapReady && !mapError && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        )}
      </View>

      {/* ── Floating header: circular back button + glass title pill ── */}
      <View style={[styles.floatHeader, { top: insets.top + 10 }]} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.circleBtn, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#1e1b4b' }]}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={[styles.titlePill, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#1e1b4b' }]}>
          <AppText style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>Salons Near You</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {!loading && mapReady && (
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10b981' }} />
            )}
            <AppText style={[styles.headerSub, { color: theme.subText }]} numberOfLines={1}>
              {loading ? 'Locating…' : `${pins.length} salon${pins.length !== 1 ? 's' : ''} nearby`}
            </AppText>
          </View>
        </View>
      </View>

      {/* ── Floating control group: compass + locate, grouped like Google Maps ── */}
      {!loading && mapReady && (
        <View style={[styles.controlGroup, { top: insets.top + 74, backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#1e1b4b' }]}>
          <TouchableOpacity onPress={toggleCompass} style={styles.controlGroupBtn} activeOpacity={0.7}>
            <Ionicons name="compass" size={21} color={compassActive ? '#ea4335' : theme.subText} />
          </TouchableOpacity>
          <View style={[styles.controlDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            onPress={handleLocate}
            style={[styles.controlGroupBtn, followMode && { backgroundColor: '#4285f4' }]}
            activeOpacity={0.7}
          >
            <Ionicons name="locate" size={19} color={followMode ? '#fff' : '#4285f4'} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom sheet: route banner OR salon card, animated entrance ── */}
      {sheetVisible && (
        <Animated.View
          style={[
            styles.sheetWrap,
            { bottom: insets.bottom + 14, opacity: sheetAnim, transform: [{ translateY: sheetTranslate }] },
          ]}
          pointerEvents="box-none"
        >
          {(routeData || routeLoading) ? (
            <View style={[styles.sheetCard, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#1e1b4b' }]}>
              <View style={styles.sheetHandle} />
              {routeLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                  <ActivityIndicator color="#4285f4" />
                  <AppText style={{ fontSize: 13, color: theme.subText, marginLeft: 12, fontWeight: '600' }}>Finding the best route…</AppText>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.routeIconWrap}>
                    <Ionicons name="navigate" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText style={[styles.routeTitle, { color: theme.text }]} numberOfLines={1}>
                      {routeData.salonName}
                    </AppText>
                    <AppText style={[styles.routeSub, { color: theme.subText }]}>
                      {fmtDist(routeData.distance)} · {fmtDur(routeData.duration)} away
                    </AppText>
                  </View>
                  <TouchableOpacity onPress={clearRoute} style={styles.sheetCloseBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={18} color={theme.subText} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.sheetCard, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#1e1b4b' }]}>
              <View style={styles.sheetHandle} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {selPhoto ? (
                  <Image source={{ uri: selPhoto }} style={styles.cardImg} />
                ) : (
                  <View style={[styles.cardImg, styles.cardImgFallback]}>
                    <Ionicons name="storefront-outline" size={26} color="#fff" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{selected?.name}</AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <StarRow rating={selected?.averageRating} />
                    {selected?.averageRating > 0 && (
                      <AppText style={{ color: theme.subText, fontSize: 12, fontWeight: '700' }}>
                        {Number(selected.averageRating).toFixed(1)}
                      </AppText>
                    )}
                    {dist != null && (
                      <AppText style={{ color: theme.subText, fontSize: 12 }}>· {fmtDist(dist)}</AppText>
                    )}
                  </View>
                  {openStatus && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: openStatus.open ? '#10b981' : '#ef4444' }} />
                      <AppText style={{ color: openStatus.open ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: '700' }}>
                        {openStatus.label}
                      </AppText>
                    </View>
                  )}
                  {selAddress ? (
                    <AppText style={{ color: theme.subText, fontSize: 11, marginTop: 3 }} numberOfLines={1}>{selAddress}</AppText>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => { setSelected(null); inject('window.deselect && deselect()'); }}
                  style={styles.sheetCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color={theme.subText} />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity style={styles.dirBtn} onPress={() => fetchRoute(selected)} activeOpacity={0.85}>
                  <Ionicons name="navigate" size={15} color="#fff" />
                  <AppText style={styles.dirBtnText}>Directions</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewBtn, { borderColor: theme.border }]}
                  onPress={() => openSalon(selected._id)}
                  activeOpacity={0.85}
                >
                  <AppText style={[styles.viewBtnText, { color: theme.text }]}>View Salon</AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Floating header: circular back button + glass title pill, both shadowed
  floatHeader: {
    position: 'absolute', left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 20,
  },
  circleBtn: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  titlePill: {
    flex: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 9,
    shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  headerTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  headerSub: { fontSize: 11.5, marginTop: 1, fontWeight: '600' },

  // Grouped control pill (compass + locate) like Google Maps
  controlGroup: {
    position: 'absolute', right: 12, borderRadius: 16, overflow: 'hidden',
    shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5,
    zIndex: 20,
  },
  controlGroupBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  controlDivider: { height: 1, marginHorizontal: 8 },

  // Bottom sheet shared wrapper
  sheetWrap: { position: 'absolute', left: 12, right: 12, zIndex: 20 },
  sheetCard: {
    borderRadius: 22, padding: 16,
    shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(148,163,184,0.4)',
    alignSelf: 'center', marginBottom: 12,
  },
  sheetCloseBtn: { padding: 4, marginLeft: 4 },

  routeIconWrap: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#4285f4',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4285f4', shadowOpacity: 0.4, shadowRadius: 8, elevation: 3,
  },
  routeTitle: { fontSize: 14.5, fontWeight: '800' },
  routeSub: { fontSize: 12, marginTop: 2, fontWeight: '600' },

  cardImg: { width: 66, height: 66, borderRadius: 14 },
  cardImgFallback: { backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  dirBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#4285f4', borderRadius: 13, paddingVertical: 12,
    shadowColor: '#4285f4', shadowOpacity: 0.35, shadowRadius: 8, elevation: 3,
  },
  dirBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  viewBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 13, borderWidth: 1.5, paddingVertical: 12,
  },
  viewBtnText: { fontSize: 13.5, fontWeight: '700' },

  retryBtn: {
    marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#6366f1', borderRadius: 13, paddingHorizontal: 24, paddingVertical: 12,
    shadowColor: '#6366f1', shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
});
