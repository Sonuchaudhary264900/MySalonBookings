import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TAB_ORDER = ['/', '/dashboard', '/favorites', '/profile'];

export default function useSwipeNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchX   = useRef(null);
  const token    = localStorage.getItem('customerToken');

  useEffect(() => {
    if (!token) return; // only swipe when logged in
    const currentIndex = TAB_ORDER.indexOf(location.pathname);
    if (currentIndex === -1) return; // not a tab page — ignore

    const onTouchStart = (e) => {
      touchX.current = e.touches[0].clientX;
    };

    const onTouchEnd = (e) => {
      if (touchX.current === null) return;
      const diff = touchX.current - e.changedTouches[0].clientX;
      touchX.current = null;

      if (Math.abs(diff) < 50) return;

      if (diff > 0 && currentIndex < TAB_ORDER.length - 1) {
        navigate(TAB_ORDER[currentIndex + 1]);
      } else if (diff < 0 && currentIndex > 0) {
        navigate(TAB_ORDER[currentIndex - 1]);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, [location.pathname, navigate, token]);
}
