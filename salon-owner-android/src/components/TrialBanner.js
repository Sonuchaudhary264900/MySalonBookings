import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSalon } from '../context/SalonContext';

const TrialBanner = ({ navigation }) => {
  const { subscription } = useSalon();

  if (!subscription) return null;

  const { trialActive, trialDaysRemaining, accessStatus } = subscription;

  // Don't show if active paid plan
  if (accessStatus === 'active') return null;

  let bgColor, borderColor, iconName, iconColor, message;

  if (trialActive && trialDaysRemaining > 3) {
    bgColor = '#eff6ff'; borderColor = '#bfdbfe';
    iconName = 'time-outline'; iconColor = '#3b82f6';
    message = `Free trial — ${trialDaysRemaining} days remaining`;
  } else if (trialActive && trialDaysRemaining <= 3) {
    bgColor = '#fefce8'; borderColor = '#fde68a';
    iconName = 'warning-outline'; iconColor = '#f59e0b';
    message = `Trial expires in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} — Choose a plan`;
  } else {
    bgColor = '#fef2f2'; borderColor = '#fecaca';
    iconName = 'close-circle-outline'; iconColor = '#ef4444';
    message = 'Trial expired — Select a plan to continue';
  }

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: bgColor, borderColor }]}
      onPress={() => navigation?.navigate('Billing')}
      activeOpacity={0.8}
    >
      <Ionicons name={iconName} size={15} color={iconColor} />
      <Text style={styles.text}>{message}</Text>
      <Text style={styles.link}>View →</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1,
  },
  text: { flex: 1, fontSize: 12, fontWeight: '600', color: '#374151' },
  link: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
});

export default TrialBanner;
