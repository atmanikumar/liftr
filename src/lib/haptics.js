/**
 * Haptic Feedback Utilities
 * Provides native-like haptic feedback with fallbacks for web
 */

let Haptics = null;
let ImpactStyle = null;
let NotificationType = null;

// Dynamically import Capacitor Haptics (only on client-side)
if (typeof window !== 'undefined') {
  import('@capacitor/haptics').then((module) => {
    Haptics = module.Haptics;
    ImpactStyle = module.ImpactStyle;
    NotificationType = module.NotificationType;
  }).catch(() => {
    // Capacitor not available, use fallbacks
  });
}

/**
 * Light haptic feedback - for button taps, list scrolling
 */
export const hapticLight = async () => {
  try {
    if (Haptics && ImpactStyle) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  } catch (e) {
    // Silent fail
  }
};

/**
 * Medium haptic feedback - for selections, toggles
 */
export const hapticMedium = async () => {
  try {
    if (Haptics && ImpactStyle) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  } catch (e) {
    // Silent fail
  }
};

/**
 * Heavy haptic feedback - for important actions, warnings
 */
export const hapticHeavy = async () => {
  try {
    if (Haptics && ImpactStyle) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  } catch (e) {
    // Silent fail
  }
};

/**
 * Success haptic - for completed actions, achievements
 */
export const hapticSuccess = async () => {
  try {
    if (Haptics && NotificationType) {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  } catch (e) {
    // Silent fail
  }
};

/**
 * Warning haptic - for caution actions
 */
export const hapticWarning = async () => {
  try {
    if (Haptics && NotificationType) {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (navigator.vibrate) {
      navigator.vibrate([20, 100, 20]);
    }
  } catch (e) {
    // Silent fail
  }
};

/**
 * Error haptic - for failed actions, errors
 */
export const hapticError = async () => {
  try {
    if (Haptics && NotificationType) {
      await Haptics.notification({ type: NotificationType.Error });
    } else if (navigator.vibrate) {
      navigator.vibrate([50, 100, 50, 100, 50]);
    }
  } catch (e) {
    // Silent fail
  }
};

/**
 * Selection haptic - for slider changes, picker scrolling
 */
export const hapticSelection = async () => {
  try {
    if (Haptics) {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } else if (navigator.vibrate) {
      navigator.vibrate(5);
    }
  } catch (e) {
    // Silent fail
  }
};

