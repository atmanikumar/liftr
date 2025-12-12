'use client';

import { useState, useEffect } from 'react';
import { Box, Toolbar } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Loader from '../common/Loader';
import { checkAuth, selectAuth, loadViewingAs } from '@/redux/slices/authSlice';

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useSelector(selectAuth);

  useEffect(() => {
    // Check authentication on mount
    const checkAuthStatus = async () => {
      await dispatch(checkAuth());
      // Load viewingAs from localStorage after auth check
      dispatch(loadViewingAs());
      setInitializing(false);
    };
    checkAuthStatus();
  }, [dispatch]);

  useEffect(() => {
    // Redirect to login if not authenticated (except on login page)
    if (!loading && !initializing && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, initializing, pathname, router]);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  // Show loader while checking auth on initial load
  if (initializing || loading) {
    // Don't show loader on login page
    if (pathname === '/login') {
      return children;
    }
    return <Loader fullScreen message="Loading..." />;
  }

  // Don't show layout on login page
  if (pathname === '/login') {
    return children;
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return <Loader fullScreen message="Redirecting..." />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', position: 'relative' }}>
      <Navbar onMenuClick={handleSidebarToggle} />
      
      {/* Overlay backdrop for mobile when sidebar is open */}
      {sidebarOpen && (
        <Box
          onClick={handleSidebarClose}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1200, // Below drawer (1300) but above everything else
            display: { xs: 'block', md: 'none' }, // Only on mobile
            cursor: 'pointer',
          }}
        />
      )}
      
      {/* Mobile Sidebar - Temporary Drawer */}
      <Sidebar 
        open={sidebarOpen} 
        onClose={handleSidebarClose} 
        variant="temporary"
        sx={{ display: { xs: 'block', md: 'none' } }}
      />
      
      {/* Desktop Sidebar - Permanent Drawer */}
      <Sidebar 
        open={true} 
        onClose={() => {}} 
        variant="permanent"
        sx={{ display: { xs: 'none', md: 'block' } }}
      />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          minHeight: '100vh',
          maxWidth: '100vw',
          overflow: 'hidden',
          backgroundColor: 'background.default',
          // Responsive padding (no safe-area-inset-top since status bar is native)
          paddingTop: {
            xs: 'calc(64px + 16px)',
            sm: 'calc(70px + 20px)',
            md: 'calc(70px + 24px)',
          },
          paddingLeft: {
            xs: 'calc(10px + env(safe-area-inset-left, 0px))',
            sm: 'calc(16px + env(safe-area-inset-left, 0px))',
            md: 'calc(24px + env(safe-area-inset-left, 0px))',
          },
          paddingRight: {
            xs: 'calc(10px + env(safe-area-inset-right, 0px))',
            sm: 'calc(16px + env(safe-area-inset-right, 0px))',
            md: 'calc(24px + env(safe-area-inset-right, 0px))',
          },
          paddingBottom: {
            xs: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            sm: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            md: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

