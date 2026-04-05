import React, { lazy, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { OnboardingProvider, useOnboarding } from '../../context/OnboardingContext';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import { useAuth } from '../../hooks/useAuth';
import ROUTES from '../../routes';

const Step1  = lazy(() => import('../../components/onboarding/steps/Step1_PhoneInput'));
const Step2  = lazy(() => import('../../components/onboarding/steps/Step2_OtpVerify'));
const Step3  = lazy(() => import('../../components/onboarding/steps/Step3_ProfileSetup'));
const Step4  = lazy(() => import('../../components/onboarding/steps/Step4_SalonIdentity'));
const Step5  = lazy(() => import('../../components/onboarding/steps/Step5_Location'));
const Step6  = lazy(() => import('../../components/onboarding/steps/Step6_WorkingHours'));
const Step7  = lazy(() => import('../../components/onboarding/steps/Step7_MediaUpload'));
const Step8  = lazy(() => import('../../components/onboarding/steps/Step8_ServicesSelect'));
const Step9  = lazy(() => import('../../components/onboarding/steps/Step9_Pricing'));
const Step10 = lazy(() => import('../../components/onboarding/steps/Step10_Preview'));

const STEPS = [Step1, Step2, Step3, Step4, Step5, Step6, Step7, Step8, Step9, Step10];

const variants = {
  enter: (dir) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
};

function StepRenderer() {
  const { currentStep, direction } = useOnboarding();
  const StepComponent = STEPS[currentStep - 1];

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

  // Already approved → go to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (user?.status === 'approved' || user?.status === 'salon_registered') {
        // Let them continue if salon not yet registered — they might be mid-onboarding
        // Only redirect if truly done (approved)
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
