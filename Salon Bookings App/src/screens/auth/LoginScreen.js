import React, { useState, useEffect, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Dimensions
} from 'react-native';
import AppText from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { showError, showSuccess } from '../../utils/toast';

export default function LoginScreen({ navigation }) {
  const { firebaseLogin } = useAuth();
  const [step, setStep]       = useState(1);
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer]     = useState(0);
  const confirmationRef       = useRef(null);
  const handledRef            = useRef(false);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const normalizePhone = (p) => {
    const digits = p.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (p.startsWith('+')) return p.trim();
    return `+91${digits}`;
  };

  const friendlyOtpError = (err) => {
    const code = err?.code || '';
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts from this device. Please wait a while (up to a few hours) and try again.';
    }
    if (code === 'auth/invalid-phone-number') return 'Invalid phone number. Enter a valid 10-digit number.';
    if (code === 'auth/quota-exceeded') return 'SMS limit reached. Please try again later.';
    return err?.message || 'Something went wrong. Try again.';
  };

  // Complete login with an already-verified Firebase user (manual confirm,
  // Android auto-retrieval, or session-expired rescue all funnel here).
  const proceedWithUser = async (fbUser) => {
    if (handledRef.current) return;
    handledRef.current = true;
    setLoading(true);
    try {
      const idToken = await fbUser.getIdToken();
      const res = await firebaseLogin(idToken);
      if (res?.needsName) {
        showSuccess('Verified! 🎉', 'Just one more step');
        navigation.navigate('Register', { phone, firebaseToken: idToken });
      }
      // On success the auth state flips and the app navigates automatically
    } catch (err) {
      handledRef.current = false;
      showError('Login Failed', err?.response?.data?.message || err?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Android instant verification: Firebase may auto-verify the SMS and sign
  // in silently, which consumes the OTP session — confirm() would then throw
  // [auth/session-expired] even for the correct code. Log in directly instead.
  useEffect(() => {
    if (step !== 2) return;
    const unsub = auth().onAuthStateChanged((u) => {
      if (u && u.phoneNumber === normalizePhone(phone)) proceedWithUser(u);
    });
    return unsub;
  }, [step, phone]);

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) { showError('Error', 'Enter a valid 10-digit phone number'); return; }
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(normalizePhone(phone));
      confirmationRef.current = confirmation;
      handledRef.current = false;
      setStep(2);
      setTimer(60);
      showSuccess('OTP Sent', `Code sent to ${normalizePhone(phone)}`);
    } catch (err) {
      showError('Error', friendlyOtpError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) { showError('Error', 'Enter the 6-digit OTP'); return; }
    if (handledRef.current) return; // auto-verification already handled it
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(otp);
      await proceedWithUser(result.user);
    } catch (err) {
      // Session already consumed by Android auto-verification — the user IS
      // verified, so continue instead of showing a bogus "Invalid OTP".
      const cur = auth().currentUser;
      const code = err?.code || '';
      if (cur && cur.phoneNumber === normalizePhone(phone) &&
          (code === 'auth/session-expired' || code === 'auth/code-expired' || code === 'auth/unknown')) {
        await proceedWithUser(cur);
        return;
      }
      showError('Invalid OTP', err?.response?.data?.message || err?.message || 'Please try again.');
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
          <AppText style={styles.appName}>GlowLoox</AppText>
          <AppText style={styles.subtitle}>Book your perfect look</AppText>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === 1 ? (
            <>
              <AppText style={styles.cardTitle}>Welcome</AppText>
              <AppText style={styles.cardSubtitle}>Sign in with your phone number</AppText>

              <View style={styles.field}>
                <AppText style={styles.label}>Phone Number</AppText>
                <View style={styles.inputRow}>
                  <Ionicons name="call-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { fontSize: 17, height: 52 }]}
                    placeholder="9876543210"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
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
                {loading ? <ActivityIndicator color="#fff" /> : <AppText style={styles.btnText}>Send OTP</AppText>}
              </TouchableOpacity>

              <AppText style={styles.trustSignal}>No password needed · We'll text you a code</AppText>
            </>
          ) : (
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
                onPress={handleVerify}
                disabled={loading || otp.length !== 6}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><AppText style={styles.btnText}>Verify &amp; Continue</AppText></>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.linkBtn, { opacity: timer > 0 ? 0.5 : 1 }]}
                onPress={timer === 0 ? handleSendOtp : undefined}
                disabled={timer > 0}
              >
                <AppText style={styles.linkText}>{timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setStep(1); setOtp(''); confirmationRef.current = null; handledRef.current = false; }}
                style={styles.linkBtn}
              >
                <AppText style={styles.linkText}>← Change phone number</AppText>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <AppText style={styles.dividerText}>OR</AppText>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerRow}>
            <AppText style={styles.registerText}>New here? </AppText>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <AppText style={styles.registerLink}>Create Account</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const { height: SCREEN_H } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 20 },
  logoImg: { width: 120, height: 120, borderRadius: 28, marginBottom: 12 },
  appName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4, letterSpacing: 0.3 },
  subtitle: { fontSize: 14, color: '#6b7280' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 48 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  btn: { backgroundColor: '#2563eb', borderRadius: 12, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 12 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkBtn: { alignItems: 'center', marginTop: 4, marginBottom: 6 },
  linkText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  trustSignal: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4, lineHeight: 18 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, color: '#9ca3af', fontSize: 12 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerLink: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
});
