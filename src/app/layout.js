'use client';

import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { store } from '@/redux/store';
import { darkTheme } from '@/styles/theme';
import MainLayout from '@/components/layout/MainLayout';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Liftr - Fitness Tracking App</title>
        <meta name="description" content="Track your fitness journey with Liftr" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Liftr" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Liftr" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#3b82f6" />
        
        {/* Icons */}
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Provider store={store}>
          <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <MainLayout>{children}</MainLayout>
          </ThemeProvider>
        </Provider>
      </body>
    </html>
  );
}
