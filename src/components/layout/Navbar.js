'use client';

import { AppBar, Toolbar, IconButton, Typography, Box, Avatar, Menu, MenuItem, Divider, ListItemIcon, ListItemText, Chip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';
import PersonIcon from '@mui/icons-material/Person';
import CheckIcon from '@mui/icons-material/Check';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectUser, selectViewingAs, selectIsTrainer, setViewingAs, clearViewingAs } from '@/redux/slices/authSlice';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar({ onMenuClick }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const user = useSelector(selectUser);
  const viewingAs = useSelector(selectViewingAs);
  const isTrainer = useSelector(selectIsTrainer);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [viewAsAnchorEl, setViewAsAnchorEl] = useState(null);
  const [trainees, setTrainees] = useState([]);

  // Determine if we should show back button (not on home page)
  const showBackButton = pathname !== '/';

  // Fetch trainees if user is a trainer
  useEffect(() => {
    if (isTrainer) {
      fetchTrainees();
    }
  }, [isTrainer]);

  const fetchTrainees = async () => {
    try {
      const response = await fetch('/api/trainees');
      const data = await response.json();
      if (data.trainees) {
        setTrainees(data.trainees);
      }
    } catch (error) {
      console.error('Failed to fetch trainees:', error);
    }
  };

  const handleProfileMenuOpen = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const handleViewAsMenuOpen = (event) => {
    setViewAsAnchorEl(event.currentTarget);
  };

  const handleViewAsMenuClose = () => {
    setViewAsAnchorEl(null);
  };

  const handleViewAsSelf = () => {
    dispatch(clearViewingAs());
    handleViewAsMenuClose();
    router.push('/');
  };

  const handleViewAsTrainee = (trainee) => {
    dispatch(setViewingAs(trainee));
    handleViewAsMenuClose();
    router.push('/');
  };

  const handleLogout = async () => {
    await dispatch(logout());
    handleProfileMenuClose();
    router.push('/login');
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={0}
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--status-bar-color, #0a0a0a)', // Use CSS variable for consistency
        borderRadius: 0,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        borderBottom: 'none',
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
        {/* Left side: Hamburger menu (only on mobile) */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ 
            mr: 1,
            display: { xs: 'flex', md: 'none' }, // Hide on desktop
            color: '#c4ff0d',
            '&:hover': {
              backgroundColor: 'rgba(196, 255, 13, 0.1)',
            }
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* Back button (shown when not on home page) */}
        {showBackButton && (
          <IconButton
            color="inherit"
            aria-label="back"
            onClick={() => router.back()}
            sx={{ 
              mr: 1,
              color: '#c4ff0d',
              '&:hover': {
                backgroundColor: 'rgba(196, 255, 13, 0.1)',
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}

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
          {/* View As Button - Only show for trainers with trainees */}
          {isTrainer && trainees.length > 0 && (
            <IconButton 
              color="inherit" 
              onClick={handleViewAsMenuOpen}
              sx={{
                borderRadius: '8px',
                px: 1.5,
                '&:hover': {
                  bgcolor: 'rgba(196, 255, 13, 0.1)',
                }
              }}
            >
              <SwitchAccountIcon sx={{ mr: 0.5, color: viewingAs ? '#c4ff0d' : 'inherit' }} />
              <Typography 
                variant="body2" 
                sx={{ 
                  display: { xs: 'none', sm: 'block' },
                  color: viewingAs ? '#c4ff0d' : 'inherit',
                  fontWeight: viewingAs ? 600 : 400
                }}
              >
                {viewingAs ? viewingAs.username : 'View As'}
              </Typography>
            </IconButton>
          )}

          {/* Profile Section */}
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2">
              {user?.username}
            </Typography>
          </Box>
          <IconButton color="inherit" onClick={handleProfileMenuOpen}>
            <AccountCircleIcon />
          </IconButton>
        </Box>

        {/* View As Menu */}
        <Menu
          anchorEl={viewAsAnchorEl}
          open={Boolean(viewAsAnchorEl)}
          onClose={handleViewAsMenuClose}
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
              minWidth: 220,
              maxHeight: 400,
            }
          }}
        >
          <MenuItem disabled sx={{ opacity: 0.7 }}>
            <SwitchAccountIcon sx={{ mr: 1 }} fontSize="small" />
            <Typography variant="caption" fontWeight={600}>
              VIEW AS
            </Typography>
          </MenuItem>
          
          <Divider sx={{ my: 1 }} />
          
          {/* View as Self */}
          <MenuItem 
            onClick={handleViewAsSelf}
            selected={!viewingAs}
            sx={{
              bgcolor: !viewingAs ? 'rgba(196, 255, 13, 0.1)' : 'transparent',
            }}
          >
            <ListItemIcon>
              <PersonIcon fontSize="small" sx={{ color: !viewingAs ? '#c4ff0d' : 'inherit' }} />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2">
                Myself
              </Typography>
            </ListItemText>
            {!viewingAs && (
              <CheckIcon sx={{ color: '#c4ff0d' }} fontSize="small" />
            )}
          </MenuItem>

          {/* View as Trainees */}
          {trainees.map((trainee) => (
            <MenuItem 
              key={trainee.id}
              onClick={() => handleViewAsTrainee(trainee)}
              selected={viewingAs?.id === trainee.id}
              sx={{
                bgcolor: viewingAs?.id === trainee.id ? 'rgba(196, 255, 13, 0.1)' : 'transparent',
              }}
            >
              <ListItemIcon>
                <PersonIcon fontSize="small" sx={{ color: viewingAs?.id === trainee.id ? '#c4ff0d' : 'inherit' }} />
              </ListItemIcon>
              <ListItemText>
                <Typography variant="body2">
                  {trainee.username}
                </Typography>
              </ListItemText>
              {viewingAs?.id === trainee.id && (
                <CheckIcon sx={{ color: '#c4ff0d' }} fontSize="small" />
              )}
            </MenuItem>
          ))}
        </Menu>

        {/* Profile Menu */}
        <Menu
          anchorEl={profileAnchorEl}
          open={Boolean(profileAnchorEl)}
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
              <Typography variant="caption" sx={{ color: '#c4ff0d', mt: 0.5 }}>
                {user.role === 'admin' ? 'Administrator' : user.role === 'trainer' ? 'Trainer' : 'User'}
              </Typography>
            )}
          </MenuItem>

          <Divider sx={{ my: 1 }} />
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

