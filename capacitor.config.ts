import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.liftr.fitness',
  appName: 'Spartans',
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
      style: 'DARK', // Dark content (black text/icons) for white status bar appearance
      backgroundColor: '#ffffff',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;

