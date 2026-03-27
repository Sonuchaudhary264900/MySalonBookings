import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { showError } from '../../utils/toast';
import api from '../../services/api';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [phone, setPhone]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);

  // Forgot password state
  const [fpMode, setFpMode]     = useState(false);
  const [fpStep, setFpStep]     = useState(1);
  const [fpPhone, setFpPhone]   = useState('');
  const [fpOtp, setFpOtp]       = useState('');
  const [fpNewPw, setFpNewPw]   = useState('');
  const [fpConfirm, setFpConfirm] = useState('');
  const [fpShowPw, setFpShowPw] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpTimer, setFpTimer]   = useState(0);
  const fpConfirmationRef       = useRef(null);

  useEffect(() => {
    if (fpTimer <= 0) return;
    const id = setInterval(() => setFpTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [fpTimer]);

  const normalizeFpPhone = (p) => {
    const digits = p.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (p.startsWith('+')) return p.trim();
    return `+91${digits}`;
  };

  const handleFpSendOtp = async () => {
    if (!fpPhone.trim()) { Alert.alert('Error', 'Please enter your phone number'); return; }
    const normalized = normalizeFpPhone(fpPhone);
    setFpLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(normalized);
      fpConfirmationRef.current = confirmation;
      setFpStep(2); setFpTimer(60);
      Alert.alert('OTP Sent', 'Enter the SMS code to reset your password');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to send OTP');
    } finally { setFpLoading(false); }
  };

  const handleFpReset = async () => {
    if (!fpOtp.trim() || fpOtp.length !== 6) { Alert.alert('Error', 'Please enter the 6-digit OTP'); return; }
    if (!fpNewPw || fpNewPw.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    if (fpNewPw !== fpConfirm) { Alert.alert('Error', 'Passwords do not match'); return; }
    setFpLoading(true);
    try {
      const result = await fpConfirmationRef.current.confirm(fpOtp);
      const idToken = await result.user.getIdToken();
      await api.post('/customer/auth/firebase-reset-password', { firebaseToken: idToken, newPassword: fpNewPw });
      Alert.alert('Success', 'Password reset successfully! Please log in.');
      setFpMode(false); setFpStep(1); setFpPhone(''); setFpOtp(''); setFpNewPw(''); setFpConfirm('');
      fpConfirmationRef.current = null;
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to reset password');
    } finally { setFpLoading(false); }
  };

  const normalizePhone = (p) => {
    const digits = p.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (p.startsWith('+')) return p.trim();
    return `+91${digits}`;
  };

  const handleLogin = async () => {
    if (!phone.trim() || !password) {
      showError('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await login(normalizePhone(phone), password);
    } catch (err) {
      showError('Login Failed', err?.message || 'Check your credentials and try again.');
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
          <Text style={styles.appName}>My Salon Bookings</Text>
          <Text style={styles.subtitle}>Book your perfect look</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account</Text>

          {/* Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                editable={!loading}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Your password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotBtn} onPress={() => { setFpMode(true); setFpPhone(phone); }}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Features row */}
          <View style={styles.featuresRow}>
            {['Book Salons', 'Track History', 'Save Favorites'].map((f) => (
              <View key={f} style={styles.featureChip}>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>New here? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Forgot Password Overlay */}
      {fpMode && (
        <View style={styles.fpOverlay}>
          <View style={styles.fpCard}>
            <View style={styles.fpHeader}>
              <Text style={styles.fpTitle}>{fpStep === 1 ? 'Forgot Password' : 'Reset Password'}</Text>
              <TouchableOpacity onPress={() => { setFpMode(false); setFpStep(1); fpConfirmationRef.current = null; }}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {fpStep === 1 ? (
              <>
                <Text style={styles.fpSub}>Enter your registered phone number</Text>
                <View style={[styles.inputRow, { marginBottom: 12 }]}>
                  <Ionicons name="call-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="+91 98765 43210" placeholderTextColor="#9ca3af" keyboardType="phone-pad" value={fpPhone} onChangeText={setFpPhone} editable={!fpLoading} />
                </View>
                <TouchableOpacity style={[styles.btn, fpLoading && styles.btnDisabled, { marginBottom: 0 }]} onPress={handleFpSendOtp} disabled={fpLoading}>
                  {fpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.fpSub}>OTP sent to {fpPhone}</Text>
                <View style={[styles.inputRow, { marginBottom: 10 }]}>
                  <Ionicons name="key-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="6-digit OTP" placeholderTextColor="#9ca3af" keyboardType="number-pad" maxLength={6} value={fpOtp} onChangeText={setFpOtp} editable={!fpLoading} />
                </View>
                <View style={[styles.inputRow, { marginBottom: 10 }]}>
                  <Ionicons name="lock-closed-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="New password" placeholderTextColor="#9ca3af" secureTextEntry={!fpShowPw} value={fpNewPw} onChangeText={setFpNewPw} editable={!fpLoading} />
                  <TouchableOpacity onPress={() => setFpShowPw(!fpShowPw)}>
                    <Ionicons name={fpShowPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputRow, { marginBottom: 12 }]}>
                  <Ionicons name="lock-closed-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Confirm new password" placeholderTextColor="#9ca3af" secureTextEntry value={fpConfirm} onChangeText={setFpConfirm} editable={!fpLoading} />
                </View>
                <TouchableOpacity style={[styles.btn, fpLoading && styles.btnDisabled, { marginBottom: 0 }]} onPress={handleFpReset} disabled={fpLoading}>
                  {fpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.forgotBtn, { opacity: fpTimer > 0 ? 0.5 : 1, marginTop: 10 }]} onPress={fpTimer === 0 ? handleFpSendOtp : undefined} disabled={fpTimer > 0}>
                  <Text style={styles.forgotText}>{fpTimer > 0 ? `Resend OTP in ${fpTimer}s` : 'Resend OTP'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const { height: SCREEN_H } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 20 },
  logoImg: { width: '100%', height: SCREEN_H * 0.40 },
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
  btn: { backgroundColor: '#2563eb', borderRadius: 12, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 16 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  featuresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  featureChip: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  featureText: { fontSize: 12, color: '#1d4ed8', fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, color: '#9ca3af', fontSize: 12 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerLink: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
  forgotBtn: { alignItems: 'center', marginBottom: 14 },
  forgotText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  fpOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  fpCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, elevation: 12 },
  fpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  fpTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  fpSub: { fontSize: 13, color: '#6b7280', marginBottom: 14 },
});
