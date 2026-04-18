import { useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Dimensions, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const { width: W, height: H } = Dimensions.get('window');

const FEATURES = [
  { icon: '📅', label: 'Smart Bookings' },
  { icon: '📊', label: 'Revenue Insights' },
  { icon: '⭐', label: 'Customer Growth' },
];

export default function IntroScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const logoScale   = useRef(new Animated.Value(0.75)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const fadeBottom  = useRef(new Animated.Value(0)).current;
  const slideBottom = useRef(new Animated.Value(50)).current;
  const glow1       = useRef(new Animated.Value(0.35)).current;
  const glow2       = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(fadeBottom, {
        toValue: 1,
        duration: 700,
        delay: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideBottom, {
        toValue: 0,
        duration: 650,
        delay: 350,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow1, { toValue: 0.65, duration: 2800, useNativeDriver: true }),
        Animated.timing(glow1, { toValue: 0.25, duration: 2800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow2, { toValue: 0.5, duration: 3400, useNativeDriver: true }),
        Animated.timing(glow2, { toValue: 0.15, duration: 3400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Ambient glow orbs */}
      <Animated.View style={[styles.orb1, { opacity: glow1 }]} />
      <Animated.View style={[styles.orb2, { opacity: glow2 }]} />
      <View style={styles.orb3} />

      {/* Top: logo */}
      <View style={[styles.topSection, { paddingTop: insets.top + 28 }]}>
        <View style={styles.pillBadge}>
          <View style={styles.pillDot} />
          <Text style={styles.pillText}>For Salon Owners</Text>
        </View>

        <Animated.View
          style={[
            styles.logoWrap,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <View style={styles.logoGlow} />
          <View style={styles.logoCircle}>
            <Image
              source={require('../../../assets/Icon-1024.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      </View>

      {/* Bottom: content */}
      <Animated.View
        style={[
          styles.bottomSection,
          {
            opacity: fadeBottom,
            transform: [{ translateY: slideBottom }],
            paddingBottom: insets.bottom + 28,
          },
        ]}
      >
        <View style={styles.featureRow}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureChip}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={styles.headline}>
          Run Your Salon Online. Get More Customers.{'\n'}
          <Text style={styles.headlineAccent}>Earn More Money.</Text>
        </Text>

        <Text style={styles.subtext}>
          Bookings, analytics, reviews & more —{'\n'}everything in one powerful app.
        </Text>

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.88}
        >
          <Text style={styles.btnPrimaryText}>Get Started Free</Text>
          <View style={styles.btnArrow}>
            <Text style={styles.btnArrowText}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Text style={styles.btnSecondaryText}>
            Already have an account?{'  '}
            <Text style={styles.signInLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07071a',
    overflow: 'hidden',
  },

  // Ambient orbs
  orb1: {
    position: 'absolute',
    width: W * 0.85,
    height: W * 0.85,
    borderRadius: W * 0.425,
    backgroundColor: '#4f46e5',
    top: -W * 0.22,
    left: -W * 0.18,
  },
  orb2: {
    position: 'absolute',
    width: W * 0.7,
    height: W * 0.7,
    borderRadius: W * 0.35,
    backgroundColor: '#7c3aed',
    top: H * 0.08,
    right: -W * 0.22,
  },
  orb3: {
    position: 'absolute',
    width: W * 0.5,
    height: W * 0.5,
    borderRadius: W * 0.25,
    backgroundColor: '#2563eb',
    bottom: H * 0.12,
    left: -W * 0.15,
    opacity: 0.18,
  },

  // Top
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.45)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 28,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#a78bfa',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c4b5fd',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: W * 0.62,
    height: W * 0.62,
    borderRadius: W * 0.31,
    backgroundColor: '#6366f1',
    opacity: 0.22,
  },
  logoCircle: {
    width: W * 0.52,
    height: W * 0.52,
    borderRadius: W * 0.26,
    backgroundColor: '#0d0d2b',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(56,189,248,0.5)',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  logoImg: {
    width: W * 1.2,
    height: W * 1.2,
  },

  // Bottom
  bottomSection: {
    paddingHorizontal: 26,
    paddingTop: 20,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  featureIcon: { fontSize: 13 },
  featureLabel: { fontSize: 11, fontWeight: '600', color: '#e2e8f0' },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 22,
  },

  headline: {
    fontSize: 36,
    fontWeight: '900',
    color: '#f1f5f9',
    lineHeight: 44,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  headlineAccent: {
    color: '#818cf8',
  },
  subtext: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 22,
    marginBottom: 28,
  },

  // Buttons
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 14,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'center',
  },
  btnArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnArrowText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  btnSecondaryText: {
    fontSize: 13.5,
    color: '#64748b',
    fontWeight: '500',
  },
  signInLink: {
    color: '#818cf8',
    fontWeight: '700',
  },
});