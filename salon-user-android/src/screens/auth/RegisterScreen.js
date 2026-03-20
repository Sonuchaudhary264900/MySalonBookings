import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showError, showSuccess } from '../../utils/toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { refreshUser } = useAuth();
  const [step, setStep]                 = useState(1);
  const [name, setName]                 = useState('');
  const [phone, setPhone]               = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp]                   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);

  const normalizePhone = (p) => {
    const digits = p.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (p.startsWith('+')) return p.trim();
    return `+91${digits}`;
  };

  const validatePassword = (pw) =>
    pw.length >= 8 &&
    /[A-Z]/.test(pw) && /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);

  const handleSendOtp = async () => {
    if (!name.trim() || name.trim().length < 2) { showError('Error', 'Name must be at least 2 characters'); return; }
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) { showError('Error', 'Enter a valid 10-digit phone number'); return; }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { showError('Error', 'A valid email address is required'); return; }
    if (!validatePassword(password)) {
      showError('Weak Password', 'Min 8 chars with uppercase, lowercase, number & special character');
      return;
    }
    if (password !== confirmPassword) { showError('Error', 'Passwords do not match'); return; }

    setLoading(true);
    try {
      const formattedPhone = normalizePhone(phone);
      const res = await api.post('/customer/auth/send-otp', { phone: formattedPhone, email: email.trim() });
      if (!res.data.success) throw new Error(res.data.message || 'Failed to send OTP');
      setStep(2);
      showSuccess('OTP Sent', `Verification code sent to ${email.trim()}`);
    } catch (err) {
      showError('Error', err?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (otp.length !== 6) { showError('Error', 'Enter the 6-digit OTP from your email'); return; }
    setLoading(true);
    try {
      const formattedPhone = normalizePhone(phone);
      const res = await api.post('/customer/auth/register', {
        name: name.trim(),
        phone: formattedPhone,
        email: email.trim(),
        password,
        otp,
      });
      if (!res.data.success) throw new Error(res.data.message || 'Registration failed');
      const { token, refreshToken } = res.data.data || {};
      if (!token) throw new Error('Registration failed — no token received');
      await AsyncStorage.setItem('customerToken', token);
      if (refreshToken) await AsyncStorage.setItem('customerRefreshToken', refreshToken);
      setToken(token);
      await refreshUser();
    } catch (err) {
      showError('Registration Failed', err?.response?.data?.message || err?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <View style={styles.logoBox}>
            <Image source={require('../../../assets/icon1.png')} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>My Salon Bookings</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.card}>
          {step === 1 ? (
            <>
              <Text style={styles.cardTitle}>Register</Text>
              <Text style={styles.cardSubtitle}>Fill in your details to get started</Text>

              {[
                { label: 'Full Name', value: name, setter: setName, icon: 'person-outline', placeholder: 'Your full name', keyboard: 'default' },
                { label: 'Phone Number', value: phone, setter: setPhone, icon: 'call-outline', placeholder: '+91 98765 43210', keyboard: 'phone-pad' },
                { label: 'Email Address', value: email, setter: setEmail, icon: 'mail-outline', placeholder: 'your@email.com', keyboard: 'email-address' },
              ].map((f) => (
                <View style={styles.field} key={f.label}>
                  <Text style={styles.label}>{f.label}</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name={f.icon} size={18} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={f.placeholder}
                      placeholderTextColor="#9ca3af"
                      keyboardType={f.keyboard}
                      value={f.value}
                      onChangeText={f.setter}
                      editable={!loading}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              ))}

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Min 8 chars, uppercase, number, symbol"
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

              <View style={styles.field}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.hintBox}>
                <Ionicons name="information-circle-outline" size={14} color="#6b7280" />
                <Text style={styles.hintText}>Password: 8+ chars with uppercase, lowercase, number & special character</Text>
              </View>

              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSendOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="mail-outline" size={18} color="#fff" /><Text style={styles.btnText}>Send OTP via Email</Text></>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Verify Email</Text>
              <Text style={styles.cardSubtitle}>Enter the 6-digit code sent to {email}</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Email OTP Code</Text>
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
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, (loading || otp.length !== 6) && styles.btnDisabled]}
                onPress={handleVerifyAndRegister}
                disabled={loading || otp.length !== 6}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.btnText}>Verify & Create Account</Text></>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep(1); setOtp(''); }} style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={styles.backLink}>← Back · Change details</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.registerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2563eb' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 28, overflow: 'hidden', paddingVertical: 8 },
  decorCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -50 },
  decorCircle2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)', top: 10, left: -50 },
  logoBox: { width: 90, height: 90, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: '#1e3a8a', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  logoImg: { width: 74, height: 74 },
  appName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4, letterSpacing: 0.3 },
  subtitle: { fontSize: 14, color: '#bfdbfe' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 48 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 14 },
  hintText: { fontSize: 12, color: '#6b7280', flex: 1, lineHeight: 17 },
  btn: { backgroundColor: '#2563eb', borderRadius: 12, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, color: '#9ca3af', fontSize: 12 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerLink: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
});
