import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1); // 1=details, 2=otp
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const handleSendOtp = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) { Alert.alert('Error', 'Enter a valid phone number'); return; }
    if (!password || password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }

    setLoading(true);
    try {
      await api.post('/owner/auth/send-otp', { phone: phone.trim() });
      setStep(2);
      Alert.alert('OTP Sent', 'Please check your phone for the OTP.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (otp.length !== 6) { Alert.alert('Error', 'Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      // Verify OTP then register
      const otpRes = await api.post('/owner/auth/verify-otp', { phone: phone.trim(), otp });
      const firebaseToken = otpRes.data.data?.firebaseToken || otpRes.data.data?.token;
      const regRes = await api.post('/owner/auth/firebase-register', {
        firebaseToken,
        name: name.trim(),
        email: email.trim() || undefined,
        password,
      });
      if (!regRes.data.success) throw new Error(regRes.data.message || 'Registration failed');
      const { token, refreshToken } = regRes.data.data;
      await AsyncStorage.setItem('token', token);
      if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
      await refreshUser();
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>💈 Smart Salon</Text>
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
                { label: 'Email (optional)', value: email, setter: setEmail, icon: 'mail-outline', placeholder: 'your@email.com', keyboard: 'email-address' },
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
                    placeholder="Minimum 6 characters"
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

              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSendOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Verify OTP</Text>
              <Text style={styles.cardSubtitle}>Enter the 6-digit code sent to {phone}</Text>
              <View style={styles.field}>
                <Text style={styles.label}>OTP Code</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="key-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    editable={!loading}
                  />
                </View>
              </View>
              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleVerifyAndRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & Register</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep(1)} style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={styles.registerLink}>← Back</Text>
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
              <Text style={styles.registerLink}>Login Here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#4f46e5' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#c7d2fe' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 48 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  btn: { backgroundColor: '#4f46e5', borderRadius: 10, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, color: '#9ca3af', fontSize: 12 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerLink: { fontSize: 14, color: '#4f46e5', fontWeight: '600' },
});
