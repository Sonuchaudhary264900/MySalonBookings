import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useOnboarding } from '../../../context/OnboardingContext';
import api from '../../../services/api';

// Mirrors website Step3_ProfileSetup — account already exists (created at
// Register); this step just saves the owner's display name + referral code.
export default function Step3_Profile() {
  const { updateProfile, user } = useAuth();
  const {
    ownerName, setOwnerName,
    referralCode, setReferralCode,
    nextStep,
  } = useOnboarding();

  const [referralOpen, setReferralOpen] = useState(!!referralCode);
  const [loading, setLoading] = useState(false);

  // Pre-fill once from the account if the draft was empty
  useEffect(() => {
    if (!ownerName && user?.name) setOwnerName(user.name);
  }, []);

  const name = ownerName;
  const isValid = name.trim().length >= 2;

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    try {
      setOwnerName(name.trim());
      await updateProfile({ name: name.trim() });
      if (referralCode.trim()) {
        try { await api.post('/owner/referral/apply', { code: referralCode.trim().toUpperCase() }); } catch {}
      }
      nextStep();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <View style={s.iconWrap}>
          <Ionicons name="hand-left-outline" size={38} color="#a78bfa" />
        </View>

        <Text style={s.title}>What's your name?</Text>
        <Text style={s.sub}>This is how your customers and our team will address you.</Text>

        {/* Big name input — matches website's underlined hero input */}
        <View style={s.nameWrap}>
          <TextInput
            style={s.nameInp}
            placeholder="Your full name"
            placeholderTextColor="rgba(241,245,249,0.22)"
            value={name}
            onChangeText={setOwnerName}
            editable={!loading}
            autoFocus
          />
          <View style={[s.underline, { opacity: name ? 1 : 0.3 }]} />
        </View>

        {/* Referral code — collapsible like the website */}
        <TouchableOpacity style={s.refToggle} onPress={() => setReferralOpen(o => !o)}>
          <Ionicons name={referralOpen ? 'chevron-down' : 'chevron-forward'} size={14} color="#a78bfa" />
          <Text style={s.refToggleText}>Have a referral code?</Text>
        </TouchableOpacity>

        {referralOpen && (
          <View style={s.row}>
            <Ionicons name="gift-outline" size={18} color="#818cf8" style={s.ic} />
            <TextInput
              style={[s.inp, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 2 }]}
              placeholder="e.g. GLX123456"
              placeholderTextColor="#4b5563"
              value={referralCode}
              onChangeText={t => setReferralCode(t.toUpperCase())}
              maxLength={12}
              autoCapitalize="characters"
              editable={!loading}
            />
          </View>
        )}

        <TouchableOpacity
          style={[s.btn, (!isValid || loading) && s.btnOff]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
          activeOpacity={0.88}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={s.btnText}>Let's go</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <Text style={s.termsNote}>
          By continuing you agree to our{' '}
          <Text style={s.termsLink} onPress={() => Linking.openURL('https://owner.glowloox.com/legal/owner-terms')}>Terms</Text>
          {' '}&{' '}
          <Text style={s.termsLink} onPress={() => Linking.openURL('https://owner.glowloox.com/legal/owner-privacy')}>Privacy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:       { flexGrow: 1, paddingHorizontal: 4, paddingTop: 28, paddingBottom: 32, justifyContent: 'center' },
  iconWrap:     { marginBottom: 20 },
  title:        { fontSize: 30, fontWeight: '900', color: '#f1f5f9', marginBottom: 10, letterSpacing: -1 },
  sub:          { fontSize: 15, color: 'rgba(255,255,255,0.38)', marginBottom: 40, lineHeight: 22 },
  nameWrap:     { marginBottom: 32 },
  nameInp:      { fontSize: 30, fontWeight: '800', color: '#f1f5f9', letterSpacing: -0.5, paddingVertical: 6 },
  underline:    { height: 3, borderRadius: 99, backgroundColor: '#7c3aed' },
  refToggle:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  refToggleText:{ fontSize: 13, fontWeight: '600', color: '#a78bfa' },
  row:          { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 14, paddingHorizontal: 14, height: 52, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
  ic:           { marginRight: 10 },
  inp:          { flex: 1, fontSize: 15, color: '#f1f5f9' },
  btn:          { backgroundColor: '#7c3aed', borderRadius: 18, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnOff:       { opacity: 0.45 },
  btnText:      { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  termsNote:    { textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 18, lineHeight: 18 },
  termsLink:    { color: '#a78bfa', fontWeight: '600' },
});
