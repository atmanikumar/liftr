'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  Chip,
  LinearProgress,
  Stack,
} from '@mui/material';
import SportsGymnasticsIcon from '@mui/icons-material/SportsGymnastics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '@/redux/slices/authSlice';
import { fetchTrainingPrograms, selectTrainingPrograms } from '@/redux/slices/trainingProgramsSlice';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const router = useRouter();
  const programs = useSelector(selectTrainingPrograms);
  const [completedToday, setCompletedToday] = useState([]);

  useEffect(() => {
    dispatch(fetchTrainingPrograms());
    // Load completed workouts from localStorage
    const today = new Date().toDateString();
    const stored = localStorage.getItem(`completed_${today}`);
    if (stored) {
      setCompletedToday(JSON.parse(stored));
    }
  }, [dispatch]);

  const markAsCompleted = (programId) => {
    const today = new Date().toDateString();
    const updated = [...completedToday, programId];
    setCompletedToday(updated);
    localStorage.setItem(`completed_${today}`, JSON.stringify(updated));
  };

  const isCompletedToday = (programId) => completedToday.includes(programId);

  // Filter out programs completed in last 2 days
  const getAvailablePrograms = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 2);

    const yesterdayKey = yesterday.toDateString();
    const dayBeforeKey = dayBefore.toDateString();

    const yesterdayCompleted = JSON.parse(localStorage.getItem(`completed_${yesterdayKey}`) || '[]');
    const dayBeforeCompleted = JSON.parse(localStorage.getItem(`completed_${dayBeforeKey}`) || '[]');

    const recentlyCompleted = [...yesterdayCompleted, ...dayBeforeCompleted];

    return programs.filter(p => !recentlyCompleted.includes(p.id));
  };

  const availablePrograms = getAvailablePrograms();
  const todayCompleted = programs.filter(p => isCompletedToday(p.id));

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
                  <Typography variant="h6">Today</Typography>
                  <Typography variant="h4">{todayCompleted.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Workouts completed
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
                  <Typography variant="h6">Workout Plans</Typography>
                  <Typography variant="h4">{programs.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total plans
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
                  <Typography variant="h6">Available</Typography>
                  <Typography variant="h4">{availablePrograms.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Plans to do
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Workout Plan Selector */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Select Today&apos;s Workout Plan
            </Typography>
            
            {availablePrograms.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  No workout plans available today. You&apos;ve either completed all or need a rest day!
                </Typography>
                <Button
                  variant="outlined"
                  sx={{ mt: 2 }}
                  onClick={() => router.push('/training-programs')}
                >
                  Create New Plan
                </Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {availablePrograms.map((program) => (
                  <Card 
                    key={program.id}
                    sx={{
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            {program.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            <Chip
                              label={`${program.workoutIds?.length || 0} exercises`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            {isCompletedToday(program.id) && (
                              <Chip
                                icon={<CheckCircleIcon />}
                                label="Completed"
                                size="small"
                                color="success"
                              />
                            )}
                          </Box>
                        </Box>
                        {!isCompletedToday(program.id) ? (
                          <Button
                            variant="contained"
                            startIcon={<PlayCircleOutlineIcon />}
                            onClick={() => {
                              router.push(`/active-workout/${program.id}`);
                            }}
                          >
                            Start
                          </Button>
                        ) : (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Done for today!"
                            color="success"
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
