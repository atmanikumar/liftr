'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useGame } from '@/context/GameContext';
import styles from './Navigation.module.css';

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const { refreshData } = useGame();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install button
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      // Hide the install button after installation
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
  };

  // Don't show navigation on login page
  if (pathname === '/login') {
    return null;
  }

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            House of Games
          </Link>
          
          {/* Desktop Navigation */}
          <div className={styles.links}>
            <Link 
              href="/" 
              className={pathname === '/' ? styles.active : ''}
            >
              Dashboard
            </Link>
            <Link 
              href="/history" 
              className={pathname === '/history' ? styles.active : ''}
            >
              History
            </Link>
            {isAdmin() && (
              <Link 
                href="/users" 
                className={pathname === '/users' ? styles.active : ''}
              >
                Users
              </Link>
            )}
            <Link 
              href="/profile" 
              className={pathname === '/profile' ? styles.active : ''}
            >
              Profile
            </Link>
            {showInstallButton && (
              <button 
                onClick={handleInstallClick}
                className={styles.installBtn}
                title="Install App"
              >
                📱 Install
              </button>
            )}
          </div>
          
          {user && (
            <div className={styles.userSection}>
              <span className={styles.userName}>
                {user.name} ({user.role})
              </span>
              <button onClick={logout} className={styles.logoutBtn}>
                Logout
              </button>
            </div>
          )}

          {/* Refresh Button */}
          <button 
            className={styles.refreshBtn}
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh data"
          >
            <span className="material-icons">
              {refreshing ? 'hourglass_empty' : 'refresh'}
            </span>
          </button>

          {/* Mobile Hamburger Button */}
          <button 
            className={styles.hamburger}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile Side Menu */}
      <div 
        className={`${styles.mobileMenuOverlay} ${mobileMenuOpen ? styles.open : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.mobileMenuHeader}>
          <span className={styles.mobileMenuTitle}>Menu</span>
          <button 
            className={styles.closeBtn}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {user && (
          <div className={styles.mobileUserInfo}>
            <div className={styles.mobileUserName}>{user.name}</div>
            <div className={styles.mobileUserRole}>{user.role}</div>
          </div>
        )}

        <div className={styles.mobileLinks}>
          <Link 
            href="/" 
            className={pathname === '/' ? styles.active : ''}
            onClick={handleLinkClick}
          >
            <span className="material-icons">home</span>
            Dashboard
          </Link>
          <Link 
            href="/history" 
            className={pathname === '/history' ? styles.active : ''}
            onClick={handleLinkClick}
          >
            <span className="material-icons">history</span>
            History
          </Link>
          {isAdmin() && (
            <Link 
              href="/users" 
              className={pathname === '/users' ? styles.active : ''}
              onClick={handleLinkClick}
            >
              <span className="material-icons">group</span>
              Users
            </Link>
          )}
          <Link 
            href="/profile" 
            className={pathname === '/profile' ? styles.active : ''}
            onClick={handleLinkClick}
          >
            <span className="material-icons">person</span>
            Profile
          </Link>
          {showInstallButton && (
            <button 
              onClick={() => {
                handleInstallClick();
                setMobileMenuOpen(false);
              }}
              className={styles.mobileInstallBtn}
            >
              <span className="material-icons">phone_iphone</span>
              Install App
            </button>
          )}
        </div>

        {user && (
          <div className={styles.mobileMenuFooter}>
            <button onClick={handleLogout} className={styles.mobileLogoutBtn}>
              Logout
            </button>
          </div>
        )}
      </div>
    </>
  );
}

