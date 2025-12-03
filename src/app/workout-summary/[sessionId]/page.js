'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Divider,
  LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Loader from '@/components/common/Loader';
import MuscleBodyMap from '@/components/common/MuscleBodyMap';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function WorkoutSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const { sessionId } = params;
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [muscleMapOpen, setMuscleMapOpen] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch(`/api/workout-summary/${sessionId}`);
        const data = await response.json();
        setSummary(data);
      } catch (error) {
        console.error('Failed to fetch workout summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [sessionId]);

  if (loading) {
    return <Loader fullScreen message="Loading workout summary..." />;
  }

  if (!summary) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          Workout not found
        </Typography>
        <Button onClick={() => router.push('/')} sx={{ mt: 2 }}>
          Go Home
        </Button>
      </Box>
    );
  }

  const { workout, exercises, totalCalories, comparison } = summary;

  // Calculate muscle distribution from exercises
  const muscleDistribution = exercises.reduce((acc, exercise) => {
    if (exercise.muscleFocus) {
      const existing = acc.find(m => m.muscle === exercise.muscleFocus);
      if (existing) {
        existing.count += exercise.sets.length;
      } else {
        acc.push({ muscle: exercise.muscleFocus, count: exercise.sets.length });
      }
    }
    return acc;
  }, []);

  return (
    <Box>
      {/* Workout Title */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #c4ff0d 0%, #8b5cf6 100%)', border: 'none' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: '#000000' }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" sx={{ color: '#000000', fontWeight: 'bold' }}>
              {workout.programName}
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(0,0,0,0.7)' }}>
              Completed at {new Date(workout.completedAt).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Calories Burned */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(196, 255, 13, 0.1)', border: '2px solid #c4ff0d', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LocalFireDepartmentIcon sx={{ fontSize: 40, color: '#c4ff0d' }} />
              <Box>
                <Typography variant="h3" sx={{ color: '#c4ff0d', fontWeight: 'bold' }}>
                  {Math.round(totalCalories)} cal
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total calories burned
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Muscle Map - Small, Clickable */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 2, 
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: '0 4px 12px rgba(196, 255, 13, 0.3)',
              }
            }}
            onClick={() => setMuscleMapOpen(true)}
          >
            <Typography variant="subtitle2" gutterBottom sx={{ textAlign: 'center' }}>
              Muscles Worked (Click to Expand)
            </Typography>
            <MuscleBodyMap 
              muscleDistribution={muscleDistribution}
              size="small"
              showToggle={false}
              showBreakdown={false}
              showLegend={true}
              autoRotate={true}
              useGradient={false}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Comparison with Last Workout */}
      {comparison && comparison.hasComparison && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Progress vs Last Session
          </Typography>
          
          {/* No Changes Message */}
          {comparison.improvements.length === 0 && comparison.decreases.length === 0 && (
            <Paper sx={{ p: 3, bgcolor: 'rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No weight changes from last session - you maintained the same weights! 💪
              </Typography>
            </Paper>
          )}
          
          <Grid container spacing={2}>
            {comparison.improvements.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: 'rgba(196, 255, 13, 0.1)', border: '1px solid rgba(196, 255, 13, 0.3)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <TrendingUpIcon sx={{ color: '#c4ff0d' }} />
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#c4ff0d' }}>
                        Improvements 💪
                      </Typography>
                    </Box>
                    <Stack spacing={1}>
                      {comparison.improvements.map((imp, idx) => (
                        <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">{imp.exercise}</Typography>
                          <Chip
                            label={`+${imp.increase} ${imp.unit}`}
                            size="small"
                            sx={{ bgcolor: 'rgba(196, 255, 13, 0.25)', color: '#c4ff0d', fontWeight: 'bold', border: '1px solid #c4ff0d' }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {comparison.decreases.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <TrendingDownIcon sx={{ color: '#ef4444' }} />
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#ef4444' }}>
                        Decreases
                      </Typography>
                    </Box>
                    <Stack spacing={1}>
                      {comparison.decreases.map((dec, idx) => (
                        <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">{dec.exercise}</Typography>
                          <Chip
                            label={`${dec.decrease} ${dec.unit}`}
                            size="small"
                            sx={{ bgcolor: '#ef4444', color: '#ffffff', fontWeight: 'bold' }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Exercises Details */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
        Exercise Details
      </Typography>
      <Stack spacing={2}>
        {exercises.map((exercise, idx) => (
          <Card key={idx}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{exercise.name}</Typography>
                <Chip
                  icon={<LocalFireDepartmentIcon />}
                  label={`${Math.round(exercise.calories)} cal`}
                  sx={{ bgcolor: 'rgba(196, 255, 13, 0.15)', color: '#c4ff0d', border: '1px solid rgba(196, 255, 13, 0.3)' }}
                />
              </Box>
              {exercise.muscleFocus && (
                <Chip label={exercise.muscleFocus} size="small" sx={{ mb: 2 }} />
              )}
              <Stack spacing={1}>
                {exercise.sets.map((set, setIdx) => (
                  <Box
                    key={setIdx}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      p: 1,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Set {set.setNumber}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="body2">
                        <strong>{set.weight} {set.unit}</strong>
                      </Typography>
                      <Typography variant="body2">
                        {set.reps} reps
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        RIR {set.rir}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Action Buttons */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          onClick={() => router.push('/recent')}
          sx={{ borderColor: '#c4ff0d', color: '#c4ff0d' }}
        >
          View All Workouts
        </Button>
        <Button
          variant="contained"
          onClick={() => router.push('/')}
          sx={{ 
            bgcolor: 'rgba(196, 255, 13, 0.15)', 
            color: '#c4ff0d',
            border: '1px solid #c4ff0d',
            '&:hover': {
              bgcolor: 'rgba(196, 255, 13, 0.25)',
            }
          }}
        >
          Done
        </Button>
      </Box>

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
            muscleDistribution={muscleDistribution}
            size="medium"
            showToggle={true}
            showBreakdown={true}
            showLegend={true}
            autoRotate={true}
            useGradient={false}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

