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
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      return true;
    } catch (error) {
      return false;
    }
  } else {
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
      
      await Promise.all(
        apiCaches.map(cacheName => caches.delete(cacheName))
      );
      
      return true;
    } catch (error) {
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
    }
    
    return true;
  } catch (error) {
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
        await registration.update();
        
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
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
      
      return stats;
    } catch (error) {
      return null;
    }
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.__pwaCache = {
    clearAll: clearAllCaches,
    clearAPI: clearAPICaches,
    reset: resetPWA,
    update: updateServiceWorker,
    stats: getCacheStats
  };
}

