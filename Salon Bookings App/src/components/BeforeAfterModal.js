import React, { useEffect } from 'react';
import { Modal, View, Image, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');
const PANEL_H = 300;

export default function BeforeAfterModal({ capturedUri, hairstyle, onClose }) {
  if (!hairstyle) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.sheet}>
          {/* Close */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Split panels */}
          <View style={styles.panels}>
            {/* Before */}
            <View style={styles.panel}>
              {capturedUri ? (
                <Image source={{ uri: capturedUri }} style={styles.panelImg} resizeMode="cover" />
              ) : (
                <View style={[styles.panelImg, styles.placeholder]}>
                  <Ionicons name="person-outline" size={40} color="#555" />
                </View>
              )}
              <View style={styles.panelLabel}>
                <Text style={styles.panelLabelText}>You</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* After */}
            <View style={styles.panel}>
              <Image source={{ uri: hairstyle.imageUrl }} style={styles.panelImg} resizeMode="cover" />
              <View style={styles.panelLabel}>
                <Text style={styles.panelLabelText} numberOfLines={1}>{hairstyle.name}</Text>
              </View>
            </View>
          </View>

          {/* Why it works */}
          {hairstyle.whyItWorks ? (
            <View style={styles.why}>
              <Text style={styles.whyText}>{hairstyle.whyItWorks}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  sheet: {
    width: SW - 32, backgroundColor: '#111',
    borderRadius: 16, overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 10, zIndex: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  panels: { flexDirection: 'row', height: PANEL_H },
  panel:  { flex: 1, position: 'relative' },
  panelImg: { width: '100%', height: '100%' },
  placeholder: { backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  divider: { width: 2, backgroundColor: '#333' },
  panelLabel: {
    position: 'absolute', bottom: 10, left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  panelLabelText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  why: { padding: 14, borderTopWidth: 1, borderTopColor: '#222' },
  whyText: { fontSize: 13, color: '#ccc', lineHeight: 19 },
});
