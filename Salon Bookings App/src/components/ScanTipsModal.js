import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');

const TIPS = [
  { icon: 'sunny-outline',        title: 'Good lighting',      desc: 'Face a window or bright light source' },
  { icon: 'camera-outline',       title: 'Face forward',       desc: 'Look straight at camera, head level' },
  { icon: 'glasses-outline',      title: 'Remove accessories', desc: 'No glasses, hats or face coverings' },
];

export default function ScanTipsModal({ visible, onContinue, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.card}>
          {/* Close */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color="#888" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={s.iconWrap}>
            <Ionicons name="camera" size={26} color="#f59e0b" />
          </View>

          <Text style={s.title}>For best results</Text>
          <Text style={s.subtitle}>A clear photo gives more accurate recommendations</Text>

          {/* Tips */}
          {TIPS.map(({ icon, title, desc }) => (
            <View key={title} style={s.tipRow}>
              <View style={s.tipIcon}>
                <Ionicons name={icon} size={18} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tipTitle}>{title}</Text>
                <Text style={s.tipDesc}>{desc}</Text>
              </View>
            </View>
          ))}

          {/* CTA */}
          <TouchableOpacity style={s.cta} onPress={onContinue} activeOpacity={0.85}>
            <Text style={s.ctaText}>Got it — scan my face</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    backgroundColor: '#111', borderRadius: 24, padding: 28,
    width: Math.min(SW - 40, 380), borderWidth: 1, borderColor: '#2a2a2a',
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14, width: 30, height: 30,
    borderRadius: 15, backgroundColor: '#1e1e1e',
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16, alignSelf: 'center',
    backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)', alignItems: 'center',
    justifyContent: 'center', marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 22 },
  tipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#242424',
  },
  tipIcon: {
    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
    backgroundColor: 'rgba(245,158,11,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#eee', marginBottom: 2 },
  tipDesc:  { fontSize: 12, color: '#666' },
  cta: {
    marginTop: 6, backgroundColor: '#f59e0b', borderRadius: 14,
    padding: 15, alignItems: 'center',
  },
  ctaText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
