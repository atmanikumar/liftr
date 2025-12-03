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
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
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

  // Find winners for each category
  const winners = {
    streak: userStats.reduce((max, user) => user.currentStreak > (max?.currentStreak || 0) ? user : max, userStats[0]),
    workouts: userStats.reduce((max, user) => (user.mostWorkoutsDone?.count || 0) > (max?.mostWorkoutsDone?.count || 0) ? user : max, userStats[0]),
    weight: userStats.reduce((max, user) => (user.highestWeightLifted?.weight || 0) > (max?.highestWeightLifted?.weight || 0) ? user : max, userStats[0]),
  };

  // Count wins per user
  const winCounts = {};
  Object.values(winners).forEach(winner => {
    if (winner) {
      const key = winner.userId;
      winCounts[key] = (winCounts[key] || 0) + 1;
    }
  });

  // Find user with most wins
  const championUserId = Object.entries(winCounts).reduce((max, [userId, count]) => 
    count > (max.count || 0) ? { userId: parseInt(userId), count } : max, { count: 0 }
  ).userId;
  const champion = userStats.find(u => u.userId === championUserId);

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        {isAdmin ? 'Workout Statistics' : 'My Statistics'}
      </Typography>

      {/* Champion - User with Most Wins */}
      {champion && winCounts[champion.userId] > 0 && (
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
                🏆 Overall Champion {!isAdmin && '(You!)'}
              </Typography>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {champion.name || champion.username}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                <Chip 
                  icon={<EmojiEventsIcon />}
                  label={`${winCounts[champion.userId]} category ${winCounts[champion.userId] === 1 ? 'win' : 'wins'}`}
                  sx={{ 
                    bgcolor: 'rgba(196, 255, 13, 0.2)', 
                    color: '#c4ff0d',
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

      {/* Records with Winners - 2 Columns */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Best Streak */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'rgba(255, 152, 0, 0.2)', width: 60, height: 60 }}>
                  <TrendingUpIcon sx={{ color: '#ff9800', fontSize: '2rem' }} />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 700, mb: 0.5 }}>
                    {winners.streak?.currentStreak || 0} days
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Longest Current Streak
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.4 }}>
                    Consecutive workout days without breaking the chain.
                    One rest day allowed between sessions.
                  </Typography>
                  <Chip 
                    icon={<EmojiEventsIcon />}
                    label={winners.streak?.username || 'N/A'} 
                    size="small"
                    sx={{ bgcolor: 'rgba(255, 152, 0, 0.15)', color: '#ff9800', fontWeight: 600 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Most Workouts Done */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'rgba(33, 150, 243, 0.2)', width: 60, height: 60 }}>
                  <FitnessCenterIcon sx={{ color: '#2196f3', fontSize: '2rem' }} />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 700, mb: 0.5 }}>
                    {winners.workouts?.mostWorkoutsDone?.count || 0} workouts
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Most Workouts in One Day
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.4 }}>
                    The highest number of different exercises completed
                    in a single day session.
                  </Typography>
                  <Chip 
                    icon={<EmojiEventsIcon />}
                    label={winners.workouts?.username || 'N/A'} 
                    size="small"
                    sx={{ bgcolor: 'rgba(33, 150, 243, 0.15)', color: '#2196f3', fontWeight: 600 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Highest Weight Lifted */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'rgba(156, 39, 176, 0.2)', width: 60, height: 60 }}>
                  <TrendingUpIcon sx={{ color: '#9c27b0', fontSize: '2rem' }} />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 700, mb: 0.5 }}>
                    {winners.weight?.highestWeightLifted?.weight || 0} {winners.weight?.highestWeightLifted?.unit || 'lbs'}
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Heaviest Single Lift
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.4 }}>
                    The maximum weight lifted in a single rep across
                    all exercises. Pure strength record.
                  </Typography>
                  <Chip 
                    icon={<EmojiEventsIcon />}
                    label={winners.weight?.username || 'N/A'} 
                    size="small"
                    sx={{ bgcolor: 'rgba(156, 39, 176, 0.15)', color: '#9c27b0', fontWeight: 600 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>


    </Box>
  );
}

