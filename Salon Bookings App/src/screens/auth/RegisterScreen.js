import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Linking,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { showError, showSuccess } from '../../utils/toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { refreshUser } = useAuth();
  const [step, setStep]                 = useState(1);
  const [name, setName]                 = useState('');
  const [phone, setPhone]               = useState('');
  const [gender, setGender]             = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp]                   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const confirmationRef                 = useRef(null);

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
    if (!gender) { showError('Error', 'Please select your gender'); return; }
    if (!validatePassword(password)) {
      showError('Weak Password', 'Min 8 chars with uppercase, lowercase, number & special character');
      return;
    }
    if (password !== confirmPassword) { showError('Error', 'Passwords do not match'); return; }
    if (!agreedToTerms) {
      showError('Terms Required', 'Please accept the Terms & Conditions and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = normalizePhone(phone);
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      confirmationRef.current = confirmation;
      setStep(2);
      showSuccess('OTP Sent', `Verification code sent to ${formattedPhone}`);
    } catch (err) {
      showError('Error', err?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (otp.length !== 6) { showError('Error', 'Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();

      const res = await api.post('/customer/auth/firebase-register', {
        firebaseToken: idToken,
        name: name.trim(),
        password,
        gender,
      });
      if (!res.data.success) throw new Error(res.data.message || 'Registration failed');
      const { token, refreshToken } = res.data.data || {};
      if (!token) throw new Error('Registration failed — no token received');
      await AsyncStorage.setItem('customerToken', token);
      if (refreshToken) await AsyncStorage.setItem('customerRefreshToken', refreshToken);
      setToken(token);
      await refreshUser();
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
          <Text style={styles.appName}>My Salon Bookings</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.card}>
          {step === 1 ? (
            <>
              <Text style={styles.cardTitle}>Register</Text>
              <Text style={styles.cardSubtitle}>Fill in your details to get started</Text>

              {/* Full Name */}
              <View style={styles.field}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Your full name"
                    placeholderTextColor="#9ca3af"
                    value={name}
                    onChangeText={setName}
                    editable={!loading}
                    autoCapitalize="words"
                  />
                </View>
              </View>

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

              {/* Gender */}
              <View style={styles.field}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderRow}>
                  {['male', 'female'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                      onPress={() => setGender(g)}
                      disabled={loading}
                    >
                      <Ionicons
                        name={g === 'male' ? 'man-outline' : 'woman-outline'}
                        size={16}
                        color={gender === g ? '#fff' : '#6b7280'}
                      />
                      <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Password */}
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

              {/* Confirm Password */}
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

              {/* Terms Agreement */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink} onPress={() => Linking.openURL('https://mysalonbookings.com/legal/customer-terms')}>
                    Terms & Conditions
                  </Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink} onPress={() => Linking.openURL('https://mysalonbookings.com/legal/customer-privacy')}>
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btn, (loading || !agreedToTerms) && styles.btnDisabled]} onPress={handleSendOtp} disabled={loading || !agreedToTerms}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="phone-portrait-outline" size={18} color="#fff" /><Text style={styles.btnText}>Send OTP via SMS</Text></>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Verify Phone</Text>
              <Text style={styles.cardSubtitle}>Enter the 6-digit code sent to {normalizePhone(phone)}</Text>

              <View style={styles.field}>
                <Text style={styles.label}>SMS OTP Code</Text>
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

              <TouchableOpacity onPress={() => { setStep(1); setOtp(''); confirmationRef.current = null; }} style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={styles.backLink}>← Back · Change details</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.privacyConsent}>
            By creating an account, you agree to our{' '}
            <Text style={styles.privacyLink} onPress={() => Linking.openURL('https://mysalonbookings.com/legal/customer-privacy')}>Privacy Policy</Text>
            {' '}and{' '}
            <Text style={styles.privacyLink} onPress={() => Linking.openURL('https://mysalonbookings.com/legal/customer-terms')}>Terms & Conditions</Text>.
          </Text>

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
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, height: 44 },
  genderBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  genderText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  genderTextActive: { color: '#fff' },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 14 },
  hintText: { fontSize: 12, color: '#6b7280', flex: 1, lineHeight: 17 },
  btn: { backgroundColor: '#2563eb', borderRadius: 12, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, color: '#9ca3af', fontSize: 12 },
  privacyConsent: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 14, lineHeight: 18 },
  privacyLink: { color: '#2563eb', textDecorationLine: 'underline' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerLink: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  termsText: { flex: 1, fontSize: 13, color: '#4b5563', lineHeight: 20 },
  termsLink: { color: '#2563eb', fontWeight: '600', textDecorationLine: 'underline' },
});
