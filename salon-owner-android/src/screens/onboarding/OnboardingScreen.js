import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, Image, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingProvider, useOnboarding, TOTAL_STEPS, STEP_LABELS } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';

import Step_Profile      from './steps/Step3_Profile';
import Step_BusinessType from './steps/Step4_BusinessType';
import Step_Identity     from './steps/Step4_SalonIdentity';
import Step_Location     from './steps/Step5_Location';
import Step_Hours        from './steps/Step6_WorkingHours';
import Step_Media        from './steps/Step7_Media';
import Step_Preview      from './steps/Step10_Preview';

const { width: W } = Dimensions.get('window');

// Progress percentage per step — same curve as the website (7 steps)
const STEP_PROGRESS = { 1:14, 2:28, 3:43, 4:57, 5:71, 6:86, 7:100 };
const STEP_TIME_LEFT = { 1:'~2 min left', 2:'~100 sec left', 3:'~80 sec left', 4:'~60 sec left', 5:'~40 sec left', 6:'~20 sec left', 7:'Almost done' };

function DraftSkeleton() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
    ])).start();
  }, []);
  const bar = (w, h, r = 10) => (
    <Animated.View style={{ width: w, height: h, borderRadius: r, backgroundColor: 'rgba(255,255,255,0.07)', opacity: pulse }} />
  );
  return (
    <View style={{ paddingTop: 24, gap: 18 }}>
      {bar('60%', 36, 12)}
      {bar('85%', 16, 8)}
      <View style={{ height: 12 }} />
      {bar('100%', 120, 20)}
      <View style={{ height: 8 }} />
      {bar('100%', 60, 14)}
      {bar('100%', 60, 14)}
      <View style={{ height: 8 }} />
      {bar('55%', 48, 14)}
    </View>
  );
}

function OnboardingContent() {
  const { step, prevStep, minStep, draftLoaded, saveStatus } = useOnboarding();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  // Slide animation + per-dot completion bounce
  const slideAnim   = useRef(new Animated.Value(0)).current;
  const prevStepRef = useRef(step);
  const dotScales   = useRef(Array.from({ length: TOTAL_STEPS }, () => new Animated.Value(1))).current;

  useEffect(() => {
    const dir = step > prevStepRef.current ? 1 : -1;
    const completedIdx = dir === 1 ? prevStepRef.current - 1 : null; // dot that just got marked done
    prevStepRef.current = step;

    slideAnim.setValue(dir * W * 0.4);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
    }).start();

    if (completedIdx != null && completedIdx >= 0 && completedIdx < TOTAL_STEPS) {
      const dv = dotScales[completedIdx];
      dv.setValue(1);
      Animated.sequence([
        Animated.spring(dv, { toValue: 1.5, useNativeDriver: true, speed: 30, bounciness: 12 }),
        Animated.spring(dv, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
      ]).start();
    }
  }, [step]);

  const progress = STEP_PROGRESS[step] || 0;

  // Progress bar anim — spring for a snappier, more "alive" fill
  const progressAnim = useRef(new Animated.Value(progress)).current;
  const [displayPct, setDisplayPct] = useState(progress);
  useEffect(() => {
    const id = progressAnim.addListener(({ value }) => setDisplayPct(Math.round(value)));
    return () => progressAnim.removeListener(id);
  }, []);
  useEffect(() => {
    Animated.spring(progressAnim, { toValue: progress, useNativeDriver: false, speed: 14, bounciness: 4 }).start();
  }, [progress]);

  // "Saving… / Saved" trust indicator
  const saveIndicatorAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(saveIndicatorAnim, {
      toValue: saveStatus === 'idle' ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [saveStatus]);

  const canGoBack = step > minStep;

  const renderStep = () => {
    switch (step) {
      case 1: return <Step_Profile />;
      case 2: return <Step_BusinessType />;
      case 3: return <Step_Identity />;
      case 4: return <Step_Location />;
      case 5: return <Step_Hours />;
      case 6: return <Step_Media />;
      case 7: return <Step_Preview />;
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
          <Text style={s.stepCounter}>Step {step} of {TOTAL_STEPS} · {displayPct}%</Text>
          <Text style={s.stepName}>{STEP_LABELS[step - 1]}</Text>
          <Text style={s.timeLeft}>{STEP_TIME_LEFT[step] || ''}</Text>
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
          width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }),
        }]} />
      </View>

      {/* Autosave trust indicator */}
      <Animated.View pointerEvents="none" style={[s.saveIndicator, {
        opacity: saveIndicatorAnim,
        transform: [{ translateY: saveIndicatorAnim.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] }) }],
      }]}>
        {saveStatus === 'saving' && <ActivityIndicator size="small" color="#818cf8" />}
        {saveStatus === 'saved'  && <Ionicons name="checkmark-circle" size={12} color="#34d399" />}
        {saveStatus === 'error'  && <Ionicons name="cloud-offline-outline" size={12} color="#f87171" />}
        <Text style={s.saveIndicatorText}>
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? "Couldn't sync — will retry" : ''}
        </Text>
      </Animated.View>

      {/* Step dots (compact) */}
      <View style={s.dotsRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              s.dot,
              i + 1 < step  && s.dotDone,
              i + 1 === step && s.dotActive,
              { transform: [{ scale: dotScales[i] }] },
            ]}
          >
            {i + 1 < step && <Ionicons name="checkmark" size={9} color="#fff" />}
          </Animated.View>
        ))}
      </View>

      {/* Step content — skeleton while restoring saved draft */}
      <Animated.View style={[s.stepWrap, { transform: [{ translateX: slideAnim }] }]}>
        {draftLoaded ? renderStep() : <DraftSkeleton />}
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen({ route }) {
  const initialStep = route?.params?.initialStep || 1;
  return (
    <OnboardingProvider initialStep={initialStep}>
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
  timeLeft:      { fontSize: 10, color: '#4b5563', fontWeight: '600', marginTop: 2 },

  // Progress
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 0, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: '#6366f1' },

  // Autosave indicator
  saveIndicator:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 6 },
  saveIndicatorText: { fontSize: 10.5, fontWeight: '700', color: '#64748b' },

  // Dots
  dotsRow:       { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 8 },
  dot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
  dotDone:       { backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: 7 },
  dotActive:     { backgroundColor: '#818cf8', width: 22, height: 8, borderRadius: 4 },

  // Step
  stepWrap:      { flex: 1, paddingHorizontal: 20, paddingBottom: 0 },
});
