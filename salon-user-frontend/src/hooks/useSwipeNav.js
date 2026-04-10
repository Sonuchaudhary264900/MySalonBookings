import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Only these top-level tab pages participate in swipe navigation
const TAB_ORDER = ['/', '/reels', '/dashboard', '/favorites', '/profile'];

// Thresholds (Instagram-like behavior)
const MIN_SWIPE_DISTANCE = 72;   // minimum horizontal px to trigger
const DIRECTION_LOCK_AFTER = 10; // px of movement before locking direction
const HORIZ_RATIO_MIN = 0.65;    // gesture must be ≥65% horizontal to count

export default function useSwipeNav() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Use refs so event listeners always read the latest values without re-registering
  const startX     = useRef(null);
  const startY     = useRef(null);
  const lockAxis   = useRef(null); // 'h' | 'v' | null
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const onTouchStart = (e) => {
      // Ignore multi-touch
      if (e.touches.length > 1) return;
      startX.current   = e.touches[0].clientX;
      startY.current   = e.touches[0].clientY;
      lockAxis.current = null;
    };

    const onTouchMove = (e) => {
      if (startX.current === null || lockAxis.current !== null) return;
      const dx = Math.abs(e.touches[0].clientX - startX.current);
      const dy = Math.abs(e.touches[0].clientY - startY.current);
      const moved = dx + dy;

      // Once the finger has moved enough, lock to the dominant axis
      if (moved > DIRECTION_LOCK_AFTER) {
        lockAxis.current = dx >= dy ? 'h' : 'v';
      }
    };

    const onTouchEnd = (e) => {
      if (startX.current === null) return;

      const endX  = e.changedTouches[0].clientX;
      const endY  = e.changedTouches[0].clientY;
      const diffX = startX.current - endX;   // positive = swipe left (next tab)
      const diffY = startY.current - endY;
      const absDX = Math.abs(diffX);
      const absDY = Math.abs(diffY);

      // Reset state
      startX.current   = null;
      startY.current   = null;
      lockAxis.current = null;

      // Must be a clearly horizontal gesture
      if (absDX < MIN_SWIPE_DISTANCE)           return; // too short
      if (absDY > absDX)                         return; // vertical-dominant
      if (absDX / (absDX + absDY) < HORIZ_RATIO_MIN) return; // not horizontal enough

      // Only fire on main tab pages
      const currentIndex = TAB_ORDER.indexOf(pathnameRef.current);
      if (currentIndex === -1) return;

      if (diffX > 0 && currentIndex < TAB_ORDER.length - 1) {
        // Swipe left → next tab
        window.scrollTo({ top: 0, behavior: 'instant' });
        navigate(TAB_ORDER[currentIndex + 1]);
      } else if (diffX < 0 && currentIndex > 0) {
        // Swipe right → previous tab
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
  }, [navigate]); // navigate is stable, pathnameRef updates without re-registering
}
