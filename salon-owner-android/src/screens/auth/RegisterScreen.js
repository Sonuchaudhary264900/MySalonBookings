import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import auth from '@react-native-firebase/auth';
import { useAuth } from '../../context/AuthContext';

// Phone Number Hint is an optional native module (SIM/Google number picker).
// Guard the require so a build that hasn't linked it — e.g. a stale dev
// client — degrades to manual entry instead of white-screening the app.
let isAvailableAsync = async () => false;
let showPhoneNumberHintAsync = async () => null;
try {
  const hintMod = require('expo-phone-number-hint');
  if (hintMod?.isAvailableAsync) isAvailableAsync = hintMod.isAvailableAsync;
  if (hintMod?.showPhoneNumberHintAsync) showPhoneNumberHintAsync = hintMod.showPhoneNumberHintAsync;
} catch { /* native module unavailable — phone hint simply won't show */ }

const { width: W, height: H } = Dimensions.get('window');

// Mirrors website Register.jsx stats strip
const STATS = [
  { icon: 'people-outline',     value: '500+',    label: 'GlowLoox partners' },
  { icon: 'trending-up-outline', value: '₹2.4Cr', label: 'Bookings processed' },
  { icon: 'flash-outline',      value: '< 3 min', label: 'Setup time' },
];

export default function RegisterScreen({ navigation }) {
  const { firebaseRegister } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);
  const confirmationRef = useRef(null);
  const handledRef = useRef(false);
  const hintTriedRef = useRef(false);

  useEffect(() => {
    if (step !== 2) return;
    setResendTimer(60);
    const id = setInterval(() => setResendTimer(t => { if (t <= 1) { clearInterval(id); return 0; } return t - 1; }), 1000);
    return () => clearInterval(id);
  }, [step]);

  // Tapping the phone field offers the on-device SIM/Google number picker
  // (Android's Phone Number Hint) instead of forcing manual typing.
  const handlePhoneFocus = async () => {
    if (hintTriedRef.current || phone) return;
    hintTriedRef.current = true;
    try {
      if (!(await isAvailableAsync())) return;
      const hinted = await showPhoneNumberHintAsync();
      if (hinted) {
        const digits = hinted.replace(/\D/g, '');
        setPhone(digits.length >= 10 ? digits.slice(-10) : digits);
        setPhoneError('');
      }
    } catch {
      // Picker unavailable/dismissed — user can still type the number
    }
  };

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (raw.startsWith('+')) return raw.trim();
    return `+91${digits}`;
  };

  const friendlyOtpError = (err) => {
    const code = err?.code || '';
    if (code === 'auth/too-many-requests') return 'Too many attempts from this device. Please wait a while (up to a few hours) and try again.';
    if (code === 'auth/invalid-phone-number') return 'Invalid phone number. Enter a valid 10-digit number.';
    if (code === 'auth/quota-exceeded') return 'SMS limit reached. Please try again later.';
    return err?.message || 'Something went wrong. Try again.';
  };

  // Register with a verified Firebase user (manual confirm, Android
  // auto-retrieval, or session-expired rescue all funnel here).
  const completeRegister = async (firebaseToken) => {
    setLoading(true);
    try {
      // Registers the account; existing accounts (409) auto-login — same as website
      await firebaseRegister(firebaseToken);
      // Auth state flips — RootNavigator routes to onboarding / approval / dashboard
    } catch (err) {
      handledRef.current = false; // allow retry
      Alert.alert('Registration Failed', err.response?.data?.message || err?.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  // Android instant verification — Firebase may sign in silently when the
  // SMS arrives; confirm() would then throw [auth/session-expired].
  useEffect(() => {
    if (step !== 2) return;
    const unsub = auth().onAuthStateChanged((u) => {
      if (u && u.phoneNumber === formatPhone(phone) && !handledRef.current) {
        handledRef.current = true;
        u.getIdToken()
          .then(t => completeRegister(t))
          .catch(() => { handledRef.current = false; });
      }
    });
    return unsub;
  }, [step, phone]);

  const handleSendOtp = async () => {
    setPhoneError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setPhoneError('Enter a valid 10-digit phone number'); return; }
    const first = digits.length === 10 ? digits[0] : digits[2];
    if (!['6','7','8','9'].includes(first)) { setPhoneError('Enter a valid Indian mobile number'); return; }
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(formatPhone(phone));
      confirmationRef.current = confirmation;
      handledRef.current = false;
      setStep(2);
    } catch (err) {
      setPhoneError(friendlyOtpError(err));
    } finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(formatPhone(phone));
      confirmationRef.current = confirmation;
      handledRef.current = false;
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
    } catch (err) {
      Alert.alert('Error', friendlyOtpError(err));
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    const code = otp.join('');
    if (code.length !== 6) { setOtpError('Enter the complete 6-digit code'); return; }
    if (handledRef.current) return; // auto-verification already handled it
    if (!confirmationRef.current) { setOtpError('Session expired. Please resend OTP.'); return; }
    setLoading(true);
    let firebaseToken;
    try {
      const result = await confirmationRef.current.confirm(code);
      firebaseToken = await result.user.getIdToken();
    } catch (err) {
      // Session consumed by Android auto-verification — the user IS verified
      const cur = auth().currentUser;
      const errCode = err?.code || '';
      if (cur && cur.phoneNumber === formatPhone(phone) &&
          (errCode === 'auth/session-expired' || errCode === 'auth/code-expired' || errCode === 'auth/unknown')) {
        firebaseToken = await cur.getIdToken();
      } else {
        const msg = (err?.message || '').toLowerCase();
        if (errCode === 'auth/too-many-requests') {
          setOtpError(friendlyOtpError(err));
        } else {
          setOtpError(msg.includes('invalid') || msg.includes('otp') || msg.includes('wrong-code')
            ? 'Invalid OTP. Please check and try again.'
            : 'OTP verification failed. Please try again.');
        }
        setLoading(false);
        return;
      }
    }

    handledRef.current = true;
    await completeRegister(firebaseToken);
  };

  const handleOtpChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    if (val.length > 1) {
      // Autofill/paste of the full code lands in one field — spread it
      // across all six boxes instead of treating it as one digit.
      const digits = val.slice(0, 6).split('');
      const next = [...otp];
      for (let i = 0; i < 6; i++) next[i] = digits[i] || '';
      setOtp(next);
      otpRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const otpFilled = otp.join('').length === 6;
  const autoSubmittedRef = useRef(false);

  // Auto-submit the instant the 6th digit lands — typed, pasted, or filled
  // by the OS SMS/Autofill suggestion — no extra tap needed.
  useEffect(() => {
    if (!otpFilled) { autoSubmittedRef.current = false; return; }
    if (step === 2 && !autoSubmittedRef.current && !loading) {
      autoSubmittedRef.current = true;
      handleVerifyOtp();
    }
  }, [otpFilled, step]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + brand */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Image source={require('../../../assets/Icon-1024.png')} style={styles.logoImg} resizeMode="contain" />
            </View>
            <Text style={styles.appName}>GlowLoox</Text>
            <View style={styles.pillBadge}>
              <View style={styles.pillDot} />
              <Text style={styles.pillText}>Partner Platform</Text>
            </View>
          </View>

          {/* Stats strip — mirrors website hero stats */}
          <View style={styles.statsRow}>
            {STATS.map(st => (
              <View key={st.label} style={styles.statCard}>
                <Ionicons name={st.icon} size={14} color="rgba(167,139,250,0.9)" />
                <Text style={styles.statValue}>{st.value}</Text>
                <Text style={styles.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>

            {/* Step 1: Phone */}
            {step === 1 && (
              <>
                <Text style={styles.cardTitle}>Create your account</Text>
                <Text style={styles.cardSubtitle}>Get set up in under 3 minutes. No credit card needed.</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={[styles.inputRow, phoneError ? styles.inputRowError : styles.inputRowNormal]}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <View style={styles.inputDivider} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="98765 43210"
                      placeholderTextColor="#4b5563"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      importantForAutofill="yes"
                      value={phone}
                      onChangeText={t => { setPhone(t); setPhoneError(''); }}
                      onFocus={handlePhoneFocus}
                      maxLength={13}
                      editable={!loading}
                    />
                  </View>
                  {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
                </View>

                <TouchableOpacity
                  style={[styles.btn, loading && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.btnText}>Send OTP</Text>
                      <View style={styles.btnArrow}>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </View>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.footerRow}>
                  <Text style={styles.footerHint}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.footerLink}>Sign in</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 2: OTP */}
            {step === 2 && (
              <>
                <Text style={styles.cardTitle}>Enter OTP</Text>
                <Text style={styles.cardSubtitle}>Code sent to {formatPhone(phone)}</Text>

                <View style={styles.otpBoxWrap}>
                  <Ionicons name="phone-portrait-outline" size={28} color="#818cf8" />
                  <Text style={styles.otpHint}>Check your SMS messages</Text>
                </View>

                <View style={styles.otpRow}>
                  {otp.map((digit, idx) => (
                    <TextInput
                      key={idx}
                      ref={r => otpRefs.current[idx] = r}
                      style={[styles.otpCell, !!digit && styles.otpCellFilled, !!otpError && styles.otpCellError]}
                      value={digit}
                      onChangeText={val => handleOtpChange(val, idx)}
                      onKeyPress={e => handleOtpKeyPress(e, idx)}
                      keyboardType="number-pad"
                      maxLength={idx === 0 ? 6 : 1}
                      editable={!loading}
                      textAlign="center"
                      selectTextOnFocus
                      autoComplete={idx === 0 ? 'sms-otp' : 'off'}
                      textContentType={idx === 0 ? 'oneTimeCode' : 'none'}
                      importantForAutofill={idx === 0 ? 'yes' : 'no'}
                    />
                  ))}
                </View>
                {!!otpError && <Text style={[styles.errorText, { textAlign: 'center', marginTop: 8 }]}>{otpError}</Text>}

                <TouchableOpacity
                  style={[styles.btn, (!otpFilled || loading) && styles.btnDisabled, { marginTop: 20 }]}
                  onPress={handleVerifyOtp}
                  disabled={!otpFilled || loading}
                  activeOpacity={0.88}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.btnText}>Continue</Text>
                      <View style={styles.btnArrow}>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </View>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.resendRow}>
                  {resendTimer > 0 ? (
                    <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                  ) : (
                    <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                      <Text style={styles.resendLink}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity onPress={() => { setStep(1); setOtp(['','','','','','']); setOtpError(''); }} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={16} color="#818cf8" />
                  <Text style={styles.backLink}>Change phone number</Text>
                </TouchableOpacity>
              </>
            )}

          </View>

          {/* Trust row — mirrors website trust items */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark-outline" size={13} color="rgba(167,139,250,0.8)" />
              <Text style={styles.trustText}>Bank-grade secure</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="flash-outline" size={13} color="rgba(167,139,250,0.8)" />
              <Text style={styles.trustText}>Free to get started</Text>
            </View>
          </View>

          <Text style={styles.footerText}>By registering, you agree to our Terms of Service & Privacy Policy</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070714', overflow: 'hidden' },
  orb1: { position: 'absolute', width: W * 0.85, height: W * 0.85, borderRadius: W * 0.425, backgroundColor: '#7c3aed', top: -W * 0.22, left: -W * 0.18, opacity: 0.35 },
  orb2: { position: 'absolute', width: W * 0.6, height: W * 0.6, borderRadius: W * 0.3, backgroundColor: '#ec4899', top: H * 0.1, right: -W * 0.2, opacity: 0.18 },
  orb3: { position: 'absolute', width: W * 0.5, height: W * 0.5, borderRadius: W * 0.25, backgroundColor: '#2563eb', bottom: H * 0.08, left: -W * 0.15, opacity: 0.14 },

  scroll: { flexGrow: 1, paddingHorizontal: 22 },

  header: { alignItems: 'center', marginBottom: 20 },
  logoCircle: { width: W * 0.3, height: W * 0.3, borderRadius: W * 0.15, backgroundColor: '#0d0d2b', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12, borderWidth: 2.5, borderColor: 'rgba(56,189,248,0.5)', shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 10 },
  logoImg: { width: W * 0.66, height: W * 0.66 },
  appName: { fontSize: 20, fontWeight: '800', color: '#f1f5f9', letterSpacing: 0.3, marginBottom: 10 },
  pillBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(124,58,237,0.18)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#a78bfa' },
  pillText: { fontSize: 11, fontWeight: '700', color: '#c4b5fd', letterSpacing: 1, textTransform: 'uppercase' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, gap: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#f1f5f9', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },

  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, padding: 24 },
  cardTitle: { fontSize: 24, fontWeight: '900', color: '#f1f5f9', marginBottom: 6, letterSpacing: -0.5 },
  cardSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 22, lineHeight: 20 },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 7 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 50, backgroundColor: 'rgba(255,255,255,0.05)' },
  inputRowNormal: { borderColor: 'rgba(124,58,237,0.35)' },
  inputRowError: { borderColor: '#ef4444' },
  countryCode: { paddingRight: 10 },
  countryCodeText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  inputDivider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 12 },
  input: { fontSize: 15, color: '#f1f5f9' },
  errorText: { color: '#f87171', fontSize: 12, marginTop: 4 },

  btn: { backgroundColor: '#7c3aed', borderRadius: 14, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3, flex: 1, textAlign: 'center' },
  btnArrow: { width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  otpBoxWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, justifyContent: 'center' },
  otpHint: { color: '#94a3b8', fontSize: 13 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpCell: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.35)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  otpCellFilled: { borderColor: '#a78bfa', backgroundColor: 'rgba(124,58,237,0.12)' },
  otpCellError: { borderColor: '#ef4444' },

  resendRow: { alignItems: 'center', marginTop: 16 },
  resendTimer: { color: '#475569', fontSize: 13 },
  resendLink: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },

  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  backLink: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },

  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  footerHint: { color: '#64748b', fontSize: 13 },
  footerLink: { color: '#a78bfa', fontSize: 13, fontWeight: '700' },

  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 20 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },

  footerText: { textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 16 },
});
