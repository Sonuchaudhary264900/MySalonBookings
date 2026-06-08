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

const { width: W, height: H } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { firebaseLogin, staffFirebaseLogin } = useAuth();
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

  useEffect(() => {
    if (step !== 2) return;
    setResendTimer(60);
    const id = setInterval(() => setResendTimer(t => { if (t <= 1) { clearInterval(id); return 0; } return t - 1; }), 1000);
    return () => clearInterval(id);
  }, [step]);

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (raw.startsWith('+')) return raw.trim();
    return `+91${digits}`;
  };

  const handleSendOtp = async () => {
    setPhoneError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setPhoneError('Enter a valid 10-digit phone number'); return; }
    const first = digits.length === 10 ? digits[0] : digits[2];
    if (!['6','7','8','9'].includes(first)) { setPhoneError('Enter a valid Indian mobile number'); return; }
    setLoading(true);
    try {
      const formatted = formatPhone(phone);
      const confirmation = await auth().signInWithPhoneNumber(formatted);
      confirmationRef.current = confirmation;
      setStep(2);
    } catch (err) {
      setPhoneError(err?.message || 'Failed to send OTP. Try again.');
    } finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const formatted = formatPhone(phone);
      const confirmation = await auth().signInWithPhoneNumber(formatted);
      confirmationRef.current = confirmation;
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to resend OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    const code = otp.join('');
    if (code.length !== 6) { setOtpError('Enter the complete 6-digit code'); return; }
    if (!confirmationRef.current) { setOtpError('Session expired. Please resend OTP.'); return; }
    setLoading(true);
    let firebaseToken;
    try {
      const result = await confirmationRef.current.confirm(code);
      firebaseToken = await result.user.getIdToken();
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('wrong-code')) {
        setOtpError('Invalid OTP. Please check and try again.');
      } else {
        setOtpError('OTP verification failed. Please try again.');
      }
      setLoading(false);
      return;
    }

    // Try owner login first, then staff login, then redirect to onboarding
    try {
      await firebaseLogin(firebaseToken, formatPhone(phone));
      // Success — AuthContext sets user, navigation updates automatically
    } catch (ownerErr) {
      // axios throws with err.message = "Request failed with status code 4xx"
      // The actual backend message is in err.response?.data?.message — check both
      const ownerStatus     = ownerErr.response?.status;
      const ownerBackendMsg = (ownerErr.response?.data?.message || ownerErr?.message || '').toLowerCase();
      const isNotFound      = ownerStatus === 404
        || ownerBackendMsg.includes('not found')
        || ownerBackendMsg.includes('no glowloox');

      if (isNotFound) {
        // Try staff login
        try {
          await staffFirebaseLogin(firebaseToken, formatPhone(phone));
          // Staff login success — user is set, navigation updates
        } catch (staffErr) {
          const staffStatus     = staffErr.response?.status;
          const staffBackendMsg = (staffErr.response?.data?.message || staffErr?.message || '').toLowerCase();
          const staffNotFound   = staffStatus === 404 || staffBackendMsg.includes('not found');
          const isBlocked       = staffStatus === 403 || staffBackendMsg.includes('deactivated');

          if (isBlocked) {
            Alert.alert(
              'Account Deactivated',
              'Your account has been deactivated. Please contact your salon owner.',
              [{ text: 'OK' }]
            );
          } else if (staffNotFound) {
            // Neither owner nor staff — ask before sending to registration
            Alert.alert(
              'No account found',
              "We couldn't find a GlowLoox Partner account with this number. Would you like to register a new account?",
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Register', onPress: () => navigation.navigate('Onboarding', { initialStep: 3, prefillPhone: formatPhone(phone), prefillToken: firebaseToken }) },
              ]
            );
          } else {
            Alert.alert('Login Failed', staffErr.response?.data?.message || staffErr?.message || 'Something went wrong. Please try again.');
          }
        }
      } else {
        Alert.alert('Login Failed', ownerErr.response?.data?.message || ownerErr?.message || 'Something went wrong. Please try again.');
      }
    } finally { setLoading(false); }
  };

  const handleOtpChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const otpFilled = otp.join('').length === 6;

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
              <Text style={styles.pillText}>Owner Portal</Text>
            </View>
          </View>

          <View style={styles.card}>

            {/* Step 1: Phone */}
            {step === 1 && (
              <>
                <Text style={styles.cardTitle}>Get Started</Text>
                <Text style={styles.cardSubtitle}>Enter your phone number to sign in or register</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={[styles.inputRow, phoneError ? styles.inputRowError : styles.inputRowNormal]}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                    </View>
                    <View style={styles.inputDivider} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="98765 43210"
                      placeholderTextColor="#4b5563"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={t => { setPhone(t); setPhoneError(''); }}
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
                      maxLength={1}
                      editable={!loading}
                      textAlign="center"
                      selectTextOnFocus
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
                      <Text style={styles.btnText}>Sign In</Text>
                      <View style={styles.btnArrow}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
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

          <Text style={styles.footerText}>By signing in, you agree to our Terms of Service</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07071a', overflow: 'hidden' },
  orb1: { position: 'absolute', width: W * 0.85, height: W * 0.85, borderRadius: W * 0.425, backgroundColor: '#4f46e5', top: -W * 0.22, left: -W * 0.18, opacity: 0.45 },
  orb2: { position: 'absolute', width: W * 0.6, height: W * 0.6, borderRadius: W * 0.3, backgroundColor: '#7c3aed', top: H * 0.1, right: -W * 0.2, opacity: 0.3 },
  orb3: { position: 'absolute', width: W * 0.5, height: W * 0.5, borderRadius: W * 0.25, backgroundColor: '#2563eb', bottom: H * 0.08, left: -W * 0.15, opacity: 0.15 },

  scroll: { flexGrow: 1, paddingHorizontal: 22 },

  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: W * 0.40, height: W * 0.40, borderRadius: W * 0.195, backgroundColor: '#0d0d2b', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 14, borderWidth: 2.5, borderColor: 'rgba(56,189,248,0.5)', shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 10 },
  logoImg: { width: W * 0.90, height: W * 0.90 },
  appName: { fontSize: 20, fontWeight: '800', color: '#f1f5f9', letterSpacing: 0.3, marginBottom: 10 },
  pillBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99,102,241,0.18)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#a78bfa' },
  pillText: { fontSize: 11, fontWeight: '700', color: '#c4b5fd', letterSpacing: 1, textTransform: 'uppercase' },

  card: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 24 },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 22 },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 7 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 50, backgroundColor: 'rgba(255,255,255,0.05)' },
  inputRowNormal: { borderColor: 'rgba(99,102,241,0.3)' },
  inputRowError: { borderColor: '#ef4444' },
  countryCode: { paddingRight: 10 },
  countryCodeText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  inputDivider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 12 },
  input: { fontSize: 15, color: '#f1f5f9' },
  errorText: { color: '#f87171', fontSize: 12, marginTop: 4 },

  btn: { backgroundColor: '#6366f1', borderRadius: 14, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3, flex: 1, textAlign: 'center' },
  btnArrow: { width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { marginHorizontal: 12, color: '#475569', fontSize: 12, fontWeight: '600' },

  registerBtn: { borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.4)', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  registerBtnText: { color: '#818cf8', fontSize: 15, fontWeight: '700' },

  otpBoxWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, justifyContent: 'center' },
  otpHint: { color: '#94a3b8', fontSize: 13 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpCell: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  otpCellFilled: { borderColor: '#818cf8', backgroundColor: 'rgba(99,102,241,0.12)' },
  otpCellError: { borderColor: '#ef4444' },

  resendRow: { alignItems: 'center', marginTop: 16 },
  resendTimer: { color: '#475569', fontSize: 13 },
  resendLink: { color: '#818cf8', fontSize: 13, fontWeight: '600' },

  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  backLink: { color: '#818cf8', fontSize: 13, fontWeight: '600' },

  footerText: { textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 24 },
});
