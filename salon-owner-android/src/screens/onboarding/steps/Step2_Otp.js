import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { useOnboarding } from '../../../context/OnboardingContext';

export default function Step2_Otp({ confirmationRef }) {
  const { phone, setFirebaseToken, nextStep, prevStep } = useOnboarding();
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [error, setError]       = useState('');
  const [timer, setTimer]       = useState(60);
  const [loading, setLoading]   = useState(false);
  const refs                    = useRef([]);

  useEffect(() => {
    setTimer(60);
    const id = setInterval(() => setTimer(t => { if (t <= 1) { clearInterval(id); return 0; } return t - 1; }), 1000);
    return () => clearInterval(id);
  }, []);

  const formatPhone = (raw) => {
    const d = raw.replace(/\D/g, '');
    return d.length === 10 ? `+91${d}` : raw;
  };

  const handleChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const handleVerify = async () => {
    setError('');
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter the complete 6-digit code'); return; }
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(code);
      const token = await result.user.getIdToken();
      setFirebaseToken(token);
      nextStep();
    } catch {
      setError('Invalid code. Please check and try again.');
      setOtp(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(formatPhone(phone));
      confirmationRef.current = confirmation;
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      setError('');
    } catch (e) {
      setError(e?.message || 'Failed to resend OTP');
    } finally { setLoading(false); }
  };

  const filled = otp.join('').length === 6;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.iconWrap}>
          <Ionicons name="shield-checkmark-outline" size={38} color="#818cf8" />
        </View>
        <Text style={s.title}>Verify Phone</Text>
        <Text style={s.sub}>Code sent to {formatPhone(phone)}</Text>

        <View style={s.hint}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#94a3b8" />
          <Text style={s.hintText}>Check your SMS messages</Text>
        </View>

        <View style={s.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={r => refs.current[idx] = r}
              style={[s.cell, digit && s.cellFilled, error && s.cellErr]}
              value={digit}
              onChangeText={v => handleChange(v, idx)}
              onKeyPress={e => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              editable={!loading}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        {!!error && (
          <View style={s.errWrap}>
            <Ionicons name="alert-circle-outline" size={15} color="#f87171" />
            <Text style={s.err}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.btn, (!filled || loading) && s.btnOff]}
          onPress={handleVerify}
          disabled={!filled || loading}
          activeOpacity={0.88}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={s.btnText}>Verify Code</Text>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <View style={s.resendRow}>
          {timer > 0
            ? <Text style={s.timerText}>Resend in {timer}s</Text>
            : <TouchableOpacity onPress={handleResend} disabled={loading}>
                <Text style={s.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
          }
        </View>

        <TouchableOpacity style={s.backRow} onPress={prevStep}>
          <Ionicons name="arrow-back" size={16} color="#818cf8" />
          <Text style={s.backText}>Change phone number</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:    { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 32 },
  iconWrap:  { alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(99,102,241,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:     { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 6 },
  sub:       { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  hint:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 12, padding: 14, marginBottom: 28, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  hintText:  { fontSize: 13, color: '#94a3b8' },
  otpRow:    { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  cell:      { width: 46, height: 58, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: 24, fontWeight: '800', color: '#f1f5f9', textAlign: 'center' },
  cellFilled:{ borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.15)' },
  cellErr:   { borderColor: '#ef4444' },
  errWrap:   { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 8 },
  err:       { fontSize: 13, color: '#f87171' },
  btn:       { backgroundColor: '#6366f1', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnOff:    { opacity: 0.5 },
  btnText:   { color: '#fff', fontSize: 16, fontWeight: '800' },
  resendRow: { alignItems: 'center', marginTop: 18 },
  timerText: { fontSize: 13, color: '#475569' },
  resendLink:{ fontSize: 14, color: '#818cf8', fontWeight: '700' },
  backRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  backText:  { fontSize: 14, color: '#818cf8', fontWeight: '600' },
});
