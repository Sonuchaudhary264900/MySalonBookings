import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { useOnboarding } from '../../../context/OnboardingContext';

export default function Step1_Phone({ confirmationRef }) {
  const { phone, setPhone, nextStep } = useOnboarding();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhone = (raw) => {
    const d = raw.replace(/\D/g, '');
    if (d.length === 10) return `+91${d}`;
    if (d.length === 12 && d.startsWith('91')) return `+${d}`;
    if (raw.startsWith('+')) return raw.trim();
    return `+91${d}`;
  };

  const handleSend = async () => {
    setError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setError('Enter a valid 10-digit phone number'); return; }
    const first = digits.length === 10 ? digits[0] : digits[2];
    if (!['6','7','8','9'].includes(first)) { setError('Enter a valid Indian mobile number'); return; }

    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(formatPhone(phone));
      confirmationRef.current = confirmation;
      nextStep();
    } catch (e) {
      setError(e?.message || 'Failed to send OTP. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.icon}>
          <Ionicons name="phone-portrait-outline" size={40} color="#818cf8" />
        </View>
        <Text style={s.title}>Enter Your Phone</Text>
        <Text style={s.sub}>We'll send a verification code via SMS</Text>

        <View style={s.field}>
          <Text style={s.label}>Phone Number</Text>
          <View style={[s.inputRow, error ? s.inputRowErr : null]}>
            <View style={s.prefix}>
              <Text style={s.prefixText}>🇮🇳 +91</Text>
            </View>
            <View style={s.sep} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="98765 43210"
              placeholderTextColor="#4b5563"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={t => { setPhone(t); setError(''); }}
              maxLength={13}
              editable={!loading}
            />
          </View>
          {!!error && <Text style={s.err}>{error}</Text>}
        </View>

        <View style={s.socialProof}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#22c55e" />
          <Text style={s.socialText}>12,000+ business owners trust us</Text>
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnOff]}
          onPress={handleSend}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={s.btnText}>Send OTP</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:      { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 32 },
  icon:        { alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(99,102,241,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:       { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 6 },
  sub:         { fontSize: 14, color: '#94a3b8', marginBottom: 28 },
  field:       { marginBottom: 18 },
  label:       { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 8 },
  inputRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.35)', borderRadius: 14, paddingHorizontal: 14, height: 54, backgroundColor: 'rgba(255,255,255,0.05)' },
  inputRowErr: { borderColor: '#ef4444' },
  prefix:      { paddingRight: 10 },
  prefixText:  { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  sep:         { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.12)', marginRight: 12 },
  input:       { fontSize: 16, color: '#f1f5f9' },
  err:         { fontSize: 12, color: '#f87171', marginTop: 6 },
  socialProof: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 10, padding: 10, marginBottom: 24 },
  socialText:  { fontSize: 13, color: '#86efac' },
  btn:         { backgroundColor: '#6366f1', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnOff:      { opacity: 0.5 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },
});
