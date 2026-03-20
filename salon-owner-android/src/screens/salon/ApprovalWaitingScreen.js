import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSalon } from '../../context/SalonContext';
import { useAuth } from '../../context/AuthContext';

export default function ApprovalWaitingScreen() {
  const { salon, fetchSalon, loading } = useSalon();
  const { logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    await fetchSalon();
    setChecking(false);
  };

  // Auto-check every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchSalon, 30000);
    return () => clearInterval(interval);
  }, [fetchSalon]);

  const status = salon?.status || salon?.approvalStatus || 'pending';
  const isRejected = status === 'rejected';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Brand logo */}
        <View style={styles.brandLogoBox}>
          <Image source={require('../../../assets/icon1.png')} style={styles.brandLogoImg} resizeMode="contain" />
        </View>

        {/* Icon */}
        <View style={[styles.iconCircle, isRejected && styles.iconCircleRed]}>
          <Ionicons
            name={isRejected ? 'close-circle-outline' : 'time-outline'}
            size={52}
            color={isRejected ? '#dc2626' : '#2563eb'}
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isRejected ? 'Salon Not Approved' : 'Waiting for Approval'}
        </Text>
        <Text style={styles.subtitle}>
          {isRejected
            ? 'Unfortunately your salon registration was not approved. Please contact support for more information.'
            : 'Your salon registration has been submitted and is currently under review by our team.'}
        </Text>

        {/* Salon name */}
        {salon?.name && (
          <View style={styles.salonBadge}>
            <Ionicons name="business-outline" size={16} color="#2563eb" />
            <Text style={styles.salonName}>{salon.name}</Text>
          </View>
        )}

        {/* Status steps */}
        {!isRejected && (
          <View style={styles.steps}>
            {[
              { label: 'Registration Submitted', done: true },
              { label: 'Under Review', done: false, active: true },
              { label: 'Approval & Activation', done: false },
            ].map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepDot, s.done && styles.stepDotDone, s.active && styles.stepDotActive]}>
                  {s.done
                    ? <Ionicons name="checkmark" size={12} color="#fff" />
                    : <View style={[styles.stepDotInner, s.active && { backgroundColor: '#fff' }]} />}
                </View>
                {i < 2 && <View style={[styles.stepConnector, s.done && { backgroundColor: '#10b981' }]} />}
                <Text style={[styles.stepLabel, s.done && { color: '#10b981' }, s.active && { color: '#2563eb', fontWeight: '700' }]}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Info */}
        {!isRejected && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
            <Text style={styles.infoText}>
              Approval usually takes 1–2 business days. This screen will update automatically.
            </Text>
          </View>
        )}

        {/* Refresh button */}
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={checking || loading}>
          {checking || loading
            ? <ActivityIndicator color="#2563eb" size="small" />
            : <>
                <Ionicons name="refresh-outline" size={18} color="#2563eb" />
                <Text style={styles.refreshText}>Check Status</Text>
              </>}
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color="#6b7280" />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center' },
  brandLogoBox: { width: 72, height: 72, borderRadius: 18, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: '#bae6fd' },
  brandLogoImg: { width: 56, height: 56 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconCircleRed: { backgroundColor: '#fee2e2' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  salonBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#dbeafe', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginBottom: 20 },
  salonName: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  steps: { width: '100%', marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepDotDone: { backgroundColor: '#10b981' },
  stepDotActive: { backgroundColor: '#2563eb' },
  stepDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9ca3af' },
  stepConnector: { position: 'absolute', left: 11, top: 24, width: 2, height: 12, backgroundColor: '#e5e7eb' },
  stepLabel: { fontSize: 13, color: '#6b7280' },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#dbeafe', borderRadius: 10, padding: 12, marginBottom: 16 },
  infoText: { fontSize: 12, color: '#2563eb', flex: 1, lineHeight: 17 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#93c5fd', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 11, marginBottom: 12, minWidth: 160, justifyContent: 'center' },
  refreshText: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutText: { fontSize: 13, color: '#6b7280' },
});
