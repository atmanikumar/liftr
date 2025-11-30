'use client';

import { AppBar, Toolbar, IconButton, Typography, Box, Avatar, Menu, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectUser } from '@/redux/slices/authSlice';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar({ onMenuClick }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector(selectUser);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await dispatch(logout());
    handleProfileMenuClose();
    router.push('/login');
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--status-bar-color, #0a0a0a)', // Use CSS variable for consistency
        borderRadius: 0,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
      }}
    >
      <Toolbar sx={{ 
        minHeight: '70px !important', 
        py: 1,
        // iOS PWA: Add padding for safe area (status bar, notch, etc.)
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'calc(16px + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(16px + env(safe-area-inset-right, 0px))',
      }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Link href="/" passHref style={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}>
          <Typography 
            variant="h5" 
            noWrap 
            component="div" 
            sx={{ 
              fontWeight: 700,
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            Liftr
          </Typography>
        </Link>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {user?.username}
          </Typography>
          <IconButton color="inherit" onClick={handleProfileMenuOpen}>
            <AccountCircleIcon />
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          sx={{
            '& .MuiPaper-root': {
              minWidth: 200,
            }
          }}
        >
          <MenuItem disabled sx={{ flexDirection: 'column', alignItems: 'flex-start', opacity: 1 }}>
            <Typography variant="body1" fontWeight={600}>
              {user?.username}
            </Typography>
            {user?.role && (
              <Typography variant="caption" color="primary.main" sx={{ mt: 0.5 }}>
                {user.role === 'admin' ? 'Administrator' : 'User'}
              </Typography>
            )}
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

