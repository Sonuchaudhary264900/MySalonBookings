import { useState, useRef, useCallback } from 'react';

/**
 * Watches GPS position with live accuracy feedback.
 * Stops automatically when accuracy ≤ targetAccuracy or after timeout.
 */
export function useGeoLocation({ targetAccuracy = 50, timeoutMs = 20000 } = {}) {
  const [status, setStatus]     = useState('idle');   // idle | watching | done | error
  const [accuracy, setAccuracy] = useState(null);
  const [position, setPosition] = useState(null);     // { lat, lng }
  const [error, setError]       = useState('');

  const watchIdRef   = useRef(null);
  const timerRef     = useRef(null);

  const stop = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    clearTimeout(timerRef.current);
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setStatus('error');
      return;
    }
    stop();
    setStatus('watching');
    setError('');
    setAccuracy(null);

    const handleSuccess = (pos) => {
      const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
      setAccuracy(Math.round(acc));
      setPosition({ lat, lng });

      if (acc <= targetAccuracy) {
        setStatus('done');
        stop();
      }
    };

    const handleError = (err) => {
      setError(err.message || 'Unable to retrieve location.');
      setStatus('error');
      stop();
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess, handleError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    // Force-stop after timeout
    timerRef.current = setTimeout(() => {
      if (watchIdRef.current != null) {
        setStatus('done');
        stop();
      }
    }, timeoutMs);
  }, [stop, targetAccuracy, timeoutMs]);

  return { status, accuracy, position, error, start, stop };
}
