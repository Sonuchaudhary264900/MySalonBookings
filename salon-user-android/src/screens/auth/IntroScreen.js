import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function IntroScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <Image
        source={require('../../../assets/Icon-1024.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.bottom}>
        <Text style={styles.title}>My Salon Bookings</Text>
        <Text style={styles.subtitle}>Discover salons, book appointments{'\n'}and manage your beauty routine</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.btnPrimaryText}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.btnSecondaryText}>Already have an account? <Text style={styles.btnSecondaryBold}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  logo: { flex: 1, width: '100%' },
  bottom: { paddingHorizontal: 28, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  btnPrimary: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: { alignItems: 'center', paddingVertical: 10 },
  btnSecondaryText: { fontSize: 14, color: '#6b7280' },
  btnSecondaryBold: { color: '#2563eb', fontWeight: '700' },
});
