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
import BarChartIcon from '@mui/icons-material/BarChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectUser } from '@/redux/slices/authSlice';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DumbbellIcon from '@/components/common/DumbbellIcon';
import { hapticLight } from '@/lib/nativeFeatures';

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
    // Haptic feedback on navigation
    hapticLight();
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
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      BackdropProps={{
        invisible: true, // Hide default Material-UI backdrop since we have custom overlay
      }}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        zIndex: 1300, // Above our custom overlay (1200)
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

