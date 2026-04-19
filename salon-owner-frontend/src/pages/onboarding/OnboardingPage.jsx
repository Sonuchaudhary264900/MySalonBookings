import React, { lazy, Suspense, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { OnboardingProvider, useOnboarding } from '../../context/OnboardingContext';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import ROUTES from '../../routes';

const Step1  = lazy(() => import('../../components/onboarding/steps/Step1_PhoneInput'));
const Step2  = lazy(() => import('../../components/onboarding/steps/Step2_OtpVerify'));
const Step3  = lazy(() => import('../../components/onboarding/steps/Step3_ProfileSetup'));
const Step4  = lazy(() => import('../../components/onboarding/steps/Step4_SalonType'));
const Step5  = lazy(() => import('../../components/onboarding/steps/Step4_SalonIdentity'));
const Step6  = lazy(() => import('../../components/onboarding/steps/Step5_Location'));
const Step7  = lazy(() => import('../../components/onboarding/steps/Step6_WorkingHours'));
const Step8  = lazy(() => import('../../components/onboarding/steps/Step7_MediaUpload'));
const Step9  = lazy(() => import('../../components/onboarding/steps/Step8_ServicesSelect'));
const Step10 = lazy(() => import('../../components/onboarding/steps/Step9_Pricing'));
const Step11 = lazy(() => import('../../components/onboarding/steps/Step10_Preview'));

const STEPS = [Step1, Step2, Step3, Step4, Step5, Step6, Step7, Step8, Step9, Step10, Step11];

const variants = {
  enter: (dir) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
};

function DraftSkeleton() {
  const { isDark } = useTheme();
  const base = isDark ? 'rgba(255,255,255,0.07)' : '#ede9fe';
  const shine = isDark ? 'rgba(255,255,255,0.04)' : '#f5f3ff';
  const sk = (w, h, r = 10) => (
    <div style={{ width: w, height: h, borderRadius: r, background: `linear-gradient(90deg,${base} 25%,${shine} 50%,${base} 75%)`, backgroundSize: '200% 100%', animation: 'sk-shine 1.2s infinite' }} />
  );
  return (
    <>
      <style>{`@keyframes sk-shine{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 0' }}>
        {sk('60%', 36, 12)}
        {sk('85%', 16, 8)}
        <div style={{ height: 12 }} />
        {sk('100%', 120, 20)}
        <div style={{ height: 8 }} />
        {sk('100%', 60, 14)}
        {sk('100%', 60, 14)}
        <div style={{ height: 8 }} />
        {sk('55%', 48, 14)}
      </div>
    </>
  );
}

function StepRenderer() {
  const { currentStep, direction, draftLoaded } = useOnboarding();
  const StepComponent = STEPS[currentStep - 1];

  if (!draftLoaded) return <DraftSkeleton />;

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={currentStep}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      >
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        }>
          <StepComponent />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function OnboardingInner() {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { update, goToStep } = useOnboarding();

  // Pre-fill phone+token from Login redirect (phone verified, skip Steps 1 & 2)
  useEffect(() => {
    const state = location.state;
    if (state?.skipToStep && state?.phone && state?.firebaseToken) {
      update({ phone: state.phone, firebaseToken: state.firebaseToken });
      goToStep(state.skipToStep);
      // Clear state so back-navigation doesn't re-trigger
      window.history.replaceState({}, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Already approved → go to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (user?.status === 'approved' || user?.status === 'salon_registered') {
        if (user?.status === 'approved') {
          navigate(ROUTES.DASHBOARD, { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, loading, navigate]);

  return (
    <OnboardingLayout>
      <StepRenderer />
    </OnboardingLayout>
  );
}

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingInner />
    </OnboardingProvider>
  );
}
