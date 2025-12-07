'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useSelector } from 'react-redux';
import { selectUser, selectViewingAs } from '@/redux/slices/authSlice';
import { useRouter } from 'next/navigation';
import Loader from '@/components/common/Loader';
import MuscleBodyMap from '@/components/common/MuscleBodyMap';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function HomePage() {
  const user = useSelector(selectUser);
  const viewingAs = useSelector(selectViewingAs);
  const effectiveUser = viewingAs || user;
  const router = useRouter();
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [activeWorkouts, setActiveWorkouts] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [muscleMapOpen, setMuscleMapOpen] = useState(false);
  const [selectedWorkoutMuscles, setSelectedWorkoutMuscles] = useState([]);
  const [todayAchievements, setTodayAchievements] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingRecentActivity, setLoadingRecentActivity] = useState(true);
  const [progressStats, setProgressStats] = useState(null);
  const [loadingProgressStats, setLoadingProgressStats] = useState(true);

  // Memoize viewingAs ID to prevent unnecessary effect triggers
  const viewingAsId = useMemo(() => viewingAs?.id, [viewingAs?.id]);

  // Fetch today's achievements
  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchTodayAchievements = async () => {
      try {
        const url = viewingAsId 
          ? `/api/achievements/today?viewAs=${viewingAsId}` 
          : `/api/achievements/today`;
        
        const response = await fetch(url, {
          signal: abortController.signal
        });
        const data = await response.json();
        
        if (data.achievements && data.achievements.length > 0) {
          setTodayAchievements(data.achievements);
        } else {
          setTodayAchievements([]);
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          // Request was aborted, ignore
          return;
        }
        console.error('Failed to fetch today achievements:', e);
      }
    };

    fetchTodayAchievements();
    
    return () => {
      abortController.abort();
    };
  }, [viewingAsId]);

  // Fetch progress stats lazily (after home data loads)
  useEffect(() => {
    if (loadingData) return; // Wait for main data to load first
    
    const abortController = new AbortController();
    
    const fetchProgressStats = async () => {
      try {
        const url = viewingAsId 
          ? `/api/progress-stats?viewAs=${viewingAsId}` 
          : `/api/progress-stats`;
        
        const response = await fetch(url, {
          signal: abortController.signal
        });
        const data = await response.json();
        
        if (data) {
          setProgressStats(data);
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch progress stats:', e);
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingProgressStats(false);
        }
      }
    };

    fetchProgressStats();
    
    return () => {
      abortController.abort();
    };
  }, [viewingAsId, loadingData]);

  // Fetch recent activity lazily (after home data loads)
  useEffect(() => {
    if (loadingData) return; // Wait for main data to load first
    
    const abortController = new AbortController();
    
    const fetchRecentActivity = async () => {
      try {
        const url = viewingAsId 
          ? `/api/recent-activity?viewAs=${viewingAsId}` 
          : `/api/recent-activity`;
        
        const response = await fetch(url, {
          signal: abortController.signal
        });
        const data = await response.json();
        
        if (data.recentActivity) {
          setRecentActivity(data.recentActivity);
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch recent activity:', e);
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingRecentActivity(false);
        }
      }
    };

    fetchRecentActivity();
    
    return () => {
      abortController.abort();
    };
  }, [viewingAsId, loadingData]);

  // Memoize fetch function to prevent recreation on every render
  const fetchHomeData = useCallback(async (signal) => {
    try {
      // Single API call to get all home page data
      const url = viewingAsId 
        ? `/api/home?viewAs=${viewingAsId}` 
        : `/api/home`;
      const response = await fetch(url, { signal });
      const data = await response.json();
      
      if (data.workoutPlans) {
        setWorkoutPlans(data.workoutPlans);
      }
      if (data.activeWorkouts) {
        setActiveWorkouts(data.activeWorkouts);
      }
      setProgressData(data.progress || null);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Failed to load home data:', e);
      }
    } finally {
      if (!signal.aborted) {
        setLoadingData(false);
      }
    }
  }, [viewingAsId]);

  useEffect(() => {
    const abortController = new AbortController();
    
    fetchHomeData(abortController.signal);
    
    // Refresh data when page becomes visible (e.g., after completing a workout)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchHomeData(abortController.signal);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      abortController.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchHomeData]);


  if (loadingData) {
    return <Loader fullScreen message="Loading today's workouts..." />;
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Today's Achievements */}
        {todayAchievements.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ 
              p: 3, 
              bgcolor: 'rgba(196, 255, 13, 0.08)', 
              border: '1px solid rgba(196, 255, 13, 0.3)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: '#c4ff0d' }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" sx={{ color: '#c4ff0d', fontWeight: 'bold' }}>
                    🎉 Today&apos;s Achievements!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Great job, {effectiveUser?.name || effectiveUser?.username}! You improved your strength today.
                  </Typography>
                </Box>
              </Box>
              
              <Stack spacing={2}>
                {todayAchievements.map((ach, idx) => {
                  const achievementType = ach.achievementType || 'weight';
                  
                  return (
                    <Card 
                      key={idx} 
                      sx={{ 
                        bgcolor: '#000', 
                        border: '2px solid #c4ff0d',
                        transition: 'all 0.2s',
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 'bold' }}>
                          {ach.exerciseName}
                        </Typography>
                        
                        {achievementType === 'weight' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ color: '#fff' }}>
                              {ach.previousValue} {ach.unit}
                            </Typography>
                            <TrendingUpIcon sx={{ color: '#c4ff0d', fontSize: 20 }} />
                            <Typography variant="body1" fontWeight="bold" sx={{ color: '#fff' }}>
                              {ach.newValue} {ach.unit}
                            </Typography>
                            <Chip 
                              label={`+${ach.improvement} ${ach.unit}`}
                              size="small"
                              icon={<TrendingUpIcon />}
                              sx={{ 
                                ml: 'auto', 
                                bgcolor: '#c4ff0d', 
                                color: '#000', 
                                fontWeight: 'bold',
                              }}
                            />
                          </Box>
                        )}
                        
                        {achievementType === 'reps' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ color: '#fff' }}>
                              {ach.previousValue} reps
                            </Typography>
                            <TrendingUpIcon sx={{ color: '#c4ff0d', fontSize: 20 }} />
                            <Typography variant="body1" fontWeight="bold" sx={{ color: '#fff' }}>
                              {ach.newValue} reps
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              @ {ach.unit}
                            </Typography>
                            <Chip 
                              label={`+${ach.improvement} reps`}
                              size="small"
                              icon={<TrendingUpIcon />}
                              sx={{ 
                                ml: 'auto', 
                                bgcolor: '#c4ff0d', 
                                color: '#000', 
                                fontWeight: 'bold',
                              }}
                            />
                          </Box>
                        )}
                        
                        {achievementType === 'rir' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ color: '#fff' }}>
                              RIR {ach.previousValue}
                            </Typography>
                            <TrendingDownIcon sx={{ color: '#c4ff0d', fontSize: 20 }} />
                            <Typography variant="body1" fontWeight="bold" sx={{ color: '#fff' }}>
                              RIR {ach.newValue}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              @ {ach.unit}
                            </Typography>
                            <Chip 
                              label={`-${ach.improvement} RIR`}
                              size="small"
                              icon={<TrendingDownIcon />}
                              sx={{ 
                                ml: 'auto', 
                                bgcolor: '#c4ff0d', 
                                color: '#000', 
                                fontWeight: 'bold',
                              }}
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
              
              <Button
                variant="outlined"
                onClick={() => router.push('/progress')}
                sx={{ 
                  mt: 3, 
                  borderColor: '#c4ff0d', 
                  color: '#c4ff0d',
                  '&:hover': {
                    borderColor: '#c4ff0d',
                    bgcolor: 'rgba(196, 255, 13, 0.1)',
                  }
                }}
                fullWidth
              >
                View All Progress →
              </Button>
            </Paper>
          </Grid>
        )}

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
                    }}
                    onClick={() => router.push(`/active-workout/${workout.id}`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h6">
                              {workout.name}
                            </Typography>
                            {workout.equipmentTag && (
                              <Chip
                                label={workout.equipmentTag}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(196, 255, 13, 0.2)',
                                  color: '#c4ff0d',
                                  border: '1px solid rgba(196, 255, 13, 0.4)',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem',
                                }}
                              />
                            )}
                          </Box>
                          
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
                              const plan = workoutPlans.find(p => p.id === workout.trainingProgramId);
                              if (plan?.muscleDistribution) {
                                setSelectedWorkoutMuscles(plan.muscleDistribution);
                                setMuscleMapOpen(true);
                              }
                            }}
                          >
                            <MuscleBodyMap 
                              muscleDistribution={workoutPlans.find(p => p.id === workout.trainingProgramId)?.muscleDistribution || []}
                              size="small"
                              showToggle={false}
                              showBreakdown={false}
                              showLegend={false}
                              autoRotate={true}
                              useGradient={false}
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
        {activeWorkouts.length === 0 && recentActivity.length === 0 && !loadingRecentActivity && (
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
            {loadingProgressStats ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2, textAlign: 'center' }}>
                    {effectiveUser?.username ? `${effectiveUser.username}'s ` : ''}Muscle Distribution
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={40} />
                  </Box>
                </Paper>
              </Grid>
            ) : progressStats?.muscleDistribution && progressStats.muscleDistribution.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2, textAlign: 'center' }}>
                    {effectiveUser?.username ? `${effectiveUser.username}'s ` : ''}Muscle Distribution
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
                    Last 7 days • Auto-resets after 1 week of rest
                  </Typography>
                  <MuscleBodyMap muscleDistribution={progressStats.muscleDistribution} useGradient={true} />
                </Paper>
              </Grid>
            )}

            {/* Calories Burned Per Day Chart */}
            {loadingProgressStats ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
                    Calories Burned (Last 30 Days)
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={40} />
                  </Box>
                </Paper>
              </Grid>
            ) : progressStats?.caloriesChart && progressStats.caloriesChart.some(day => day.calories > 0) && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
                    Calories Burned (Last 30 Days)
                  </Typography>
                  <Box sx={{ width: '100%', ml: -2 }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={progressStats.caloriesChart} margin={{ left: -20 }}>
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
            {recentActivity.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Recent Activity
                  </Typography>
                  {loadingRecentActivity ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={40} />
                    </Box>
                  ) : (
                    <Stack spacing={2}>
                      {recentActivity.map((plan, index) => (
                      <Card 
                        key={`${plan.id}-${plan.completedAt}`}
                        onClick={() => router.push(`/workout-summary/${encodeURIComponent(plan.completedAt)}`)}
                        sx={{ 
                          border: '1px solid rgba(196, 255, 13, 0.3)',
                          bgcolor: 'background.paper',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
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
                              
                              {/* Comparison with last session */}
                              {plan.comparison && plan.comparison.hasComparison && (
                                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  {plan.comparison.improvements.length > 0 && plan.comparison.improvements.map((imp, idx) => (
                                    <Chip
                                      key={`imp-${idx}`}
                                      icon={<TrendingUpIcon />}
                                      label={`${imp.exercise}: +${imp.increase} ${imp.unit}`}
                                      size="small"
                                      sx={{
                                        bgcolor: 'rgba(196, 255, 13, 0.2)',
                                        color: '#c4ff0d',
                                        fontWeight: 'bold',
                                        border: '1px solid #c4ff0d',
                                      }}
                                    />
                                  ))}
                                  {plan.comparison.decreases.length > 0 && plan.comparison.decreases.map((dec, idx) => (
                                    <Chip
                                      key={`dec-${idx}`}
                                      icon={<TrendingDownIcon />}
                                      label={`${dec.exercise}: -${dec.decrease} ${dec.unit}`}
                                      size="small"
                                      sx={{
                                        bgcolor: 'rgba(239, 68, 68, 0.2)',
                                        color: '#ef4444',
                                        fontWeight: 'bold',
                                        border: '1px solid #ef4444',
                                      }}
                                    />
                                  ))}
                                </Box>
                              )}
                            </Box>
                            
                            {plan.muscleFocusGroups && plan.muscleFocusGroups.length > 0 && (
                              <Box 
                                sx={{ 
                                  width: '60px',
                                  flexShrink: 0,
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
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
                                  useGradient={false}
                                />
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                      ))}
                      
                      {recentActivity.length >= 5 && (
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
                  )}
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
            useGradient={true}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
