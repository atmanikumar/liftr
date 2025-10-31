import './globals.css'
import { GameProvider } from '@/context/GameContext'
import { AuthProvider } from '@/context/AuthContext'
import Navigation from '@/components/Navigation'

export const metadata = {
  title: 'Vilayattu Veedu - Card Game Tracker',
  description: 'Track your card game scores and statistics',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'House of Games',
  },
  formatDetection: {
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        
        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon/favicon-96x96.png" />
        
        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
        
        {/* PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="House of Games" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Material Icons */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
      </head>
      <body>
        <AuthProvider>
          <GameProvider>
            <Navigation />
            {children}
          </GameProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

