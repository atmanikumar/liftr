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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
