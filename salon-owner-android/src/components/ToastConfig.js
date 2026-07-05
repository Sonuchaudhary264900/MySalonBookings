import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';

const { width: W } = Dimensions.get('window');

const VARIANTS = {
  success: { icon: 'checkmark',        accent: '#10b981', glow: 'rgba(16,185,129,0.45)' },
  error:   { icon: 'alert',            accent: '#ef4444', glow: 'rgba(239,68,68,0.45)' },
  info:    { icon: 'information',      accent: '#6366f1', glow: 'rgba(99,102,241,0.45)' },
};

function PremiumToast({ variant, text1, text2, onPress }) {
  const { theme, isDark } = useTheme();
  const v = VARIANTS[variant] || VARIANTS.info;

  // entrance + gentle icon pop
  const slide = useRef(new Animated.Value(-18)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  const pop   = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 90, friction: 11 }),
      Animated.spring(pop,   { toValue: 1, useNativeDriver: true, tension: 140, friction: 6, delay: 60 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], width: W - 24 }}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(20,20,38,0.96)' : '#ffffff',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            shadowColor: v.glow,
          },
        ]}
      >
        {/* accent rail */}
        <View style={[styles.rail, { backgroundColor: v.accent }]} />

        {/* icon badge */}
        <Animated.View style={[styles.badge, { backgroundColor: v.accent, shadowColor: v.glow, transform: [{ scale: pop }] }]}>
          <Ionicons name={v.icon} size={19} color="#fff" />
        </Animated.View>

        {/* text */}
        <View style={{ flex: 1, minWidth: 0 }}>
          {!!text1 && <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{text1}</Text>}
          {!!text2 && <Text numberOfLines={2} style={[styles.msg, { color: theme.subText }]}>{text2}</Text>}
        </View>

        {/* dismiss */}
        <View style={styles.close}>
          <Ionicons name="close" size={15} color={theme.subText} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 13,
    paddingLeft: 16,
    paddingRight: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  rail:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  badge: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6,
  },
  title: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },
  msg:   { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  close: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(128,128,160,0.12)' },
});

// react-native-toast-message config map
export const toastConfig = {
  success: (props) => <PremiumToast variant="success" text1={props.text1} text2={props.text2} onPress={() => Toast.hide()} />,
  error:   (props) => <PremiumToast variant="error"   text1={props.text1} text2={props.text2} onPress={() => Toast.hide()} />,
  info:    (props) => <PremiumToast variant="info"    text1={props.text1} text2={props.text2} onPress={() => Toast.hide()} />,
};

export default toastConfig;
