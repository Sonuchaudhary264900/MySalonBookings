import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  ActivityIndicator, Share, Alert, FlatList, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location   from 'expo-location';
import * as Device     from 'expo-device';
import { Ionicons }    from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage    from '@react-native-async-storage/async-storage';

import { useTheme }    from '../../context/ThemeContext';
import { useAuth }     from '../../context/AuthContext';
import {
  analyzePhoto, getByShape, getTrending, trackEvent, getStylists,
} from '../../services/hairstyleApi';
import { classifyFromContour } from '../../utils/faceShapeClassifier';
import FaceShapeReveal  from '../../components/FaceShapeReveal';
import BeforeAfterModal from '../../components/BeforeAfterModal';
import ScanTipsModal    from '../../components/ScanTipsModal';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 48) / 2;

const LOADING_MESSAGES = [
  'Reading face structure...',
  'Measuring facial proportions...',
  'Matching hairstyle catalog...',
];

const SHAPE_LABELS = {
  oval:   'Oval',
  round:  'Round',
  square: 'Square',
  heart:  'Heart',
  oblong: 'Oblong',
};

const TIPS_NO_FACE = [
  'Face camera directly',
  'Better lighting helps',
  'Move closer to camera',
  'Remove hats / glasses',
];

const TIPS_BLURRY = [
  'Hold camera steady',
  'Better lighting',
  'Clean the lens',
];

export default function StyleAIScreen() {
  const { theme }      = useTheme();
  const { user }       = useAuth();
  const navigation     = useNavigation();
  const s              = styles(theme);

  const [phase, setPhase]           = useState('idle');   // idle | detecting | reveal | results | error
  const [showTips,   setShowTips]   = useState(false);
  const [tipsTarget, setTipsTarget] = useState('camera'); // 'camera' | 'gallery'
  const [hairstyles, setHairstyles] = useState([]);
  const [trending,   setTrending]   = useState([]);
  const [stylists,   setStylists]   = useState([]);
  const [faceShape,  setFaceShape]  = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [imageUri,   setImageUri]   = useState(null);
  const [errorCode,  setErrorCode]  = useState(null);
  const [loadMsg,    setLoadMsg]    = useState(LOADING_MESSAGES[0]);
  const [expanded,   setExpanded]   = useState({});
  const [stylistMap, setStylistMap] = useState({});
  const [saved,      setSaved]      = useState({});
  const [modalStyle, setModalStyle] = useState(null);
  const [manualMode, setManualMode] = useState(false);

  const loadMsgRef = useRef(null);
  const gender     = user?.gender === 'male' ? 'male' : user?.gender === 'female' ? 'female' : 'unisex';

  // Preload trending
  useEffect(() => {
    getTrending(gender).then(r => setTrending(r.data?.hairstyles || [])).catch(() => {});
    // Check cached face profile
    AsyncStorage.getItem('@userFaceProfile').then(raw => {
      if (raw) {
        try {
          const p = JSON.parse(raw);
          if (p.faceShape && p.hairstyles?.length) {
            setFaceShape(p.faceShape);
            setConfidence(p.confidence);
            setHairstyles(p.hairstyles);
            setStylists(p.stylists || []);
            setPhase('results');
          }
        } catch (_) {}
      }
    });
  }, []);

  // Cycle loading messages
  const startLoadingCycle = () => {
    let i = 0;
    setLoadMsg(LOADING_MESSAGES[0]);
    loadMsgRef.current = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadMsg(LOADING_MESSAGES[i]);
    }, 900);
  };
  const stopLoadingCycle = () => {
    if (loadMsgRef.current) { clearInterval(loadMsgRef.current); loadMsgRef.current = null; }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return { lat: null, lng: null };
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch (_) { return { lat: null, lng: null }; }
  };

  const runAnalysis = useCallback(async (uri) => {
    setPhase('detecting');
    setImageUri(uri);
    startLoadingCycle();

    const { lat, lng } = await getLocation();

    try {
      let shape, conf, styles, stls;

      // ML Kit on-device path — only on devices with >= 2.5 GB RAM
      const totalRAM   = await Device.getTotalMemoryAsync();
      const useOnDevice = totalRAM >= 2.5 * 1024 * 1024 * 1024;
      let onDeviceSuccess = false;

      if (useOnDevice) {
        try {
          const FaceDetection = require('@react-native-ml-kit/face-detection').default;
          const mlResult = await FaceDetection.process(uri, {
            performanceModeType: 'accurate',
            contourModeType: 'all',
          });
          if (mlResult.faces?.length > 0) {
            const contour = mlResult.faces[0].contours?.face;
            const classification = classifyFromContour(contour);
            if (classification) {
              // Got on-device shape — fetch catalog from server (no image upload)
              const catalogRes = await getByShape(classification.faceShape, gender);
              shape  = classification.faceShape;
              conf   = classification.confidence;
              styles = catalogRes.data?.hairstyles || [];
              stls   = catalogRes.data?.stylists   || [];
              onDeviceSuccess = true;
            }
          }
        } catch (_) {
          // Fall through to server path
        }
      }

      if (!onDeviceSuccess) {
        const res = await analyzePhoto(uri, gender, lat, lng);
        ({ faceShape: shape, confidence: conf, hairstyles: styles, stylists: stls } = res.data);
      }

      stopLoadingCycle();
      setFaceShape(shape);
      setConfidence(conf);
      setHairstyles(styles || []);
      setStylists(stls || []);

      // Cache for return visit
      AsyncStorage.setItem('@userFaceProfile', JSON.stringify({
        faceShape: shape, confidence: conf, hairstyles: styles, stylists: stls,
      })).catch(() => {});

      setPhase('reveal');
    } catch (err) {
      stopLoadingCycle();
      const data = err?.response?.data;
      setErrorCode(data?.error || 'unknown');
      setPhase('error');
    }
  }, [gender]);

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to analyse your face shape.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.82,
    });
    if (!result.canceled) runAnalysis(result.assets[0].uri);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.82,
    });
    if (!result.canceled) runAnalysis(result.assets[0].uri);
  };

  const handleManualShape = async (shape) => {
    setManualMode(false);
    setPhase('detecting');
    startLoadingCycle();
    try {
      const res = await getByShape(shape, gender);
      stopLoadingCycle();
      setFaceShape(shape);
      setConfidence(null);
      setHairstyles(res.data?.hairstyles || []);
      setStylists(res.data?.stylists || []);
      setPhase('results');
    } catch (_) {
      stopLoadingCycle();
      setPhase('error');
    }
  };

  const handleRevealComplete = () => setPhase('results');

  const handleSave = async (hairstyle) => {
    const next = !saved[hairstyle._id];
    setSaved(p => ({ ...p, [hairstyle._id]: next }));
    await trackEvent({ hairstyleId: hairstyle._id, event_type: next ? 'save' : 'unsave', faceShape });
  };

  const handleExpand = async (hairstyle) => {
    const id = hairstyle._id;
    setExpanded(p => ({ ...p, [id]: !p[id] }));
    if (!stylistMap[id]) {
      try {
        const r = await getStylists({ suggestedService: hairstyle.suggestedService });
        setStylistMap(p => ({ ...p, [id]: r.data?.stylists || [] }));
      } catch (_) { setStylistMap(p => ({ ...p, [id]: [] })); }
    }
    await trackEvent({ hairstyleId: id, event_type: 'click', faceShape });
  };

  const handleBook = (hairstyle, stylist) => {
    trackEvent({ hairstyleId: hairstyle._id, event_type: 'book_cta', faceShape });
    if (stylist?.salonId) {
      navigation.navigate('HomeTab', {
        screen: 'Booking',
        params: { salonId: stylist.salonId, barberId: stylist.barberId, service: hairstyle.suggestedService },
      });
    }
  };

  const handleShare = () => {
    if (!faceShape) return;
    const top = hairstyles.slice(0, 3).map(h => h._id).join(',');
    const payload = Buffer.from(JSON.stringify({ shape: faceShape, ids: top })).toString('base64');
    const url = `https://glowloox.com/hairstyle/shared?s=${payload}`;
    Share.share({
      message: `My face shape is ${SHAPE_LABELS[faceShape] || faceShape} — see my top styles on GlowLoox\n${url}`,
    });
  };

  const resetScreen = () => {
    setPhase('idle');
    setImageUri(null);
    setFaceShape(null);
    setHairstyles([]);
    setStylists([]);
    setErrorCode(null);
    setManualMode(false);
    AsyncStorage.removeItem('@userFaceProfile').catch(() => {});
  };

  // ── Render helpers ──────────────────────────────────────────────

  const renderHairstyleCard = ({ item: h, index }) => {
    const isExpanded  = !!expanded[h._id];
    const cardStylists = stylistMap[h._id] || [];
    const isSaved     = !!saved[h._id];

    return (
      <View style={[s.card, index % 2 === 0 ? { marginRight: 8 } : { marginLeft: 8 }]}>
        <TouchableOpacity onPress={() => setModalStyle(h)} activeOpacity={0.9}>
          <View style={s.cardImgWrap}>
            <Image source={{ uri: h.imageUrl }} style={s.cardImg} resizeMode="cover" />
            {h.trending && (
              <View style={s.trendBadge}>
                <Ionicons name="flame" size={10} color="#f59e0b" />
                <Text style={s.trendText}>Hot</Text>
              </View>
            )}
            {h.styleScore != null && (
              <View style={s.scoreBadge}>
                <Text style={s.scoreText}>{h.styleScore}%</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <View style={s.cardBody}>
          <Text style={s.cardName} numberOfLines={1}>{h.name}</Text>
          {h.description ? <Text style={s.cardDesc} numberOfLines={2}>{h.description}</Text> : null}

          <View style={s.cardActions}>
            <TouchableOpacity onPress={() => setModalStyle(h)} style={s.actionBtn}>
              <Ionicons name="eye-outline" size={15} color={theme.subText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSave(h)} style={s.actionBtn}>
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={15}
                color={isSaved ? '#f59e0b' : theme.subText}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleExpand(h)} style={s.actionBtn}>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={15}
                color={theme.subText}
              />
            </TouchableOpacity>
          </View>

          {isExpanded && (
            <View style={s.expandSection}>
              {h.whyItWorks ? <Text style={s.whyText}>{h.whyItWorks}</Text> : null}
              {cardStylists.length > 0 ? (
                cardStylists.map(stylist => (
                  <View key={stylist.barberId} style={s.stylistRow}>
                    <View style={s.stylistAvatar}>
                      {stylist.photo
                        ? <Image source={{ uri: stylist.photo }} style={s.stylistAvatarImg} />
                        : <Text style={s.stylistInitial}>{stylist.name[0]}</Text>
                      }
                    </View>
                    <View style={s.stylistInfo}>
                      <Text style={s.stylistName}>{stylist.name}</Text>
                      <Text style={s.stylistSalon}>{stylist.salonName} · ⭐ {stylist.rating?.toFixed(1)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleBook(h, stylist)} style={s.bookBtn}>
                      <Text style={s.bookBtnText}>Book</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : cardStylists !== undefined ? (
                <Text style={s.noStylist}>No nearby stylists for this style.</Text>
              ) : null}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSkeletonCard = (key) => (
    <View key={key} style={[s.card, key % 2 === 0 ? { marginRight: 8 } : { marginLeft: 8 }]}>
      <View style={[s.cardImg, s.skeleton]} />
      <View style={s.cardBody}>
        <View style={[s.skeleton, { height: 13, borderRadius: 6, marginBottom: 6 }]} />
        <View style={[s.skeleton, { height: 11, borderRadius: 6, width: '60%' }]} />
      </View>
    </View>
  );

  // ── PHASES ──────────────────────────────────────────────────────

  if (phase === 'reveal') {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <FaceShapeReveal
          faceShape={faceShape}
          imageUri={imageUri}
          onComplete={handleRevealComplete}
        />
      </View>
    );
  }

  if (phase === 'detecting') {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        {imageUri && (
          <Image source={{ uri: imageUri }} style={s.detectingPhoto} resizeMode="cover" />
        )}
        <View style={s.detectingOverlay}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={s.detectingMsg}>{loadMsg}</Text>
        </View>
      </View>
    );
  }

  if (phase === 'error') {
    const tips = errorCode === 'blurry_image' ? TIPS_BLURRY : TIPS_NO_FACE;
    return (
      <View style={[s.root, s.center]}>
        <Ionicons name="camera-outline" size={56} color={theme.subText} />
        <Text style={s.errorTitle}>
          {errorCode === 'blurry_image' ? 'Photo too blurry' : errorCode === 'angled_photo' ? 'Face the camera directly' : 'No face detected'}
        </Text>
        <Text style={s.errorSub}>Tips for a better photo:</Text>
        {tips.map((t, i) => (
          <Text key={i} style={s.tip}>• {t}</Text>
        ))}
        <TouchableOpacity onPress={() => setPhase('idle')} style={[s.primaryBtn, { marginTop: 20 }]}>
          <Text style={s.primaryBtnText}>Try Again</Text>
        </TouchableOpacity>
        <Text style={s.orLabel}>— or pick your shape manually —</Text>
        <View style={s.shapeRow}>
          {Object.entries(SHAPE_LABELS).map(([k, v]) => (
            <TouchableOpacity key={k} onPress={() => handleManualShape(k)} style={s.shapePill}>
              <Text style={s.shapePillText}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  if (phase === 'results') {
    const confPct = confidence != null ? Math.round(confidence * 100) : null;
    const showCorrectionPrompt = confidence != null && confidence < 0.75;
    const topStyle  = hairstyles[0];
    const topStylest = stylists[0];

    return (
      <View style={s.root}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.resultsHeader}>
            <View>
              <Text style={s.shapeLabel}>
                {confPct != null && confPct < 50 ? 'Select your shape below' :
                  `Your face shape: ${SHAPE_LABELS[faceShape] || faceShape}`}
                {confPct != null && confPct >= 75 && <Text style={s.confBadge}> {confPct}%</Text>}
              </Text>
              {showCorrectionPrompt && confPct >= 50 && (
                <Text style={s.correctionHint}>Does this look right? <Text style={s.correctionLink} onPress={() => setManualMode(true)}>Pick manually →</Text></Text>
              )}
            </View>
            <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
              <Ionicons name="share-outline" size={20} color={theme.accent} />
            </TouchableOpacity>
          </View>

          {/* Manual shape selector */}
          {(manualMode || (confPct != null && confPct < 50)) && (
            <View style={s.manualWrap}>
              <Text style={s.manualLabel}>Pick your face shape:</Text>
              <View style={s.shapeRow}>
                {Object.entries(SHAPE_LABELS).map(([k, v]) => (
                  <TouchableOpacity
                    key={k}
                    onPress={() => handleManualShape(k)}
                    style={[s.shapePill, faceShape === k && s.shapePillActive]}
                  >
                    <Text style={[s.shapePillText, faceShape === k && s.shapePillTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Golden Path hero card */}
          {topStyle && topStylest && (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => handleBook(topStyle, topStylest)}
              style={s.heroCard}
            >
              <Image source={{ uri: topStyle.imageUrl }} style={s.heroImg} resizeMode="cover" />
              <View style={s.heroOverlay}>
                {topStyle.styleScore != null && (
                  <View style={s.heroScoreBadge}>
                    <Text style={s.heroScoreText}>{topStyle.styleScore}% match</Text>
                  </View>
                )}
                <View style={s.heroBottom}>
                  <Text style={s.heroStyleName}>{topStyle.name}</Text>
                  <Text style={s.heroBarber}>Book with {topStylest.name} · {topStylest.salonName}</Text>
                  <View style={s.heroBookBtn}>
                    <Ionicons name="calendar-outline" size={14} color="#fff" />
                    <Text style={s.heroBookBtnText}>Book This Style →</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Grid */}
          <Text style={s.gridTitle}>All styles for your face</Text>
          <FlatList
            data={hairstyles}
            keyExtractor={h => h._id}
            renderItem={renderHairstyleCard}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={s.gridRow}
            contentContainerStyle={{ paddingBottom: 16 }}
          />

          {/* Re-scan */}
          <TouchableOpacity onPress={resetScreen} style={s.rescanBtn}>
            <Ionicons name="camera-outline" size={16} color={theme.accent} />
            <Text style={[s.rescanText, { color: theme.accent }]}>Re-scan photo</Text>
          </TouchableOpacity>
        </ScrollView>

        {modalStyle && (
          <BeforeAfterModal
            capturedUri={imageUri}
            hairstyle={modalStyle}
            onClose={() => setModalStyle(null)}
          />
        )}
      </View>
    );
  }

  // ── IDLE ────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <ScanTipsModal
        visible={showTips}
        onClose={() => setShowTips(false)}
        onContinue={() => {
          setShowTips(false);
          if (tipsTarget === 'camera') pickFromCamera();
          else pickFromGallery();
        }}
      />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.idleHero}>
          <View style={s.aiIconWrap}>
            <Ionicons name="sparkles" size={32} color="#f59e0b" />
          </View>
          <Text style={s.idleTitle}>StyleAI</Text>
          <Text style={s.idleSub}>Find hairstyles that suit your face shape — book in one tap.</Text>

          <TouchableOpacity onPress={() => { setTipsTarget('camera'); setShowTips(true); }} style={s.primaryBtn}>
            <Ionicons name="camera-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.primaryBtnText}>Take a selfie</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setTipsTarget('gallery'); setShowTips(true); }} style={s.secondaryBtn}>
            <Ionicons name="images-outline" size={18} color={theme.accent} style={{ marginRight: 8 }} />
            <Text style={[s.secondaryBtnText, { color: theme.accent }]}>Choose from gallery</Text>
          </TouchableOpacity>

          <Text style={s.privacyNote}>
            <Ionicons name="lock-closed-outline" size={12} /> Your photo is used only for analysis and never stored.
          </Text>
        </View>

        {/* Manual shape shortcut */}
        <View style={s.manualWrap}>
          <Text style={s.manualLabel}>Or pick your face shape:</Text>
          <View style={s.shapeRow}>
            {Object.entries(SHAPE_LABELS).map(([k, v]) => (
              <TouchableOpacity key={k} onPress={() => handleManualShape(k)} style={s.shapePill}>
                <Text style={s.shapePillText}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Trending preview */}
        {trending.length > 0 && (
          <>
            <Text style={s.gridTitle}>Trending now</Text>
            <FlatList
              data={trending.slice(0, 6)}
              keyExtractor={h => h._id}
              renderItem={({ item: h, index }) => (
                <View style={[s.card, index % 2 === 0 ? { marginRight: 8 } : { marginLeft: 8 }]}>
                  <Image source={{ uri: h.imageUrl }} style={s.cardImg} resizeMode="cover" />
                  <View style={s.cardBody}>
                    <Text style={s.cardName} numberOfLines={1}>{h.name}</Text>
                  </View>
                </View>
              )}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={s.gridRow}
            />
          </>
        )}

        {phase === 'detecting' && (
          <View style={s.skeletonRow}>
            {[0, 1, 2, 4].map(renderSkeletonCard)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: theme.background },
  scroll: { padding: 16, paddingBottom: 80 },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },

  idleHero:   { alignItems: 'center', paddingVertical: 32 },
  aiIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  idleTitle: { fontSize: 26, fontWeight: '800', color: theme.text, marginBottom: 6 },
  idleSub:   { fontSize: 14, color: theme.subText, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  privacyNote: { fontSize: 11, color: theme.subText, marginTop: 12, textAlign: 'center' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.accent, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 14, marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.accent, paddingVertical: 13, paddingHorizontal: 28,
    borderRadius: 14, marginBottom: 8,
  },
  secondaryBtnText: { fontWeight: '700', fontSize: 15 },

  manualWrap:    { marginBottom: 20 },
  manualLabel:   { fontSize: 13, color: theme.subText, marginBottom: 8, fontWeight: '600' },
  shapeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shapePill:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  shapePillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  shapePillText:   { fontSize: 13, color: theme.text, fontWeight: '600' },
  shapePillTextActive: { color: '#fff' },

  gridTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 12 },
  gridRow:   { marginBottom: 12 },
  card: {
    width: CARD_W, backgroundColor: theme.card,
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.border,
  },
  cardImgWrap: { position: 'relative' },
  cardImg:     { width: '100%', height: 160 },
  cardBody:    { padding: 10 },
  cardName:    { fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 3 },
  cardDesc:    { fontSize: 11, color: theme.subText, marginBottom: 8, lineHeight: 15 },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn:   {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center',
  },

  trendBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  trendText: { fontSize: 10, color: '#f59e0b', fontWeight: '700' },
  scoreBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 20,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#f59e0b',
  },
  scoreText: { fontSize: 11, color: '#f59e0b', fontWeight: '800' },

  expandSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 },
  whyText:       { fontSize: 11, color: theme.subText, marginBottom: 8, lineHeight: 15 },
  stylistRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  stylistAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: theme.border,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  stylistAvatarImg: { width: '100%', height: '100%' },
  stylistInitial:   { fontSize: 15, fontWeight: '700', color: theme.subText },
  stylistInfo:      { flex: 1 },
  stylistName:      { fontSize: 12, fontWeight: '700', color: theme.text },
  stylistSalon:     { fontSize: 11, color: theme.subText },
  bookBtn: {
    backgroundColor: theme.accent, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  bookBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  noStylist:   { fontSize: 11, color: theme.subText },

  heroCard: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 20,
    height: 260, position: 'relative',
  },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute', inset: 0, top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-between', padding: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroScoreBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1.5, borderColor: '#f59e0b',
  },
  heroScoreText: { fontSize: 12, fontWeight: '800', color: '#f59e0b' },
  heroBottom:    {},
  heroStyleName: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 3 },
  heroBarber:    { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  heroBookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: theme.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
  },
  heroBookBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  resultsHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  shapeLabel:    { fontSize: 16, fontWeight: '800', color: theme.text },
  confBadge:     { fontSize: 13, fontWeight: '600', color: theme.subText },
  correctionHint: { fontSize: 12, color: theme.subText, marginTop: 2 },
  correctionLink: { color: theme.accent, fontWeight: '600' },
  shareBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center',
  },

  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 16, paddingVertical: 12,
  },
  rescanText: { fontSize: 13, fontWeight: '600' },

  detectingPhoto: {
    width: SW - 64, height: SW - 64, borderRadius: 16,
    alignSelf: 'center',
  },
  detectingOverlay: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    padding: 24, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16,
    bottom: 40,
  },
  detectingMsg: { color: '#fff', fontSize: 14, marginTop: 12, fontWeight: '600' },

  errorTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginTop: 16, marginBottom: 4 },
  errorSub:   { fontSize: 13, color: theme.subText, marginBottom: 8 },
  tip:        { fontSize: 13, color: theme.subText, marginBottom: 3 },
  orLabel:    { fontSize: 12, color: theme.subText, marginVertical: 16 },

  skeleton: { backgroundColor: theme.border, opacity: 0.5 },
  skeletonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
