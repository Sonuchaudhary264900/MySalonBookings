import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DrawerMenuButton from '../../components/DrawerMenuButton';
import api from '../../services/api';

const BillingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const statusRes = await api.get("/owner/subscription/status");
      if (statusRes.data.success) setData(statusRes.data.data);
    } catch {
      Alert.alert("Error", "Failed to load billing information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <DrawerMenuButton />
          <Text style={styles.headerTitle}>Billing & Plan</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </View>
    );
  }

  const monthlyBookingCount = data?.monthlyBookingCount || 0;
  const estRevenue = monthlyBookingCount * 200;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <DrawerMenuButton />
        <Text style={styles.headerTitle}>Billing & Plan</Text>
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <View style={styles.freeBanner}>
          <View style={styles.freeBannerIcon}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <Text style={styles.freeBannerTitle}>GlowLoox is free for all partners</Text>
          <Text style={styles.freeBannerText}>
            No subscription, no monthly fees — manage bookings, staff and your storefront at no cost.
            The only paid feature is optional Promotions, which help boost your business's visibility to nearby customers.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.statLabel}>This Month</Text>
            <Text style={styles.statValue}>{monthlyBookingCount}</Text>
            <Text style={styles.statSub}>bookings</Text>
          </View>
          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.statLabel}>Est. Revenue</Text>
            <Text style={styles.statValue}>{"₹" + estRevenue.toLocaleString()}</Text>
            <Text style={styles.statSub}>{"₹200/booking"}</Text>
          </View>
        </View>

        <Text style={styles.footerNote}>Looking to grow faster? Check out Promotions in your dashboard.</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#f8fafc' },
  header:            {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle:       { flex: 1, fontSize: 18, fontWeight: '700', color: '#0f172a', marginLeft: 12 },
  refreshBtn:        { padding: 4 },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:           { padding: 16, paddingBottom: 32, gap: 12 },
  card:              {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  freeBanner:        { backgroundColor: '#10b981', borderRadius: 16, padding: 18, gap: 6 },
  freeBannerIcon:    { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  freeBannerTitle:   { fontSize: 16, fontWeight: '800', color: '#fff' },
  freeBannerText:    { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 19 },
  statsRow:          { flexDirection: 'row', gap: 12 },
  statCard:          { flex: 1 },
  statLabel:         { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  statValue:         { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  statSub:           { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  footerNote:        { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
});

export default BillingScreen;
