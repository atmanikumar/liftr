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
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useSelector } from 'react-redux';
import { selectUser } from '@/redux/slices/authSlice';
import { useRouter } from 'next/navigation';
import Loader from '@/components/common/Loader';
import MuscleBodyMap from '@/components/common/MuscleBodyMap';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function HomePage() {
  const user = useSelector(selectUser);
  const router = useRouter();
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [activeWorkouts, setActiveWorkouts] = useState([]);
  const [todayCalories, setTodayCalories] = useState(0);
  const [progressData, setProgressData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [muscleMapOpen, setMuscleMapOpen] = useState(false);
  const [selectedWorkoutMuscles, setSelectedWorkoutMuscles] = useState([]);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        // Single API call to get all home page data
        const response = await fetch('/api/home');
        const data = await response.json();
        
        if (data.workoutPlans) {
          setWorkoutPlans(data.workoutPlans);
        }
        if (data.completedSessions) {
          setCompletedSessions(data.completedSessions);
        }
        if (data.activeWorkouts) {
          setActiveWorkouts(data.activeWorkouts);
        }
        setTodayCalories(data.todayCalories || 0);
        setProgressData(data.progress || null);
      } catch (e) {
        console.error('Failed to load home data:', e);
      } finally {
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
  }, []);


  if (loadingData) {
    return <Loader fullScreen message="Loading today's workouts..." />;
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* In Progress Workouts */}
        {activeWorkouts.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                In Progress
              </Typography>
              
              <Stack spacing={2}>
                {activeWorkouts.map((workout) => (
                  <Card 
                    key={workout.id}
                    sx={{
                      border: '2px solid #c4ff0d',
                      bgcolor: 'background.paper',
                      transition: 'all 0.3s',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(196, 255, 13, 0.3)',
                      }
                    }}
                    onClick={() => router.push(`/active-workout/${workout.id}`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                            {workout.name}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                            <Chip
                              label={new Date(workout.startedAt).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                color: 'rgba(255, 255, 255, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            />
                          </Box>
                        </Box>
                        
                        {workoutPlans.find(p => p.id === workout.trainingProgramId)?.muscleDistribution && (
                          <Box 
                            sx={{ 
                              width: '60px',
                              flexShrink: 0,
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'scale(1.1)',
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorkoutMuscles(workoutPlans.find(p => p.id === workout.trainingProgramId).muscleDistribution);
                              setMuscleMapOpen(true);
                            }}
                          >
                            <MuscleBodyMap 
                              muscleDistribution={workoutPlans.find(p => p.id === workout.trainingProgramId).muscleDistribution}
                              size="small"
                              showToggle={false}
                              showBreakdown={false}
                              showLegend={false}
                              autoRotate={true}
                            />
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Paper>
          </Grid>
        )}

        {/* No workouts message */}
        {activeWorkouts.length === 0 && (!progressData || (progressData.recentActivity && progressData.recentActivity.length === 0)) && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <FitnessCenterIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No workouts yet!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start a workout plan to begin tracking your progress
              </Typography>
              <Button
                variant="contained"
                onClick={() => router.push('/training-programs')}
                sx={{
                  bgcolor: '#c4ff0d',
                  color: '#000',
                  '&:hover': {
                    bgcolor: '#b0e00b',
                  }
                }}
              >
                View Workout Plans
              </Button>
            </Paper>
          </Grid>
        )}

        {/* Progress Section */}
        {progressData && (
          <>
            {/* Muscle Group Distribution - Body Map */}
            {progressData.muscleDistribution && progressData.muscleDistribution.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2, textAlign: 'center' }}>
                    Muscle Group Distribution
                  </Typography>
                  <MuscleBodyMap muscleDistribution={progressData.muscleDistribution} />
                </Paper>
              </Grid>
            )}

            {/* Calories Burned Per Day Chart */}
            {progressData.caloriesChart && progressData.caloriesChart.some(day => day.calories > 0) && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
                    Calories Burned (Last 30 Days)
                  </Typography>
                  <Box sx={{ width: '100%', ml: -2 }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={progressData.caloriesChart} margin={{ left: -20 }}>
                        <XAxis 
                          dataKey="shortDate" 
                          stroke="rgba(255, 255, 255, 0.5)"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          stroke="rgba(255, 255, 255, 0.5)"
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            border: '1px solid rgba(196, 255, 13, 0.3)',
                            borderRadius: '8px',
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="calories" 
                          stroke="#c4ff0d" 
                          strokeWidth={3}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Recent Activity - Last 5 Completed Workout Plans */}
            {progressData.recentActivity && progressData.recentActivity.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Recent Activity
                  </Typography>
                  <Stack spacing={2}>
                    {progressData.recentActivity.map((plan, index) => (
                      <Card 
                        key={`${plan.id}-${plan.completedAt}`}
                        onClick={() => router.push(`/workout-summary/${encodeURIComponent(plan.completedAt)}`)}
                        sx={{ 
                          border: '1px solid rgba(196, 255, 13, 0.3)',
                          bgcolor: 'background.paper',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(196, 255, 13, 0.05)',
                            border: '1px solid rgba(196, 255, 13, 0.5)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(196, 255, 13, 0.2)',
                          }
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                            <Box sx={{ flexGrow: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Typography variant="h6">
                                  {plan.name}
                                </Typography>
                                <Box sx={{ textAlign: 'right' }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(plan.completedAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {new Date(plan.completedAt).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </Typography>
                                </Box>
                              </Box>
                              
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                                <Chip
                                  icon={<FitnessCenterIcon />}
                                  label={`${plan.workoutCount || 0} workouts`}
                                  size="small"
                                  sx={{ 
                                    borderColor: 'rgba(196, 255, 13, 0.5)',
                                    color: '#c4ff0d',
                                    bgcolor: 'rgba(196, 255, 13, 0.1)',
                                  }}
                                  variant="outlined"
                                />
                                <Chip
                                  label={`${plan.totalSets || 0} sets`}
                                  size="small"
                                  sx={{ 
                                    borderColor: 'rgba(196, 255, 13, 0.5)',
                                    color: '#c4ff0d',
                                    bgcolor: 'rgba(196, 255, 13, 0.1)',
                                  }}
                                  variant="outlined"
                                />
                                <Chip
                                  icon={<LocalFireDepartmentIcon />}
                                  label={`${plan.calories || 0} cal`}
                                  size="small"
                                  sx={{ 
                                    borderColor: 'rgba(196, 255, 13, 0.5)',
                                    color: '#c4ff0d',
                                    bgcolor: 'rgba(196, 255, 13, 0.1)',
                                  }}
                                  variant="outlined"
                                />
                              </Box>
                              
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {plan.workoutNames && plan.workoutNames.length > 0 
                                  ? plan.workoutNames.join(' • ') 
                                  : 'No workouts'}
                              </Typography>
                              
                              {plan.muscleFocusGroups && plan.muscleFocusGroups.length > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  Focus: {plan.muscleFocusGroups.map(m => `${m.muscle} (${m.count}x)`).join(', ')}
                                </Typography>
                              )}
                            </Box>
                            
                            {plan.muscleFocusGroups && plan.muscleFocusGroups.length > 0 && (
                              <Box 
                                sx={{ 
                                  width: '60px',
                                  flexShrink: 0,
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  '&:hover': {
                                    transform: 'scale(1.1)',
                                  }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWorkoutMuscles(plan.muscleFocusGroups);
                                  setMuscleMapOpen(true);
                                }}
                              >
                                <MuscleBodyMap 
                                  muscleDistribution={plan.muscleFocusGroups}
                                  size="small"
                                  showToggle={false}
                                  showBreakdown={false}
                                  showLegend={false}
                                  autoRotate={true}
                                />
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {progressData.recentActivity.length >= 5 && (
                      <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Button
                          variant="outlined"
                          onClick={() => router.push('/recent')}
                          sx={{
                            color: '#c4ff0d',
                            borderColor: 'rgba(196, 255, 13, 0.5)',
                            '&:hover': {
                              borderColor: '#c4ff0d',
                              bgcolor: 'rgba(196, 255, 13, 0.1)',
                            }
                          }}
                        >
                          More Workouts
                        </Button>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            )}
          </>
        )}
      </Grid>

      {/* Muscle Map Dialog - Medium Size */}
      <Dialog 
        open={muscleMapOpen} 
        onClose={() => setMuscleMapOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Muscles Worked
            <IconButton onClick={() => setMuscleMapOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <MuscleBodyMap 
            muscleDistribution={selectedWorkoutMuscles}
            size="medium"
            showToggle={true}
            showBreakdown={true}
            showLegend={true}
            autoRotate={true}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
