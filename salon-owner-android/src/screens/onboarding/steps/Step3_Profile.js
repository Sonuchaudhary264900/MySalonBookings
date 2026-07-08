import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Linking,
  Animated, Vibration, LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useOnboarding } from '../../../context/OnboardingContext';
import api from '../../../services/api';

const GREETING = (() => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', icon: 'sunny-outline' };
  if (h < 17) return { text: 'Good afternoon', icon: 'partly-sunny-outline' };
  return { text: 'Good evening', icon: 'moon-outline' };
})();

// Mirrors website Step3_ProfileSetup — account already exists (created at
// Register); this step just saves the owner's display name + referral code.
export default function Step3_Profile() {
  const { updateProfile, user } = useAuth();
  const {
    ownerName, setOwnerName,
    referralCode, setReferralCode,
    nextStep,
  } = useOnboarding();

  const [referralOpen, setReferralOpen] = useState(!!referralCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  // Pre-fill once from the account if the draft was empty
  useEffect(() => {
    if (!ownerName && user?.name) setOwnerName(user.name);
  }, []);

  const name = ownerName;
  const trimmed = name.trim();
  const isValid = trimmed.length >= 2;
  const firstName = trimmed.split(/\s+/)[0];

  // Staggered entrance — pill, then headline, then the form
  const entPill  = useRef(new Animated.Value(0)).current;
  const entTitle = useRef(new Animated.Value(0)).current;
  const entForm  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.stagger(90, [
      Animated.timing(entPill,  { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(entTitle, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(entForm,  { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();
  }, []);
  const rise = (v) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  });

  // Checkmark pops in the moment the name becomes valid (one light buzz, not on every keystroke)
  const checkScale = useRef(new Animated.Value(0)).current;
  const wasValid = useRef(false);
  useEffect(() => {
    if (isValid && !wasValid.current) {
      Vibration.vibrate(8);
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 14 }).start();
    } else if (!isValid && wasValid.current) {
      Animated.timing(checkScale, { toValue: 0, duration: 120, useNativeDriver: true }).start();
    }
    wasValid.current = isValid;
  }, [isValid]);

  // Button press feedback
  const btnScale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }).start();

  const toggleReferral = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReferralOpen(o => !o);
  };

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    Vibration.vibrate(10);
    setError('');
    setLoading(true);
    try {
      setOwnerName(trimmed);
      await updateProfile({ name: trimmed });
      if (referralCode.trim()) {
        try { await api.post('/owner/referral/apply', { code: referralCode.trim().toUpperCase() }); } catch {}
      }
      nextStep();
    } catch (err) {
      Vibration.vibrate([0, 30, 40, 30]);
      setError(err.response?.data?.message || err?.message || "Couldn't save that — check your connection and try again.");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <Animated.View style={rise(entPill)}>
          <View style={s.greetPill}>
            <Ionicons name={GREETING.icon} size={13} color="#a78bfa" />
            <Text style={s.greetText}>{GREETING.text} — let's get you set up</Text>
          </View>
          <View style={s.iconWrap}>
            <Ionicons name="hand-left-outline" size={38} color="#a78bfa" />
          </View>
        </Animated.View>

        <Animated.View style={rise(entTitle)}>
          <Text style={s.title}>What's your name?</Text>
          <Text style={s.sub}>
            {isValid ? `Nice to meet you, ${firstName}.` : 'This is how your customers and our team will address you.'}
          </Text>
        </Animated.View>

        <Animated.View style={rise(entForm)}>
          {/* Big name input — matches website's underlined hero input */}
          <View style={s.nameWrap}>
            <View style={s.nameRow}>
              <TextInput
                style={s.nameInp}
                placeholder="Your full name"
                placeholderTextColor="rgba(241,245,249,0.22)"
                value={name}
                onChangeText={setOwnerName}
                editable={!loading}
                autoFocus
                autoCorrect={false}
                autoComplete="name"
                textContentType="name"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              <Animated.View style={{ transform: [{ scale: checkScale }], opacity: checkScale }}>
                <Ionicons name="checkmark-circle" size={22} color="#34d399" />
              </Animated.View>
            </View>
            <View style={[s.underline, {
              opacity: focused || name ? 1 : 0.3,
              backgroundColor: isValid ? '#34d399' : '#7c3aed',
            }]} />
          </View>

          {/* Referral code — collapsible like the website */}
          <TouchableOpacity style={s.refToggle} onPress={toggleReferral} activeOpacity={0.7}>
            <Ionicons name={referralOpen ? 'chevron-down' : 'chevron-forward'} size={14} color="#a78bfa" />
            <Text style={s.refToggleText}>Have a referral code?</Text>
          </TouchableOpacity>

          {referralOpen && (
            <View style={s.row}>
              <Ionicons name="gift-outline" size={18} color="#818cf8" style={s.ic} />
              <TextInput
                style={[s.inp, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 2 }]}
                placeholder="e.g. GLX123456"
                placeholderTextColor="#4b5563"
                value={referralCode}
                onChangeText={t => setReferralCode(t.toUpperCase())}
                maxLength={12}
                autoCapitalize="characters"
                editable={!loading}
              />
            </View>
          )}

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#f87171" />
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity onPress={handleSubmit} style={s.retryBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[s.btn, (!isValid || loading) && s.btnOff]}
              onPress={handleSubmit}
              onPressIn={pressIn}
              onPressOut={pressOut}
              disabled={!isValid || loading}
              activeOpacity={0.88}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={s.btnText}>Let's go</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={s.hintText}>Takes less than 2 minutes · autosaves as you go</Text>

          <Text style={s.termsNote}>
            By continuing you agree to our{' '}
            <Text style={s.termsLink} onPress={() => Linking.openURL('https://owner.glowloox.com/legal/owner-terms')}>Terms</Text>
            {' '}&{' '}
            <Text style={s.termsLink} onPress={() => Linking.openURL('https://owner.glowloox.com/legal/owner-privacy')}>Privacy</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:       { flexGrow: 1, paddingHorizontal: 4, paddingTop: 20, paddingBottom: 32, justifyContent: 'center' },
  greetPill:    { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(124,58,237,0.12)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 18 },
  greetText:    { fontSize: 12, fontWeight: '700', color: '#c4b5fd' },
  iconWrap:     { marginBottom: 20 },
  title:        { fontSize: 30, fontWeight: '900', color: '#f1f5f9', marginBottom: 10, letterSpacing: -1 },
  sub:          { fontSize: 15, color: 'rgba(255,255,255,0.38)', marginBottom: 40, lineHeight: 22 },
  nameWrap:     { marginBottom: 32 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  nameInp:      { flex: 1, fontSize: 30, fontWeight: '800', color: '#f1f5f9', letterSpacing: -0.5, paddingVertical: 6 },
  underline:    { height: 3, borderRadius: 99, backgroundColor: '#7c3aed', marginTop: 4 },
  refToggle:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  refToggleText:{ fontSize: 13, fontWeight: '600', color: '#a78bfa' },
  row:          { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 14, paddingHorizontal: 14, height: 52, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
  ic:           { marginRight: 10 },
  inp:          { flex: 1, fontSize: 15, color: '#f1f5f9' },
  errorBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  errorText:    { flex: 1, fontSize: 12.5, color: '#fca5a5', lineHeight: 17 },
  retryBtn:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(248,113,113,0.18)' },
  retryText:    { fontSize: 12, fontWeight: '700', color: '#fecaca' },
  btn:          { backgroundColor: '#7c3aed', borderRadius: 18, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnOff:       { opacity: 0.45 },
  btnText:      { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  hintText:     { textAlign: 'center', fontSize: 11.5, color: '#475569', marginTop: 14, fontWeight: '600' },
  termsNote:    { textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 12, lineHeight: 18 },
  termsLink:    { color: '#a78bfa', fontWeight: '600' },
});
