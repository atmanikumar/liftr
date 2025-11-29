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
  Stack,
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '@/redux/slices/authSlice';
import { fetchTrainingPrograms, selectTrainingPrograms } from '@/redux/slices/trainingProgramsSlice';
import { useRouter } from 'next/navigation';
import { getTodayCalories } from '@/lib/caloriesCalculator';

export default function HomePage() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const router = useRouter();
  const programs = useSelector(selectTrainingPrograms);
  const [completedToday, setCompletedToday] = useState([]);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [loadingActive, setLoadingActive] = useState(true);
  const [todayCalories, setTodayCalories] = useState(0);

  useEffect(() => {
    dispatch(fetchTrainingPrograms());
    
    // Check for active workout
    const fetchActiveWorkout = async () => {
      try {
        const response = await fetch('/api/active-workout');
        const data = await response.json();
        if (data.activeWorkout) {
          setActiveWorkout(data.activeWorkout);
        }
      } catch (e) {
        console.error('Failed to load active workout:', e);
      } finally {
        setLoadingActive(false);
      }
    };
    
    fetchActiveWorkout();
    
    // Fetch today's calories
    const fetchTodayCalories = async () => {
      try {
        const response = await fetch('/api/progress');
        const data = await response.json();
        if (data.recentSessions) {
          const calories = getTodayCalories(data.recentSessions);
          setTodayCalories(calories);
        }
      } catch (e) {
        console.error('Failed to calculate calories:', e);
      }
    };
    
    fetchTodayCalories();
    
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
      {/* Today's Calories */}
      {todayCalories > 0 && (
        <Paper sx={{ p: 2, mb: 3, background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <LocalFireDepartmentIcon sx={{ fontSize: 40, color: 'white' }} />
            <Box>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                {todayCalories} cal
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Calories burned today
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Active Workout - Show if one exists */}
        {activeWorkout && !loadingActive && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, border: '2px solid', borderColor: 'primary.main' }}>
              <Typography variant="h6" gutterBottom color="primary.main">
                Continue Your Workout
              </Typography>
              {programs.find(p => p.id === activeWorkout.trainingProgramId) && (
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {programs.find(p => p.id === activeWorkout.trainingProgramId)?.name}
                        </Typography>
                        <Chip
                          label="In Progress"
                          size="small"
                          color="warning"
                          icon={<PlayCircleOutlineIcon />}
                        />
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<PlayCircleOutlineIcon />}
                        onClick={() => router.push(`/active-workout/${activeWorkout.trainingProgramId}`)}
                      >
                        Continue
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Paper>
          </Grid>
        )}

        {/* Today's Workout Plan Selector - Only show if no active workout */}
        {!activeWorkout && !loadingActive && (
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
                    onClick={() => router.push('/workout-plans')}
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
        )}
      </Grid>
    </Box>
  );
}
