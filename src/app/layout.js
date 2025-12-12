'use client';

import { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { store } from '@/redux/store';
import { darkTheme } from '@/styles/theme';
import MainLayout from '@/components/layout/MainLayout';
import { initializeNativeFeatures } from '@/lib/nativeFeatures';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import './globals.css';

// Client-side wrapper to use hooks
function ClientLayout({ children }) {
  // Enable swipe-to-go-back gesture
  useSwipeBack(true);

  return <MainLayout>{children}</MainLayout>;
}

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize native features when app loads
    initializeNativeFeatures();
  }, []);

  return (
    <html lang="en">
      <head>
        <title>Spartans - Fitness Tracking App</title>
        <meta name="description" content="Track your fitness journey with Spartans" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Spartans" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Spartans" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0a0a0a" />
        
        {/* Icons */}
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Provider store={store}>
          <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <ClientLayout>{children}</ClientLayout>
          </ThemeProvider>
        </Provider>
      </body>
    </html>
  );
}
