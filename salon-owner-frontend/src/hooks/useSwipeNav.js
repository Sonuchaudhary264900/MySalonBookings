import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ROUTES from '../routes';

const TAB_ORDER = [
  ROUTES.DASHBOARD,
  ROUTES.ANALYTICS,
  ROUTES.SERVICES,
  ROUTES.MESSAGES,
  ROUTES.SETTINGS,
];

// Thresholds (Instagram-like behavior)
const MIN_SWIPE_DISTANCE = 72;   // minimum horizontal px to trigger
const DIRECTION_LOCK_AFTER = 10; // px of movement before locking direction
const HORIZ_RATIO_MIN = 0.65;    // gesture must be ≥65% horizontal to count

export default function useSwipeNav() {
  const navigate    = useNavigate();
  const location    = useLocation();

  const startX      = useRef(null);
  const startY      = useRef(null);
  const lockAxis    = useRef(null); // 'h' | 'v' | null
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const onTouchStart = (e) => {
      if (e.touches.length > 1) return;
      startX.current   = e.touches[0].clientX;
      startY.current   = e.touches[0].clientY;
      lockAxis.current = null;
    };

    const onTouchMove = (e) => {
      if (startX.current === null || lockAxis.current !== null) return;
      const dx = Math.abs(e.touches[0].clientX - startX.current);
      const dy = Math.abs(e.touches[0].clientY - startY.current);
      if (dx + dy > DIRECTION_LOCK_AFTER) {
        lockAxis.current = dx >= dy ? 'h' : 'v';
      }
    };

    const onTouchEnd = (e) => {
      if (startX.current === null) return;

      const endX  = e.changedTouches[0].clientX;
      const endY  = e.changedTouches[0].clientY;
      const diffX = startX.current - endX;
      const diffY = startY.current - endY;
      const absDX = Math.abs(diffX);
      const absDY = Math.abs(diffY);
      const origX = startX.current;

      startX.current   = null;
      startY.current   = null;
      lockAxis.current = null;

      // Left-edge swipe reserved for drawer
      if (origX < 30) return;

      // Must be a clearly horizontal gesture
      if (absDX < MIN_SWIPE_DISTANCE) return;
      if (absDY > absDX) return;
      if (absDX / (absDX + absDY) < HORIZ_RATIO_MIN) return;

      const currentIndex = TAB_ORDER.indexOf(pathnameRef.current);
      if (currentIndex === -1) return;

      if (diffX > 0 && currentIndex < TAB_ORDER.length - 1) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        navigate(TAB_ORDER[currentIndex + 1]);
      } else if (diffX < 0 && currentIndex > 0) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        navigate(TAB_ORDER[currentIndex - 1]);
      }
    };

    const onTouchCancel = () => {
      startX.current   = null;
      startY.current   = null;
      lockAxis.current = null;
    };

    document.addEventListener('touchstart',  onTouchStart,  { passive: true });
    document.addEventListener('touchmove',   onTouchMove,   { passive: true });
    document.addEventListener('touchend',    onTouchEnd,    { passive: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart',  onTouchStart);
      document.removeEventListener('touchmove',   onTouchMove);
      document.removeEventListener('touchend',    onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [navigate]);
}
