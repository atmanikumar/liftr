import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for pull-to-refresh functionality with visual indicator
 * @param {Function} onRefresh - Callback function to execute on refresh
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Pull distance threshold (default: 180px)
 * @param {boolean} options.enabled - Enable/disable the feature (default: true)
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const { threshold = 180, enabled = true } = options;
  const startY = useRef(0);
  const currentY = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);
  const [pullProgress, setPullProgress] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Create refresh indicator element
    const indicator = document.createElement('div');
    indicator.id = 'pull-refresh-indicator';
    indicator.innerHTML = '↻';
    indicator.style.cssText = `
      position: fixed;
      top: 30px;
      left: 50%;
      transform: translateX(-50%) scale(0);
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: bold;
      z-index: 9999;
      pointer-events: none;
      transition: transform 0.3s ease, opacity 0.3s ease, background 0.2s ease;
      opacity: 0;
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    `;
    document.body.appendChild(indicator);

    const handleTouchStart = (e) => {
      // Only activate if we're at the top of the page
      if (window.scrollY > 0) return;
      
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const handleTouchMove = (e) => {
      if (!pulling.current || refreshing.current) return;
      
      currentY.current = e.touches[0].clientY;
      const pullDistance = currentY.current - startY.current;

      // Only pull down, not up
      if (pullDistance > 0) {
        // Prevent default scroll behavior when pulling
        if (pullDistance > 10) {
          e.preventDefault();
        }

        // Calculate progress - no upper limit for infinite pull
        const progress = pullDistance / threshold;
        setPullProgress(progress);

        // Show and scale indicator based on pull distance
        // Use easing for smoother feel, but allow infinite growth with diminishing returns
        const scale = Math.min(0.5 + Math.log(1 + progress) * 0.6, 2);
        const rotation = (progress * 180) % 360; // Continuous rotation
        
        indicator.style.opacity = Math.min(progress * 1.5, 1);
        indicator.style.transform = `translateX(-50%) scale(${scale}) rotate(${rotation}deg)`;

        // Change indicator color based on threshold (keep refresh icon)
        if (pullDistance > threshold) {
          indicator.style.background = 'var(--success)';
          // Infinite body translation with diminishing returns (logarithmic)
          const bodyTranslate = pullDistance * 0.5;
          document.body.style.transform = `translateY(${bodyTranslate}px)`;
          document.body.style.transition = 'none';
        } else {
          indicator.style.background = 'var(--primary)';
          // Even before threshold, allow body to move
          const bodyTranslate = pullDistance * 0.3;
          document.body.style.transform = `translateY(${bodyTranslate}px)`;
          document.body.style.transition = 'none';
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling.current || refreshing.current) return;
      
      const pullDistance = currentY.current - startY.current;
      
      // Reset transform
      document.body.style.transform = '';
      document.body.style.transition = 'transform 0.3s ease';

      // Trigger refresh if threshold exceeded
      if (pullDistance > threshold) {
        refreshing.current = true;
        
        // Show loading state (keep green color)
        indicator.style.opacity = '1';
        indicator.style.transform = 'translateX(-50%) scale(1)';
        indicator.style.animation = 'spin 1s linear infinite';
        indicator.style.background = 'var(--success)';
        
        // Add spin animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes spin {
            from { transform: translateX(-50%) rotate(0deg); }
            to { transform: translateX(-50%) rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh error:', error);
        } finally {
          refreshing.current = false;
          
          // Fade out indicator
          indicator.style.animation = '';
          indicator.style.opacity = '0';
          indicator.style.transform = 'translateX(-50%) scale(0)';
          
          setTimeout(() => {
            document.head.removeChild(style);
          }, 300);
        }
      } else {
        // Reset indicator
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateX(-50%) scale(0)';
      }

      pulling.current = false;
      startY.current = 0;
      currentY.current = 0;
      setPullProgress(0);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      
      // Cleanup
      document.body.style.transform = '';
      document.body.style.transition = '';
      if (indicator.parentNode) {
        document.body.removeChild(indicator);
      }
    };
  }, [onRefresh, threshold, enabled]);

  return pullProgress;
}

