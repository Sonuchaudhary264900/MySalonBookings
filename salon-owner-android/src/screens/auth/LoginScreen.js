import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Dimensions, Modal, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import auth from '@react-native-firebase/auth';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const { width: W, height: H } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passError, setPassError] = useState('');

  // Forgot password state
  const [fpMode, setFpMode] = useState(false);
  const [fpStep, setFpStep] = useState(1);
  const [fpPhone, setFpPhone] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPw, setFpNewPw] = useState('');
  const [fpConfirmPw, setFpConfirmPw] = useState('');
  const [fpShowPw, setFpShowPw] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpTimer, setFpTimer] = useState(0);
  const fpConfirmationRef = useRef(null);

  useEffect(() => {
    if (fpTimer <= 0) return;
    const id = setInterval(() => setFpTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [fpTimer]);

  const normalizePhone = (p) => {
    const digits = p.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return p.trim();
  };

  const handleFpSendOtp = async () => {
    if (!fpPhone.trim()) { Alert.alert('Error', 'Please enter your phone number'); return; }
    const normalized = normalizePhone(fpPhone);
    setFpLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(normalized);
      fpConfirmationRef.current = confirmation;
      setFpStep(2);
      setFpTimer(60);
      Alert.alert('OTP Sent', `Enter the SMS code sent to ${normalized}`);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to send OTP');
    } finally { setFpLoading(false); }
  };

  const handleFpReset = async () => {
    if (!fpOtp.trim() || fpOtp.length !== 6) { Alert.alert('Error', 'Please enter the 6-digit OTP'); return; }
    if (!fpNewPw || fpNewPw.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return; }
    if (fpNewPw !== fpConfirmPw) { Alert.alert('Error', 'Passwords do not match'); return; }
    setFpLoading(true);
    try {
      const result = await fpConfirmationRef.current.confirm(fpOtp);
      const idToken = await result.user.getIdToken();
      await api.post('/owner/auth/firebase-reset-password', { firebaseToken: idToken, newPassword: fpNewPw });
      Alert.alert('Success', 'Password reset successfully! Please log in.');
      setFpMode(false); setFpStep(1); setFpPhone(''); setFpOtp(''); setFpNewPw(''); setFpConfirmPw('');
      fpConfirmationRef.current = null;
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to reset password');
    } finally { setFpLoading(false); }
  };

  const validate = () => {
    let valid = true;
    setPhoneError('');
    setPassError('');
    if (!phone.trim()) { setPhoneError('Phone number is required'); valid = false; }
    if (!password) { setPassError('Password is required'); valid = false; }
    return valid;
  };

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (raw.startsWith('+')) return raw.trim();
    return raw.trim();
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    const identifier = phone.includes('@') ? phone.trim() : formatPhone(phone);
    try {
      await login(identifier, password);
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Ambient orbs — same as IntroScreen */}
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

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>Sign in to manage your salon</Text>

            {/* Phone */}
            <View style={styles.field}>
              <Text style={styles.label}>Phone / Email</Text>
              <View style={[styles.inputRow, phoneError ? styles.inputError : styles.inputNormal]}>
                <Ionicons name="call-outline" size={18} color="#818cf8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#4b5563"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setPhoneError(''); }}
                  editable={!loading}
                  autoComplete="username"
                  textContentType="username"
                  importantForAutofill="yes"
                />
              </View>
              {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputRow, passError ? styles.inputError : styles.inputNormal]}>
                <Ionicons name="lock-closed-outline" size={18} color="#818cf8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter your password"
                  placeholderTextColor="#4b5563"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setPassError(''); }}
                  editable={!loading}
                  autoComplete="current-password"
                  textContentType="password"
                  importantForAutofill="yes"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
              {!!passError && <Text style={styles.errorText}>{passError}</Text>}
            </View>

            {/* Forgot */}
            <TouchableOpacity style={styles.forgotBtn} onPress={() => { setFpMode(true); setFpPhone(phone); }}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Sign In</Text>
                  <View style={styles.btnArrow}>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </View>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
              <Text style={styles.registerBtnText}>Create New Account</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>By signing in, you agree to our Terms of Service</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal visible={fpMode} transparent animationType="slide" statusBarTranslucent onRequestClose={() => { setFpMode(false); setFpStep(1); fpConfirmationRef.current = null; }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView style={styles.fpOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableWithoutFeedback>
              <View style={styles.fpCard}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.fpHeader}>
              <Text style={styles.fpTitle}>{fpStep === 1 ? 'Forgot Password' : 'Reset Password'}</Text>
              <TouchableOpacity onPress={() => { setFpMode(false); setFpStep(1); fpConfirmationRef.current = null; }} style={styles.fpClose}>
                <Ionicons name="close" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {fpStep === 1 ? (
              <>
                <Text style={styles.fpSub}>Enter your registered phone number to receive an OTP</Text>
                <View style={[styles.inputRow, styles.inputNormal, { marginBottom: 16 }]}>
                  <Ionicons name="call-outline" size={18} color="#818cf8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="+91 98765 43210"
                    placeholderTextColor="#4b5563"
                    keyboardType="phone-pad"
                    value={fpPhone}
                    onChangeText={setFpPhone}
                    editable={!fpLoading}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.loginBtn, fpLoading && styles.loginBtnDisabled]}
                  onPress={handleFpSendOtp}
                  disabled={fpLoading}
                >
                  {fpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Send OTP</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.fpSub}>OTP sent to {fpPhone}</Text>
                <View style={[styles.inputRow, styles.inputNormal, { marginBottom: 10 }]}>
                  <Ionicons name="key-outline" size={18} color="#818cf8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#4b5563"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={fpOtp}
                    onChangeText={setFpOtp}
                    editable={!fpLoading}
                  />
                </View>
                <View style={[styles.inputRow, styles.inputNormal, { marginBottom: 10 }]}>
                  <Ionicons name="lock-closed-outline" size={18} color="#818cf8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="New password (min 8 chars)"
                    placeholderTextColor="#4b5563"
                    secureTextEntry={!fpShowPw}
                    value={fpNewPw}
                    onChangeText={setFpNewPw}
                    editable={!fpLoading}
                  />
                  <TouchableOpacity onPress={() => setFpShowPw(!fpShowPw)}>
                    <Ionicons name={fpShowPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputRow, styles.inputNormal, { marginBottom: 16 }]}>
                  <Ionicons name="lock-closed-outline" size={18} color="#818cf8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor="#4b5563"
                    secureTextEntry
                    value={fpConfirmPw}
                    onChangeText={setFpConfirmPw}
                    editable={!fpLoading}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.loginBtn, fpLoading && styles.loginBtnDisabled]}
                  onPress={handleFpReset}
                  disabled={fpLoading}
                >
                  {fpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Reset Password</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.forgotBtn, { opacity: fpTimer > 0 ? 0.5 : 1 }]}
                  onPress={fpTimer === 0 ? handleFpSendOtp : undefined}
                  disabled={fpTimer > 0}
                >
                  <Text style={styles.forgotText}>
                    {fpTimer > 0 ? `Resend OTP in ${fpTimer}s` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
              </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
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

  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: W * 0.40, height: W * 0.40, borderRadius: W * 0.195,
    backgroundColor: '#0d0d2b', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 14,
    borderWidth: 2.5, borderColor: 'rgba(56,189,248,0.5)',
    shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
  },
  logoImg: { width: W * 0.90, height: W * 0.90 },
  appName: { fontSize: 20, fontWeight: '800', color: '#f1f5f9', letterSpacing: 0.3, marginBottom: 10 },
  pillBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#a78bfa' },
  pillText: { fontSize: 11, fontWeight: '700', color: '#c4b5fd', letterSpacing: 1, textTransform: 'uppercase' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, padding: 24,
  },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 22 },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 7 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  inputNormal: { borderColor: 'rgba(99,102,241,0.3)' },
  inputError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#f1f5f9' },
  eyeBtn: { padding: 4 },
  errorText: { color: '#f87171', fontSize: 12, marginTop: 4 },

  forgotBtn: { alignItems: 'flex-end', marginBottom: 18, marginTop: -4 },
  forgotText: { fontSize: 13, color: '#818cf8', fontWeight: '600' },

  loginBtn: {
    backgroundColor: '#6366f1', borderRadius: 14, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 8,
  },
  loginBtnDisabled: { opacity: 0.65 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3, flex: 1, textAlign: 'center' },
  btnArrow: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { marginHorizontal: 12, color: '#475569', fontSize: 12, fontWeight: '600' },

  registerBtn: {
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.4)',
    borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center',
  },
  registerBtnText: { color: '#818cf8', fontSize: 15, fontWeight: '700' },

  footerText: { textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 24 },

  // Forgot password modal
  fpOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  fpCard: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, borderTopWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
    maxHeight: H * 0.85,
  },
  fpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fpClose: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  fpTitle: { fontSize: 18, fontWeight: '800', color: '#f1f5f9' },
  fpSub: { fontSize: 13, color: '#94a3b8', marginBottom: 18 },
});