/**
 * PWA Cache Management Utilities
 * 
 * These functions help manage the Service Worker cache to ensure
 * users always see fresh data.
 */

/**
 * Clear all PWA caches
 * @returns {Promise<void>}
 */
export async function clearAllCaches() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      console.log('[PWA Cache] Found caches:', cacheNames);
      
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('[PWA Cache] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
      
      console.log('[PWA Cache] ✅ All caches cleared!');
      return true;
    } catch (error) {
      console.error('[PWA Cache] Error clearing caches:', error);
      return false;
    }
  } else {
    console.log('[PWA Cache] Cache API not supported');
    return false;
  }
}

/**
 * Clear only API-related caches
 * @returns {Promise<void>}
 */
export async function clearAPICaches() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      const apiCaches = cacheNames.filter(name => 
        name.includes('apis') || 
        name.includes('next-data') || 
        name.includes('static-data')
      );
      
      console.log('[PWA Cache] Clearing API caches:', apiCaches);
      
      await Promise.all(
        apiCaches.map(cacheName => caches.delete(cacheName))
      );
      
      console.log('[PWA Cache] ✅ API caches cleared!');
      return true;
    } catch (error) {
      console.error('[PWA Cache] Error clearing API caches:', error);
      return false;
    }
  }
  return false;
}

/**
 * Unregister service worker and clear all caches
 * USE WITH CAUTION: This will disable PWA functionality until page reload
 * @returns {Promise<void>}
 */
export async function resetPWA() {
  try {
    // Clear all caches
    await clearAllCaches();
    
    // Unregister service worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
      console.log('[PWA Cache] ✅ Service worker unregistered');
    }
    
    console.log('[PWA Cache] ✅ PWA reset complete! Please reload the page.');
    return true;
  } catch (error) {
    console.error('[PWA Cache] Error resetting PWA:', error);
    return false;
  }
}

/**
 * Force update service worker to latest version
 * @returns {Promise<void>}
 */
export async function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (const registration of registrations) {
        console.log('[PWA Cache] Checking for service worker updates...');
        await registration.update();
        
        if (registration.waiting) {
          console.log('[PWA Cache] New service worker available! Activating...');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Reload page after new SW activates
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
              refreshing = true;
              window.location.reload();
            }
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error('[PWA Cache] Error updating service worker:', error);
      return false;
    }
  }
  return false;
}

/**
 * Get cache statistics
 * @returns {Promise<Object>}
 */
export async function getCacheStats() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      const stats = {
        totalCaches: cacheNames.length,
        caches: {}
      };
      
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        stats.caches[name] = keys.length;
      }
      
      console.log('[PWA Cache] Cache stats:', stats);
      return stats;
    } catch (error) {
      console.error('[PWA Cache] Error getting cache stats:', error);
      return null;
    }
  }
  return null;
}

// Export for use in browser console (for debugging)
if (typeof window !== 'undefined') {
  window.__pwaCache = {
    clearAll: clearAllCaches,
    clearAPI: clearAPICaches,
    reset: resetPWA,
    update: updateServiceWorker,
    stats: getCacheStats
  };
  
  console.log('[PWA Cache] Utilities available at window.__pwaCache');
  console.log('[PWA Cache] Try: __pwaCache.clearAll() or __pwaCache.stats()');
}

