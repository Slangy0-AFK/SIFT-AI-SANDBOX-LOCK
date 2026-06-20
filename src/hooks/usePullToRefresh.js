import { useEffect, useRef, useState } from 'react';

export default function usePullToRefresh(onRefresh, containerRef) {
  const startY = useRef(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = containerRef?.current || window;

    const onTouchStart = (e) => {
      const scrollTop = containerRef?.current
        ? containerRef.current.scrollTop
        : window.scrollY;
      if (scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchEnd = async (e) => {
      if (startY.current === null) return;
      const delta = e.changedTouches[0].clientY - startY.current;
      startY.current = null;
      if (delta > 70 && !refreshing) {
        setRefreshing(true);
        await onRefresh();
        setRefreshing(false);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, refreshing, containerRef]);

  return refreshing;
}