import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDAN129txmFNPJVCUovGTxqWXgoR66HNYE",
  authDomain: "smartsalonotp.firebaseapp.com",
  projectId: "smartsalonotp",
  storageBucket: "smartsalonotp.firebasestorage.app",
  messagingSenderId: "1073830044380",
  appId: "1:1073830044380:web:69907d3f2005c73b6a8a19",
  measurementId: "G-LYSJZ3ZLCM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Disable reCAPTCHA in development — use test phone numbers in Firebase Console
if (import.meta.env.DEV) {
  auth.settings.appVerificationDisabledForTesting = true;
}

export default app;
