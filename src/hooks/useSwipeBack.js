/**
 * Custom hook for iOS-style swipe-to-go-back gesture
 * Allows users to swipe from left edge to go back in navigation
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { hapticLight, isNative } from '@/lib/nativeFeatures';

export function useSwipeBack(enabled = true) {
  const router = useRouter();
  const startX = useRef(0);
  const startY = useRef(0);
  const isSwiping = useRef(false);
  const swipeProgress = useRef(0);

  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;

    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;

    // Only start swipe if touch started from left edge (within 20px)
    if (startX.current <= 20) {
      isSwiping.current = true;
    }
  }, [enabled]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled || !isSwiping.current) return;

    const touch = e.touches[0];
    const diffX = touch.clientX - startX.current;
    const diffY = touch.clientY - startY.current;

    // Only treat as swipe if horizontal movement is greater than vertical
    if (Math.abs(diffX) > Math.abs(diffY) && diffX > 0) {
      swipeProgress.current = Math.min(diffX / window.innerWidth, 1);

      // Trigger haptic at 50% progress
      if (swipeProgress.current >= 0.5 && swipeProgress.current < 0.52) {
        hapticLight();
      }
    }
  }, [enabled]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isSwiping.current) return;

    // If swiped more than 50% of screen width, go back
    if (swipeProgress.current >= 0.5) {
      hapticLight();
      router.back();
    }

    // Reset
    isSwiping.current = false;
    swipeProgress.current = 0;
  }, [enabled, router]);

  useEffect(() => {
    if (!enabled || !isNative()) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);
}

export default useSwipeBack;

