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

function pwStrength(pw) {
  if (!pw) return null;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[!@#$%^&*]/.test(pw)) s++;
  return [
    { label: 'Very Weak',  color: '#ef4444', pct: 0.2 },
    { label: 'Weak',       color: '#f97316', pct: 0.4 },
    { label: 'Fair',       color: '#eab308', pct: 0.6 },
    { label: 'Strong',     color: '#22c55e', pct: 0.8 },
    { label: 'Very Strong',color: '#10b981', pct: 1.0 },
  ][s - 1] || { label: 'Very Weak', color: '#ef4444', pct: 0.2 };
}

export default function Step3_Profile() {
  const { refreshUser } = useAuth();
  const {
    firebaseToken,
    ownerName, setOwnerName,
    ownerEmail, setOwnerEmail,
    ownerGender, setOwnerGender,
    password, setPassword,
    referralCode, setReferralCode,
    nextStep,
  } = useOnboarding();

  const [confirmPw, setConfirmPw]   = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [showCPw, setShowCPw]       = useState(false);
  const [agreed, setAgreed]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const strength                    = pwStrength(password);

  const handleRegister = async () => {
    if (!ownerName.trim() || ownerName.trim().length < 2) { Alert.alert('Error', 'Name must be at least 2 characters'); return; }
    if (!ownerGender) { Alert.alert('Error', 'Please select your gender'); return; }
    if (!ownerEmail.trim() || !/\S+@\S+\.\S+/.test(ownerEmail)) { Alert.alert('Error', 'Enter a valid email address'); return; }
    if (password.length < 8) { Alert.alert('Weak Password', 'Password must be at least 8 characters'); return; }
    if (password !== confirmPw) { Alert.alert('Error', 'Passwords do not match'); return; }
    if (!agreed) { Alert.alert('Terms Required', 'Please accept the Terms & Conditions'); return; }

    setLoading(true);
    try {
      const res = await api.post('/owner/auth/firebase-register', {
        firebaseToken,
        name: ownerName.trim(),
        email: ownerEmail.trim().toLowerCase(),
        password,
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

        {/* Email */}
        <View style={s.field}>
          <Text style={s.label}>Email Address <Text style={s.req}>*</Text></Text>
          <View style={s.row}>
            <Ionicons name="mail-outline" size={18} color="#818cf8" style={s.ic} />
            <TextInput style={s.inp} placeholder="your@email.com" placeholderTextColor="#4b5563" keyboardType="email-address" autoCapitalize="none" value={ownerEmail} onChangeText={setOwnerEmail} editable={!loading} />
            {ownerEmail.includes('@') && ownerEmail.includes('.') && (
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            )}
          </View>
        </View>

        {/* Password */}
        <View style={s.field}>
          <Text style={s.label}>Password <Text style={s.req}>*</Text></Text>
          <View style={s.row}>
            <Ionicons name="lock-closed-outline" size={18} color="#818cf8" style={s.ic} />
            <TextInput style={[s.inp, { flex: 1 }]} placeholder="Min 8 characters" placeholderTextColor="#4b5563" secureTextEntry={!showPw} value={password} onChangeText={setPassword} editable={!loading} />
            <TouchableOpacity onPress={() => setShowPw(!showPw)}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {password.length > 0 && strength && (
            <View style={s.strengthRow}>
              <View style={s.strengthBg}><View style={[s.strengthFill, { width: `${strength.pct * 100}%`, backgroundColor: strength.color }]} /></View>
              <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}
        </View>

        {/* Confirm password */}
        <View style={s.field}>
          <Text style={s.label}>Confirm Password <Text style={s.req}>*</Text></Text>
          <View style={s.row}>
            <Ionicons name="lock-closed-outline" size={18} color="#818cf8" style={s.ic} />
            <TextInput style={[s.inp, { flex: 1 }]} placeholder="Re-enter password" placeholderTextColor="#4b5563" secureTextEntry={!showCPw} value={confirmPw} onChangeText={setConfirmPw} editable={!loading} />
            {confirmPw.length > 0 && confirmPw === password
              ? <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              : <TouchableOpacity onPress={() => setShowCPw(!showCPw)}><Ionicons name={showCPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" /></TouchableOpacity>
            }
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

        {/* Terms */}
        <TouchableOpacity style={s.termsRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
          <View style={[s.cb, agreed && s.cbOn]}>
            {agreed && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Text style={s.termsText}>
            I agree to the{' '}
            <Text style={s.termsLink} onPress={() => Linking.openURL('https://owner.mysalonbookings.com/legal/owner-terms')}>Terms & Conditions</Text>
            {' '}and{' '}
            <Text style={s.termsLink} onPress={() => Linking.openURL('https://owner.mysalonbookings.com/legal/owner-privacy')}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.btn, (loading || !agreed) && s.btnOff]}
          onPress={handleRegister}
          disabled={loading || !agreed}
          activeOpacity={0.88}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={s.btnText}>Create Account</Text>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:      { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 32 },
  title:       { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 6 },
  sub:         { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  field:       { marginBottom: 14 },
  label:       { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 7 },
  req:         { color: '#f87171' },
  opt:         { color: '#475569', fontWeight: '400' },
  row:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 14, paddingHorizontal: 14, height: 52, backgroundColor: 'rgba(255,255,255,0.05)' },
  ic:          { marginRight: 10 },
  inp:         { flex: 1, fontSize: 15, color: '#f1f5f9' },
  genderRow:   { flexDirection: 'row', gap: 10 },
  gChip:       { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(255,255,255,0.05)' },
  gChipOn:     { backgroundColor: 'rgba(99,102,241,0.22)', borderColor: '#6366f1' },
  gEmoji:      { fontSize: 20, marginBottom: 3 },
  gLabel:      { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  gLabelOn:    { color: '#c4b5fd' },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 },
  strengthBg:  { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  strengthFill:{ height: 4, borderRadius: 2 },
  strengthLabel:{ fontSize: 11, fontWeight: '700', width: 72, textAlign: 'right' },
  termsRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  cb:          { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(99,102,241,0.4)', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.05)' },
  cbOn:        { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  termsText:   { flex: 1, fontSize: 13, color: '#94a3b8', lineHeight: 20 },
  termsLink:   { color: '#818cf8', fontWeight: '600' },
  btn:         { backgroundColor: '#6366f1', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnOff:      { opacity: 0.5 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },
});
