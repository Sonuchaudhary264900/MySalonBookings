import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Image, StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AppText from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const TYPES = [
  { key: 'bug',        label: 'Bug',        icon: 'bug-outline' },
  { key: 'suggestion', label: 'Suggestion', icon: 'bulb-outline' },
  { key: 'feedback',   label: 'Feedback',   icon: 'chatbox-ellipses-outline' },
];

const SEVERITIES = [
  { key: 'low',      label: 'Low',      color: '#64748b' },
  { key: 'medium',   label: 'Medium',   color: '#2563eb' },
  { key: 'high',     label: 'High',     color: '#d97706' },
  { key: 'critical', label: 'Critical', color: '#dc2626' },
];

const STATUS_META = {
  open:      { label: 'Open',      color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  in_review: { label: 'In Review', color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  resolved:  { label: 'Resolved',  color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  closed:    { label: 'Closed',    color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const TYPE_ICON = {
  bug: 'bug-outline',
  suggestion: 'bulb-outline',
  feedback: 'chatbox-ellipses-outline',
};

export default function FeedbackScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState('feedback');
  const [severity, setSeverity] = useState('low');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reopeningId, setReopeningId] = useState(null);

  const loadFeedback = useCallback((p = 1) => {
    setLoading(true);
    api.get(`/customer/feedback?page=${p}&limit=10`)
      .then(res => {
        const data = res.data?.data || [];
        const pagination = res.data?.pagination || {};
        setItems(data);
        setPage(pagination.page || p);
        setPages(pagination.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadFeedback(1); }, [loadFeedback]);

  const pickScreenshot = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setScreenshot(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      setError('Please fill in both subject and description');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('severity', type === 'bug' ? severity : 'low');
      fd.append('subject', subject.trim());
      fd.append('description', description.trim());
      fd.append('platform', 'android');
      fd.append('appVersion', Constants.expoConfig?.version || '');
      fd.append('osVersion', String(Platform.Version));
      fd.append('deviceInfo', `${Device.modelName || 'Unknown'} / Android ${Platform.Version}`);
      if (screenshot) {
        fd.append('screenshot', { uri: screenshot, name: 'screenshot.jpg', type: 'image/jpeg' });
      }

      // Do NOT set Content-Type manually — axios auto-detects FormData and
      // lets React Native's networking layer generate the multipart boundary.
      // Forcing 'multipart/form-data' without a boundary breaks multer's parser.
      await api.post('/customer/feedback', fd, {
        headers: { 'X-Platform': 'mobile' },
      });

      setSuccess('Thanks! Your submission has been received.');
      setSubject('');
      setDescription('');
      setSeverity('low');
      setScreenshot(null);
      loadFeedback(1);
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async (id) => {
    setReopeningId(id);
    try {
      await api.patch(`/customer/feedback/${id}/reopen`);
      loadFeedback(page);
    } catch {} finally {
      setReopeningId(null);
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: theme.text }]}>Help & Feedback</AppText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Type toggle */}
        <View style={styles.typeRow}>
          {TYPES.map(({ key, label, icon }) => {
            const active = type === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setType(key)}
                style={[
                  styles.typeBtn,
                  {
                    borderColor: active ? '#8b5cf6' : theme.border,
                    backgroundColor: active ? 'rgba(139,92,246,0.1)' : theme.card,
                  },
                ]}
              >
                <Ionicons name={icon} size={20} color={active ? '#8b5cf6' : theme.subText} />
                <AppText style={{ fontSize: 12, fontWeight: '600', color: active ? '#8b5cf6' : theme.subText, marginTop: 6 }}>
                  {label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Severity (bug only) */}
        {type === 'bug' && (
          <View style={styles.severityRow}>
            {SEVERITIES.map(({ key, label, color }) => {
              const active = severity === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSeverity(key)}
                  style={[
                    styles.sevChip,
                    {
                      borderColor: active ? color : theme.border,
                      backgroundColor: active ? color + '1f' : theme.card,
                    },
                  ]}
                >
                  <AppText style={{ fontSize: 12, fontWeight: '600', color: active ? color : theme.subText }}>{label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Subject */}
        <AppText style={[styles.label, { color: theme.subText }]}>Subject</AppText>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="Brief summary of the issue or idea"
          placeholderTextColor={theme.subText}
          maxLength={120}
          style={[styles.input, { backgroundColor: theme.cardAlt, borderColor: theme.border, color: theme.text }]}
        />

        {/* Description */}
        <AppText style={[styles.label, { color: theme.subText }]}>Description</AppText>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Tell us more — what happened, what you expected, steps to reproduce..."
          placeholderTextColor={theme.subText}
          multiline
          numberOfLines={5}
          maxLength={2000}
          style={[styles.input, styles.textarea, { backgroundColor: theme.cardAlt, borderColor: theme.border, color: theme.text }]}
        />

        {/* Screenshot */}
        <AppText style={[styles.label, { color: theme.subText }]}>Screenshot (optional)</AppText>
        {screenshot ? (
          <View style={styles.screenshotWrap}>
            <Image source={{ uri: screenshot }} style={styles.screenshotImg} />
            <TouchableOpacity onPress={() => setScreenshot(null)} style={styles.removeBtn}>
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={pickScreenshot}
            style={[styles.uploadBtn, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}
          >
            <Ionicons name="image-outline" size={18} color={theme.subText} />
            <AppText style={{ fontSize: 13, fontWeight: '500', color: theme.subText, marginLeft: 8 }}>Add a screenshot</AppText>
          </TouchableOpacity>
        )}

        {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
        {success ? <AppText style={styles.successText}>{success}</AppText> : null}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={[styles.submitBtn, { opacity: submitting ? 0.7 : 1 }]}
        >
          {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={16} color="#fff" />}
          <AppText style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit'}</AppText>
        </TouchableOpacity>

        {/* My submissions */}
        <AppText style={[styles.sectionTitle, { color: theme.text }]}>My Submissions</AppText>
        <View style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {loading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator color="#8b5cf6" />
            </View>
          ) : items.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <AppText style={{ fontSize: 13, color: theme.subText }}>No submissions yet</AppText>
            </View>
          ) : (
            items.map((item, i) => {
              const status = STATUS_META[item.status] || STATUS_META.open;
              return (
                <View
                  key={item._id}
                  style={[styles.itemRow, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                >
                  <View style={styles.itemTop}>
                    <View style={styles.itemIcon}>
                      <Ionicons name={TYPE_ICON[item.type] || 'chatbox-ellipses-outline'} size={16} color="#8b5cf6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={[styles.itemSubject, { color: theme.text }]} numberOfLines={1}>{item.subject}</AppText>
                      <AppText style={[styles.itemMeta, { color: theme.subText }]}>
                        {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        {item.type === 'bug' && item.severity ? ` · ${item.severity.charAt(0).toUpperCase()}${item.severity.slice(1)}` : ''}
                      </AppText>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                      <AppText style={{ fontSize: 11, fontWeight: '700', color: status.color }}>{status.label}</AppText>
                    </View>
                  </View>
                  {item.status === 'resolved' && (
                    <TouchableOpacity onPress={() => handleReopen(item._id)} disabled={reopeningId === item._id} style={styles.reopenBtn}>
                      <Ionicons name="refresh" size={13} color="#8b5cf6" />
                      <AppText style={{ fontSize: 12, fontWeight: '600', color: '#8b5cf6', marginLeft: 6 }}>
                        {reopeningId === item._id ? 'Reopening...' : 'Reopen'}
                      </AppText>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        {pages > 1 && (
          <View style={styles.pagerRow}>
            <TouchableOpacity
              onPress={() => loadFeedback(page - 1)}
              disabled={page <= 1}
              style={[styles.pagerBtn, { borderColor: theme.border, backgroundColor: theme.card, opacity: page <= 1 ? 0.5 : 1 }]}
            >
              <AppText style={{ fontSize: 12, fontWeight: '600', color: theme.subText }}>Previous</AppText>
            </TouchableOpacity>
            <AppText style={{ fontSize: 12, color: theme.subText }}>Page {page} of {pages}</AppText>
            <TouchableOpacity
              onPress={() => loadFeedback(page + 1)}
              disabled={page >= pages}
              style={[styles.pagerBtn, { borderColor: theme.border, backgroundColor: theme.card, opacity: page >= pages ? 0.5 : 1 }]}
            >
              <AppText style={{ fontSize: 12, fontWeight: '600', color: theme.subText }}>Next</AppText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700' },
  scroll:        { padding: 16, paddingBottom: 40 },
  typeRow:       { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeBtn:       { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
  severityRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  sevChip:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  label:         { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input:         { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 12 },
  textarea:      { minHeight: 110, textAlignVertical: 'top' },
  uploadBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 14, marginBottom: 14 },
  screenshotWrap:{ marginBottom: 14, alignSelf: 'flex-start' },
  screenshotImg: { width: 140, height: 140, borderRadius: 12 },
  removeBtn:     { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  errorText:     { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  successText:   { color: '#059669', fontSize: 13, marginBottom: 10 },
  submitBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, backgroundColor: '#7c3aed', gap: 8 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionTitle:  { fontSize: 13, fontWeight: '700', marginTop: 28, marginBottom: 10 },
  listCard:      { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  itemRow:       { padding: 14 },
  itemTop:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemIcon:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(139,92,246,0.12)', alignItems: 'center', justifyContent: 'center' },
  itemSubject:   { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemMeta:      { fontSize: 11 },
  statusPill:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 11 },
  reopenBtn:     { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  pagerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12 },
  pagerBtn:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
});
