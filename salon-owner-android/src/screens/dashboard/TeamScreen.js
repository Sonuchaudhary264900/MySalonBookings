import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Modal,
  ScrollView, Alert, Image, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';

/* ── constants ───────────────────────────────────────────────── */
const ROLE_LABELS = {
  owner:        { label: 'Owner',        color: '#6366f1' },
  manager:      { label: 'Manager',      color: '#8b5cf6' },
  receptionist: { label: 'Receptionist', color: '#0ea5e9' },
  stylist:      { label: 'Stylist',      color: '#10b981' },
};

const STATUS_BADGE = {
  active:  { label: 'Active',     color: '#10b981' },
  invited: { label: 'Not Joined', color: '#9ca3af' },
  blocked: { label: 'Blocked',    color: '#ef4444' },
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

const initials = (name) => (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/* ── Staff Form Modal ────────────────────────────────────────── */
function StaffFormModal({ mode, initial, visible, onClose, onSaved, theme, isDark }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm({
        name: '', phone: '', email: '', gender: '', bio: '',
        staffRole: 'stylist', experience: 0,
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        shiftStart: '09:00', shiftEnd: '18:00',
        showEarningsToStaff: false,
        ...(initial || {}),
      });
    }
  }, [visible, initial]);

  const toggleDay = (day) => setForm(f => ({
    ...f,
    workingDays: (f.workingDays || []).includes(day)
      ? f.workingDays.filter(d => d !== day)
      : [...(f.workingDays || []), day],
  }));

  const handleSave = async () => {
    if (!form.name?.trim()) { showError('Name is required'); return; }
    setSaving(true);
    try {
      if (mode === 'add') {
        await api.post('/owner/team', form);
        showSuccess('Team member added');
      } else {
        await api.put(`/owner/team/${initial._id}`, form);
        showSuccess('Changes saved');
      }
      onSaved();
      onClose();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.modalBox, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{mode === 'add' ? 'Add Team Member' : 'Edit Team Member'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="e.g. Priya Sharma"
                placeholderTextColor={theme.placeholder}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />
            </View>

            {/* Role + Gender */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Role</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {['stylist', 'receptionist', 'manager'].map(r => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setForm(f => ({ ...f, staffRole: r }))}
                      style={[styles.chip, { borderColor: form.staffRole === r ? '#6366f1' : theme.border, backgroundColor: form.staffRole === r ? 'rgba(99,102,241,0.1)' : 'transparent' }]}
                    >
                      <Text style={[styles.chipText, { color: form.staffRole === r ? '#6366f1' : theme.subText }]}>{ROLE_LABELS[r].label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Gender */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Gender</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[{ v: '', l: 'Not specified' }, { v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }].map(g => (
                  <TouchableOpacity
                    key={g.v}
                    onPress={() => setForm(f => ({ ...f, gender: g.v }))}
                    style={[styles.chip, { borderColor: (form.gender || '') === g.v ? '#6366f1' : theme.border, backgroundColor: (form.gender || '') === g.v ? 'rgba(99,102,241,0.1)' : 'transparent' }]}
                  >
                    <Text style={[styles.chipText, { color: (form.gender || '') === g.v ? '#6366f1' : theme.subText }]}>{g.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Phone</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="+91XXXXXXXXXX"
                placeholderTextColor={theme.placeholder}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
              />
              <Text style={[styles.fieldHint, { color: theme.subText }]}>They log in instantly with this number via the Partner app — no invite link needed.</Text>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="priya@salon.com"
                placeholderTextColor={theme.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={v => setForm(f => ({ ...f, email: v }))}
              />
            </View>

            {/* Experience + Shift */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Experience (yrs)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="0"
                  placeholderTextColor={theme.placeholder}
                  keyboardType="number-pad"
                  value={String(form.experience ?? 0)}
                  onChangeText={v => setForm(f => ({ ...f, experience: Number(v) || 0 }))}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Shift</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                    placeholder="09:00"
                    placeholderTextColor={theme.placeholder}
                    value={form.shiftStart}
                    onChangeText={v => setForm(f => ({ ...f, shiftStart: v }))}
                  />
                  <Text style={{ color: theme.subText, fontSize: 11 }}>to</Text>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                    placeholder="18:00"
                    placeholderTextColor={theme.placeholder}
                    value={form.shiftEnd}
                    onChangeText={v => setForm(f => ({ ...f, shiftEnd: v }))}
                  />
                </View>
              </View>
            </View>

            {/* Working Days */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Working Days</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {DAYS.map(day => {
                  const on = (form.workingDays || []).includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => toggleDay(day)}
                      style={[styles.dayChip, { backgroundColor: on ? '#6366f1' : (isDark ? '#1e293b' : '#f3f4f6') }]}
                    >
                      <Text style={[styles.dayChipText, { color: on ? '#fff' : theme.subText }]}>{DAY_SHORT[day]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Bio */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Bio (optional)</Text>
              <TextInput
                style={[styles.input, styles.textarea, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="e.g. 5 years experience in hair coloring…"
                placeholderTextColor={theme.placeholder}
                value={form.bio}
                onChangeText={v => setForm(f => ({ ...f, bio: v }))}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Earnings toggle */}
            <View style={[styles.toggleRow, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleTitle, { color: theme.text }]}>Show earnings to staff</Text>
                <Text style={[styles.toggleSub, { color: theme.subText }]}>They will see their own daily estimated earnings</Text>
              </View>
              <Switch
                value={!!form.showEarningsToStaff}
                onValueChange={v => setForm(f => ({ ...f, showEarningsToStaff: v }))}
                trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
                thumbColor={form.showEarningsToStaff ? '#6366f1' : '#f1f5f9'}
              />
            </View>

            {/* Actions */}
            <View style={styles.formActions}>
              <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { borderColor: theme.border }]}>
                <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                  <Text style={styles.saveBtnText}>{mode === 'add' ? 'Add Member' : 'Save Changes'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ── Staff Card ──────────────────────────────────────────────── */
function StaffCard({ member, onEdit, onToggleActive, onMarkAbsent, isAbsent, absentLoading, theme, isDark }) {
  const [expanded, setExpanded] = useState(false);
  const role = ROLE_LABELS[member.staffRole] || ROLE_LABELS.stylist;
  const status = !member.isOwner ? (STATUS_BADGE[member.status] || STATUS_BADGE.invited) : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, opacity: member.isActive ? 1 : 0.6, borderColor: member.isActive ? theme.border : '#fecaca' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {member.profilePhoto
          ? <Image source={{ uri: member.profilePhoto }} style={styles.avatar} />
          : <View style={[styles.avatar, { backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' }]}><Text style={styles.avatarText}>{initials(member.name)}</Text></View>
        }
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{member.name}</Text>
            {member.isOwner && <Text style={{ color: '#d97706', fontSize: 11, fontWeight: '600' }}>(You)</Text>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <View style={[styles.badge, { backgroundColor: role.color + '22' }]}>
              <Text style={[styles.badgeText, { color: role.color }]}>{role.label}</Text>
            </View>
            {status && (
              <View style={[styles.badge, { backgroundColor: status.color + '22' }]}>
                <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
              </View>
            )}
            {isAbsent && (
              <View style={[styles.badge, { backgroundColor: '#d9770622' }]}>
                <Text style={[styles.badgeText, { color: '#d97706' }]}>Absent today</Text>
              </View>
            )}
          </View>
          {member.averageRating > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 }}>
              <Ionicons name="star" size={11} color="#f59e0b" />
              <Text style={{ color: theme.subText, fontSize: 11 }}>{member.averageRating.toFixed(1)} ({member.totalReviews} reviews)</Text>
            </View>
          )}
        </View>
        {!member.isOwner && (
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <TouchableOpacity onPress={() => onEdit(member)} style={styles.iconBtn}>
              <Ionicons name="create-outline" size={18} color={theme.subText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onToggleActive(member)} style={styles.iconBtn}>
              <Ionicons name={member.isActive ? 'toggle' : 'toggle-outline'} size={22} color={member.isActive ? '#10b981' : '#ef4444'} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {[
          { label: 'Bookings', value: member.monthBookings ?? 0 },
          { label: 'Revenue', value: `₹${(((member.monthRevenue ?? 0)) / 1000).toFixed(1)}k` },
          { label: 'Experience', value: `${member.experience ?? 0}y` },
        ].map(s => (
          <View key={s.label} style={[styles.statBox, { backgroundColor: isDark ? '#0f172a' : '#f9fafb' }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Expand toggle */}
      <TouchableOpacity onPress={() => setExpanded(e => !e)} style={styles.expandBtn}>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={theme.subText} />
        <Text style={{ color: theme.subText, fontSize: 12 }}>{expanded ? 'Less details' : 'More details'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, marginTop: 10, paddingTop: 12, gap: 8 }}>
          {member.phone && <DetailRow icon="call-outline" text={member.phone} theme={theme} />}
          {member.email && <DetailRow icon="mail-outline" text={member.email} theme={theme} />}
          <DetailRow icon="time-outline" text={`${member.shiftStart} – ${member.shiftEnd}`} theme={theme} />
          {member.workingDays?.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              {member.workingDays.map(d => (
                <View key={d} style={[styles.dayPill, { backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff' }]}>
                  <Text style={{ color: '#6366f1', fontSize: 10, fontWeight: '600' }}>{DAY_SHORT[d]}</Text>
                </View>
              ))}
            </View>
          )}
          {member.bio ? <Text style={{ color: theme.subText, fontSize: 11, fontStyle: 'italic' }}>{member.bio}</Text> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.subText, fontSize: 11 }}>Earnings visibility</Text>
            <Text style={{ color: member.showEarningsToStaff ? '#10b981' : theme.subText, fontSize: 11, fontWeight: '600' }}>
              {member.showEarningsToStaff ? 'Shown to staff' : 'Hidden'}
            </Text>
          </View>
          {!member.isOwner && (
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View>
                <Text style={{ color: theme.subText, fontSize: 10, fontWeight: '600' }}>Joined</Text>
                <Text style={{ color: theme.text, fontSize: 11 }}>{fmtDate(member.joinedAt)}</Text>
              </View>
              <View>
                <Text style={{ color: theme.subText, fontSize: 10, fontWeight: '600' }}>Last login</Text>
                <Text style={{ color: theme.text, fontSize: 11 }}>{fmtDate(member.lastLogin)}</Text>
              </View>
            </View>
          )}
          {!member.isOwner && !member.phone && (
            <View style={[styles.warnRow, { backgroundColor: isDark ? 'rgba(217,119,6,0.12)' : '#fffbeb' }]}>
              <Ionicons name="log-in-outline" size={13} color="#d97706" />
              <Text style={{ color: '#d97706', fontSize: 11, flex: 1 }}>Add a phone number so this staff member can log in</Text>
            </View>
          )}
          {!member.isOwner && member.isActive && (
            <TouchableOpacity
              onPress={() => onMarkAbsent(member._id, isAbsent)}
              disabled={absentLoading}
              style={[styles.outlineBtn, { borderColor: isAbsent ? '#10b981' : '#d97706' }]}
            >
              {absentLoading ? <ActivityIndicator size="small" color={isAbsent ? '#10b981' : '#d97706'} /> : (
                <>
                  <Ionicons name={isAbsent ? 'calendar' : 'calendar-outline'} size={13} color={isAbsent ? '#10b981' : '#d97706'} />
                  <Text style={{ color: isAbsent ? '#10b981' : '#d97706', fontSize: 12, fontWeight: '600' }}>{isAbsent ? 'Mark Present' : 'Mark Absent Today'}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {!member.isOwner && (
            <TouchableOpacity
              onPress={() => Alert.alert(`Remove ${member.name}?`, 'Their past booking history is preserved. You can reactivate them later.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => onToggleActive(member) },
              ])}
              style={[styles.outlineBtn, { borderColor: '#ef4444' }]}
            >
              <Ionicons name="trash-outline" size={13} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Remove from Team</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const DetailRow = ({ icon, text, theme }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Ionicons name={icon} size={13} color={theme.subText} />
    <Text style={{ color: theme.text, fontSize: 13 }}>{text}</Text>
  </View>
);

/* ── Main screen ─────────────────────────────────────────────── */
export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(null); // null | { mode, initial }
  const [absentIds, setAbsentIds] = useState(new Set());
  const [absentLoading, setAbsentLoading] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/owner/team');
      setStaff(r.data.data?.staff || []);
    } catch {
      showError('Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAbsences = useCallback(async () => {
    try {
      const res = await api.get('/owner/team/absences');
      setAbsentIds(new Set((res.data.data?.absences || []).map(a => String(a.barberId))));
    } catch {}
  }, []);

  useEffect(() => { load(); loadAbsences(); }, [load, loadAbsences]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), loadAbsences()]);
    setRefreshing(false);
  };

  const handleMarkAbsent = async (staffId, currentlyAbsent) => {
    setAbsentLoading(staffId);
    try {
      if (currentlyAbsent) {
        await api.delete(`/owner/team/${staffId}/absent`);
        setAbsentIds(prev => { const s = new Set(prev); s.delete(String(staffId)); return s; });
        showSuccess('Staff marked present');
      } else {
        const res = await api.post(`/owner/team/${staffId}/absent`);
        setAbsentIds(prev => new Set([...prev, String(staffId)]));
        showSuccess(res.data?.message || 'Staff marked absent, bookings reassigned');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed');
    } finally {
      setAbsentLoading(null);
    }
  };

  const handleToggleActive = async (member) => {
    try {
      if (member.isActive) {
        await api.delete(`/owner/team/${member._id}`);
        showSuccess(`${member.name} deactivated`);
      } else {
        await api.put(`/owner/team/${member._id}`, { isActive: true });
        showSuccess(`${member.name} reactivated`);
      }
      load();
    } catch {
      showError('Failed to update');
    }
  };

  const activeStaff = staff.filter(s => s.isActive);
  const inactiveStaff = staff.filter(s => !s.isActive);
  const hasTeam = activeStaff.filter(s => !s.isOwner).length > 0;

  const renderCard = (m) => (
    <StaffCard
      key={m._id}
      member={m}
      onEdit={member => setModal({ mode: 'edit', initial: member })}
      onToggleActive={handleToggleActive}
      onMarkAbsent={handleMarkAbsent}
      isAbsent={absentIds.has(String(m._id))}
      absentLoading={absentLoading === m._id}
      theme={theme}
      isDark={isDark}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team</Text>
          <TouchableOpacity onPress={() => setModal({ mode: 'add', initial: {} })} style={styles.addHeaderBtn}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 3 }}>Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>
          {hasTeam ? `${activeStaff.length} active member${activeStaff.length !== 1 ? 's' : ''}` : 'Add your first team member to get started'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
          {!hasTeam && (
            <View style={[styles.soloBanner, { backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff', borderColor: isDark ? 'rgba(99,102,241,0.3)' : '#c7d2fe' }]}>
              <View style={styles.soloIcon}>
                <Ionicons name="people-outline" size={18} color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>You're the whole team right now</Text>
                <Text style={{ color: theme.subText, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                  Add a staff member with their phone number. They can log in instantly using that number via the GlowLoox Partner app — no invite link needed.
                </Text>
              </View>
            </View>
          )}

          {activeStaff.map(renderCard)}

          {inactiveStaff.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.subText }]}>Inactive Members</Text>
              {inactiveStaff.map(renderCard)}
            </>
          )}

          {staff.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="people-outline" size={48} color={theme.subText} />
              <Text style={{ color: theme.subText, marginTop: 8 }}>No team members yet</Text>
            </View>
          )}
        </ScrollView>
      )}

      <StaffFormModal
        mode={modal?.mode || 'add'}
        initial={modal?.initial}
        visible={!!modal}
        onClose={() => setModal(null)}
        onSaved={load}
        theme={theme}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', flex: 1, marginLeft: 8 },
  headerSub: { color: '#c7d2fe', fontSize: 12, marginTop: 6, marginLeft: 8 },
  addHeaderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },

  soloBanner: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  soloIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.18)', alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },

  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#6366f1' },
  name: { fontSize: 15, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  iconBtn: { padding: 6 },
  statBox: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 2 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10 },
  dayPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 10 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 12, borderWidth: 1, marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  fieldHint: { fontSize: 11, marginTop: 5, lineHeight: 15 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  textarea: { height: 70, textAlignVertical: 'top' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  dayChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  dayChipText: { fontSize: 12, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 14 },
  toggleTitle: { fontSize: 13, fontWeight: '600' },
  toggleSub: { fontSize: 11, marginTop: 2 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 10 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
