'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import Loader from '@/components/common/Loader';

export default function StatsPage() {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        setStatsData(data);
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <Loader fullScreen message="Loading statistics..." />;
  }

  if (!statsData) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Statistics
        </Typography>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Failed to load statistics
          </Typography>
        </Paper>
      </Box>
    );
  }

  const { userStats, mostConsistent, isAdmin } = statsData;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        {isAdmin ? 'Workout Statistics' : 'My Statistics'}
      </Typography>

      {/* Most Consistent User - Hero Card */}
      {mostConsistent && mostConsistent.consistency > 0 && (
        <Paper 
          sx={{ 
            p: 4, 
            mb: 4, 
            background: 'linear-gradient(135deg, rgba(196, 255, 13, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
            border: '1px solid rgba(196, 255, 13, 0.3)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: '#c4ff0d', 
                color: '#000',
                fontSize: '2rem',
                fontWeight: 700,
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: '3rem' }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" sx={{ mb: 1, color: '#c4ff0d', fontWeight: 600 }}>
                🏆 Most Consistent {isAdmin ? 'Member' : 'You!'}
              </Typography>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {mostConsistent.name || mostConsistent.username}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                <Chip 
                  icon={<LocalFireDepartmentIcon />}
                  label={`${mostConsistent.consistency} days consistent (last 7 days)`}
                  sx={{ 
                    bgcolor: 'rgba(196, 255, 13, 0.2)', 
                    color: '#c4ff0d',
                    fontWeight: 600,
                    fontSize: '1rem',
                    px: 1,
                  }}
                />
                <Chip 
                  icon={<TrendingUpIcon />}
                  label={`${mostConsistent.currentStreak} day current streak`}
                  sx={{ 
                    bgcolor: 'rgba(139, 92, 246, 0.2)', 
                    color: '#8b5cf6',
                    fontWeight: 600,
                    fontSize: '1rem',
                    px: 1,
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Users Working Out */}
        {isAdmin && (
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(196, 255, 13, 0.2)' }}>
                    <CalendarTodayIcon sx={{ color: '#c4ff0d' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ color: '#c4ff0d' }}>
                      {userStats.filter(u => u.totalWorkoutDays > 0).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Members
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Longest Break */}
        <Grid item xs={12} sm={6} md={isAdmin ? 4 : 6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(244, 67, 54, 0.2)' }}>
                  <EventBusyIcon sx={{ color: '#f44336' }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ color: '#f44336' }}>
                    {userStats.length > 0 
                      ? Math.max(...userStats.map(u => u.longestBreak))
                      : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Longest Break (days)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Best Streak */}
        <Grid item xs={12} sm={6} md={isAdmin ? 4 : 6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255, 152, 0, 0.2)' }}>
                  <TrendingUpIcon sx={{ color: '#ff9800' }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ color: '#ff9800' }}>
                    {userStats.length > 0 
                      ? Math.max(...userStats.map(u => u.currentStreak))
                      : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Best Current Streak
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* User Stats Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          {isAdmin ? 'Member Statistics' : 'Your Statistics'}
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Rank</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell align="center"><strong>Consistency (7d)</strong></TableCell>
                <TableCell align="center"><strong>Current Streak</strong></TableCell>
                <TableCell align="center"><strong>Total Days</strong></TableCell>
                <TableCell align="center"><strong>Longest Break</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userStats.map((user, index) => (
                <TableRow 
                  key={user.userId}
                  sx={{ 
                    bgcolor: index === 0 && user.consistency > 0 
                      ? 'rgba(196, 255, 13, 0.03)' 
                      : 'transparent',
                  }}
                >
                  <TableCell>
                    {index === 0 && user.consistency > 0 ? (
                      <Chip 
                        label="1st" 
                        icon={<EmojiEventsIcon />}
                        size="small"
                        sx={{ 
                          bgcolor: 'rgba(196, 255, 13, 0.2)', 
                          color: '#c4ff0d',
                          border: '1px solid rgba(196, 255, 13, 0.4)',
                          fontWeight: 600,
                        }} 
                      />
                    ) : (
                      <Typography>{index + 1}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {user.name || user.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        @{user.username}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={`${user.consistency} days`}
                      icon={<LocalFireDepartmentIcon />}
                      size="small"
                      sx={{
                        bgcolor: user.consistency >= 6 
                          ? 'rgba(196, 255, 13, 0.2)' 
                          : user.consistency >= 4
                          ? 'rgba(255, 152, 0, 0.2)'
                          : 'rgba(128, 128, 128, 0.2)',
                        color: user.consistency >= 6 
                          ? '#c4ff0d' 
                          : user.consistency >= 4
                          ? '#ff9800'
                          : '#9e9e9e',
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight={600}>
                      {user.currentStreak} days
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography>
                      {user.totalWorkoutDays}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography color={user.longestBreak > 7 ? 'error' : 'text.primary'}>
                      {user.longestBreak} days
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Legend */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          <strong>Note:</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          • <strong>Consistency:</strong> Number of workout days in the last 7 days. One rest day is allowed without breaking consistency, but 2 consecutive rest days break the streak.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          • <strong>Current Streak:</strong> Consecutive days of working out (with 1 rest day allowed).
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          • <strong>Longest Break:</strong> Maximum number of days between any two workouts.
        </Typography>
      </Paper>
    </Box>
  );
}

