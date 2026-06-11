import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { useTheme } from '../context/ThemeContext';

// Pulls a UPI ID (VPA) out of any scanned QR text.
// UPI payment QRs encode "upi://pay?pa=<vpa>&pn=..."; plain QRs may hold a raw VPA.
export function extractUpiId(text) {
  if (!text) return null;
  const paMatch = text.match(/[?&]pa=([^&]+)/i);
  const candidate = paMatch ? decodeURIComponent(paMatch[1]) : text;
  const vpa = candidate.match(/[\w.\-]{2,256}@[a-zA-Z]{2,64}/);
  return vpa ? vpa[0] : null;
}

// Live camera QR scanner. Calls onResult(upiId) when a UPI QR is recognised.
export default function QrScanModal({ visible, onResult, onClose }) {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState('');
  const scannedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      scannedRef.current = false;
      setError('');
    }
  }, [visible]);

  const handleScan = ({ data }) => {
    if (scannedRef.current) return;
    const upi = extractUpiId(data);
    if (upi) {
      scannedRef.current = true;
      onResult(upi);
    } else {
      setError('That QR has no UPI ID. Scan a UPI payment QR.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Ionicons name="scan-outline" size={16} color="#8b5cf6" style={{ marginRight: 8 }} />
          <AppText style={[styles.title, { color: theme.text }]}>Scan UPI QR</AppText>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={theme.subText} />
          </TouchableOpacity>
        </View>

        {!permission ? (
          <View style={styles.center} />
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Ionicons name="camera-outline" size={40} color={theme.subText} />
            <AppText style={[styles.permText, { color: theme.subText }]}>
              Camera access is needed to scan UPI QR codes.
            </AppText>
            <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
              <AppText style={styles.permBtnText}>Grant Camera Access</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scannedRef.current ? undefined : handleScan}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
            </View>
          </View>
        )}

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <AppText style={[styles.hint, { color: theme.subText }]}>
            Point the camera at any UPI QR (PhonePe, GPay, Paytm, bank QR). The UPI ID is read automatically.
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title:     { flex: 1, fontSize: 15, fontWeight: '700' },
  closeBtn:  { padding: 4 },
  cameraWrap:{ flex: 1, backgroundColor: '#000' },
  overlay:   { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame:     { width: 230, height: 230, borderWidth: 2.5, borderColor: 'rgba(139,92,246,0.9)', borderRadius: 18 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  permText:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  permBtn:   { marginTop: 4, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#8b5cf6' },
  permBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  footer:    { padding: 14, borderTopWidth: 1 },
  error:     { fontSize: 12, color: '#dc2626', marginBottom: 6 },
  hint:      { fontSize: 11.5, lineHeight: 16 },
});
