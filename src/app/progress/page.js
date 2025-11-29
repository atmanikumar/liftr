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
  Chip,
  Divider,
  LinearProgress,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WarningIcon from '@mui/icons-material/Warning';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import Loader from '@/components/common/Loader';

export default function ProgressPage() {
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

  const { summary, improvements, areasOfImprovement, muscleDistribution, workoutsByDate } =
    progressData;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Progress
      </Typography>

      <Grid container spacing={3}>
        {/* Summary Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarTodayIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h4">{summary.totalWorkouts}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Workouts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FitnessCenterIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h4">{summary.totalSets}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Sets
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h4">{summary.totalReps}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Reps
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EmojiEventsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h4">{summary.totalWeight.toLocaleString()}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Weight Lifted (lbs)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Improvements */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">Top Improvements</Typography>
            </Box>
            {improvements.length === 0 ? (
              <Typography color="text.secondary">
                No improvements yet. Keep training!
              </Typography>
            ) : (
              <List>
                {improvements.slice(0, 5).map((item, idx) => (
                  <Box key={idx}>
                    <ListItem>
                      <ListItemText
                        primary={item.exercise}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Chip
                              label={`+${item.improvement} lbs`}
                              size="small"
                              color="success"
                            />
                            <Chip
                              label={`Current: ${item.currentWeight} lbs`}
                              size="small"
                              variant="outlined"
                            />
                            {item.muscleFocus && (
                              <Chip label={item.muscleFocus} size="small" />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {idx < improvements.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Areas of Improvement */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <WarningIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">Areas to Focus On</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Exercises you haven&apos;t trained as much
            </Typography>
            {areasOfImprovement.length === 0 ? (
              <Typography color="text.secondary">No data yet</Typography>
            ) : (
              <List>
                {areasOfImprovement.map((item, idx) => (
                  <Box key={idx}>
                    <ListItem>
                      <ListItemText
                        primary={item.exercise}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip
                              label={`${item.sessions} session${item.sessions > 1 ? 's' : ''}`}
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                            {item.muscleFocus && (
                              <Chip label={item.muscleFocus} size="small" />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {idx < areasOfImprovement.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Muscle Distribution */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Muscle Group Distribution
            </Typography>
            {muscleDistribution.length === 0 ? (
              <Typography color="text.secondary">No data yet</Typography>
            ) : (
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
            )}
          </Paper>
        </Grid>

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
      </Grid>
    </Box>
  );
}

