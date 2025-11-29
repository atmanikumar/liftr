'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Chip,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTrainingPrograms, selectTrainingPrograms } from '@/redux/slices/trainingProgramsSlice';
import { fetchWorkouts, selectWorkouts } from '@/redux/slices/workoutsSlice';
import Loader from '@/components/common/Loader';

const WEIGHT_UNITS = ['lbs', 'kg'];
const RIR_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const REPS_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

// Generate weight options from 0 to 150 in increments of 2.5
const generateWeightOptions = () => {
  const options = [];
  for (let i = 0; i <= 150; i += 2.5) {
    options.push(i);
  }
  return options;
};

const WEIGHT_OPTIONS = generateWeightOptions();

// Determine equipment type and auto-increment
const getAutoIncrement = (equipmentName) => {
  if (!equipmentName) return 5;
  
  const name = equipmentName.toLowerCase();
  
  // Hydraulic/Machine exercises - 5 lbs increment
  if (name.includes('machine') || name.includes('hydraulic') || 
      name.includes('cable') || name.includes('leg press') ||
      name.includes('hack squat') || name.includes('pec deck')) {
    return 5;
  }
  
  // Dumbbell/Barbell exercises - 10 lbs increment
  if (name.includes('dumbbell') || name.includes('barbell') || 
      name.includes('smith') || name.includes('bench')) {
    return 10;
  }
  
  // Default - 5 lbs
  return 5;
};

export default function ActiveWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const programId = parseInt(params.programId);
  
  const programs = useSelector(selectTrainingPrograms);
  const workouts = useSelector(selectWorkouts);
  
  const [program, setProgram] = useState(null);
  const [programWorkouts, setProgramWorkouts] = useState([]);
  const [workoutData, setWorkoutData] = useState({});
  const [expandedWorkout, setExpandedWorkout] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [lastSessionData, setLastSessionData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        dispatch(fetchTrainingPrograms()),
        dispatch(fetchWorkouts()),
      ]);
      setLoading(false);
    };
    loadData();
  }, [dispatch]);

  useEffect(() => {
    const initializeWorkout = async () => {
      if (programs.length > 0 && workouts.length > 0) {
        const selectedProgram = programs.find(p => p.id === programId);
        if (selectedProgram) {
          setProgram(selectedProgram);
          const workoutIds = selectedProgram.workoutIds || [];
          const workoutList = workoutIds.map(id => 
            workouts.find(w => w.id === id)
          ).filter(Boolean);
          setProgramWorkouts(workoutList);
          
          // Try to load active workout from DB first
          try {
            const activeResponse = await fetch('/api/active-workout');
            const activeData = await activeResponse.json();
            
            if (activeData.activeWorkout && activeData.activeWorkout.trainingProgramId === programId) {
              setWorkoutData(activeData.activeWorkout.workoutData);
              return;
            }
          } catch (e) {
            console.error('Failed to load active workout:', e);
          }
          
          // Try to load last session for prefilling
          try {
            const lastSessionResponse = await fetch(`/api/last-session/${programId}`);
            const lastSessionResult = await lastSessionResponse.json();
            
            if (lastSessionResult.lastSession) {
              setLastSessionData(lastSessionResult.lastSession);
            }
          } catch (e) {
            console.error('Failed to load last session:', e);
          }
          
          // Initialize workout data with 2 sets for each workout (default reps: 12)
          // Prefill from last session if available
          const initialData = {};
          workoutList.forEach(workout => {
            const lastSession = lastSessionData?.[workout.id];
            
            initialData[workout.id] = {
              unit: lastSession?.unit || 'lbs',
              sets: lastSession?.sets.map(set => ({
                weight: set.weight || 0,
                reps: set.reps || 12,
                rir: set.rir || 0,
                completed: false,
                previousWeight: set.weight || 0, // Store for comparison
              })) || [
                { weight: 0, reps: 12, rir: 0, completed: false, previousWeight: 0 },
                { weight: 0, reps: 12, rir: 0, completed: false, previousWeight: 0 },
              ],
              workoutCompleted: false,
            };
          });
          
          setWorkoutData(initialData);
          
          // Save as active workout in DB
          try {
            await fetch('/api/active-workout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                trainingProgramId: programId,
                workoutData: initialData,
              }),
            });
          } catch (e) {
            console.error('Failed to save active workout:', e);
          }
        }
      }
    };
    
    initializeWorkout();
  }, [programs, workouts, programId, lastSessionData]);

  const updateSet = (workoutId, setIndex, field, value) => {
    setWorkoutData(prev => {
      const workout = programWorkouts.find(w => w.id === workoutId);
      const autoIncrement = getAutoIncrement(workout?.equipmentName);
      
      const newSets = prev[workoutId].sets.map((set, idx) => {
        if (idx === setIndex) {
          return { ...set, [field]: value };
        }
        // Auto-increment weight for subsequent sets when first set weight is changed
        if (field === 'weight' && setIndex === 0 && idx > 0) {
          const incrementedWeight = Math.min(150, value + (autoIncrement * idx));
          return { ...set, weight: incrementedWeight };
        }
        return set;
      });

      const updatedData = {
        ...prev,
        [workoutId]: {
          ...prev[workoutId],
          sets: newSets,
        },
      };
      
      // Save to DB
      fetch('/api/active-workout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutData: updatedData }),
      }).catch(e => console.error('Failed to save:', e));
      
      return updatedData;
    });
  };

  const updateUnit = (workoutId, unit) => {
    setWorkoutData(prev => {
      const updatedData = {
        ...prev,
        [workoutId]: {
          ...prev[workoutId],
          unit: unit,
        },
      };
      
      // Save to DB
      fetch('/api/active-workout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutData: updatedData }),
      }).catch(e => console.error('Failed to save:', e));
      
      return updatedData;
    });
  };

  const addSet = (workoutId) => {
    setWorkoutData(prev => {
      const currentSets = prev[workoutId].sets;
      const lastSet = currentSets[currentSets.length - 1];
      const workout = programWorkouts.find(w => w.id === workoutId);
      const autoIncrement = getAutoIncrement(workout?.equipmentName);
      
      // Auto-increment weight from last set
      const newWeight = Math.min(150, (lastSet?.weight || 0) + autoIncrement);
      
      const updatedData = {
        ...prev,
        [workoutId]: {
          ...prev[workoutId],
          sets: [
            ...currentSets,
            { 
              weight: newWeight, 
              reps: lastSet?.reps || 12, 
              rir: lastSet?.rir || 0, 
              completed: false,
              previousWeight: lastSet?.previousWeight || 0 
            },
          ],
        },
      };
      
      // Save to DB
      fetch('/api/active-workout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutData: updatedData }),
      }).catch(e => console.error('Failed to save:', e));
      
      return updatedData;
    });
  };

  const removeSet = (workoutId, setIndex) => {
    setWorkoutData(prev => {
      const updatedData = {
        ...prev,
        [workoutId]: {
          ...prev[workoutId],
          sets: prev[workoutId].sets.filter((_, idx) => idx !== setIndex),
        },
      };
      
      // Save to DB
      fetch('/api/active-workout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutData: updatedData }),
      }).catch(e => console.error('Failed to save:', e));
      
      return updatedData;
    });
  };

  const toggleSetComplete = (workoutId, setIndex) => {
    setWorkoutData(prev => {
      const newSets = prev[workoutId].sets.map((set, idx) =>
        idx === setIndex ? { ...set, completed: !set.completed } : set
      );
      const allCompleted = newSets.every(set => set.completed);
      
      const updatedData = {
        ...prev,
        [workoutId]: {
          ...prev[workoutId],
          sets: newSets,
          workoutCompleted: allCompleted,
        },
      };
      
      // Save to DB
      fetch('/api/active-workout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutData: updatedData }),
      }).catch(e => console.error('Failed to save:', e));
      
      return updatedData;
    });
  };

  // Swipe handlers for weight adjustment
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = (workoutId, setIndex, currentWeight) => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 50;
    const isDownSwipe = distance < -50;

    if (isUpSwipe) {
      // Swipe up - increase weight
      const newWeight = Math.min(150, currentWeight + 2.5);
      updateSet(workoutId, setIndex, 'weight', newWeight);
    }
    if (isDownSwipe) {
      // Swipe down - decrease weight
      const newWeight = Math.max(0, currentWeight - 2.5);
      updateSet(workoutId, setIndex, 'weight', newWeight);
    }
  };

  const calculateProgress = () => {
    const totalSets = Object.values(workoutData).reduce((acc, workout) => {
      return acc + workout.sets.length;
    }, 0);
    const completedSets = Object.values(workoutData).reduce((acc, workout) => {
      return acc + workout.sets.filter(set => set.completed).length;
    }, 0);
    return totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  };

  const handleSaveWorkout = async () => {
    try {
      // Prepare data for API
      const sessions = [];
      programWorkouts.forEach(workout => {
        const sets = workoutData[workout.id].sets.filter(set => set.completed);
        if (sets.length > 0) {
          const workoutUnit = workoutData[workout.id].unit;
          sessions.push({
            workoutId: workout.id,
            trainingProgramId: programId,
            sets: sets.length,
            reps: sets.map(s => s.reps),
            weight: sets.map(s => `${s.weight}${workoutUnit}`),
            rir: sets.map(s => s.rir),
            completedAt: new Date().toISOString(),
          });
        }
      });

      // Save to database via API
      const response = await fetch('/api/save-workout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessions }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save workout');
      }
      
      // Mark as completed in localStorage
      const today = new Date().toDateString();
      const completed = JSON.parse(localStorage.getItem(`completed_${today}`) || '[]');
      completed.push(programId);
      localStorage.setItem(`completed_${today}`, JSON.stringify(completed));

      // Clear active workout data
      localStorage.removeItem('activeWorkout');

      router.push('/');
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout: ' + error.message);
    }
  };

  if (loading) {
    return <Loader fullScreen />;
  }

  if (!program) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6">Workout plan not found</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.push('/')}>
          Go Home
        </Button>
      </Box>
    );
  }

  const progress = calculateProgress();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {program.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {programWorkouts.length} exercises • {new Date().toLocaleDateString()}
        </Typography>
        
        {/* Progress Bar */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Progress</Typography>
            <Typography variant="body2">{Math.round(progress)}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
        </Box>
      </Box>

      {/* Workout Exercises */}
      <Stack spacing={2}>
        {programWorkouts.map((workout, workoutIndex) => {
          const workoutSets = workoutData[workout.id]?.sets || [];
          const completedSets = workoutSets.filter(s => s.completed).length;
          
          return (
            <Accordion
              key={workout.id}
              expanded={expandedWorkout === workout.id}
              onChange={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
            >
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  bgcolor: workoutData[workout.id]?.workoutCompleted ? 'success.dark' : 'inherit',
                  '&:hover': {
                    bgcolor: workoutData[workout.id]?.workoutCompleted ? 'success.dark' : 'action.hover',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  {workoutData[workout.id]?.workoutCompleted && (
                    <CheckCircleIcon color="success" />
                  )}
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {workoutIndex + 1}. {workout.name}
                  </Typography>
                  <Chip 
                    label={`${completedSets}/${workoutSets.length} sets`}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                    }}
                  />
                  {workout.muscleFocus && (
                    <Chip label={workout.muscleFocus} size="small" variant="outlined" />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {/* Equipment type info and Unit selector */}
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    {workout.equipmentName && (
                      <Typography variant="caption" color="text.secondary">
                        {workout.equipmentName} • Auto +{getAutoIncrement(workout.equipmentName)}lbs per set
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">Unit:</Typography>
                    <TextField
                      select
                      value={workoutData[workout.id]?.unit || 'lbs'}
                      onChange={(e) => updateUnit(workout.id, e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    >
                      {WEIGHT_UNITS.map(u => (
                        <MenuItem key={u} value={u}>{u}</MenuItem>
                      ))}
                    </TextField>
                  </Box>
                </Box>

                <Stack spacing={2}>
                  {workoutSets.map((set, setIndex) => (
                    <Card key={setIndex} sx={{ bgcolor: 'background.paper' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Set {setIndex + 1}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {workoutSets.length > 2 && setIndex >= 2 && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeSet(workout.id, setIndex)}
                                title="Delete this set"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                            <IconButton
                              color={set.completed ? 'success' : 'default'}
                              onClick={() => toggleSetComplete(workout.id, setIndex)}
                              title={set.completed ? 'Mark as incomplete' : 'Mark as complete'}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        <Grid container spacing={2}>
                          {/* Weight with swipe support */}
                          <Grid item xs={12} sm={4}>
                            <Box sx={{ position: 'relative' }}>
                              <TextField
                                select
                                fullWidth
                                label="Weight"
                                value={set.weight}
                                onChange={(e) => updateSet(workout.id, setIndex, 'weight', parseFloat(e.target.value))}
                                size="small"
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={() => handleTouchEnd(workout.id, setIndex, set.weight)}
                                helperText="Swipe ↕ to adjust"
                              >
                                {WEIGHT_OPTIONS.map(w => (
                                  <MenuItem key={w} value={w}>{w}</MenuItem>
                                ))}
                              </TextField>
                              {set.previousWeight && set.weight > set.previousWeight && (
                                <Chip
                                  label={`+${set.weight - set.previousWeight}`}
                                  size="small"
                                  color="success"
                                  sx={{
                                    position: 'absolute',
                                    top: -8,
                                    right: -8,
                                    height: 20,
                                    fontSize: '0.7rem',
                                  }}
                                />
                              )}
                            </Box>
                          </Grid>

                          {/* Reps */}
                          <Grid item xs={6} sm={4}>
                            <TextField
                              select
                              fullWidth
                              label="Reps"
                              value={set.reps}
                              onChange={(e) => updateSet(workout.id, setIndex, 'reps', parseInt(e.target.value))}
                              size="small"
                            >
                              {REPS_OPTIONS.map(r => (
                                <MenuItem key={r} value={r}>{r}</MenuItem>
                              ))}
                            </TextField>
                          </Grid>

                          {/* RIR */}
                          <Grid item xs={6} sm={4}>
                            <TextField
                              select
                              fullWidth
                              label="RIR"
                              value={set.rir}
                              onChange={(e) => updateSet(workout.id, setIndex, 'rir', e.target.value)}
                              size="small"
                            >
                              {RIR_OPTIONS.map(r => (
                                <MenuItem key={r} value={r}>{r}</MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Add Set Button */}
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => addSet(workout.id)}
                    fullWidth
                  >
                    Add Set
                  </Button>
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>

      {/* Action Buttons */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={() => router.push('/')}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => setSaveDialogOpen(true)}
          disabled={progress === 0}
        >
          Save Workout
        </Button>
      </Box>

      {/* Save Confirmation Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Workout?</DialogTitle>
        <DialogContent>
          <Typography>
            You&apos;ve completed {Math.round(progress)}% of this workout. Save your progress?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveWorkout} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

