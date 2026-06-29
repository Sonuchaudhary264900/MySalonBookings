import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import AppText from '../../components/AppText';
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
        <AppText style={styles.title}>GlowLoox</AppText>
        <AppText style={styles.subtitle}>Discover salons, book appointments{'\n'}and manage your beauty routine</AppText>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Register')}>
          <AppText style={styles.btnPrimaryText}>Get Started</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Login')}>
          <AppText style={styles.btnSecondaryText}>Already have an account? <AppText style={styles.btnSecondaryBold}>Sign In</AppText></AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGuest} onPress={() => navigation.navigate('GuestHome')}>
          <AppText style={styles.btnGuestText}>Browse Salons</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { height: SCREEN_H } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  logo: { width: '100%', height: SCREEN_H * 0.40, alignSelf: 'center' },
  bottom: { paddingHorizontal: 28, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  btnPrimary: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: { alignItems: 'center', paddingVertical: 10 },
  btnSecondaryText: { fontSize: 14, color: '#6b7280' },
  btnSecondaryBold: { color: '#2563eb', fontWeight: '700' },
  btnGuest:     { alignItems: 'center', paddingVertical: 8 },
  btnGuestText: { fontSize: 13, color: '#9ca3af', textDecorationLine: 'underline' }
});
