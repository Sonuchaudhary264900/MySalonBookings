import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TAB_ORDER = ['/', '/dashboard', '/favorites', '/profile'];

export default function useSwipeNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchX   = useRef(null);
  const touchY   = useRef(null);

  useEffect(() => {
    const currentIndex = TAB_ORDER.indexOf(location.pathname);
    if (currentIndex === -1) return; // not a tab page — ignore

    const onTouchStart = (e) => {
      touchX.current = e.touches[0].clientX;
      touchY.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e) => {
      if (touchX.current === null) return;
      const diffX = touchX.current - e.changedTouches[0].clientX;
      const diffY = touchY.current - e.changedTouches[0].clientY;
      touchX.current = null;
      touchY.current = null;

      // Ignore vertical-dominant swipes (scrolling)
      if (Math.abs(diffY) > Math.abs(diffX)) return;
      if (Math.abs(diffX) < 50) return;

      if (diffX > 0 && currentIndex < TAB_ORDER.length - 1) {
        window.scrollTo(0, 0);
        navigate(TAB_ORDER[currentIndex + 1]);
      } else if (diffX < 0 && currentIndex > 0) {
        window.scrollTo(0, 0);
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
