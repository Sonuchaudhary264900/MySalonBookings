import React, { createContext, useState, useCallback, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from './AuthContext';

const SOCKET_URL = 'https://mysalonbookings.onrender.com';

export const SalonContext = createContext();

export const SalonProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salonFetchDone, setSalonFetchDone] = useState(false);
  const socketRef = useRef(null);

  const fetchSalon = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.get('/owner/salon');
      setSalon(res.data.data || null);
    } catch {
      setSalon(null);
    } finally {
      setLoading(false);
      setSalonFetchDone(true);
    }
  }, [isAuthenticated]);

  const createSalon = useCallback(async (data) => {
    const res = await api.post('/owner/salon', data);
    if (!res.data.success) throw new Error(res.data.message || 'Failed to create salon');
    setSalon(res.data.data);
    return res.data.data;
  }, []);

  const updateSalon = useCallback(async (data) => {
    const res = await api.put('/owner/salon', data);
    if (!res.data.success) throw new Error(res.data.message || 'Failed to update salon');
    setSalon(res.data.data);
    return res.data.data;
  }, []);

  const fetchSalonStatus = useCallback(async () => {
    try {
      const res = await api.get('/owner/salon/approval-status');
      return res.data.data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setSalonFetchDone(false);
      fetchSalon();
    } else {
      setSalon(null);
      setLoading(false);
      setSalonFetchDone(false);
    }
  }, [isAuthenticated]);

  // ── Socket: mark salon online when owner is logged in ─────────
  useEffect(() => {
    if (!salon?._id) return;
    const isApproved = salon.isApproved || salon.approvalStatus === 'approved';
    if (!isApproved) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-salon', { salonId: salon._id, ownerId: salon.ownerId });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [salon?._id, salon?.isApproved, salon?.approvalStatus, salon?.ownerId]);

  return (
    <SalonContext.Provider value={{ salon, loading, salonFetchDone, fetchSalon, createSalon, updateSalon, fetchSalonStatus, setSalon }}>
      {children}
    </SalonContext.Provider>
  );
};

export const useSalon = () => useContext(SalonContext);
