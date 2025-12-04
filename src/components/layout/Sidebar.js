'use client';

import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HistoryIcon from '@mui/icons-material/History';
import PeopleIcon from '@mui/icons-material/People';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import BarChartIcon from '@mui/icons-material/BarChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectUser } from '@/redux/slices/authSlice';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DumbbellIcon from '@/components/common/DumbbellIcon';

const DRAWER_WIDTH = 260;

const iconMap = {
  DumbbellIcon: DumbbellIcon,
  CalendarMonthIcon: CalendarMonthIcon,
  TrendingUpIcon: TrendingUpIcon,
  HistoryIcon: HistoryIcon,
  PeopleIcon: PeopleIcon,
  HomeIcon: HomeIcon,
  BarChartIcon: BarChartIcon,
  EmojiEventsIcon: EmojiEventsIcon,
};

const menuItems = [
  {
    title: 'Home',
    path: '/',
    icon: 'HomeIcon',
    adminOnly: false,
  },
  {
    title: 'Workout Plans',
    path: '/training-programs',
    icon: 'CalendarMonthIcon',
    adminOnly: false,
  },
  {
    title: 'Workouts',
    path: '/workouts',
    icon: 'DumbbellIcon',
    adminOnly: false,
  },
  {
    title: 'My Total Progress',
    path: '/progress',
    icon: 'TrendingUpIcon',
    adminOnly: false,
  },
  {
    title: 'Recent Workouts',
    path: '/recent',
    icon: 'HistoryIcon',
    adminOnly: false,
  },
  {
    title: 'Statistics',
    path: '/stats',
    icon: 'BarChartIcon',
    adminOnly: false,
  },
  {
    title: 'Users',
    path: '/users',
    icon: 'PeopleIcon',
    adminOnly: false,
    trainerOrAdmin: true,
  },
];

export default function Sidebar({ open, onClose, variant = 'temporary', sx }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSelector(selectUser);
  const isAdmin = user?.role === 'admin';
  const isTrainer = user?.role === 'trainer';
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    window.location.reload();
  };

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.adminOnly) {
      return isAdmin;
    }
    if (item.trainerOrAdmin) {
      return isAdmin || isTrainer;
    }
    return true;
  });

  // Prefetch all menu pages for instant navigation
  useEffect(() => {
    filteredMenuItems.forEach((item) => {
      router.prefetch(item.path);
    });
  }, [router, filteredMenuItems]);

  const handleNavigate = () => {
    if (variant === 'temporary') {
      onClose();
    }
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar />
      <Divider />
      
      <List sx={{ flexGrow: 1 }}>
        {filteredMenuItems.map((item, index) => {
          const IconComponent = iconMap[item.icon];
          const isActive = pathname === item.path;

          return (
            <ListItem 
              key={item.path} 
              disablePadding
              sx={{ pt: index === 0 ? 2 : 0 }}
            >
              <Link href={item.path} passHref legacyBehavior>
                <ListItemButton
                  component="a"
                  onClick={handleNavigate}
                  selected={isActive}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(196, 255, 13, 0.12)',
                      '&:hover': {
                        backgroundColor: 'rgba(196, 255, 13, 0.15)',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? '#c4ff0d' : 'rgba(255, 255, 255, 0.6)' }}>
                    {item.icon === 'DumbbellIcon' ? (
                      <DumbbellIcon 
                        size={24} 
                        color={isActive ? '#c4ff0d' : 'rgba(255, 255, 255, 0.6)'} 
                      />
                    ) : (
                      <IconComponent />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.title}
                    primaryTypographyProps={{
                      sx: { 
                        color: isActive ? '#c4ff0d' : 'rgba(255, 255, 255, 0.8)',
                        fontWeight: isActive ? 600 : 400,
                      }
                    }}
                  />
                </ListItemButton>
              </Link>
            </ListItem>
          );
        })}
      </List>
      
      {/* Refresh Button at Bottom */}
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Divider sx={{ mb: 2 }} />
        <Tooltip title="Refresh Page" placement="right">
          <ListItemButton
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{
              color: '#c4ff0d',
              borderRadius: 2,
              border: '1px solid rgba(196, 255, 13, 0.3)',
              justifyContent: 'center',
              py: 1.5,
              '&:hover': {
                backgroundColor: 'rgba(196, 255, 13, 0.1)',
                border: '1px solid rgba(196, 255, 13, 0.5)',
              },
              '&:disabled': {
                color: 'rgba(196, 255, 13, 0.5)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 'auto', mr: 1, color: 'inherit' }}>
              <RefreshIcon 
                sx={{ 
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }} 
              />
            </ListItemIcon>
            <ListItemText 
              primary="Refresh" 
              primaryTypographyProps={{
                sx: { color: 'inherit', fontWeight: 600 }
              }}
            />
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
        ...sx, // Merge custom sx prop
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

