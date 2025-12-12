/**
 * Native Features Integration for Liftr
 * Provides haptic feedback, status bar control, keyboard management, and more
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

// Check if running in native app (Capacitor)
export const isNative = () => {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform();
};

// ============================================================================
// HAPTIC FEEDBACK
// ============================================================================

/**
 * Light haptic feedback (for UI interactions like button taps)
 */
export const hapticLight = async () => {
  try {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (navigator.vibrate) {
      // Fallback for web
      navigator.vibrate(10);
    }
  } catch (e) {
    console.warn('Haptic feedback not available:', e);
  }
};

/**
 * Medium haptic feedback (for selections, toggles)
 */
export const hapticMedium = async () => {
  try {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  } catch (e) {
    console.warn('Haptic feedback not available:', e);
  }
};

/**
 * Heavy haptic feedback (for important actions)
 */
export const hapticHeavy = async () => {
  try {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else if (navigator.vibrate) {
      navigator.vibrate(40);
    }
  } catch (e) {
    console.warn('Haptic feedback not available:', e);
  }
};

/**
 * Success haptic (for successful operations)
 */
export const hapticSuccess = async () => {
  try {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  } catch (e) {
    console.warn('Haptic feedback not available:', e);
  }
};

/**
 * Warning haptic (for warnings or cautions)
 */
export const hapticWarning = async () => {
  try {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (navigator.vibrate) {
      navigator.vibrate([10, 30, 10, 30, 10]);
    }
  } catch (e) {
    console.warn('Haptic feedback not available:', e);
  }
};

/**
 * Error haptic (for errors or failed operations)
 */
export const hapticError = async () => {
  try {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Error });
    } else if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10, 50, 10]);
    }
  } catch (e) {
    console.warn('Haptic feedback not available:', e);
  }
};

/**
 * Selection changed haptic (for picker/slider interactions)
 */
export const hapticSelection = async () => {
  try {
    if (isNative()) {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } else if (navigator.vibrate) {
      navigator.vibrate(5);
    }
  } catch (e) {
    console.warn('Haptic feedback not available:', e);
  }
};

// ============================================================================
// STATUS BAR
// ============================================================================

/**
 * Set status bar style (light or dark)
 * 'light' = light content (white icons) on dark background
 * 'dark' = dark content (black icons) on light background
 */
export const setStatusBarStyle = async (style = 'light') => {
  try {
    if (isNative()) {
      await StatusBar.setStyle({ 
        style: style === 'light' ? Style.Light : Style.Dark 
      });
    }
  } catch (e) {
    console.warn('Status bar control not available:', e);
  }
};

/**
 * Hide status bar
 */
export const hideStatusBar = async () => {
  try {
    if (isNative()) {
      await StatusBar.hide();
    }
  } catch (e) {
    console.warn('Status bar control not available:', e);
  }
};

/**
 * Show status bar
 */
export const showStatusBar = async () => {
  try {
    if (isNative()) {
      await StatusBar.show();
    }
  } catch (e) {
    console.warn('Status bar control not available:', e);
  }
};

/**
 * Set status bar background color
 */
export const setStatusBarColor = async (color = '#0a0a0a') => {
  try {
    if (isNative()) {
      await StatusBar.setBackgroundColor({ color });
    }
  } catch (e) {
    console.warn('Status bar control not available:', e);
  }
};

// ============================================================================
// KEYBOARD
// ============================================================================

/**
 * Show keyboard
 */
export const showKeyboard = async () => {
  try {
    if (isNative()) {
      await Keyboard.show();
    }
  } catch (e) {
    console.warn('Keyboard control not available:', e);
  }
};

/**
 * Hide keyboard
 */
export const hideKeyboard = async () => {
  try {
    if (isNative()) {
      await Keyboard.hide();
    }
  } catch (e) {
    console.warn('Keyboard control not available:', e);
  }
};

/**
 * Add keyboard event listeners
 */
export const addKeyboardListeners = (onShow, onHide) => {
  if (!isNative()) return () => {};

  try {
    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
      if (onShow) onShow(info);
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      if (onHide) onHide();
    });

    // Return cleanup function
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  } catch (e) {
    console.warn('Keyboard listeners not available:', e);
    return () => {};
  }
};

// ============================================================================
// APP LIFECYCLE
// ============================================================================

/**
 * Add app state change listeners (active, background, inactive)
 */
export const addAppStateListeners = (onActive, onBackground) => {
  if (!isNative()) return () => {};

  try {
    const stateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && onActive) {
        onActive();
      } else if (!isActive && onBackground) {
        onBackground();
      }
    });

    // Return cleanup function
    return () => {
      stateListener.remove();
    };
  } catch (e) {
    console.warn('App state listeners not available:', e);
    return () => {};
  }
};

/**
 * Add back button listener (Android)
 */
export const addBackButtonListener = (handler) => {
  if (!isNative()) return () => {};

  try {
    const backListener = App.addListener('backButton', handler);

    // Return cleanup function
    return () => {
      backListener.remove();
    };
  } catch (e) {
    console.warn('Back button listener not available:', e);
    return () => {};
  }
};

/**
 * Exit app (Android)
 */
export const exitApp = async () => {
  try {
    if (isNative()) {
      await App.exitApp();
    }
  } catch (e) {
    console.warn('Exit app not available:', e);
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Debounced haptic feedback (prevents spamming)
 */
let hapticTimeout = null;
export const hapticLightDebounced = () => {
  if (hapticTimeout) return;
  
  hapticLight();
  hapticTimeout = setTimeout(() => {
    hapticTimeout = null;
  }, 50); // 50ms debounce
};

/**
 * Add haptic feedback to buttons automatically
 */
export const withHaptic = (callback, hapticType = 'light') => {
  return async (...args) => {
    // Trigger haptic first
    switch (hapticType) {
      case 'light':
        await hapticLight();
        break;
      case 'medium':
        await hapticMedium();
        break;
      case 'heavy':
        await hapticHeavy();
        break;
      case 'success':
        await hapticSuccess();
        break;
      case 'warning':
        await hapticWarning();
        break;
      case 'error':
        await hapticError();
        break;
      default:
        await hapticLight();
    }
    
    // Then execute callback
    if (callback) {
      return callback(...args);
    }
  };
};

/**
 * Initialize native features on app load
 */
export const initializeNativeFeatures = async () => {
  if (!isNative()) {
    console.log('Running in web mode - native features disabled');
    return;
  }

  console.log('Initializing native features...');

  // Set status bar to overlay mode with solid background
  try {
    // CRITICAL: Set overlay to false to prevent transparency
    await StatusBar.setOverlaysWebView({ overlay: false });
    
    // Set style (light = white icons on dark background)
    await StatusBar.setStyle({ style: Style.Light });
    
    // Set solid background color
    await StatusBar.setBackgroundColor({ color: '#0a0a0a' });
    
    console.log('Status bar configured with solid background ✅');
  } catch (e) {
    console.warn('Status bar configuration failed:', e);
  }

  // Configure keyboard behavior
  try {
    await Keyboard.setAccessoryBarVisible({ isVisible: false });
    await Keyboard.setScroll({ isDisabled: false });
  } catch (e) {
    console.warn('Keyboard configuration not available:', e);
  }

  console.log('Native features initialized ✅');
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Haptics
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticWarning,
  hapticError,
  hapticSelection,
  hapticLightDebounced,
  withHaptic,
  
  // Status Bar
  setStatusBarStyle,
  hideStatusBar,
  showStatusBar,
  setStatusBarColor,
  
  // Keyboard
  showKeyboard,
  hideKeyboard,
  addKeyboardListeners,
  
  // App Lifecycle
  addAppStateListeners,
  addBackButtonListener,
  exitApp,
  
  // Utility
  isNative,
  initializeNativeFeatures,
};

