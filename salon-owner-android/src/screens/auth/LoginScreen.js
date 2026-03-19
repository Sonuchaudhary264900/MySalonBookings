import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passError, setPassError] = useState('');

  const validate = () => {
    let valid = true;
    setPhoneError('');
    setPassError('');
    if (!phone.trim()) { setPhoneError('Phone number is required'); valid = false; }
    if (!password) { setPassError('Password is required'); valid = false; }
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>💈 Smart Salon</Text>
          <Text style={styles.subtitle}>Owner Login</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to manage your salon</Text>

          {/* Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={[styles.inputRow, phoneError ? styles.inputError : styles.inputNormal]}>
              <Ionicons name="call-outline" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => { setPhone(t); setPhoneError(''); }}
                editable={!loading}
              />
            </View>
            {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputRow, passError ? styles.inputError : styles.inputNormal]}>
              <Ionicons name="lock-closed-outline" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => { setPassword(t); setPassError(''); }}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {!!passError && <Text style={styles.errorText}>{passError}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Login</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Register Here</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footerText}>By logging in, you agree to our Terms of Service</Text>
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
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, height: 48 },
  inputNormal: { borderColor: '#d1d5db' },
  inputError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  eyeBtn: { padding: 4 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  loginBtn: { backgroundColor: '#4f46e5', borderRadius: 10, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, color: '#9ca3af', fontSize: 12 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerLink: { fontSize: 14, color: '#4f46e5', fontWeight: '600' },
  footerText: { textAlign: 'center', color: '#c7d2fe', fontSize: 12, marginTop: 24 },
});
