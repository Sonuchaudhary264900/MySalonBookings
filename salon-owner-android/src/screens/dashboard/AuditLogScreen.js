import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';

const ACTION_LABELS = {
  'booking.status_changed': 'Booking status changed',
  'booking.created':        'Booking created',
  'booking.cancelled':      'Booking cancelled',
  'booking.completed':      'Booking completed',
  'payment.received':       'Payment received',
};

const ROLE_COLORS = {
  owner:   '#6366f1',
  manager: '#0ea5e9',
  staff:   '#6b7280',
};

const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const LIMIT = 25;

export default function AuditLogScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/owner/audit?page=${page}&limit=${LIMIT}`);
      setLogs(data.data?.logs || []);
      setTotal(data.data?.total || 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;

  const renderItem = ({ item }) => {
    const roleColor = ROLE_COLORS[item.actorRole] || '#6b7280';
    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setSelectedLog(item)}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.action, { color: theme.text }]} numberOfLines={1}>
            {ACTION_LABELS[item.action] || item.action}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>{item.actorName || '—'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleColor + '22' }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>{item.actorRole}</Text>
            </View>
            {item.entity ? <Text style={{ color: theme.subText, fontSize: 11 }}>· {item.entity}</Text> : null}
          </View>
          <Text style={{ color: theme.subText, fontSize: 11, marginTop: 4 }}>{formatDate(item.createdAt)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.subText} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.headerTitle}>Audit Log</Text>
            <Text style={styles.headerSub}>{total} events · 1-year retention</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="shield-checkmark-outline" size={48} color={theme.subText} />
              <Text style={{ color: theme.subText, marginTop: 8 }}>No audit events found</Text>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={[styles.pageBtn, { borderColor: theme.border, opacity: page === 1 ? 0.4 : 1 }]}
                >
                  <Ionicons name="chevron-back" size={18} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ color: theme.subText, fontSize: 13 }}>Page {page} of {totalPages}</Text>
                <TouchableOpacity
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={[styles.pageBtn, { borderColor: theme.border, opacity: page === totalPages ? 0.4 : 1 }]}
                >
                  <Ionicons name="chevron-forward" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Diff modal */}
      <Modal visible={!!selectedLog} transparent animationType="slide" onRequestClose={() => setSelectedLog(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedLog(null)} />
          <View style={[styles.modalBox, { backgroundColor: theme.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                {selectedLog ? (ACTION_LABELS[selectedLog.action] || selectedLog.action) : ''}
              </Text>
              <TouchableOpacity onPress={() => setSelectedLog(null)}>
                <Ionicons name="close" size={22} color={theme.subText} />
              </TouchableOpacity>
            </View>
            {selectedLog && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: theme.subText, fontSize: 12, marginBottom: 14 }}>
                  {formatDate(selectedLog.createdAt)} by {selectedLog.actorName} ({selectedLog.actorRole})
                </Text>
                <Text style={[styles.diffLabel, { color: '#ef4444' }]}>BEFORE</Text>
                <View style={[styles.codeBox, { backgroundColor: isDark ? '#0f172a' : '#f9fafb', borderColor: theme.border }]}>
                  <Text style={[styles.code, { color: theme.text }]}>{JSON.stringify(selectedLog.before, null, 2)}</Text>
                </View>
                <Text style={[styles.diffLabel, { color: '#10b981', marginTop: 14 }]}>AFTER</Text>
                <View style={[styles.codeBox, { backgroundColor: isDark ? '#0f172a' : '#f9fafb', borderColor: theme.border }]}>
                  <Text style={[styles.code, { color: theme.text }]}>{JSON.stringify(selectedLog.after, null, 2)}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { color: '#c7d2fe', fontSize: 12, marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  action: { fontSize: 14, fontWeight: '700' },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 99 },
  roleText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 8 },
  pageBtn: { padding: 8, borderRadius: 10, borderWidth: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 10 },
  diffLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  codeBox: { borderRadius: 12, borderWidth: 1, padding: 12 },
  code: { fontSize: 11, fontFamily: 'monospace' },
});
