/**
 * Pull-to-Refresh Hook
 * Provides native-like pull-to-refresh functionality
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { hapticMedium } from '@/lib/haptics';

export const usePullToRefresh = (onRefresh, threshold = 80) => {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return;
    
    // Only trigger at top of scroll
    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current || refreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    // Only allow pull down
    if (diff > 0) {
      // Damping effect: slower pull as distance increases
      const dampedDistance = Math.min(diff * 0.5, threshold * 1.5);
      setPullDistance(dampedDistance);
      
      // Prevent default scroll when pulling
      if (diff > 10) {
        e.preventDefault();
      }
    }
  }, [threshold, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    
    pulling.current = false;
    
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      await hapticMedium();
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Bounce back
      setPullDistance(0);
    }
  }, [pullDistance, threshold, refreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    refreshing,
    pullDistance,
    isPulling: pulling.current,
  };
};

