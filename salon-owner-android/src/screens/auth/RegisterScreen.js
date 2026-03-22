import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Linking,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { refreshUser } = useAuth();

  const [step, setStep]               = useState(1);
  const [name, setName]               = useState('');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [otp, setOtp]                 = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const confirmationRef               = useRef(null);

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (raw.startsWith('+')) return raw.trim();
    return `+91${digits}`;
  };

  const validatePassword = (pw) => {
    return (
      pw.length >= 8 &&
      /[A-Z]/.test(pw) &&
      /[a-z]/.test(pw) &&
      /[0-9]/.test(pw) &&
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)
    );
  };

  const handleSendOtp = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      Alert.alert('Error', 'Enter a valid 10-digit phone number');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'A valid email address is required');
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters and include:\n• Uppercase letter\n• Lowercase letter\n• Number\n• Special character (!@#$%^&*...)'
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhone(phone);
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      confirmationRef.current = confirmation;
      setStep(2);
      Alert.alert('OTP Sent', `A verification code was sent to ${formattedPhone}`);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();

      const res = await api.post('/owner/auth/firebase-register', {
        firebaseToken: idToken,
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (!res.data.success) throw new Error(res.data.message || 'Registration failed');

      const { token, refreshToken } = res.data.data;
      await AsyncStorage.setItem('token', token);
      if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);

      // Apply referral code if provided (silently)
      if (referralCode.trim()) {
        try {
          await api.post('/owner/referral/apply', { code: referralCode.trim() });
        } catch {}
      }

      await refreshUser();
    } catch (err) {
      Alert.alert('Registration Failed', err?.response?.data?.message || err?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require('../../../assets/Icon-1024.png')} style={styles.logoImg} resizeMode="contain" />
          <Text style={styles.appName}>My Salon Bookings</Text>
          <Text style={styles.subtitle}>Create Owner Account</Text>
        </View>

        <View style={styles.card}>
          {step === 1 ? (
            <>
              <Text style={styles.cardTitle}>Register</Text>
              <Text style={styles.cardSubtitle}>Create your salon owner account</Text>

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
                <Text style={styles.hintText}>
                  Password must be 8+ chars with uppercase, lowercase, number & special character
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Referral Code <Text style={{ color: '#9ca3af', fontWeight: '400' }}>(optional)</Text></Text>
                <View style={styles.inputRow}>
                  <Ionicons name="gift-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. MSB123456"
                    placeholderTextColor="#9ca3af"
                    value={referralCode}
                    onChangeText={t => setReferralCode(t.toUpperCase())}
                    maxLength={9}
                    autoCapitalize="characters"
                    editable={!loading}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="phone-portrait-outline" size={18} color="#fff" />
                    <Text style={styles.btnText}>Send OTP via SMS</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Verify Phone</Text>
              <Text style={styles.cardSubtitle}>
                Enter the 6-digit code sent to {formatPhone(phone)}
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>SMS OTP Code</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="key-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { letterSpacing: 8, fontSize: 20, fontWeight: '700' }]}
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
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.btnText}>Verify & Register</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setStep(1); setOtp(''); confirmationRef.current = null; }}
                style={{ marginTop: 12, alignItems: 'center' }}
              >
                <Text style={styles.backLink}>← Back · Change details</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.privacyConsent}>
            By creating an account, you agree to our{' '}
            <Text style={styles.privacyLink} onPress={() => Linking.openURL('https://mysalonbookings.com/privacy-policy')}>Privacy Policy</Text>
            {' '}and{' '}
            <Text style={styles.privacyLink} onPress={() => Linking.openURL('https://mysalonbookings.com/terms')}>Terms & Conditions</Text>.
          </Text>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.registerLink}>Login Here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 20 },
  logoImg: { width: '100%', height: Dimensions.get('window').height * 0.40 },
  appName: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4, letterSpacing: 0.3 },
  subtitle: { fontSize: 14, color: '#6b7280' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 48 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 14 },
  hintText: { fontSize: 12, color: '#6b7280', flex: 1, lineHeight: 17 },
  btn: { backgroundColor: '#2563eb', borderRadius: 10, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, color: '#9ca3af', fontSize: 12 },
  privacyConsent: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 14, lineHeight: 18 },
  privacyLink: { color: '#2563eb', textDecorationLine: 'underline' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerLink: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
});
