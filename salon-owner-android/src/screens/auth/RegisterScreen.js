import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Linking,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
  Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import auth from '@react-native-firebase/auth';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

const { width: W, height: H } = Dimensions.get('window');

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male',   emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'other',  label: 'Other',  emoji: '🧑' },
];

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) score++;
  const levels = [
    { label: 'Very Weak', color: '#ef4444', pct: 0.2 },
    { label: 'Weak',      color: '#f97316', pct: 0.4 },
    { label: 'Fair',      color: '#eab308', pct: 0.6 },
    { label: 'Strong',    color: '#22c55e', pct: 0.8 },
    { label: 'Very Strong', color: '#10b981', pct: 1.0 },
  ];
  return pw.length === 0 ? null : levels[score - 1] || levels[0];
}

export default function RegisterScreen({ navigation }) {
  const { refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  // Step 1 — phone
  const [phone, setPhone]       = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Step 2 — OTP
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const otpRefs                 = useRef([]);
  const confirmationRef         = useRef(null);
  const firebaseTokenRef        = useRef(null);

  // Step 3 — profile
  const [name, setName]         = useState('');
  const [gender, setGender]     = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [step, setStep]         = useState(1);
  const [loading, setLoading]   = useState(false);

  // OTP countdown timer
  useEffect(() => {
    if (step !== 2) return;
    setResendTimer(60);
    const id = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (raw.startsWith('+')) return raw.trim();
    return `+91${digits}`;
  };

  // ─── Step 1: Send OTP ────────────────────────────────────────
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
      setOtpError(err?.message || 'Failed to resend OTP');
    } finally { setLoading(false); }
  };

  // ─── Step 2: Verify OTP ──────────────────────────────────────
  const handleVerifyOtp = async () => {
    setOtpError('');
    const code = otp.join('');
    if (code.length !== 6) { setOtpError('Enter the complete 6-digit code'); return; }
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(code);
      firebaseTokenRef.current = await result.user.getIdToken();
      setStep(3);
    } catch (err) {
      setOtpError('Invalid OTP. Please check and try again.');
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

  // ─── Step 3: Register ────────────────────────────────────────
  const handleRegister = async () => {
    if (!name.trim() || name.trim().length < 2) { Alert.alert('Error', 'Name must be at least 2 characters'); return; }
    if (!gender) { Alert.alert('Error', 'Please select your gender'); return; }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { Alert.alert('Error', 'Enter a valid email address'); return; }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPw) { Alert.alert('Error', 'Passwords do not match'); return; }
    if (!agreedToTerms) { Alert.alert('Terms Required', 'Please accept the Terms & Conditions and Privacy Policy'); return; }

    setLoading(true);
    try {
      const res = await api.post('/owner/auth/firebase-register', {
        firebaseToken: firebaseTokenRef.current,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        gender,
      });
      if (!res.data.success) throw new Error(res.data.message || 'Registration failed');
      const { token, refreshToken } = res.data.data;
      await AsyncStorage.setItem('token', token);
      if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
      if (referralCode.trim()) {
        try { await api.post('/owner/referral/apply', { code: referralCode.trim() }); } catch {}
      }
      await refreshUser();
    } catch (err) {
      Alert.alert('Registration Failed', err?.response?.data?.message || err?.message || 'Please try again.');
    } finally { setLoading(false); }
  };

  const pwStrength = passwordStrength(password);
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Image source={require('../../../assets/Icon-1024.png')} style={styles.logoImg} resizeMode="contain" />
            </View>
            <Text style={styles.appName}>My Salon Bookings</Text>
            <View style={styles.pillBadge}>
              <View style={styles.pillDot} />
              <Text style={styles.pillText}>Owner Registration</Text>
            </View>
          </View>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {[1, 2, 3].map((s, i) => (
              <React.Fragment key={s}>
                <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                  {step > s
                    ? <Ionicons name="checkmark" size={14} color="#fff" />
                    : <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
                  }
                </View>
                {i < 2 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
              </React.Fragment>
            ))}
          </View>
          <View style={styles.stepLabels}>
            <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Phone</Text>
            <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Verify</Text>
            <Text style={[styles.stepLabel, step === 3 && styles.stepLabelActive]}>Profile</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>

            {/* ── Step 1: Phone ── */}
            {step === 1 && (
              <>
                <Text style={styles.cardTitle}>Enter Your Phone</Text>
                <Text style={styles.cardSubtitle}>We'll send a verification code via SMS</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={[styles.inputRow, phoneError ? styles.inputRowError : null]}>
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

            {/* ── Step 2: OTP ── */}
            {step === 2 && (
              <>
                <Text style={styles.cardTitle}>Verify Phone</Text>
                <Text style={styles.cardSubtitle}>
                  Code sent to {formatPhone(phone)}
                </Text>

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
                  style={[styles.btn, (!otpFilled || loading) && styles.btnDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={!otpFilled || loading}
                  activeOpacity={0.88}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.btnText}>Verify Code</Text>
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

                <TouchableOpacity
                  onPress={() => { setStep(1); setOtp(['', '', '', '', '', '']); setOtpError(''); }}
                  style={styles.backBtn}
                >
                  <Ionicons name="arrow-back" size={16} color="#818cf8" />
                  <Text style={styles.backLink}>Change phone number</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Step 3: Profile ── */}
            {step === 3 && (
              <>
                <Text style={styles.cardTitle}>Complete Profile</Text>
                <Text style={styles.cardSubtitle}>Almost there! Fill in your details</Text>

                {/* Name */}
                <View style={styles.field}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="person-outline" size={18} color="#818cf8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Your full name"
                      placeholderTextColor="#4b5563"
                      value={name}
                      onChangeText={setName}
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Gender */}
                <View style={styles.field}>
                  <Text style={styles.label}>Gender <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.genderRow}>
                    {GENDER_OPTIONS.map(g => (
                      <TouchableOpacity
                        key={g.value}
                        style={[styles.genderChip, gender === g.value && styles.genderChipActive]}
                        onPress={() => setGender(g.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.genderEmoji}>{g.emoji}</Text>
                        <Text style={[styles.genderLabel, gender === g.value && styles.genderLabelActive]}>{g.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Email */}
                <View style={styles.field}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="mail-outline" size={18} color="#818cf8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor="#4b5563"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="lock-closed-outline" size={18} color="#818cf8" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Minimum 8 characters"
                      placeholderTextColor="#4b5563"
                      secureTextEntry={!showPw}
                      value={password}
                      onChangeText={setPassword}
                      editable={!loading}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      importantForAutofill="yes"
                    />
                    <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ padding: 4 }}>
                      <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                  {password.length > 0 && pwStrength && (
                    <View style={styles.strengthWrap}>
                      <View style={styles.strengthBar}>
                        <View style={[styles.strengthFill, { width: `${pwStrength.pct * 100}%`, backgroundColor: pwStrength.color }]} />
                      </View>
                      <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text>
                    </View>
                  )}
                </View>

                {/* Confirm Password */}
                <View style={styles.field}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="lock-closed-outline" size={18} color="#818cf8" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Re-enter password"
                      placeholderTextColor="#4b5563"
                      secureTextEntry={!showConfirmPw}
                      value={confirmPw}
                      onChangeText={setConfirmPw}
                      editable={!loading}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      importantForAutofill="yes"
                    />
                    {confirmPw.length > 0 && confirmPw === password
                      ? <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                      : <TouchableOpacity onPress={() => setShowConfirmPw(!showConfirmPw)} style={{ padding: 4 }}>
                          <Ionicons name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
                        </TouchableOpacity>
                    }
                  </View>
                </View>

                {/* Referral */}
                <View style={styles.field}>
                  <Text style={styles.label}>Referral Code <Text style={{ color: '#475569', fontWeight: '400' }}>(optional)</Text></Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="gift-outline" size={18} color="#818cf8" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 2 }]}
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
                <TouchableOpacity style={styles.termsRow} onPress={() => setAgreedToTerms(!agreedToTerms)} activeOpacity={0.8}>
                  <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                    {agreedToTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text style={styles.termsLink} onPress={() => Linking.openURL('https://owner.mysalonbookings.com/legal/owner-terms')}>
                      Terms & Conditions
                    </Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink} onPress={() => Linking.openURL('https://owner.mysalonbookings.com/legal/owner-privacy')}>
                      Privacy Policy
                    </Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, (loading || !agreedToTerms) && styles.btnDisabled]}
                  onPress={handleRegister}
                  disabled={loading || !agreedToTerms}
                  activeOpacity={0.88}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.btnText}>Create Account</Text>
                      <View style={styles.btnArrow}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
              <Text style={styles.loginBtnText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>By registering, you agree to our Terms of Service & Privacy Policy</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07071a', overflow: 'hidden' },

  orb1: {
    position: 'absolute', width: W * 0.85, height: W * 0.85,
    borderRadius: W * 0.425, backgroundColor: '#4f46e5',
    top: -W * 0.22, left: -W * 0.18, opacity: 0.45,
  },
  orb2: {
    position: 'absolute', width: W * 0.6, height: W * 0.6,
    borderRadius: W * 0.3, backgroundColor: '#7c3aed',
    top: H * 0.1, right: -W * 0.2, opacity: 0.3,
  },
  orb3: {
    position: 'absolute', width: W * 0.5, height: W * 0.5,
    borderRadius: W * 0.25, backgroundColor: '#2563eb',
    bottom: H * 0.08, left: -W * 0.15, opacity: 0.15,
  },

  scroll: { flexGrow: 1, paddingHorizontal: 22 },

  header: { alignItems: 'center', marginBottom: 20 },
  logoCircle: {
    width: W * 0.28, height: W * 0.28, borderRadius: W * 0.14,
    backgroundColor: '#0d0d2b', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 12,
    borderWidth: 2.5, borderColor: 'rgba(56,189,248,0.5)',
    shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
  },
  logoImg: { width: W * 0.60, height: W * 0.60 },
  appName: { fontSize: 20, fontWeight: '800', color: '#f1f5f9', letterSpacing: 0.3, marginBottom: 10 },
  pillBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#a78bfa' },
  pillText: { fontSize: 11, fontWeight: '700', color: '#c4b5fd', letterSpacing: 1, textTransform: 'uppercase' },

  // Steps
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: 'rgba(99,102,241,0.3)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  stepDotActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  stepNum: { fontSize: 13, fontWeight: '800', color: '#475569' },
  stepNumActive: { color: '#fff' },
  stepLine: { width: 50, height: 2, backgroundColor: 'rgba(99,102,241,0.2)', marginHorizontal: 6 },
  stepLineActive: { backgroundColor: '#6366f1' },
  stepLabels: { flexDirection: 'row', justifyContent: 'center', gap: 0, marginBottom: 18 },
  stepLabel: { width: 82, textAlign: 'center', fontSize: 11, color: '#475569', fontWeight: '500' },
  stepLabelActive: { color: '#818cf8', fontWeight: '700' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, padding: 24,
  },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 7 },
  requiredStar: { color: '#f87171' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 12, paddingHorizontal: 14, height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  inputRowError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#f1f5f9' },
  errorText: { fontSize: 12, color: '#f87171', marginTop: 5 },

  // Phone step
  countryCode: { flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
  countryCodeText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  inputDivider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.12)', marginRight: 12 },

  // OTP
  otpBoxWrap: {
    alignItems: 'center', paddingVertical: 18,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: 14, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  otpHint: { fontSize: 13, color: '#94a3b8', marginTop: 8 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 4 },
  otpCell: {
    width: 44, height: 54, borderRadius: 12,
    borderWidth: 2, borderColor: 'rgba(99,102,241,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    fontSize: 22, fontWeight: '700', color: '#f1f5f9',
    textAlign: 'center',
  },
  otpCellFilled: { borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.15)' },
  otpCellError: { borderColor: '#ef4444' },

  resendRow: { alignItems: 'center', marginTop: 14, marginBottom: 4 },
  resendTimer: { fontSize: 13, color: '#475569' },
  resendLink: { fontSize: 13, color: '#818cf8', fontWeight: '700' },

  // Gender
  genderRow: { flexDirection: 'row', gap: 10 },
  genderChip: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 4,
  },
  genderChipActive: { backgroundColor: 'rgba(99,102,241,0.25)', borderColor: '#6366f1' },
  genderEmoji: { fontSize: 20 },
  genderLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  genderLabelActive: { color: '#c4b5fd' },

  // Password strength
  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  strengthFill: { height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', width: 72, textAlign: 'right' },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.4)', alignItems: 'center',
    justifyContent: 'center', marginTop: 1, flexShrink: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  checkboxChecked: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  termsText: { flex: 1, fontSize: 13, color: '#94a3b8', lineHeight: 20 },
  termsLink: { color: '#818cf8', fontWeight: '600' },

  btn: {
    backgroundColor: '#6366f1', borderRadius: 14, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3, flex: 1, textAlign: 'center' },
  btnArrow: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  backLink: { fontSize: 14, color: '#818cf8', fontWeight: '600' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { marginHorizontal: 12, color: '#475569', fontSize: 12, fontWeight: '600' },

  loginBtn: {
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.4)',
    borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center',
  },
  loginBtnText: { color: '#818cf8', fontSize: 15, fontWeight: '700' },

  footerText: { textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 24 },
});
