'use client';

import { useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Paper } from '@mui/material';
import SportsGymnasticsIcon from '@mui/icons-material/SportsGymnastics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useSelector } from 'react-redux';
import { selectUser } from '@/redux/slices/authSlice';

export default function HomePage() {
  const user = useSelector(selectUser);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.name || user?.username}! 💪
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Ready to crush your fitness goals today?
      </Typography>

      <Grid container spacing={3}>
        {/* Quick Stats Cards */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SportsGymnasticsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6">Workouts</Typography>
                  <Typography variant="h4">0</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total completed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CalendarMonthIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
                <Box>
                  <Typography variant="h6">Programs</Typography>
                  <Typography variant="h4">0</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Training programs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main' }} />
                <Box>
                  <Typography variant="h6">Streak</Typography>
                  <Typography variant="h4">0</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Days in a row
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This section will show your recent workouts and quick action buttons.
              We&apos;ll implement this in the next phase!
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
