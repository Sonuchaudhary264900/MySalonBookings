import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, PanResponder,
  Dimensions, ActivityIndicator, Modal, StatusBar, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const MIN_CROP = 60;
const HIT = 22; // half the handle hit-box

async function runManipulate(uri, actions) {
  if (typeof ImageManipulator.manipulateAsync === 'function') {
    return ImageManipulator.manipulateAsync(uri, actions, {
      compress: 0.9, format: ImageManipulator.SaveFormat.JPEG,
    });
  }
  const ctx = ImageManipulator.ImageManipulator.manipulate(uri);
  for (const a of actions) {
    if (a.crop) ctx.crop(a.crop);
    if (a.rotate) ctx.rotate(a.rotate);
  }
  const ref = await ctx.renderAsync();
  return ref.saveAsync({ compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
}

export default function ImageCropper({ visible, uri, width, height, onCancel, onDone }) {
  const insets = useSafeAreaInsets();

  const TOP_BAR = 56 + insets.top;
  const BOTTOM_BAR = 110 + insets.bottom;
  const cropAreaH = SCREEN_H - TOP_BAR - BOTTOM_BAR;

  const [work, setWork] = useState({ uri, w: width || 1000, h: height || 1000 });
  const [busy, setBusy] = useState(false);

  useEffect(() => { setWork({ uri, w: width || 1000, h: height || 1000 }); }, [uri, width, height]);

  // Image display rect (contain-fit inside the crop area)
  const disp = useMemo(() => {
    const scale = Math.min(SCREEN_W / work.w, cropAreaH / work.h);
    const w = work.w * scale;
    const h = work.h * scale;
    return { w, h, left: (SCREEN_W - w) / 2, top: TOP_BAR + (cropAreaH - h) / 2, scale };
  }, [work.w, work.h, cropAreaH, TOP_BAR]);

  // Live geometry the gesture handlers read (kept in a ref so the once-created
  // PanResponders always see the current values, even after a rotate).
  const geo = useRef({ L: 0, T: 0, R: 0, B: 0, scale: 1 });
  geo.current = { L: disp.left, T: disp.top, R: disp.left + disp.w, B: disp.top + disp.h, scale: disp.scale };

  // Animated crop rect — updated directly (no React re-render → smooth, and the
  // handle views never remount mid-drag).
  const rx = useRef(new Animated.Value(0)).current;
  const ry = useRef(new Animated.Value(0)).current;
  const rw = useRef(new Animated.Value(0)).current;
  const rh = useRef(new Animated.Value(0)).current;
  const num = useRef({ x: 0, y: 0, w: 0, h: 0 }); // numeric mirror
  const start = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const setRect = (x, y, w, h) => {
    num.current = { x, y, w, h };
    rx.setValue(x); ry.setValue(y); rw.setValue(w); rh.setValue(h);
  };

  const resetRect = () => setRect(disp.left, disp.top, disp.w, disp.h);

  // Reset to full image whenever the display changes (new pic / rotate)
  useEffect(() => { resetRect(); }, [disp.left, disp.top, disp.w, disp.h]);

  const makeCorner = (corner) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => { start.current = { ...num.current }; },
    onPanResponderMove: (_e, gs) => {
      const s = start.current;
      const { L, T, R, B } = geo.current;
      let { x, y, w, h } = s;
      if (corner === 'tl') {
        const nx = clamp(s.x + gs.dx, L, s.x + s.w - MIN_CROP);
        const ny = clamp(s.y + gs.dy, T, s.y + s.h - MIN_CROP);
        x = nx; y = ny; w = s.x + s.w - nx; h = s.y + s.h - ny;
      } else if (corner === 'tr') {
        const nr = clamp(s.x + s.w + gs.dx, s.x + MIN_CROP, R);
        const ny = clamp(s.y + gs.dy, T, s.y + s.h - MIN_CROP);
        y = ny; w = nr - s.x; h = s.y + s.h - ny;
      } else if (corner === 'bl') {
        const nx = clamp(s.x + gs.dx, L, s.x + s.w - MIN_CROP);
        const nb = clamp(s.y + s.h + gs.dy, s.y + MIN_CROP, B);
        x = nx; w = s.x + s.w - nx; h = nb - s.y;
      } else {
        const nr = clamp(s.x + s.w + gs.dx, s.x + MIN_CROP, R);
        const nb = clamp(s.y + s.h + gs.dy, s.y + MIN_CROP, B);
        w = nr - s.x; h = nb - s.y;
      }
      setRect(x, y, w, h);
    },
  });

  const corners = useRef({
    tl: makeCorner('tl'), tr: makeCorner('tr'), bl: makeCorner('bl'), br: makeCorner('br'),
  }).current;

  const body = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_e, gs) => Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => { start.current = { ...num.current }; },
    onPanResponderMove: (_e, gs) => {
      const s = start.current;
      const { L, T, R, B } = geo.current;
      const nx = clamp(s.x + gs.dx, L, R - s.w);
      const ny = clamp(s.y + gs.dy, T, B - s.h);
      setRect(nx, ny, s.w, s.h);
    },
  })).current;

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
      const r = num.current;
      const px = 1 / geo.current.scale;
      let originX = Math.round((r.x - disp.left) * px);
      let originY = Math.round((r.y - disp.top) * px);
      let cropW = Math.round(r.w * px);
      let cropH = Math.round(r.h * px);
      originX = clamp(originX, 0, work.w - 1);
      originY = clamp(originY, 0, work.h - 1);
      cropW = clamp(cropW, 1, work.w - originX);
      cropH = clamp(cropH, 1, work.h - originY);
      const res = await runManipulate(work.uri, [{ crop: { originX, originY, width: cropW, height: cropH } }]);
      onDone(res.uri);
    } catch { onDone(work.uri); } finally { setBusy(false); }
  };

  // Derived Animated positions
  const right = Animated.add(rx, rw);
  const bottom = Animated.add(ry, rh);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        <Image source={{ uri: work.uri }}
          style={{ position: 'absolute', left: disp.left, top: disp.top, width: disp.w, height: disp.h }}
          resizeMode="stretch" />

        {/* Dim mask (driven by Animated values) */}
        <Animated.View pointerEvents="none" style={[styles.mask, { left: 0, top: 0, right: 0, height: ry }]} />
        <Animated.View pointerEvents="none" style={[styles.mask, { left: 0, top: bottom, right: 0, bottom: 0 }]} />
        <Animated.View pointerEvents="none" style={[styles.mask, { left: 0, top: ry, width: rx, height: rh }]} />
        <Animated.View pointerEvents="none" style={[styles.mask, { left: right, top: ry, right: 0, height: rh }]} />

        {/* Crop rectangle — draggable body */}
        <Animated.View {...body.panHandlers}
          style={{ position: 'absolute', left: rx, top: ry, width: rw, height: rh, borderWidth: 2, borderColor: '#fff' }}>
          <View pointerEvents="none" style={[styles.gridV, { left: '33.33%' }]} />
          <View pointerEvents="none" style={[styles.gridV, { left: '66.66%' }]} />
          <View pointerEvents="none" style={[styles.gridH, { top: '33.33%' }]} />
          <View pointerEvents="none" style={[styles.gridH, { top: '66.66%' }]} />
        </Animated.View>

        {/* Corner handles (Animated positions, stable views) */}
        <Animated.View {...corners.tl.panHandlers} style={[styles.handle, { left: Animated.subtract(rx, HIT), top: Animated.subtract(ry, HIT) }]}>
          <View style={styles.handleDot} />
        </Animated.View>
        <Animated.View {...corners.tr.panHandlers} style={[styles.handle, { left: Animated.subtract(right, HIT), top: Animated.subtract(ry, HIT) }]}>
          <View style={styles.handleDot} />
        </Animated.View>
        <Animated.View {...corners.bl.panHandlers} style={[styles.handle, { left: Animated.subtract(rx, HIT), top: Animated.subtract(bottom, HIT) }]}>
          <View style={styles.handleDot} />
        </Animated.View>
        <Animated.View {...corners.br.panHandlers} style={[styles.handle, { left: Animated.subtract(right, HIT), top: Animated.subtract(bottom, HIT) }]}>
          <View style={styles.handleDot} />
        </Animated.View>

        {/* Top bar */}
        <View style={[styles.topBar, { height: TOP_BAR, paddingTop: insets.top }]}>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.topBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Crop Photo</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={resetRect} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.topBtn}>
              <Ionicons name="scan-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={doRotate} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.topBtn}>
              <Ionicons name="refresh" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.hint}>Drag the corners to crop any size · drag inside to move</Text>
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
  mask: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.4)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.4)' },
  handle: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  handleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', borderWidth: 3, borderColor: '#6366f1' },
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
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  cancelBtn: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  cancelText: { color: '#e2e8f0', fontSize: 15, fontWeight: '700' },
  doneBtn: { backgroundColor: '#6366f1' },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  busyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
});
