import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.liftr.fitness',
  appName: 'Liftr',
  webDir: 'public',
  server: {
    url: 'https://liftr-six.vercel.app',
  },
  ios: {
    contentInset: 'never', // Don't add automatic insets since we have solid status bar
    scrollEnabled: true,
    // Enable native swipe-to-go-back gesture
    allowsBackForwardNavigationGestures: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT', // Light content (white text/icons) on dark background
      backgroundColor: '#0a0a0a',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;

