import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSalon } from '../context/SalonContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const TrialBanner = () => {
  const { subscription } = useSalon();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();

  if (!subscription) return null;

  const { trialActive, trialDaysRemaining, accessStatus, planType, paymentStatus } = subscription;

  // Hide when on a fully paid active plan (not just trial)
  if (accessStatus === 'active') return null;

  // ── Derive state ────────────────────────────────────────────
  let iconName, iconColor, leftText, ctaText, accentColor, bgColor, borderColor;

  const hasPlan = planType && planType !== 'free_trial';
  const planLabel = planType === 'starter' ? '₹150/month Starter' : planType === 'per_booking' ? '₹1/booking Per Booking' : '';

  if (trialActive && trialDaysRemaining > 3) {
    // Healthy trial
    iconName    = 'time-outline';
    iconColor   = '#6366f1';
    accentColor = '#6366f1';
    leftText    = `Free trial active — ${trialDaysRemaining} days remaining`;
    ctaText     = 'Go to Billing';
    bgColor     = isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)';
    borderColor = isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.20)';
  } else if (trialActive && trialDaysRemaining <= 3) {
    // Expiring soon — amber warning
    iconName    = 'alert-circle-outline';
    iconColor   = '#f59e0b';
    accentColor = '#f59e0b';
    leftText    = `Trial expires in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''}`;
    ctaText     = 'Choose a plan';
    bgColor     = isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)';
    borderColor = isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.20)';
  } else if (accessStatus === 'overdue' && hasPlan) {
    // Has a plan but payment is overdue
    iconName    = 'card-outline';
    iconColor   = '#ef4444';
    accentColor = '#ef4444';
    leftText    = `Payment due — ${planLabel} plan`;
    ctaText     = 'Pay now';
    bgColor     = isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)';
    borderColor = isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.18)';
  } else {
    // Trial expired, no plan selected
    iconName    = 'lock-closed-outline';
    iconColor   = '#ef4444';
    accentColor = '#ef4444';
    leftText    = 'Trial ended — Choose a plan to continue';
    ctaText     = 'Choose plan';
    bgColor     = isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)';
    borderColor = isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.18)';
  }

  const textColor = isDark ? 'rgba(255,255,255,0.70)' : 'rgba(17,24,39,0.65)';

  return (
    <View style={[styles.wrap, { backgroundColor: bgColor, borderColor }]}>
      {/* Left: icon + message */}
      <View style={styles.left}>
        <Ionicons name={iconName} size={13} color={iconColor} style={styles.icon} />
        <Text style={[styles.msg, { color: textColor }]} numberOfLines={1}>
          {leftText}
        </Text>
      </View>

      {/* Right: CTA */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Billing')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
        activeOpacity={0.7}
      >
        <Text style={[styles.cta, { color: accentColor }]}>{ctaText} →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
    marginRight: 10,
  },
  icon: {
    flexShrink: 0,
  },
  msg: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.1,
  },
  cta: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
    flexShrink: 0,
  },
});

export default TrialBanner;
