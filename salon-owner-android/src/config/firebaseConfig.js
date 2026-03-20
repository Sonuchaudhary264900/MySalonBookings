import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDAN129txmFNPJVCUovGTxqWXgoR66HNYE',
  authDomain: 'smartsalonotp.firebaseapp.com',
  projectId: 'smartsalonotp',
  storageBucket: 'smartsalonotp.firebasestorage.app',
  messagingSenderId: '1073830044380',
  appId: '1:1073830044380:web:69907d3f2005c73b6a8a19',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export { firebaseConfig };
export default app;
