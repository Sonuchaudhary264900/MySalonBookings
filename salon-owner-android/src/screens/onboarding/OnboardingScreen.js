import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  SafeAreaView, Dimensions, Image, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingProvider, useOnboarding, TOTAL_STEPS, STEP_LABELS } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';

import Step1_Phone        from './steps/Step1_Phone';
import Step2_Otp          from './steps/Step2_Otp';
import Step3_Profile      from './steps/Step3_Profile';
import Step4_SalonIdentity from './steps/Step4_SalonIdentity';
import Step5_Location     from './steps/Step5_Location';
import Step6_WorkingHours from './steps/Step6_WorkingHours';
import Step7_Media        from './steps/Step7_Media';
import Step8_Services     from './steps/Step8_Services';
import Step9_Pricing      from './steps/Step9_Pricing';
import Step10_Preview     from './steps/Step10_Preview';

const { width: W } = Dimensions.get('window');

// Progress percentage per step
const STEP_PROGRESS = { 1:10, 2:20, 3:30, 4:42, 5:54, 6:64, 7:74, 8:83, 9:92, 10:98 };

// Speed message per step
const SPEED_MSG = {
  1:'⚡ Takes under 2 min',
  2:'⚡ Takes under 2 min',
  3:'⚡ Takes under 2 min',
  4:'🔥 Setting up salon...',
  5:'📍 Almost halfway!',
  6:'🗓️ Just a few more steps',
  7:'📸 Looking great!',
  8:'💼 Choose your services',
  9:'💰 Almost there!',
  10:'🚀 Final stretch!',
};

function OnboardingContent() {
  const { step, prevStep, minStep } = useOnboarding();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const confirmationRef = useRef(null);

  // Slide animation
  const slideAnim  = useRef(new Animated.Value(0)).current;
  const prevStepRef = useRef(step);

  useEffect(() => {
    const dir = step > prevStepRef.current ? 1 : -1;
    prevStepRef.current = step;

    slideAnim.setValue(dir * W * 0.4);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
    }).start();
  }, [step]);

  const progress = STEP_PROGRESS[step] || 0;

  // Progress bar anim
  const progressAnim = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 400, useNativeDriver: false }).start();
  }, [progress]);

  const canGoBack = step > minStep && !(step === 4 && user?.salonId);

  const renderStep = () => {
    const props = { confirmationRef };
    switch (step) {
      case 1:  return <Step1_Phone {...props} />;
      case 2:  return <Step2_Otp  {...props} />;
      case 3:  return <Step3_Profile />;
      case 4:  return <Step4_SalonIdentity />;
      case 5:  return <Step5_Location />;
      case 6:  return <Step6_WorkingHours />;
      case 7:  return <Step7_Media />;
      case 8:  return <Step8_Services />;
      case 9:  return <Step9_Pricing />;
      case 10: return <Step10_Preview />;
      default: return null;
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#07071a" />

      {/* Background orbs */}
      <View style={s.orb1} />
      <View style={s.orb2} />

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.topLeft}>
          {canGoBack ? (
            <TouchableOpacity style={s.backBtn} onPress={prevStep} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={20} color="#94a3b8" />
            </TouchableOpacity>
          ) : (
            <View style={s.logoWrap}>
              <Image source={require('../../../assets/Icon-1024.png')} style={s.logo} resizeMode="contain" />
            </View>
          )}
        </View>

        <View style={s.topCenter}>
          <Text style={s.stepCounter}>Step {step} of {TOTAL_STEPS}</Text>
          <Text style={s.stepName}>{STEP_LABELS[step - 1]}</Text>
        </View>

        <View style={s.topRight}>
          <TouchableOpacity style={s.logoutBtn} onPress={logout} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="log-out-outline" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, {
          width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }]} />
      </View>

      {/* Step dots (compact) */}
      <View style={s.dotsRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              i + 1 < step  && s.dotDone,
              i + 1 === step && s.dotActive,
            ]}
          >
            {i + 1 < step && <Ionicons name="checkmark" size={9} color="#fff" />}
          </View>
        ))}
      </View>

      {/* Step content */}
      <Animated.View style={[s.stepWrap, { transform: [{ translateX: slideAnim }] }]}>
        {renderStep()}
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen({ route }) {
  const initialStep   = route?.params?.initialStep  || 1;
  const prefillPhone  = route?.params?.prefillPhone || '';
  const prefillToken  = route?.params?.prefillToken || '';
  return (
    <OnboardingProvider initialStep={initialStep} prefillPhone={prefillPhone} prefillToken={prefillToken}>
      <OnboardingContent />
    </OnboardingProvider>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#07071a', overflow: 'hidden' },
  orb1:          { position: 'absolute', width: W * 0.9, height: W * 0.9, borderRadius: W * 0.45, backgroundColor: '#4f46e5', top: -W * 0.25, left: -W * 0.2, opacity: 0.35 },
  orb2:          { position: 'absolute', width: W * 0.6, height: W * 0.6, borderRadius: W * 0.3, backgroundColor: '#7c3aed', top: W * 0.05, right: -W * 0.25, opacity: 0.2 },

  // Top bar
  topBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  topLeft:       { width: 44 },
  topCenter:     { flex: 1, alignItems: 'center' },
  topRight:      { width: 44, alignItems: 'flex-end' },
  backBtn:       { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  logoutBtn:     { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  logoWrap:      { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0d0d2b', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(56,189,248,0.4)' },
  logo:          { width: 32, height: 32 },
  stepCounter:   { fontSize: 11, color: '#475569', fontWeight: '600', letterSpacing: 0.5 },
  stepName:      { fontSize: 14, fontWeight: '800', color: '#c4b5fd', marginTop: 1 },
  speedBadge:    { backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)' },
  speedText:     { fontSize: 9, color: '#818cf8', fontWeight: '700' },

  // Progress
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 0, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: '#6366f1' },

  // Dots
  dotsRow:       { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 8 },
  dot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
  dotDone:       { backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: 7 },
  dotActive:     { backgroundColor: '#818cf8', width: 22, height: 8, borderRadius: 4 },

  // Step
  stepWrap:      { flex: 1, paddingHorizontal: 20, paddingBottom: 0 },
});
