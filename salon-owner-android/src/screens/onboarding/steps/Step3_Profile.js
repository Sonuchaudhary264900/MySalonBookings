import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../context/AuthContext';
import { useOnboarding } from '../../../context/OnboardingContext';
import api from '../../../services/api';

const GENDER_OPTS = [
  { value: 'male',   label: 'Male',   emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'other',  label: 'Other',  emoji: '🧑' },
];

export default function Step3_Profile() {
  const { refreshUser } = useAuth();
  const {
    phone,
    firebaseToken,
    ownerName, setOwnerName,
    ownerGender, setOwnerGender,
    referralCode, setReferralCode,
    nextStep,
  } = useOnboarding();

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!ownerName.trim() || ownerName.trim().length < 2) { Alert.alert('Error', 'Name must be at least 2 characters'); return; }

    setLoading(true);
    try {
      const res = await api.post('/owner/auth/firebase-register', {
        firebaseToken,
        name: ownerName.trim(),
        gender: ownerGender,
      });
      if (!res.data.success) throw new Error(res.data.message || 'Registration failed');
      const { token, refreshToken } = res.data.data;
      await AsyncStorage.setItem('token', token);
      if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
      if (referralCode.trim()) {
        try { await api.post('/owner/referral/apply', { code: referralCode.trim() }); } catch {}
      }
      await refreshUser();
      nextStep();
    } catch (e) {
      Alert.alert('Registration Failed', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Complete Profile</Text>
        <Text style={s.sub}>Almost there! Fill in your details</Text>

        {/* Verified phone banner */}
        {!!phone && (
          <View style={s.phoneBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={s.phoneBannerText}>Phone verified: {phone}</Text>
          </View>
        )}

        {/* Name */}
        <View style={s.field}>
          <Text style={s.label}>Full Name <Text style={s.req}>*</Text></Text>
          <View style={s.row}>
            <Ionicons name="person-outline" size={18} color="#818cf8" style={s.ic} />
            <TextInput style={s.inp} placeholder="Your full name" placeholderTextColor="#4b5563" value={ownerName} onChangeText={setOwnerName} editable={!loading} />
          </View>
        </View>

        {/* Gender */}
        <View style={s.field}>
          <Text style={s.label}>Gender <Text style={s.req}>*</Text></Text>
          <View style={s.genderRow}>
            {GENDER_OPTS.map(g => (
              <TouchableOpacity
                key={g.value}
                style={[s.gChip, ownerGender === g.value && s.gChipOn]}
                onPress={() => setOwnerGender(g.value)}
              >
                <Text style={s.gEmoji}>{g.emoji}</Text>
                <Text style={[s.gLabel, ownerGender === g.value && s.gLabelOn]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Referral */}
        <View style={s.field}>
          <Text style={s.label}>Referral Code <Text style={s.opt}>(optional)</Text></Text>
          <View style={s.row}>
            <Ionicons name="gift-outline" size={18} color="#818cf8" style={s.ic} />
            <TextInput
              style={[s.inp, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 2 }]}
              placeholder="e.g. MSB123456"
              placeholderTextColor="#4b5563"
              value={referralCode}
              onChangeText={t => setReferralCode(t.toUpperCase())}
              maxLength={9}
              autoCapitalize="characters"
              editable={!loading}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnOff]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={s.btnText}>Create Account</Text>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <Text style={s.termsNote}>
          By continuing you agree to our{' '}
          <Text style={s.termsLink} onPress={() => Linking.openURL('https://owner.glowloox.com/legal/owner-terms')}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={s.termsLink} onPress={() => Linking.openURL('https://owner.glowloox.com/legal/owner-privacy')}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:         { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 32 },
  title:          { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 6 },
  sub:            { fontSize: 14, color: '#94a3b8', marginBottom: 16 },
  phoneBanner:    { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16 },
  phoneBannerText:{ fontSize: 13, color: '#10b981', fontWeight: '600', flex: 1 },
  field:          { marginBottom: 14 },
  label:          { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 7 },
  req:            { color: '#f87171' },
  opt:            { color: '#475569', fontWeight: '400' },
  row:            { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 14, paddingHorizontal: 14, height: 52, backgroundColor: 'rgba(255,255,255,0.05)' },
  ic:             { marginRight: 10 },
  inp:            { flex: 1, fontSize: 15, color: '#f1f5f9' },
  genderRow:      { flexDirection: 'row', gap: 10 },
  gChip:          { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(255,255,255,0.05)' },
  gChipOn:        { backgroundColor: 'rgba(99,102,241,0.22)', borderColor: '#6366f1' },
  gEmoji:         { fontSize: 20, marginBottom: 3 },
  gLabel:         { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  gLabelOn:       { color: '#c4b5fd' },
  termsNote:      { textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 14, lineHeight: 18 },
  termsLink:      { color: '#818cf8', fontWeight: '600' },
  btn:            { backgroundColor: '#6366f1', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnOff:         { opacity: 0.5 },
  btnText:        { color: '#fff', fontSize: 16, fontWeight: '800' },
});
