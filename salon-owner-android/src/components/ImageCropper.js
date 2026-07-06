import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, PanResponder,
  Dimensions, ActivityIndicator, Modal, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Works with both the modern (context) and legacy expo-image-manipulator APIs.
async function runManipulate(uri, actions) {
  if (typeof ImageManipulator.manipulateAsync === 'function') {
    return ImageManipulator.manipulateAsync(uri, actions, {
      compress: 0.85, format: ImageManipulator.SaveFormat.JPEG,
    });
  }
  const ctx = ImageManipulator.ImageManipulator.manipulate(uri);
  for (const a of actions) {
    if (a.crop) ctx.crop(a.crop);
    if (a.rotate) ctx.rotate(a.rotate);
  }
  const ref = await ctx.renderAsync();
  return ref.saveAsync({ compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
}

const ASPECTS = [
  { key: 'square',   label: '1:1',      ratio: 1 },
  { key: 'portrait', label: '4:5',      ratio: 4 / 5 },
  { key: 'wide',     label: '16:9',     ratio: 16 / 9 },
  { key: 'free',     label: 'Original', ratio: null },
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function ImageCropper({ visible, uri, width, height, onCancel, onDone }) {
  const insets = useSafeAreaInsets();

  const TOP_BAR = 56 + insets.top;
  const BOTTOM_BAR = 148 + insets.bottom;
  const cropAreaH = SCREEN_H - TOP_BAR - BOTTOM_BAR;
  const frameCenterX = SCREEN_W / 2;
  const frameCenterY = TOP_BAR + cropAreaH / 2;

  const [work, setWork] = useState({ uri, w: width || 1000, h: height || 1000 });
  const [aspectKey, setAspectKey] = useState('portrait');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0); // force re-render on transform change

  // Reset working image whenever a new picture comes in
  React.useEffect(() => {
    setWork({ uri, w: width || 1000, h: height || 1000 });
    setAspectKey('portrait');
  }, [uri, width, height]);

  // Crop frame size for the chosen aspect (fits inside the crop area)
  const frame = useMemo(() => {
    const maxW = SCREEN_W - 44;
    const maxH = cropAreaH - 44;
    const asp = ASPECTS.find(a => a.key === aspectKey);
    const ratio = asp?.ratio ?? (work.w / work.h);
    let fw = maxW, fh = fw / ratio;
    if (fh > maxH) { fh = maxH; fw = fh * ratio; }
    return { w: fw, h: fh };
  }, [aspectKey, cropAreaH, work.w, work.h]);

  const minScale = useMemo(
    () => Math.max(frame.w / work.w, frame.h / work.h),
    [frame.w, frame.h, work.w, work.h]
  );

  // Transform state kept in refs (updated live during gestures)
  const scaleRef  = useRef(minScale);
  const offsetRef = useRef({ x: 0, y: 0 });

  const clampOffset = useCallback((o, scale) => {
    const exX = Math.max(0, (work.w * scale - frame.w) / 2);
    const exY = Math.max(0, (work.h * scale - frame.h) / 2);
    return { x: clamp(o.x, -exX, exX), y: clamp(o.y, -exY, exY) };
  }, [work.w, work.h, frame.w, frame.h]);

  // Re-fit when frame / image changes
  React.useEffect(() => {
    scaleRef.current = minScale;
    offsetRef.current = clampOffset({ x: 0, y: 0 }, minScale);
    setTick(t => t + 1);
  }, [minScale, clampOffset]);

  const gesture = useRef({ startOffset: { x: 0, y: 0 }, startScale: 1, startDist: 0 }).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        gesture.startOffset = { ...offsetRef.current };
        gesture.startScale = scaleRef.current;
        const t = evt.nativeEvent.touches;
        gesture.startDist = t.length >= 2
          ? Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY)
          : 0;
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        let scale = scaleRef.current;
        if (touches.length >= 2 && gesture.startDist > 0) {
          const dist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );
          scale = clamp(gesture.startScale * (dist / gesture.startDist), minScale, minScale * 5);
          scaleRef.current = scale;
        }
        const next = clampOffset(
          { x: gesture.startOffset.x + gs.dx, y: gesture.startOffset.y + gs.dy },
          scale
        );
        offsetRef.current = next;
        setTick(t => t + 1);
      },
    })
  ).current;

  const doRotate = async () => {
    setBusy(true);
    try {
      const res = await runManipulate(work.uri, [{ rotate: 90 }]);
      setWork({ uri: res.uri, w: res.width || work.h, h: res.height || work.w });
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  const doDone = async () => {
    setBusy(true);
    try {
      const scale = scaleRef.current;
      const o = offsetRef.current;
      const cropW = frame.w / scale;
      const cropH = frame.h / scale;
      let originX = work.w / 2 - frame.w / (2 * scale) - o.x / scale;
      let originY = work.h / 2 - frame.h / (2 * scale) - o.y / scale;
      originX = clamp(originX, 0, Math.max(0, work.w - cropW));
      originY = clamp(originY, 0, Math.max(0, work.h - cropH));
      const crop = {
        originX: Math.round(originX),
        originY: Math.round(originY),
        width:  Math.round(Math.min(cropW, work.w - originX)),
        height: Math.round(Math.min(cropH, work.h - originY)),
      };
      const res = await runManipulate(work.uri, [{ crop }]);
      onDone(res.uri);
    } catch (e) {
      onDone(work.uri); // fall back to the uncropped image rather than blocking
    } finally { setBusy(false); }
  };

  const scale = scaleRef.current;
  const off = offsetRef.current;
  const imgLeft = frameCenterX - (work.w * scale) / 2 + off.x;
  const imgTop  = frameCenterY - (work.h * scale) / 2 + off.y;
  const frameLeft = frameCenterX - frame.w / 2;
  const frameTop  = frameCenterY - frame.h / 2;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {/* Crop area */}
        <View style={styles.cropArea} {...panResponder.panHandlers}>
          <Image
            source={{ uri: work.uri }}
            style={{ position: 'absolute', left: imgLeft, top: imgTop, width: work.w * scale, height: work.h * scale }}
            resizeMode="stretch"
          />
          {/* Dim mask (4 rectangles around the frame) */}
          <View pointerEvents="none" style={[styles.mask, { left: 0, top: 0, right: 0, height: frameTop }]} />
          <View pointerEvents="none" style={[styles.mask, { left: 0, top: frameTop + frame.h, right: 0, bottom: 0 }]} />
          <View pointerEvents="none" style={[styles.mask, { left: 0, top: frameTop, width: frameLeft, height: frame.h }]} />
          <View pointerEvents="none" style={[styles.mask, { right: 0, top: frameTop, width: frameLeft, height: frame.h }]} />
          {/* Frame border + grid */}
          <View pointerEvents="none" style={{ position: 'absolute', left: frameLeft, top: frameTop, width: frame.w, height: frame.h, borderWidth: 2, borderColor: 'rgba(255,255,255,0.95)' }}>
            <View style={[styles.gridV, { left: '33.33%' }]} />
            <View style={[styles.gridV, { left: '66.66%' }]} />
            <View style={[styles.gridH, { top: '33.33%' }]} />
            <View style={[styles.gridH, { top: '66.66%' }]} />
          </View>
        </View>

        {/* Top bar */}
        <View style={[styles.topBar, { height: TOP_BAR, paddingTop: insets.top }]}>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.topBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Crop Photo</Text>
          <TouchableOpacity onPress={doRotate} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.topBtn}>
            <Ionicons name="refresh" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.aspectRow}>
            {ASPECTS.map(a => {
              const active = a.key === aspectKey;
              return (
                <TouchableOpacity key={a.key} onPress={() => setAspectKey(a.key)} activeOpacity={0.8}
                  style={[styles.aspectPill, active && styles.aspectPillActive]}>
                  <Text style={[styles.aspectText, active && styles.aspectTextActive]}>{a.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.hint}>Drag to reposition · pinch to zoom</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={onCancel} style={[styles.actionBtn, styles.cancelBtn]} activeOpacity={0.85}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={doDone} disabled={busy} style={[styles.actionBtn, styles.doneBtn, busy && { opacity: 0.6 }]} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.doneText}>Use Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {busy && (
          <View style={styles.busyOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  cropArea: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  mask: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.4)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.4)' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, backgroundColor: 'rgba(0,0,0,0.55)',
  },
  topBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)', paddingTop: 14, paddingHorizontal: 16, gap: 12,
  },
  aspectRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  aspectPill: {
    paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  aspectPillActive: { borderColor: '#818cf8', backgroundColor: '#6366f1' },
  aspectText: { color: '#cbd5e1', fontSize: 13, fontWeight: '700' },
  aspectTextActive: { color: '#fff' },
  hint: { color: 'rgba(255,255,255,0.55)', fontSize: 12, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  cancelBtn: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  cancelText: { color: '#e2e8f0', fontSize: 15, fontWeight: '700' },
  doneBtn: { backgroundColor: '#6366f1' },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  busyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
});
