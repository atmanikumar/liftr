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
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HistoryIcon from '@mui/icons-material/History';
import PeopleIcon from '@mui/icons-material/People';
import HomeIcon from '@mui/icons-material/Home';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectUser } from '@/redux/slices/authSlice';
import { useEffect } from 'react';
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
};

const menuItems = [
  {
    title: 'Home',
    path: '/',
    icon: 'HomeIcon',
    adminOnly: false,
  },
  {
    title: 'Workouts',
    path: '/workouts',
    icon: 'DumbbellIcon',
    adminOnly: false,
  },
  {
    title: 'Training Programs',
    path: '/training-programs',
    icon: 'CalendarMonthIcon',
    adminOnly: false,
  },
  {
    title: 'My Progress',
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
    title: 'Users',
    path: '/users',
    icon: 'PeopleIcon',
    adminOnly: true,
  },
];

export default function Sidebar({ open, onClose, variant = 'temporary' }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSelector(selectUser);
  const isAdmin = user?.role === 'admin';

  const filteredMenuItems = menuItems.filter(
    (item) => !item.adminOnly || (item.adminOnly && isAdmin)
  );

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
    <Box>
      <Toolbar />
      <Divider />
      <List>
        {filteredMenuItems.map((item) => {
          const IconComponent = iconMap[item.icon];
          const isActive = pathname === item.path;

          return (
            <ListItem key={item.path} disablePadding>
              <Link href={item.path} passHref legacyBehavior>
                <ListItemButton
                  component="a"
                  onClick={handleNavigate}
                  selected={isActive}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(255, 107, 53, 0.12)',
                      borderLeft: '3px solid #ff6b35',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 107, 53, 0.15)',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? '#ff6b35' : 'rgba(255, 255, 255, 0.6)' }}>
                    {item.icon === 'DumbbellIcon' ? (
                      <DumbbellIcon 
                        size={24} 
                        color={isActive ? '#ff6b35' : 'rgba(255, 255, 255, 0.6)'} 
                      />
                    ) : (
                      <IconComponent />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.title}
                    primaryTypographyProps={{
                      sx: { 
                        color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
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
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

