import { useContext } from 'react';
import { SalonContext } from '../context/SalonContext';

/**
 * useSalon Hook
 * Custom hook to access salon context
 * 
 * Usage:
 * const { salon, services, fetchServices, createService } = useSalon();
 */
export const useSalon = () => {
  const context = useContext(SalonContext);

  if (!context) {
    throw new Error('useSalon must be used within SalonProvider');
  }

  return context;
};

export default useSalon;