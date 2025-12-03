'use client';

import { useEffect, useState, useRef } from 'react';
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
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTrainingPrograms, selectTrainingPrograms } from '@/redux/slices/trainingProgramsSlice';
import { fetchWorkouts, selectWorkouts } from '@/redux/slices/workoutsSlice';
import Loader from '@/components/common/Loader';
import MuscleBodyMap from '@/components/common/MuscleBodyMap';

const WEIGHT_UNITS = ['lbs', 'kgs'];
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
  const activeWorkoutId = parseInt(params.programId); // This is actually the active workout ID
  
  const programs = useSelector(selectTrainingPrograms);
  const workouts = useSelector(selectWorkouts);
  
  const [program, setProgram] = useState(null);
  const [programWorkouts, setProgramWorkouts] = useState([]);
  const [workoutData, setWorkoutData] = useState({});
  const [expandedWorkouts, setExpandedWorkouts] = useState([]); // Changed to array to support multiple
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [addWorkoutDialogOpen, setAddWorkoutDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [activeWorkoutData, setActiveWorkoutData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [addingWorkout, setAddingWorkout] = useState(false);
  
  const initializedRef = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        dispatch(fetchTrainingPrograms()),
        dispatch(fetchWorkouts()),
      ]);
      // Don't set loading to false here - wait for program to be initialized
    };
    loadData();
  }, [dispatch]);

  useEffect(() => {
    const initializeWorkout = async () => {
      if (workouts.length > 0 && !initializedRef.current) {
        initializedRef.current = true;
        
        try {
          // Load active workout by ID
          const response = await fetch(`/api/active-workout/${activeWorkoutId}`);
          const data = await response.json();
          
          if (response.ok && data.activeWorkout) {
            const aw = data.activeWorkout;
            setActiveWorkoutData(aw);
            
            // Set program info
            setProgram({
              id: aw.trainingProgramId,
              name: aw.programName,
              workoutIds: aw.workoutIds,
            });
            
            // Get workout list
            const workoutList = aw.workoutIds.map(id => 
              workouts.find(w => w.id === id)
            ).filter(Boolean);
            setProgramWorkouts(workoutList);
            
            // Set workout data
            setWorkoutData(aw.workoutData);
            
            // Only set loading to false after program is loaded
            setLoading(false);
          } else {
            router.push('/');
          }
        } catch (e) {
          console.error('Failed to load active workout:', e);
          router.push('/');
        }
      }
    };
    
    initializeWorkout();
  }, [workouts, activeWorkoutId, router]);

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

  const getMuscleDistribution = () => {
    const muscleCount = {};
    programWorkouts.forEach(workout => {
      if (workout.muscleFocus) {
        muscleCount[workout.muscleFocus] = (muscleCount[workout.muscleFocus] || 0) + 1;
      }
    });
    return Object.entries(muscleCount).map(([muscle, count]) => ({ muscle, count }));
  };

  const addWorkoutToSession = async (workoutId) => {
    if (addingWorkout) return; // Prevent duplicate clicks
    
    setAddingWorkout(true);
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) {
      setAddingWorkout(false);
      return;
    }

    setProgramWorkouts(prev => [...prev, workout]);

    let lastExerciseData = null;
    try {
      const lastExerciseResponse = await fetch(`/api/last-exercise/${workout.id}`);
      const lastExerciseResult = await lastExerciseResponse.json();
      
      if (lastExerciseResult.lastSession) {
        lastExerciseData = lastExerciseResult.lastSession;
      }
    } catch (e) {
      console.error(`Failed to load last session for workout ${workout.id}:`, e);
    }

    const defaultSets = [
      { weight: 0, reps: 12, rir: 0, completed: false, previousWeight: 0 },
      { weight: 0, reps: 12, rir: 0, completed: false, previousWeight: 0 },
    ];

    const newWorkoutData = {
      unit: lastExerciseData?.unit || 'lbs',
      sets: lastExerciseData?.sets?.length > 0 
        ? lastExerciseData.sets.map(set => ({
            weight: parseFloat(set.weight) || 0,
            reps: parseInt(set.reps) || 12,
            rir: parseInt(set.rir) || 0,
            completed: false,
            previousWeight: parseFloat(set.weight) || 0,
          }))
        : defaultSets,
      workoutCompleted: false,
    };

    setWorkoutData(prev => {
      const updated = {
        ...prev,
        [workout.id]: newWorkoutData,
      };
      
      fetch('/api/active-workout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutData: updated }),
      }).catch(e => console.error('Failed to save:', e));
      
      return updated;
    });

    setAddingWorkout(false);
    setAddWorkoutDialogOpen(false);
  };

  const handleSaveWorkout = async () => {
    if (saving) return; // Prevent duplicate clicks
    
    setSaving(true);
    try {
      if (!program || !program.id) {
        throw new Error('Program information not available');
      }

      const sessions = [];
      programWorkouts.forEach(workout => {
        if (!workoutData[workout.id] || !workoutData[workout.id].sets) {
          return; // Skip if no data
        }
        
        const sets = workoutData[workout.id].sets.filter(set => set.completed);
        if (sets.length > 0) {
          const workoutUnit = workoutData[workout.id].unit || 'lbs';
          sessions.push({
            workoutId: workout.id,
            trainingProgramId: program.id, // Use program.id which is the trainingProgramId
            sets: sets.map((s, idx) => ({
              setNumber: idx + 1,
              weight: s.weight || 0,
              reps: s.reps || 0,
              rir: s.rir || 0,
              previousWeight: s.previousWeight || 0,
            })),
            unit: workoutUnit,
          });
        }
      });
      
      // Validate that we have at least one session to save
      if (sessions.length === 0) {
        setSaving(false);
        alert('Please complete at least one set before saving');
        return;
      }

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

      // Navigate to achievements page if there are any improvements or decreases
      if ((data.improvements && data.improvements.length > 0) || (data.decreases && data.decreases.length > 0)) {
        router.push(`/achievements?session=${data.completedAt}`);
      } else {
        router.push('/');
      }
    } catch (error) {
      setSaving(false);
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
  const muscleDistribution = getMuscleDistribution();

  return (
    <Box>
      {/* Header with Muscle Map */}
      <Box sx={{ mb: 3, display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        <Box sx={{ flexGrow: 1 }}>
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
        
        {/* Muscle Map */}
        {muscleDistribution.length > 0 && (
          <Box sx={{ width: '200px', flexShrink: 0 }}>
            <MuscleBodyMap 
              muscleDistribution={muscleDistribution}
              size="medium"
              showToggle={true}
              showLegend={true}
              showBreakdown={false}
              autoRotate={true}
              useGradient={false}
            />
          </Box>
        )}
      </Box>

      {/* Workout Exercises */}
      <Stack spacing={2}>
        {programWorkouts.map((workout, workoutIndex) => {
          const workoutSets = workoutData[workout.id]?.sets || [];
          const completedSets = workoutSets.filter(s => s.completed).length;
          
          return (
            <Accordion
              key={workout.id}
              expanded={expandedWorkouts.includes(workout.id)}
              onChange={() => {
                setExpandedWorkouts(prev => 
                  prev.includes(workout.id) 
                    ? prev.filter(id => id !== workout.id) // Collapse if already expanded
                    : [...prev, workout.id] // Expand and keep others expanded
                );
              }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  border: workoutData[workout.id]?.workoutCompleted ? '2px solid #c4ff0d' : '1px solid rgba(255, 255, 255, 0.05)',
                  bgcolor: 'inherit',
                  minHeight: '80px',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  '& .MuiAccordionSummary-content': {
                    my: 2,
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: 1, width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    {workoutData[workout.id]?.workoutCompleted && (
                      <CheckCircleIcon color="success" />
                    )}
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {workoutIndex + 1}. {workout.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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
                    {workout.equipmentName && (
                      <Chip 
                        label={workout.equipmentName}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.05)',
                          color: 'rgba(255, 255, 255, 0.6)',
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {/* Equipment info and Unit selector row */}
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
                              {set.previousWeight && set.weight !== set.previousWeight && (
                                <Chip
                                  label={`${set.weight > set.previousWeight ? '+' : ''}${set.weight - set.previousWeight} ${workoutData[workout.id]?.unit || 'lbs'}`}
                                  size="small"
                                  sx={{
                                    position: 'absolute',
                                    top: -8,
                                    right: -8,
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    bgcolor: set.weight > set.previousWeight ? '#c4ff0d' : '#ef4444',
                                    color: set.weight > set.previousWeight ? '#000000' : '#ffffff',
                                    border: 'none'
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

      {/* Add Workout Button */}
      <Box sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          startIcon={<FitnessCenterIcon />}
          onClick={() => setAddWorkoutDialogOpen(true)}
          fullWidth
          sx={{ 
            borderStyle: 'dashed',
            color: '#c4ff0d',
            borderColor: '#c4ff0d',
          }}
        >
          Add Exercise to Today&apos;s Session
        </Button>
      </Box>

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
          startIcon={saving ? null : <SaveIcon />}
          onClick={() => setSaveDialogOpen(true)}
          disabled={progress === 0 || saving}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Workout'}
        </Button>
      </Box>

      {/* Save Confirmation Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Workout?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You&apos;ve completed {Math.round(progress)}% of this workout.
          </Typography>
          
          {/* Show weight improvements */}
          {programWorkouts.some(w => {
            const data = workoutData[w.id];
            if (!data) return false;
            const completedSets = data.sets.filter(s => s.completed);
            return completedSets.some(s => s.previousWeight && s.weight > s.previousWeight);
          }) && (
            <Box sx={{ mt: 2, p: 2, border: '2px solid #c4ff0d', bgcolor: 'rgba(196, 255, 13, 0.1)', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold" sx={{ color: '#c4ff0d' }}>
                🎉 Weight Increases:
              </Typography>
              <Stack spacing={1}>
                {programWorkouts.map(workout => {
                  const data = workoutData[workout.id];
                  if (!data) return null;
                  
                  const completedSets = data.sets.filter(s => s.completed);
                  const weightIncreases = completedSets.filter(s => s.previousWeight && s.weight > s.previousWeight);
                  
                  if (weightIncreases.length === 0) return null;
                  
                  const maxIncrease = Math.max(...weightIncreases.map(s => s.weight - s.previousWeight));
                  
                  return (
                    <Box key={workout.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">{workout.name}</Typography>
                      <Chip
                        label={`+${maxIncrease} ${data.unit}`}
                        size="small"
                        sx={{ 
                          fontWeight: 'bold',
                          bgcolor: '#c4ff0d',
                          color: '#000000'
                        }}
                      />
                    </Box>
                  );
                }).filter(Boolean)}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button 
            onClick={handleSaveWorkout} 
            variant="contained"
            disabled={saving}
            startIcon={saving ? null : undefined}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Workout Dialog */}
      <Dialog open={addWorkoutDialogOpen} onClose={() => setAddWorkoutDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Exercise to Session</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select an exercise to add to today&apos;s workout session
          </Typography>
          <Stack spacing={1} sx={{ mt: 2 }}>
            {workouts
              .filter(w => !programWorkouts.find(pw => pw.id === w.id))
              .map(workout => (
                <Card 
                  key={workout.id}
                  sx={{ 
                    cursor: addingWorkout ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: addingWorkout ? 0.5 : 1,
                    '&:hover': {
                      bgcolor: addingWorkout ? 'inherit' : 'action.hover',
                      transform: addingWorkout ? 'none' : 'translateX(4px)',
                    }
                  }}
                  onClick={() => !addingWorkout && addWorkoutToSession(workout.id)}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {workout.name}
                        </Typography>
                        {workout.equipmentName && (
                          <Typography variant="caption" color="text.secondary">
                            {workout.equipmentName}
                          </Typography>
                        )}
                      </Box>
                      {workout.muscleFocus && (
                        <Chip label={workout.muscleFocus} size="small" />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddWorkoutDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

