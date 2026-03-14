import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  // IMPORTANT: Make sure context has these methods
  if (!context.sendOtp) {
    console.error('sendOtp not found in AuthContext', context);
  }
  if (!context.verifyOtp) {
    console.error('verifyOtp not found in AuthContext', context);
  }
  if (!context.register) {
    console.error('register not found in AuthContext', context);
  }

  return context;
};