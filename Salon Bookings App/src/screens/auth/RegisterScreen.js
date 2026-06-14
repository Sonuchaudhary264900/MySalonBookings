import React, { useState, useRef, useEffect } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Linking,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Dimensions
} from 'react-native';
import AppText from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { showError, showSuccess } from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation, route }) {
  const { firebaseLogin } = useAuth();
  const [step, setStep]       = useState(1);
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const confirmationRef       = useRef(null);
  const firebaseTokenRef      = useRef('');
  const nameInputRef          = useRef(null);

  // If LoginScreen verified a brand-new number, jump straight to the name step.
  useEffect(() => {
    if (route?.params?.firebaseToken) {
      firebaseTokenRef.current = route.params.firebaseToken;
      if (route.params.phone) setPhone(route.params.phone);
      setStep(3);
      setTimeout(() => nameInputRef.current?.focus(), 300);
    }
  }, [route?.params?.firebaseToken]);

  const normalizePhone = (p) => {
    const digits = p.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (p.startsWith('+')) return p.trim();
    return `+91${digits}`;
  };

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) { showError('Error', 'Enter a valid 10-digit phone number'); return; }
    setLoading(true);
    try {
      const formattedPhone = normalizePhone(phone);
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      confirmationRef.current = confirmation;
      setStep(2);
      showSuccess('OTP Sent', `Code sent to ${formattedPhone}`);
    } catch (err) {
      showError('Error', err?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { showError('Error', 'Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(otp);
      firebaseTokenRef.current = await result.user.getIdToken();
      showSuccess('Verified! 🎉', 'Phone number confirmed');
      setStep(3);
      setTimeout(() => nameInputRef.current?.focus(), 300);
    } catch (err) {
      showError('Invalid OTP', err?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async () => {
    setLoading(true);
    const finalName = name.trim().length >= 2 ? name.trim() : 'User';
    try {
      // OTP-only: the unified endpoint creates the account (no password).
      await firebaseLogin(firebaseTokenRef.current, finalName);
      showSuccess('Welcome! 🎉', `You're all set${name.trim() ? `, ${finalName}` : ''}`);
      // Auth state flips → app navigates automatically
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Please try again.';
      showError('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../../assets/Icon-1024.png')} style={styles.logoImg} resizeMode="contain" />
          <AppText style={styles.appName}>My Salon Bookings</AppText>
          <AppText style={styles.subtitle}>Create your account in seconds</AppText>
        </View>

        <View style={styles.card}>

          {/* ── STEP 1 — Phone ── */}
          {step === 1 && (
            <>
              <AppText style={styles.cardTitle}>Create Account</AppText>
              <AppText style={styles.cardSubtitle}>Enter your phone number to get started</AppText>

              <View style={styles.field}>
                <AppText style={styles.labelPrimary}>Phone Number</AppText>
                <View style={styles.inputRow}>
                  <Ionicons name="call-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { fontSize: 17, height: 52 }]}
                    placeholder="9876543210"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                    editable={!loading}
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <AppText style={styles.btnText}>Continue</AppText>}
              </TouchableOpacity>

              <AppText style={styles.termsText}>
                By continuing, you agree to our{' '}
                <AppText style={styles.termsLink} onPress={() => Linking.openURL('https://mysalonbookings.com/legal/customer-terms')}>Terms</AppText>
                {' '}&amp;{' '}
                <AppText style={styles.termsLink} onPress={() => Linking.openURL('https://mysalonbookings.com/legal/customer-privacy')}>Privacy Policy</AppText>
              </AppText>

              <AppText style={styles.trustSignal}>Takes less than 10 seconds · No password required</AppText>
            </>
          )}

          {/* ── STEP 2 — OTP ── */}
          {step === 2 && (
            <>
              <AppText style={styles.cardTitle}>Verify Phone</AppText>
              <AppText style={styles.cardSubtitle}>Enter the 6-digit code sent to {normalizePhone(phone)}</AppText>

              <View style={styles.field}>
                <AppText style={styles.label}>OTP Code</AppText>
                <View style={styles.inputRow}>
                  <Ionicons name="key-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { letterSpacing: 8, fontSize: 22, fontWeight: '700' }]}
                    placeholder="• • • • • •"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    editable={!loading}
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, (loading || otp.length !== 6) && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><AppText style={styles.btnText}>Verify &amp; Continue</AppText></>}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setStep(1); setOtp(''); confirmationRef.current = null; }}
                style={{ marginTop: 12, alignItems: 'center' }}
              >
                <AppText style={styles.backLink}>← Change phone number</AppText>
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 3 — Name ── */}
          {step === 3 && (
            <>
              <AppText style={[styles.cardTitle, { textAlign: 'center', fontSize: 20 }]}>What should we call you?</AppText>
              <AppText style={[styles.cardSubtitle, { textAlign: 'center' }]}>You can always update this later</AppText>

              <View style={styles.field}>
                <AppText style={styles.label}>Full Name</AppText>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    ref={nameInputRef}
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor="#9ca3af"
                    value={name}
                    onChangeText={setName}
                    editable={!loading}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleNameSubmit}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleNameSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <AppText style={styles.btnText}>Continue →</AppText>}
              </TouchableOpacity>

              {!name.trim() && (
                <TouchableOpacity onPress={handleNameSubmit} disabled={loading} style={{ marginTop: 12, alignItems: 'center' }}>
                  <AppText style={styles.skipLink}>Skip for now</AppText>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <AppText style={styles.dividerText}>OR</AppText>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerRow}>
            <AppText style={styles.registerText}>Already have an account? </AppText>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <AppText style={styles.registerLink}>Sign In</AppText>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const { height: SCREEN_H } = Dimensions.get('window');
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fff' },
  scroll:       { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header:       { alignItems: 'center', marginBottom: 20 },
  logoImg:      { width: '100%', height: SCREEN_H * 0.40 },
  appName:      { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4, letterSpacing: 0.3 },
  subtitle:     { fontSize: 14, color: '#6b7280' },
  card:         { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  cardTitle:    { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  field:        { marginBottom: 14 },
  label:        { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  labelPrimary: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 6 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 48 },
  inputIcon:    { marginRight: 8 },
  input:        { flex: 1, fontSize: 15, color: '#111827' },
  btn:          { backgroundColor: '#2563eb', borderRadius: 12, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 8 },
  btnDisabled:  { opacity: 0.5 },
  btnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink:     { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  skipLink:     { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  divider:      { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText:  { marginHorizontal: 12, color: '#9ca3af', fontSize: 12 },
  registerRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerLink: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
  termsText:    { fontSize: 12, color: '#9ca3af', lineHeight: 18, textAlign: 'center', marginTop: 8 },
  termsLink:    { color: '#2563eb', fontWeight: '600' },
  trustSignal:  { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4, lineHeight: 18 }
});
