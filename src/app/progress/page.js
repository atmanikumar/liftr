'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  LinearProgress,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { useRouter } from 'next/navigation';
import Loader from '@/components/common/Loader';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function ProgressPage() {
  const router = useRouter();
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch('/api/progress');
        const data = await response.json();
        setProgressData(data);
      } catch (e) {
        console.error('Failed to load progress:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (loading) {
    return <Loader fullScreen />;
  }

  if (!progressData) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          My Progress
        </Typography>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Failed to load progress data
          </Typography>
        </Paper>
      </Box>
    );
  }

  const { 
    summary = {}, 
    chartData = {},
    muscleDistribution = [], 
    workoutsByDate = [],
    achievements = []
  } = progressData || {};

  const { workoutsPerDay = [] } = chartData;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        My Total Progress
      </Typography>

      <Grid container spacing={3}>
        {/* Workouts Per Day Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Workouts Per Day (Last 30 Days)
            </Typography>
            {workoutsPerDay.length === 0 ? (
              <Typography color="text.secondary">No workout data yet</Typography>
            ) : (
              <Box sx={{ width: '100%', maxWidth: 900, mt: 2, '& .recharts-wrapper': { margin: '0 auto' } }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart 
                    data={workoutsPerDay}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <XAxis 
                      dataKey="shortDate" 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(28, 28, 30, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ outline: 'none' }} />
                    <Line
                      type="monotone"
                      dataKey="workouts"
                      stroke="#ff6b35"
                      strokeWidth={3}
                      dot={false}
                      activeDot={false}
                      name="Workouts"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Calories Burned Per Day Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocalFireDepartmentIcon color="error" sx={{ mr: 1 }} />
              <Typography variant="h6">Calories Burned Per Day (Last 30 Days)</Typography>
            </Box>
            {workoutsPerDay.length === 0 ? (
              <Typography color="text.secondary">No calorie data yet</Typography>
            ) : (
              <Box sx={{ width: '100%', maxWidth: 900, mt: 2, '& .recharts-wrapper': { margin: '0 auto' } }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart 
                    data={workoutsPerDay}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <XAxis 
                      dataKey="shortDate" 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(28, 28, 30, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ outline: 'none' }} />
                    <Line
                      type="monotone"
                      dataKey="calories"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={false}
                      activeDot={false}
                      name="Calories"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Muscle Distribution - Only show if there's data */}
        {muscleDistribution.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Muscle Group Distribution
              </Typography>
              <Box sx={{ mt: 2 }}>
                {muscleDistribution.map((item, idx) => (
                  <Box key={idx} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{item.muscle}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.sets} sets
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(item.sets / muscleDistribution[0].sets) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            {workoutsByDate.length === 0 ? (
              <Typography color="text.secondary">No workouts yet</Typography>
            ) : (
              <List>
                {workoutsByDate.slice(0, 10).map((day, idx) => (
                  <Box key={idx}>
                    <ListItem>
                      <ListItemText
                        primary={day.date}
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {day.programs.join(', ')} • {day.sets} sets •{' '}
                              {day.exercises.length} exercises
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {idx < workoutsByDate.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Achievements Section */}
        {achievements && achievements.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <EmojiEventsIcon sx={{ color: '#c4ff0d', fontSize: 32, mr: 1 }} />
                <Typography variant="h6">🏆 My Achievements</Typography>
              </Box>
              <Grid container spacing={2}>
                {achievements.map((achievement, idx) => (
                  <Grid item xs={12} md={6} key={idx}>
                    <Card sx={{ 
                      bgcolor: 'rgba(196, 255, 13, 0.1)', 
                      border: '1px solid rgba(196, 255, 13, 0.3)',
                      transition: 'all 0.3s',
                      '&:hover': {
                        bgcolor: 'rgba(196, 255, 13, 0.15)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(196, 255, 13, 0.3)',
                      }
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" sx={{ color: '#c4ff0d' }}>
                            {achievement.exerciseName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(achievement.achievedAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              timeZone: 'Asia/Kolkata'
                            })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" color="text.secondary">
                            From
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {achievement.previousWeight} {achievement.unit}
                          </Typography>
                          <TrendingUpIcon sx={{ color: '#c4ff0d' }} />
                          <Typography variant="body1" fontWeight="bold" sx={{ color: '#c4ff0d' }}>
                            {achievement.newWeight} {achievement.unit}
                          </Typography>
                          <Box sx={{ 
                            ml: 'auto',
                            px: 2,
                            py: 0.5,
                            bgcolor: 'rgba(196, 255, 13, 0.3)',
                            borderRadius: 2,
                            border: '1px solid #c4ff0d',
                          }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: '#c4ff0d' }}>
                              +{achievement.improvement} {achievement.unit}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

