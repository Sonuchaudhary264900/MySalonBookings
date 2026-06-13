import React, { createContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import * as salonService from '../services/salonService';
import billingService from '../services/billingService';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000';

// Create context
export const SalonContext = createContext();

/**
 * SalonProvider Component
 * Manages global salon state
 * 
 * Provides:
 * - salon: Current salon data
 * - services: List of services
 * - bookings: List of bookings
 * - analytics: Analytics data
 * - loading: Loading state
 * - error: Error messages
 */
export const SalonProvider = ({ children }) => {
  // State
  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [salonInitialized, setSalonInitialized] = useState(false);
  const [salonFetchFailed, setSalonFetchFailed] = useState(false);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const socketRef = useRef(null);

  // ── Socket: mark salon online/offline based on connection ─────
  useEffect(() => {
    if (!salon?._id) return;
    const isApproved = salon.isApproved || salon.approvalStatus === 'approved';
    if (!isApproved) return;

    // Connect socket and mark salon online.
    // withCredentials sends the httpOnly auth cookie in the handshake so the
    // server can verify this owner owns the salon before flipping isOnline.
    const socket = io(SOCKET_URL, { transports: ['polling', 'websocket'], withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-salon', { salonId: salon._id, ownerId: salon.ownerId });
    });

    // Notify owner when customer sends a message
    socket.on('new-chat-message', ({ bookingId, message }) => {
      window.dispatchEvent(new CustomEvent('new-chat-message', { detail: { bookingId, message } }));
    });

    // Mark offline on tab/window close
    const handleBeforeUnload = () => {
      socket.disconnect();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [salon?._id, salon?.isApproved, salon?.approvalStatus, salon?.ownerId]);

  // ✅ CREATE SALON
  const createSalon = useCallback(async (salonData) => {
    try {
      setError(null);
      setLoading(true);

      const response = await salonService.createSalon(salonData);

      if (response.data) {
        setSalon(response.data);
      }

      return response;
    } catch (err) {
      const errorMsg = err.message || 'Failed to create salon';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ GET MY SALON
  const fetchSalon = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setSalonFetchFailed(false);

      const response = await salonService.getMySalon();

      if (response.data) {
        setSalon(response.data);
        // Load subscription status alongside salon
        billingService.getSubscriptionStatus().then(res => {
          if (res?.success) setSubscription(res.data);
        }).catch(() => {});
      }

      return response;
    } catch (err) {
      // Network error (status 0) = server is down, not an approval issue
      if (!err.status || err.status === 0) {
        setSalonFetchFailed(true);
      }
      return null;
    } finally {
      setLoading(false);
      setSalonInitialized(true);
    }
  }, []);

  // ✅ UPDATE SALON
  const updateSalon = useCallback(async (salonData) => {
    try {
      setError(null);
      setLoading(true);

      const response = await salonService.updateSalon(salonData);

      if (response.data) {
        setSalon(response.data);
      }

      return response;
    } catch (err) {
      setError(err.message || 'Failed to update salon');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ GET SALON STATUS
  const fetchSalonStatus = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await salonService.getSalonStatus();

      return response;
    } catch (err) {
      console.error('❌ Fetch status failed:', err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ CREATE SERVICE
  const createService = useCallback(async (serviceData) => {
    try {
      setError(null);
      setLoading(true);

      const response = await salonService.createService(serviceData);

      if (response.data) {
        setServices([...services, response.data]);
      }

      return response;
    } catch (err) {
      setError(err.message || 'Failed to create service');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [services]);

  // ✅ GET SERVICES
  const fetchServices = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await salonService.getServices();

      if (response.data) {
        setServices(Array.isArray(response.data) ? response.data : []);
      }

      return response;
    } catch (err) {
      console.error('❌ Fetch services failed:', err.message);
      setServices([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ UPDATE SERVICE
  const updateService = useCallback(async (serviceId, serviceData) => {
    try {
      setError(null);
      setLoading(true);

      const response = await salonService.updateService(serviceId, serviceData);

      if (response.data) {
        setServices(services.map(s => s._id === serviceId ? response.data : s));
      }

      return response;
    } catch (err) {
      setError(err.message || 'Failed to update service');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [services]);

  // ✅ DELETE SERVICE
  const deleteService = useCallback(async (serviceId) => {
    try {
      setError(null);
      setLoading(true);

      await salonService.deleteService(serviceId);
      setServices(services.filter(s => s._id !== serviceId));
    } catch (err) {
      setError(err.message || 'Failed to delete service');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [services]);

  // ✅ BULK UPSERT SERVICES
  const bulkUpsertServices = useCallback(async (updates) => {
    try {
      setError(null);
      const response = await salonService.bulkUpsertServices(updates);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to bulk update services');
      throw err;
    }
  }, []);

  // ✅ GET BOOKINGS
  const fetchBookings = useCallback(async (filters = {}) => {
    try {
      setError(null);
      setLoading(true);

      const response = await salonService.getBookings(filters);

      if (response.data) {
        setBookings(Array.isArray(response.data) ? response.data : []);
      }

      return response;
    } catch (err) {
      console.error('❌ Fetch bookings failed:', err.message);
      setBookings([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ CREATE WALK-IN BOOKING
  const createWalkInBooking = useCallback(async (bookingData) => {
    try {
      setError(null);
      const response = await salonService.createWalkInBooking(bookingData);
      if (response.data) {
        setBookings((prev) => [response.data, ...prev]);
      }
      return response;
    } catch (err) {
      const errorMsg = err.message || 'Failed to create booking';
      setError(errorMsg);
      throw err;
    }
  }, []);

  // ✅ UPDATE BOOKING STATUS
  const updateBookingStatus = useCallback(async (bookingId, status) => {
    try {
      setError(null);
      setLoading(true);

      const response = await salonService.updateBookingStatus(bookingId, status);

      if (response.data) {
        setBookings(bookings.map(b => b._id === bookingId ? response.data : b));
      }

      return response;
    } catch (err) {
      setError(err.message || 'Failed to update booking');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [bookings]);

  // ✅ GET ANALYTICS
  const fetchAnalytics = useCallback(async (period = 'month') => {
    try {
      setError(null);
      setLoading(true);

      const response = await salonService.getAnalytics(period);

      if (response.data) {
        setAnalytics(response.data);
      }

      return response;
    } catch (err) {
      console.error('❌ Fetch analytics failed:', err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ GET REVENUE REPORT
  const fetchRevenueReport = useCallback(async (startDate, endDate) => {
    try {
      setError(null);
      setLoading(true);

      const response = await salonService.getRevenueReport(startDate, endDate);

      return response;
    } catch (err) {
      setError(err.message || 'Failed to fetch revenue report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ GET CUSTOMER COUNT
  const fetchCustomerCount = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await salonService.getCustomerCount();

      return response;
    } catch (err) {
      console.error('❌ Fetch customer count failed:', err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ FETCH SUBSCRIPTION
  const fetchSubscription = useCallback(async () => {
    try {
      setSubscriptionLoading(true);
      const res = await billingService.getSubscriptionStatus();
      if (res.success) setSubscription(res.data);
      return res;
    } catch (err) {
      console.error('fetchSubscription error:', err.message);
      return null;
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  // ✅ CLEAR ERROR
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    // State
    salon,
    services,
    bookings,
    analytics,
    loading,
    salonInitialized,
    salonFetchFailed,
    error,
    subscription,
    subscriptionLoading,

    // Salon methods
    createSalon,
    fetchSalon,
    updateSalon,
    fetchSalonStatus,

    // Service methods
    createService,
    fetchServices,
    updateService,
    deleteService,
    bulkUpsertServices,

    // Booking methods
    fetchBookings,
    updateBookingStatus,
    createWalkInBooking,

    // Analytics methods
    fetchAnalytics,
    fetchRevenueReport,
    fetchCustomerCount,

    // Subscription methods
    fetchSubscription,

    // Utility methods
    clearError,
  }), [
    salon, services, bookings, analytics, loading, salonInitialized, salonFetchFailed, error,
    subscription, subscriptionLoading,
    createSalon, fetchSalon, updateSalon, fetchSalonStatus,
    createService, fetchServices, updateService, deleteService, bulkUpsertServices,
    fetchBookings, updateBookingStatus, createWalkInBooking,
    fetchAnalytics, fetchRevenueReport, fetchCustomerCount,
    fetchSubscription,
    clearError,
  ]);

  return (
    <SalonContext.Provider value={value}>
      {children}
    </SalonContext.Provider>
  );
};

export default SalonContext;