import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ROUTES from '../routes';

const TAB_ORDER = [
  ROUTES.DASHBOARD,
  ROUTES.ANALYTICS,
  ROUTES.SERVICES,
  ROUTES.PROFILE,
  ROUTES.SETTINGS,
];

export default function useSwipeNav() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const touchX    = useRef(null);

  useEffect(() => {
    const currentIndex = TAB_ORDER.indexOf(location.pathname);
    if (currentIndex === -1) return; // not a tab page — ignore swipes

    const onTouchStart = (e) => {
      touchX.current = e.touches[0].clientX;
    };

    const onTouchEnd = (e) => {
      if (touchX.current === null) return;
      const startX = touchX.current;
      const diff   = startX - e.changedTouches[0].clientX;
      touchX.current = null;

      if (Math.abs(diff) < 50) return; // too short — ignore
      // Left-edge swipe (< 30px from left) is reserved for drawer — skip tab nav
      if (startX < 30) return;

      if (diff > 0 && currentIndex < TAB_ORDER.length - 1) {
        // swipe left → next tab
        navigate(TAB_ORDER[currentIndex + 1]);
      } else if (diff < 0 && currentIndex > 0) {
        // swipe right → previous tab
        navigate(TAB_ORDER[currentIndex - 1]);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, [location.pathname, navigate]);
}
