'use client';

import { useState, useEffect } from 'react';
import { Box, Toolbar } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Loader from '../common/Loader';
import { checkAuth, selectAuth } from '@/redux/slices/authSlice';

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
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar onMenuClick={handleSidebarToggle} />
      <Sidebar open={sidebarOpen} onClose={handleSidebarToggle} variant="temporary" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          minHeight: '100vh',
          backgroundColor: 'background.default',
          // Account for navbar height + safe area
          paddingTop: 'calc(70px + env(safe-area-inset-top, 0px) + 24px)', // 70px navbar + safe area + default padding
          // Also add safe area for bottom on iOS devices
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

