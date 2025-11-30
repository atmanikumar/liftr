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
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '@/redux/slices/authSlice';
import { fetchTrainingPrograms, selectTrainingPrograms } from '@/redux/slices/trainingProgramsSlice';
import { useRouter } from 'next/navigation';
import { getTodayCalories } from '@/lib/caloriesCalculator';
import Loader from '@/components/common/Loader';

export default function HomePage() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const router = useRouter();
  const programs = useSelector(selectTrainingPrograms);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [loadingActive, setLoadingActive] = useState(true);
  const [todayCalories, setTodayCalories] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    dispatch(fetchTrainingPrograms());
    
    const fetchHomeData = async () => {
      try {
        // Fetch active workout
        const activeResponse = await fetch('/api/active-workout');
        const activeData = await activeResponse.json();
        if (activeData.activeWorkout) {
          setActiveWorkout(activeData.activeWorkout);
        }
        
        // Fetch today's completed workout sessions from DB
        const completedResponse = await fetch('/api/today-completed');
        const completedData = await completedResponse.json();
        if (completedData.completedSessions) {
          setCompletedSessions(completedData.completedSessions);
        }
        
        // Fetch today's calories
        const progressResponse = await fetch('/api/progress');
        const progressData = await progressResponse.json();
        if (progressData.recentSessions) {
          const calories = getTodayCalories(progressData.recentSessions);
          setTodayCalories(calories);
        }
      } catch (e) {
        console.error('Failed to load home data:', e);
      } finally {
        setLoadingActive(false);
        setLoadingData(false);
      }
    };
    
    fetchHomeData();
    
    // Refresh data when page becomes visible (e.g., after completing a workout)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchHomeData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dispatch]);

  // Build list of today's workout items (each session separate) with calories
  const [workoutItemsWithCalories, setWorkoutItemsWithCalories] = useState([]);
  
  useEffect(() => {
    const fetchCaloriesForSessions = async () => {
      // Don't process until we have programs and initial data is loaded
      if (programs.length === 0 || loadingData) return;
      
      const items = [];
      
      // Add completed sessions with calories
      for (const session of completedSessions) {
        const program = programs.find(p => p.id === session.trainingProgramId);
        if (program) {
          // Fetch calories for this session
          let calories = 0;
          try {
            const response = await fetch(`/api/session-calories/${encodeURIComponent(session.completedAt)}`);
            const data = await response.json();
            calories = data.calories || 0;
          } catch (e) {
            console.error('Failed to fetch calories:', e);
          }
          
          items.push({
            ...program,
            sessionId: session.completedAt,
            completedAt: session.completedAt,
            setCount: session.setCount,
            calories,
            isCompleted: true,
            isActive: false,
          });
        }
      }
      
      // Add active workout if exists
      if (activeWorkout) {
        const program = programs.find(p => p.id === activeWorkout.trainingProgramId);
        if (program) {
          items.push({
            ...program,
            sessionId: 'active',
            isCompleted: false,
            isActive: true,
          });
        }
      }
      
      // Sort by completed time (most recent first), active workout at top
      items.sort((a, b) => {
        if (a.isActive) return -1;
        if (b.isActive) return 1;
        return new Date(b.completedAt) - new Date(a.completedAt);
      });
      
      setWorkoutItemsWithCalories(items);
    };
    
    fetchCaloriesForSessions();
  }, [completedSessions, activeWorkout, programs, loadingData]);
  
  const todayWorkoutItems = workoutItemsWithCalories;

  // Show loader while initial data is loading OR while fetching calories for completed sessions
  const isLoadingWorkouts = loadingData || (completedSessions.length > 0 && workoutItemsWithCalories.length === 0 && programs.length > 0);
  
  if (isLoadingWorkouts) {
    return <Loader fullScreen message="Loading today's workouts..." />;
  }

  return (
    <Box>
      {/* Today's Calories */}
      {todayCalories > 0 && (
        <Paper sx={{ p: 2, mb: 3, background: 'linear-gradient(135deg, #c4ff0d 0%, #8b5cf6 100%)', border: 'none' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <LocalFireDepartmentIcon sx={{ fontSize: 40, color: '#000000' }} />
            <Box>
              <Typography variant="h4" sx={{ color: '#000000', fontWeight: 'bold' }}>
                {todayCalories} cal
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.7)' }}>
                Calories burned today
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Show each workout session separately */}
        {todayWorkoutItems.length > 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Today&apos;s Workouts
              </Typography>
              
              <Stack spacing={2}>
                {todayWorkoutItems.map((item, index) => {
                  const completedTime = item.completedAt ? new Date(item.completedAt).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  }) : null;
                  
                  return (
                    <Card 
                      key={`${item.id}-${item.sessionId}`}
                      onClick={() => {
                        if (item.isCompleted) {
                          router.push(`/workout-summary/${encodeURIComponent(item.completedAt)}`);
                        }
                      }}
                      sx={{
                        border: item.isActive ? '2px solid #c4ff0d' : '1px solid rgba(196, 255, 13, 0.3)',
                        bgcolor: 'background.paper',
                        transition: 'all 0.3s',
                        cursor: item.isCompleted ? 'pointer' : 'default',
                        '&:hover': item.isCompleted ? {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 24px rgba(196, 255, 13, 0.2)',
                        } : {},
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                              {item.name}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                              <Chip
                                icon={<FitnessCenterIcon />}
                                label={`${item.workoutIds?.length || 0} exercises`}
                                size="small"
                                sx={{ 
                                  borderColor: 'rgba(196, 255, 13, 0.5)',
                                  color: '#c4ff0d',
                                  bgcolor: 'rgba(196, 255, 13, 0.1)',
                                  border: '1px solid rgba(196, 255, 13, 0.5)'
                                }}
                              />
                              {item.isActive && (
                                <Chip
                                  icon={<PlayCircleOutlineIcon />}
                                  label="In Progress"
                                  size="small"
                                  sx={{
                                    bgcolor: 'rgba(251, 191, 36, 0.15)',
                                    color: '#fbbf24',
                                    border: '1px solid rgba(251, 191, 36, 0.3)'
                                  }}
                                />
                              )}
                              {item.isCompleted && (
                                <>
                                  <Chip
                                    icon={<CheckCircleIcon />}
                                    label="Completed"
                                    size="small"
                                    sx={{
                                      bgcolor: 'rgba(196, 255, 13, 0.15)',
                                      color: '#c4ff0d',
                                      border: '1px solid rgba(196, 255, 13, 0.3)'
                                    }}
                                  />
                                  {completedTime && (
                                    <Chip
                                      label={completedTime}
                                      size="small"
                                      sx={{
                                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                      }}
                                    />
                                  )}
                                </>
                              )}
                            </Box>
                            
                            {/* Additional Details for Completed Workouts */}
                            {item.isCompleted && (
                              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                {item.calories > 0 && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <LocalFireDepartmentIcon sx={{ fontSize: 20, color: '#c4ff0d' }} />
                                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#c4ff0d' }}>
                                      {Math.round(item.calories)} cal
                                    </Typography>
                                  </Box>
                                )}
                                {item.setCount && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <TrendingUpIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {item.setCount} sets
                                    </Typography>
                                  </Box>
                                )}
                                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                  Tap to view details →
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          {item.isActive && (
                            <Button
                              variant="contained"
                              startIcon={<PlayCircleOutlineIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/active-workout/${item.id}`);
                              }}
                              sx={{
                                bgcolor: '#c4ff0d',
                                color: '#000000',
                                '&:hover': {
                                  bgcolor: '#d4ff4d'
                                }
                              }}
                            >
                              Continue
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Paper>
          </Grid>
        ) : !loadingActive && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No workouts for today yet!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start a workout plan to begin tracking your progress
              </Typography>
              <Button
                variant="contained"
                onClick={() => router.push('/workout-plans')}
              >
                View Workout Plans
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
