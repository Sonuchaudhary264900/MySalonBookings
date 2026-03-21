import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';

const TYPE_CONFIG = {
  booking: { icon: 'calendar-outline', bg: '#dbeafe', color: '#2563eb' },
  success: { icon: 'checkmark-circle-outline', bg: '#dcfce7', color: '#16a34a' },
  warning: { icon: 'warning-outline', bg: '#fef9c3', color: '#ca8a04' },
  info:    { icon: 'information-circle-outline', bg: '#dbeafe', color: '#2563eb' },
};

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { notifications, unreadCount, markRead, markAllRead, remove, clearAll } = useNotifications();

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert('Clear All', 'Remove all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearAll },
    ]);
  };

  const renderItem = ({ item }) => {
    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card }, !item.read && styles.cardUnread]}
        onPress={() => markRead(item.id)}
        activeOpacity={0.85}
      >
        {/* Unread dot */}
        {!item.read && <View style={styles.unreadDot} />}

        <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }, !item.read && { fontWeight: '700' }]}>{item.title}</Text>
          <Text style={[styles.message, { color: theme.subText }]} numberOfLines={2}>{item.message}</Text>
          <Text style={[styles.time, { color: theme.subText }]}>{timeAgo(item.createdAt)}</Text>
        </View>

        <TouchableOpacity onPress={() => remove(item.id)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color="#9ca3af" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 14 + insets.top }]}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 4, marginTop: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.headerBtn} onPress={markAllRead}>
              <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
              <Text style={styles.headerBtnText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity style={[styles.headerBtn, styles.headerBtnDanger]} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={16} color="#fca5a5" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={48} color="#2563eb" />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>
              You have no notifications. New booking alerts will appear here automatically.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  headerBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  headerBtnDanger: { backgroundColor: 'rgba(239,68,68,0.25)' },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, position: 'relative' },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  unreadDot: { position: 'absolute', top: 12, right: 38, width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content: { flex: 1, marginRight: 8 },
  title: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 },
  message: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  deleteBtn: { padding: 2 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
});
