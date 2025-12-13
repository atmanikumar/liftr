'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  Collapse,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TimelineIcon from '@mui/icons-material/Timeline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useSelector } from 'react-redux';
import { selectUser, selectViewingAs } from '@/redux/slices/authSlice';
import { useRouter } from 'next/navigation';
import Loader from '@/components/common/Loader';
import MuscleBodyMap from '@/components/common/MuscleBodyMap';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { WorkoutCardSkeleton, StatsCardSkeleton, ChartSkeleton } from '@/components/common/SkeletonLoader';
import PullToRefresh from '@/components/common/PullToRefresh';
import { hapticSuccess } from '@/lib/nativeFeatures';
import { formatTimeIST } from '@/lib/timezone';

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
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingRecentActivity, setLoadingRecentActivity] = useState(true);
  const [progressStats, setProgressStats] = useState(null);
  const [loadingProgressStats, setLoadingProgressStats] = useState(true);
  const [suggestedWorkout, setSuggestedWorkout] = useState(null);
  
  // Track if PPL detection has already run to prevent loops
  const pplDetectionRan = useRef(false);

  // Memoize viewingAs ID to prevent unnecessary effect triggers
  const viewingAsId = useMemo(() => viewingAs?.id, [viewingAs?.id]);

  // Detect Push/Pull/Leg pattern and suggest next workout
  // PPL Pattern: Push -> Pull -> Legs -> Push (repeat)
  const detectPushPullLegPattern = useCallback((plans) => {
    // Check if user is following PPL pattern
    const pushPlans = plans.filter(p => 
      p.name.toLowerCase().includes('push')
    );
    const pullPlans = plans.filter(p => 
      p.name.toLowerCase().includes('pull')
    );
    const legPlans = plans.filter(p => 
      p.name.toLowerCase().includes('leg')
    );

    // Only suggest if user has all three types
    if (pushPlans.length === 0 || pullPlans.length === 0 || legPlans.length === 0) {
      return null;
    }

    // Get last workout to detect pattern - need to wait for recentActivity to load
    if (recentActivity.length === 0) {
      // No recent activity, suggest push as starting point
      return { type: 'push', plan: pushPlans[0], reason: 'Start your PPL routine with Push day' };
    }

    // Get the last completed workout (most recent)
    const lastWorkout = recentActivity[0];
    const lastWorkoutName = lastWorkout.programName ? lastWorkout.programName.toLowerCase() : '';
    
    // Detect last workout type based on name
    let lastType = null;
    if (lastWorkoutName.includes('push')) {
      lastType = 'push';
    } else if (lastWorkoutName.includes('pull')) {
      lastType = 'pull';
    } else if (lastWorkoutName.includes('leg')) {
      lastType = 'leg';
    }

    // If we couldn't detect the type, don't suggest
    if (!lastType) {
      return null;
    }

    // Suggest next in cycle: Push -> Pull -> Leg -> Push
    if (lastType === 'push') {
      return { type: 'pull', plan: pullPlans[0], reason: 'Next in your PPL cycle: Pull day' };
    } else if (lastType === 'pull') {
      return { type: 'leg', plan: legPlans[0], reason: 'Next in your PPL cycle: Leg day' };
    } else if (lastType === 'leg') {
      return { type: 'push', plan: pushPlans[0], reason: 'Next in your PPL cycle: Push day' };
    }

    return null;
  }, [recentActivity]);

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
  }, [viewingAsId, loadingData]); // Removed workoutPlans and detectPushPullLegPattern to prevent loop

  // Detect PPL pattern and suggest next workout (runs ONCE after data loads)
  useEffect(() => {
    if (!pplDetectionRan.current && recentActivity.length > 0 && workoutPlans.length > 0 && !loadingData) {
      pplDetectionRan.current = true;
      const suggestion = detectPushPullLegPattern(workoutPlans);
      setSuggestedWorkout(suggestion);
    }
  }, [recentActivity.length, workoutPlans.length, loadingData, detectPushPullLegPattern]); // Safe to include now with ref guard

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

  // Detect PPL pattern after recentActivity loads
  useEffect(() => {
    if (recentActivity.length > 0 && workoutPlans.length > 0) {
      const suggestion = detectPushPullLegPattern(workoutPlans);
      setSuggestedWorkout(suggestion);
    }
  }, [recentActivity, workoutPlans, detectPushPullLegPattern]);

  useEffect(() => {
    // Reset PPL detection when data reloads
    pplDetectionRan.current = false;
    
    const abortController = new AbortController();
    
    fetchHomeData(abortController.signal);
    
    // Refresh data when page becomes visible (e.g., after completing a workout)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pplDetectionRan.current = false; // Reset on visibility change
        fetchHomeData(abortController.signal);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      abortController.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchHomeData]);


  // Handle pull-to-refresh
  const handleRefresh = async () => {
    const abortController = new AbortController();
    await fetchHomeData(abortController.signal);
    hapticSuccess(); // Success feedback
  };

  if (loadingData) {
    return (
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          <StatsCardSkeleton count={3} />
          <WorkoutCardSkeleton count={3} />
          <ChartSkeleton />
        </Stack>
      </Box>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <Box>
      <Grid container spacing={3}>
        {/* Today's Achievements - Compact Expandable */}
        {todayAchievements.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ 
              bgcolor: 'rgba(50, 80, 0, 0.4)',
              border: '2px solid rgba(196, 255, 13, 0.3)',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <CardContent 
                onClick={() => setAchievementsExpanded(!achievementsExpanded)}
                sx={{ 
                  cursor: 'pointer',
                  p: 2,
                  '&:last-child': { pb: 2 },
                  transition: 'background-color 0.2s',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      bgcolor: '#10b981', 
                      borderRadius: '50%', 
                      width: 40, 
                      height: 40, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <CheckCircleIcon sx={{ fontSize: 24, color: '#000' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 'bold', mb: 0.25 }}>
                        Today&apos;s Achievements
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {todayAchievements.length} new personal record{todayAchievements.length > 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton 
                    size="small"
                    sx={{ 
                      color: '#10b981',
                      transform: achievementsExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.3s',
                    }}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                </Box>
              </CardContent>

              <Collapse in={achievementsExpanded}>
                <Box sx={{ px: 2, pb: 2 }}>
                  <Stack spacing={1.5}>
                    {todayAchievements.map((ach, idx) => {
                      const achievementType = ach.achievementType || 'weight';
                      
                      return (
                        <Box 
                          key={idx} 
                          sx={{ 
                            bgcolor: 'rgba(50, 70, 0, 0.6)',
                            border: '1px solid rgba(196, 255, 13, 0.3)',
                            borderRadius: 2,
                            p: 1.5,
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                            {ach.exerciseName}
                          </Typography>
                      
                          {achievementType === 'weight' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                  {ach.previousValue} {ach.unit}
                                </Typography>
                                <TrendingUpIcon sx={{ color: '#10b981', fontSize: 18 }} />
                                <Typography variant="body2" fontWeight="bold" sx={{ color: '#fff' }}>
                                  {ach.newValue} {ach.unit}
                                </Typography>
                              </Box>
                              <Chip
                                icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
                                label={`+${ach.improvement} ${ach.unit}`}
                                size="small"
                                sx={{ 
                                  bgcolor: '#10b981', 
                                  color: '#000',
                                  fontWeight: 'bold',
                                  height: 24,
                                  '& .MuiChip-icon': { color: '#000' },
                                }}
                              />
                            </Box>
                          )}
                        
                            
                          {achievementType === 'reps' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                  {ach.previousValue} reps
                                </Typography>
                                <TrendingUpIcon sx={{ color: '#10b981', fontSize: 18 }} />
                                <Typography variant="body2" fontWeight="bold" sx={{ color: '#fff' }}>
                                  {ach.newValue} reps
                                </Typography>
                              </Box>
                              <Chip
                                icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
                                label={`+${ach.improvement} reps`}
                                size="small"
                                sx={{ 
                                  bgcolor: '#10b981', 
                                  color: '#000',
                                  fontWeight: 'bold',
                                  height: 24,
                                  '& .MuiChip-icon': { color: '#000' },
                                }}
                              />
                            </Box>
                          )}
                        
                            
                          {achievementType === 'rir' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                  RIR {ach.previousValue}
                                </Typography>
                                <TrendingDownIcon sx={{ color: '#10b981', fontSize: 18 }} />
                                <Typography variant="body2" fontWeight="bold" sx={{ color: '#fff' }}>
                                  RIR {ach.newValue}
                                </Typography>
                              </Box>
                              <Chip
                                icon={<TrendingDownIcon sx={{ fontSize: 14 }} />}
                                label={`-${ach.improvement} RIR`}
                                size="small"
                                sx={{ 
                                  bgcolor: '#10b981', 
                                  color: '#000',
                                  fontWeight: 'bold',
                                  height: 24,
                                  '& .MuiChip-icon': { color: '#000' },
                                }}
                              />
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </Collapse>
            </Card>
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
                      border: '2px solid #10b981',
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
                                  color: '#10b981',
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
                              label={formatTimeIST(workout.startedAt)}
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

        {/* Suggested Next Workout (Push/Pull/Leg Detection) */}
        {suggestedWorkout && activeWorkouts.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ 
              p: 3, 
              bgcolor: 'rgba(139, 92, 246, 0.08)', 
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#8b5cf6', fontWeight: 'bold' }}>
                💡 Suggested Next Workout
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {suggestedWorkout.reason}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">
                    {suggestedWorkout.plan.name}
                  </Typography>
                  {suggestedWorkout.plan.muscleDistribution && suggestedWorkout.plan.muscleDistribution.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {suggestedWorkout.plan.muscleDistribution.map(m => `${m.muscle} (${m.count}x)`).join(', ')}
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="contained"
                  onClick={() => router.push(`/training-programs`)}
                  sx={{
                    bgcolor: '#8b5cf6',
                    color: '#fff',
                  }}
                >
                  Start Workout
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* No workouts message */}
        {activeWorkouts.length === 0 && recentActivity.length === 0 && !loadingRecentActivity && !suggestedWorkout && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <TimelineIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
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
                  bgcolor: '#10b981',
                  color: '#000',
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
            {/* Muscle Group Distribution - Body Map - Always reserve space */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, minHeight: { xs: 400, sm: 480, md: 520 } }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, textAlign: 'center' }}>
                  {effectiveUser?.username ? `${effectiveUser.username}'s ` : ''}Muscle Distribution
                </Typography>
                {loadingProgressStats ? (
                  <Box sx={{ minHeight: { xs: 300, sm: 380, md: 420 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Loading muscle distribution...
                    </Typography>
                  </Box>
                ) : progressStats?.muscleDistribution && progressStats.muscleDistribution.length > 0 ? (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
                      Last 7 days • Auto-resets after 1 week of rest
                    </Typography>
                    <Box sx={{ minHeight: { xs: 300, sm: 380, md: 420 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MuscleBodyMap muscleDistribution={progressStats.muscleDistribution} useGradient={true} showBreakdown={false} />
                    </Box>
                  
                    {/* Muscle Breakdown - Most & Least Worked */}
                    {(() => {
                      const allMuscles = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Quads', 'Hamstrings', 'Glutes', 'Calves'];
                      const workedMuscles = progressStats.muscleDistribution || [];
                      const sortedWorked = [...workedMuscles].sort((a, b) => b.count - a.count);
                      const mostWorked = sortedWorked.slice(0, 5);
                      const workedNames = workedMuscles.map(m => m.muscle);
                      const neglectedMuscles = allMuscles.filter(m => !workedNames.includes(m));
                      const leastWorked = sortedWorked.length > 5 ? sortedWorked.slice(-3) : [];
                      const neglected = [...neglectedMuscles.slice(0, 5), ...leastWorked.map(m => m.muscle)].slice(0, 5);
                      
                      return (
                        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                          {mostWorked.length > 0 && (
                            <Box sx={{ 
                              flex: '1 1 140px', 
                              maxWidth: 180,
                              p: 1.5, 
                              bgcolor: 'rgba(16, 185, 129, 0.1)', 
                              borderRadius: 2,
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                            }}>
                              <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600, display: 'block', mb: 1 }}>
                                💪 Most Worked
                              </Typography>
                              {mostWorked.map((m, i) => (
                                <Typography key={i} variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.7rem' }}>
                                  {m.muscle} ({m.count}x)
                                </Typography>
                              ))}
                            </Box>
                          )}
                          {neglected.length > 0 && (
                            <Box sx={{ 
                              flex: '1 1 140px', 
                              maxWidth: 180,
                              p: 1.5, 
                              bgcolor: 'rgba(239, 68, 68, 0.1)', 
                              borderRadius: 2,
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                            }}>
                              <Typography variant="caption" sx={{ color: '#f87171', fontWeight: 600, display: 'block', mb: 1 }}>
                                ⚠️ Needs Attention
                              </Typography>
                              {neglected.map((m, i) => (
                                <Typography key={i} variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.7rem' }}>
                                  {m}
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </Box>
                      );
                    })()}
                  </>
                ) : (
                  <Box sx={{ minHeight: { xs: 300, sm: 380, md: 420 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', px: 2 }}>
                      No muscle data available. Complete some workouts to see your muscle distribution.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Calories Burned Per Day Chart */}
            {loadingProgressStats ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
                    Calories Burned (Last 30 Days)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Loading muscle distribution...
                  </Typography>
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
                          stroke="#10b981" 
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
                      <Typography variant="body2" color="text.secondary">Loading...</Typography>
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
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography variant="h6" sx={{ mb: 0.5 }}>
                                {plan.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                                {new Date(plan.completedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })} • {new Date(plan.completedAt).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </Typography>
                              
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                                <Chip
                                  icon={<TimelineIcon />}
                                  label={`${plan.workoutCount || 0} workouts`}
                                  size="small"
                                  sx={{ 
                                    borderColor: 'rgba(196, 255, 13, 0.5)',
                                    color: '#10b981',
                                    bgcolor: 'rgba(196, 255, 13, 0.1)',
                                  }}
                                  variant="outlined"
                                />
                                <Chip
                                  label={`${plan.totalSets || 0} sets`}
                                  size="small"
                                  sx={{ 
                                    borderColor: 'rgba(196, 255, 13, 0.5)',
                                    color: '#10b981',
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
                                    color: '#10b981',
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
                                        color: '#10b981',
                                        fontWeight: 'bold',
                                        border: '1px solid #10b981',
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
                              color: '#10b981',
                              borderColor: 'rgba(196, 255, 13, 0.5)',
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
    </PullToRefresh>
  );
}
