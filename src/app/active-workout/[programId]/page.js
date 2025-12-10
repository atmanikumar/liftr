'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  Slider,
  Pagination,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { useParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTrainingPrograms, selectTrainingPrograms } from '@/redux/slices/trainingProgramsSlice';
import { fetchWorkouts, selectWorkouts } from '@/redux/slices/workoutsSlice';
import Loader from '@/components/common/Loader';
import MuscleBodyMap from '@/components/common/MuscleBodyMap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { debounce } from '@/lib/debounce';
import { MUSCLE_GROUPS } from '@/constants/app';

const WEIGHT_UNITS = ['lbs', 'kgs'];

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
  const [currentWorkoutId, setCurrentWorkoutId] = useState(null); // Currently selected workout in dialog
  const [completedWorkoutIds, setCompletedWorkoutIds] = useState([]); // Track completed workouts in order
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false); // Dialog for workout details
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [addWorkoutDialogOpen, setAddWorkoutDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [activeWorkoutData, setActiveWorkoutData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [addingWorkout, setAddingWorkout] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState({});
  const [searchWorkout, setSearchWorkout] = useState('');
  const [searchPage, setSearchPage] = useState(1);
  const [createWorkoutDialogOpen, setCreateWorkoutDialogOpen] = useState(false);
  const [newWorkoutData, setNewWorkoutData] = useState({
    name: '',
    equipmentName: '',
    muscleFocus: '',
    description: ''
  });
  const [creatingWorkout, setCreatingWorkout] = useState(false);
  const ITEMS_PER_PAGE = 10;
  
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

  // Debounced save to reduce API calls
  const debouncedSave = useRef(
    debounce((data) => {
      fetch('/api/active-workout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutData: data }),
      }).catch(e => console.error('Failed to save:', e));
    }, 500)
  ).current;

  const updateSet = useCallback((workoutId, setIndex, field, value) => {
    setWorkoutData(prev => {
      const newSets = prev[workoutId].sets.map((set, idx) => {
        if (idx === setIndex) {
          return { ...set, [field]: value };
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
      
      // Debounced save to DB
      debouncedSave(updatedData);
      
      return updatedData;
    });
  }, [debouncedSave]);

  const updateUnit = useCallback((workoutId, unit) => {
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
  }, []);

  const addSet = useCallback((workoutId) => {
    setWorkoutData(prev => {
      const currentSets = prev[workoutId].sets;
      const lastSet = currentSets[currentSets.length - 1];
      
      // Use same weight as last set (no auto-increment)
      const newWeight = lastSet?.weight || 0;
      
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
  }, []);

  const removeSet = useCallback((workoutId, setIndex) => {
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
  }, []);

  const deleteSet = useCallback((workoutId, setIndex) => {
    // Only allow deleting sets after the first 2
    if (setIndex < 2) return;
    
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
  }, []);

  const toggleSetComplete = useCallback((workoutId, setIndex) => {
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
  }, []);

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

  // Fetch workout history when workout is expanded
  const fetchWorkoutHistory = useCallback(async (workoutId) => {
    if (workoutHistory[workoutId]) {
      return; // Already fetched
    }
    
    try {
      const response = await fetch(`/api/workout-history/${workoutId}`);
      const data = await response.json();
      
      if (response.ok && data.history) {
        setWorkoutHistory(prev => ({
          ...prev,
          [workoutId]: data.history,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch workout history:', error);
    }
  }, [workoutHistory]);

  // Open workout details dialog
  const handleOpenWorkout = useCallback((workoutId) => {
    setCurrentWorkoutId(workoutId);
    setWorkoutDialogOpen(true);
    fetchWorkoutHistory(workoutId);
  }, [fetchWorkoutHistory]);

  // Close workout dialog
  const handleCloseWorkout = useCallback(() => {
    setWorkoutDialogOpen(false);
    setCurrentWorkoutId(null);
  }, []);

  // Mark current workout as complete
  const handleCompleteWorkout = useCallback(() => {
    if (!currentWorkoutId) return;
    
    // Mark all sets as completed for this workout
    setWorkoutData(prev => {
      const workout = prev[currentWorkoutId];
      if (!workout) return prev;
      
      const updatedSets = workout.sets.map(set => ({
        ...set,
        completed: true,
      }));
      
      const updatedData = {
        ...prev,
        [currentWorkoutId]: {
          ...workout,
          sets: updatedSets,
          workoutCompleted: true,
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
    
    // Add to completed list
    setCompletedWorkoutIds(prev => {
      if (!prev.includes(currentWorkoutId)) {
        return [...prev, currentWorkoutId];
      }
      return prev;
    });
    
    // Close dialog
    handleCloseWorkout();
    
    // Auto-open next uncompleted workout if available
    const nextWorkout = programWorkouts.find(w => 
      w.id !== currentWorkoutId && !completedWorkoutIds.includes(w.id)
    );
    if (nextWorkout) {
      setTimeout(() => handleOpenWorkout(nextWorkout.id), 300);
    }
  }, [currentWorkoutId, programWorkouts, completedWorkoutIds, handleCloseWorkout, handleOpenWorkout]);

  const handleCreateWorkout = async () => {
    if (creatingWorkout) return;
    
    // Validate
    if (!newWorkoutData.name.trim()) {
      alert('Please enter a workout name');
      return;
    }
    
    setCreatingWorkout(true);
    
    try {
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorkoutData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create workout');
      }
      
      // Add the newly created workout to the session
      await addWorkoutToSession(data.workout.id);
      
      // Close the create dialog
      setCreateWorkoutDialogOpen(false);
      setNewWorkoutData({ name: '', equipmentName: '', muscleFocus: '', description: '' });
      
      // Refresh workouts list
      dispatch(fetchWorkouts());
    } catch (error) {
      console.error('Failed to create workout:', error);
      alert('Failed to create workout: ' + error.message);
    } finally {
      setCreatingWorkout(false);
    }
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
      // Only save completed workouts
      const completedWorkouts = programWorkouts.filter(w => completedWorkoutIds.includes(w.id));
      
      completedWorkouts.forEach(workout => {
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
      
      // Validate that we have at least one completed workout to save
      if (sessions.length === 0) {
        setSaving(false);
        alert('Please complete at least one workout before saving');
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

      {/* Workout List */}
      <Stack spacing={2}>
        {/* Completed Workouts - Show at top */}
        {completedWorkoutIds.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#c4ff0d', fontWeight: 'bold' }}>
              ✓ Completed ({completedWorkoutIds.length})
            </Typography>
            <Stack spacing={1}>
              {completedWorkoutIds.map((workoutId, index) => {
                const workout = programWorkouts.find(w => w.id === workoutId);
                if (!workout) return null;
                
          const workoutSets = workoutData[workout.id]?.sets || [];
          const completedSets = workoutSets.filter(s => s.completed).length;
          
          return (
                  <Card
                    key={workoutId}
                sx={{
                      cursor: 'pointer',
                      border: '2px solid #c4ff0d',
                      bgcolor: 'rgba(196, 255, 13, 0.1)',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'rgba(196, 255, 13, 0.15)',
                      },
                    }}
                    onClick={() => handleOpenWorkout(workoutId)}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CheckCircleIcon sx={{ color: '#c4ff0d', fontSize: 28 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" sx={{ color: '#c4ff0d' }}>
                            {index + 1}. {workout.name}
                    </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                            <Chip 
                              label={`${completedSets} sets completed`}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(196, 255, 13, 0.2)',
                                color: '#c4ff0d',
                              }}
                            />
                            {workout.muscleFocus && (
                              <Chip label={workout.muscleFocus} size="small" />
                            )}
                  </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Pending Workouts */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 'bold' }}>
            Pending ({programWorkouts.filter(w => !completedWorkoutIds.includes(w.id)).length})
          </Typography>
          <Stack spacing={1}>
            {programWorkouts
              .filter(w => !completedWorkoutIds.includes(w.id))
              .map((workout, index) => {
                const workoutSets = workoutData[workout.id]?.sets || [];
                const completedSets = workoutSets.filter(s => s.completed).length;
                
                return (
                  <Card
                    key={workout.id}
                    sx={{
                      cursor: 'pointer',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.2s',
                      '&:hover': {
                        border: '1px solid #c4ff0d',
                        bgcolor: 'rgba(196, 255, 13, 0.05)',
                      },
                    }}
                    onClick={() => handleOpenWorkout(workout.id)}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6">
                            {completedWorkoutIds.length + index + 1}. {workout.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip 
                              label={`${workoutSets.length} sets`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
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
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
          </Stack>
        </Box>
      </Stack>

      {/* Workout Details Dialog */}
      <Dialog 
        open={workoutDialogOpen} 
        onClose={handleCloseWorkout}
        maxWidth="md"
        fullWidth
        fullScreen
        TransitionProps={{
          timeout: 300,
        }}
        disableScrollLock={true}
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'flex-start',
          },
          '& .MuiPaper-root': {
            margin: 0,
            maxHeight: '100%',
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {programWorkouts.find(w => w.id === currentWorkoutId)?.name}
            </Typography>
            <IconButton onClick={handleCloseWorkout}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {currentWorkoutId && workoutData[currentWorkoutId] && (() => {
            const workout = programWorkouts.find(w => w.id === currentWorkoutId);
            if (!workout) return null;
            
            const workoutSets = workoutData[currentWorkoutId]?.sets || [];
            
            return (
              <Box>
                {/* Last Workout Progress - Simple Line */}
                {workoutHistory[workout.id] && workoutHistory[workout.id].length > 0 && (
                  <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(196, 255, 13, 0.03)', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                      Progress History
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      position: 'relative',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '50%',
                        height: '2px',
                        bgcolor: 'rgba(196, 255, 13, 0.2)',
                        zIndex: 0,
                      }
                    }}>
                      {workoutHistory[workout.id].slice(-7).map((session, index) => (
                        <Box 
                          key={index}
                          sx={{ 
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            position: 'relative',
                            zIndex: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: index === workoutHistory[workout.id].slice(-7).length - 1 ? '#c4ff0d' : 'rgba(196, 255, 13, 0.4)',
                              border: '2px solid #000',
                              mb: 0.5,
                            }}
                          />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontSize: '0.65rem',
                              fontWeight: index === workoutHistory[workout.id].slice(-7).length - 1 ? 'bold' : 'normal',
                              color: index === workoutHistory[workout.id].slice(-7).length - 1 ? '#c4ff0d' : 'text.secondary',
                              textAlign: 'center',
                            }}
                          >
                            {session.weight1 || 0}{session.unit || 'lbs'}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontSize: '0.6rem',
                              color: 'text.secondary',
                              textAlign: 'center',
                            }}
                          >
                            ({session.reps1 || 12} reps)
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Equipment info and Unit selector row */}
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    {workout.equipmentName && (
                      <Typography variant="caption" color="text.secondary">
                        {workout.equipmentName}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2, p: 0.5 }}>
                    <Button
                      size="small"
                      variant={workoutData[workout.id]?.unit === 'lbs' ? 'contained' : 'text'}
                      onClick={() => updateUnit(workout.id, 'lbs')}
                      sx={{
                        minWidth: 50,
                        bgcolor: workoutData[workout.id]?.unit === 'lbs' ? '#1976d2' : 'transparent',
                        color: workoutData[workout.id]?.unit === 'lbs' ? '#fff' : 'text.secondary',
                        '&:hover': {
                          bgcolor: workoutData[workout.id]?.unit === 'lbs' ? '#1565c0' : 'rgba(255, 255, 255, 0.08)',
                        }
                      }}
                    >
                      lbs
                    </Button>
                    <Button
                      size="small"
                      variant={workoutData[workout.id]?.unit === 'kgs' ? 'contained' : 'text'}
                      onClick={() => updateUnit(workout.id, 'kgs')}
                      sx={{
                        minWidth: 50,
                        bgcolor: workoutData[workout.id]?.unit === 'kgs' ? '#1976d2' : 'transparent',
                        color: workoutData[workout.id]?.unit === 'kgs' ? '#fff' : 'text.secondary',
                        '&:hover': {
                          bgcolor: workoutData[workout.id]?.unit === 'kgs' ? '#1565c0' : 'rgba(255, 255, 255, 0.08)',
                        }
                      }}
                    >
                      kgs
                    </Button>
                  </Box>
                </Box>

                <Stack spacing={2.5}>
                  {workoutSets.map((set, setIndex) => (
                    <Card key={setIndex} sx={{ bgcolor: 'background.paper' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Set {setIndex + 1}
                          </Typography>
                          {setIndex >= 2 && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteSet(workout.id, setIndex)}
                              title="Delete set"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                        
                        <Grid container spacing={3}>
                          {/* Weight Slider */}
                          <Grid item xs={12}>
                            <Box sx={{ position: 'relative', px: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Weight
                                </Typography>
                                <Typography 
                                  variant="h6" 
                                  fontWeight="bold"
                                  sx={{
                                    color: set.previousWeight && set.weight > set.previousWeight ? '#c4ff0d' : 'inherit'
                                  }}
                                >
                                  {set.weight} {workoutData[workout.id]?.unit || 'lbs'}
                                </Typography>
                              </Box>
                              <Slider
                                value={set.weight}
                                onChange={(e, value) => updateSet(workout.id, setIndex, 'weight', value)}
                                min={0}
                                max={workoutData[workout.id]?.unit === 'kgs' ? 100 : 150}
                                step={2.5}
                                marks={[
                                  { value: 0, label: '0' },
                                  { value: workoutData[workout.id]?.unit === 'kgs' ? 50 : 75, label: workoutData[workout.id]?.unit === 'kgs' ? '50' : '75' },
                                  { value: workoutData[workout.id]?.unit === 'kgs' ? 100 : 150, label: workoutData[workout.id]?.unit === 'kgs' ? '100' : '150' }
                                ]}
                                sx={{
                                  '& .MuiSlider-thumb': {
                                    bgcolor: set.previousWeight && set.weight !== set.previousWeight 
                                      ? (set.weight > set.previousWeight ? '#c4ff0d' : '#ef4444') 
                                      : '#1976d2',
                                  },
                                  '& .MuiSlider-track': {
                                    bgcolor: set.previousWeight && set.weight !== set.previousWeight 
                                      ? (set.weight > set.previousWeight ? '#c4ff0d' : '#ef4444') 
                                      : '#1976d2',
                                  },
                                  '& .MuiSlider-rail': {
                                    opacity: 0.3,
                                  }
                                }}
                              />
                              {set.previousWeight && set.previousWeight > 0 && set.weight !== set.previousWeight && (
                                <Chip
                                  label={`${set.weight > set.previousWeight ? '+' : ''}${(set.weight - set.previousWeight).toFixed(1)} ${workoutData[workout.id]?.unit || 'lbs'}`}
                                  size="small"
                                  sx={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 8,
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    bgcolor: set.weight > set.previousWeight ? '#c4ff0d' : '#ef4444',
                                    color: set.weight > set.previousWeight ? '#000000' : '#ffffff',
                                    border: 'none',
                                    zIndex: 1,
                                  }}
                                />
                              )}
                            </Box>
                          </Grid>

                          {/* Reps Slider */}
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ px: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Reps
                                </Typography>
                                <Typography variant="h6" fontWeight="bold">
                                  {set.reps}
                                </Typography>
                              </Box>
                              <Slider
                              value={set.reps}
                                onChange={(e, value) => updateSet(workout.id, setIndex, 'reps', value)}
                                min={0}
                                max={20}
                                step={1}
                                marks={[
                                  { value: 0, label: '0' },
                                  { value: 10, label: '10' },
                                  { value: 20, label: '20' }
                                ]}
                                sx={{
                                  '& .MuiSlider-thumb': {
                                    bgcolor: '#8b5cf6',
                                  },
                                  '& .MuiSlider-track': {
                                    bgcolor: '#8b5cf6',
                                  },
                                  '& .MuiSlider-rail': {
                                    opacity: 0.3,
                                  }
                                }}
                              />
                            </Box>
                          </Grid>

                          {/* RIR Slider */}
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ px: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  RIR
                                </Typography>
                                <Typography variant="h6" fontWeight="bold">
                                  {set.rir}
                                </Typography>
                              </Box>
                              <Slider
                              value={set.rir}
                                onChange={(e, value) => updateSet(workout.id, setIndex, 'rir', value)}
                                min={0}
                                max={10}
                                step={1}
                                marks={[
                                  { value: 0, label: '0' },
                                  { value: 5, label: '5' },
                                  { value: 10, label: '10' }
                                ]}
                                sx={{
                                  '& .MuiSlider-thumb': {
                                    bgcolor: '#f59e0b',
                                  },
                                  '& .MuiSlider-track': {
                                    bgcolor: '#f59e0b',
                                  },
                                  '& .MuiSlider-rail': {
                                    opacity: 0.3,
                                  }
                                }}
                              />
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Add Set Button */}
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => addSet(currentWorkoutId)}
                    fullWidth
                  >
                    Add Set
                  </Button>
                </Stack>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button onClick={handleCloseWorkout} variant="outlined">
            Close
          </Button>
          <Button
            onClick={handleCompleteWorkout}
            variant="contained"
            size="large"
            sx={{
              bgcolor: '#c4ff0d',
              color: '#000',
              fontWeight: 'bold',
              '&:hover': {
                bgcolor: '#b0e00b',
              }
            }}
          >
            Complete Workout
          </Button>
        </DialogActions>
      </Dialog>

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
      <Dialog open={addWorkoutDialogOpen} onClose={() => {
        setAddWorkoutDialogOpen(false);
        setSearchWorkout('');
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Add Exercise to Session</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Search for an exercise to add to today&apos;s workout session
          </Typography>
          
          {/* Create New Workout Button */}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateWorkoutDialogOpen(true)}
            fullWidth
            sx={{
              mb: 2,
              borderColor: '#c4ff0d',
              color: '#c4ff0d',
              '&:hover': {
                borderColor: '#c4ff0d',
                bgcolor: 'rgba(196, 255, 13, 0.1)',
              }
            }}
          >
            Create New Workout
          </Button>

          {/* Search Field */}
          <TextField
            fullWidth
            placeholder="Type to search exercises..."
            value={searchWorkout}
            onChange={(e) => {
              setSearchWorkout(e.target.value);
              setSearchPage(1); // Reset to page 1 on new search
            }}
            sx={{ mb: 2 }}
            size="small"
            autoFocus
          />
          
          <Box sx={{ mt: 2 }}>
            {searchWorkout.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Start typing to search for exercises...
              </Typography>
            ) : (
              <>
            {(() => {
              const filteredWorkouts = workouts
              .filter(w => !programWorkouts.find(pw => pw.id === w.id))
                .filter(w => 
                  w.name.toLowerCase().includes(searchWorkout.toLowerCase()) ||
                  w.equipmentName?.toLowerCase().includes(searchWorkout.toLowerCase()) ||
                  w.muscleFocus?.toLowerCase().includes(searchWorkout.toLowerCase())
                );
              
              const totalPages = Math.ceil(filteredWorkouts.length / ITEMS_PER_PAGE);
              const startIndex = (searchPage - 1) * ITEMS_PER_PAGE;
              const paginatedWorkouts = filteredWorkouts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
              
              return (
                <>
                  {paginatedWorkouts.length > 0 ? (
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                        Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredWorkouts.length)} of {filteredWorkouts.length} exercises
                      </Typography>
                      
                      <Stack spacing={1.5} sx={{ maxHeight: '400px', overflowY: 'auto', pr: 1 }}>
                        {paginatedWorkouts.map(workout => (
                <Box
                  key={workout.id}
                  sx={{ 
                    cursor: addingWorkout ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: addingWorkout ? 0.5 : 1,
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 1,
                    p: 2,
                    '&:hover': {
                      bgcolor: addingWorkout ? 'rgba(255, 255, 255, 0.05)' : 'rgba(196, 255, 13, 0.1)',
                      borderColor: addingWorkout ? 'rgba(255, 255, 255, 0.1)' : '#c4ff0d',
                    }
                  }}
                  onClick={() => !addingWorkout && addWorkoutToSession(workout.id)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1" fontWeight="medium" sx={{ color: '#ffffff', mb: 0.5 }}>
                          {workout.name}
                        </Typography>
                        {workout.equipmentName && (
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            {workout.equipmentName}
                          </Typography>
                        )}
                      </Box>
                      {workout.muscleFocus && (
                      <Chip 
                        label={workout.muscleFocus} 
                        size="small" 
                        sx={{ 
                          bgcolor: 'rgba(196, 255, 13, 0.2)',
                          color: '#c4ff0d',
                          fontWeight: 'medium',
                          border: '1px solid rgba(196, 255, 13, 0.3)'
                        }}
                      />
                      )}
                    </Box>
                </Box>
              ))}
          </Stack>
                      
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                          <Pagination 
                            count={totalPages} 
                            page={searchPage} 
                            onChange={(e, page) => setSearchPage(page)}
                            color="primary"
                            size="small"
                            sx={{
                              '& .MuiPaginationItem-root': {
                                color: '#fff'
                              }
                            }}
                          />
                        </Box>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      No exercises found for &quot;{searchWorkout}&quot;
                    </Typography>
                  )}
                </>
              );
            })()}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddWorkoutDialogOpen(false);
            setSearchWorkout('');
            setSearchPage(1);
          }}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Create New Workout Dialog */}
      <Dialog
        open={createWorkoutDialogOpen}
        onClose={() => !creatingWorkout && setCreateWorkoutDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Workout</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Workout Name */}
            <TextField
              label="Workout Name"
              value={newWorkoutData.name}
              onChange={(e) => setNewWorkoutData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              placeholder="e.g., Barbell Bench Press"
              autoFocus
            />

            {/* Equipment Name */}
            <TextField
              label="Equipment Name"
              value={newWorkoutData.equipmentName}
              onChange={(e) => setNewWorkoutData(prev => ({ ...prev, equipmentName: e.target.value }))}
              fullWidth
              placeholder="e.g., Barbell, Dumbbell, Cable"
            />

            {/* Muscle Focus */}
            <TextField
              select
              label="Muscle Focus"
              value={newWorkoutData.muscleFocus}
              onChange={(e) => setNewWorkoutData(prev => ({ ...prev, muscleFocus: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">
                <em>Select muscle group</em>
              </MenuItem>
              {MUSCLE_GROUPS.map(muscle => (
                <MenuItem key={muscle} value={muscle}>
                  {muscle}
                </MenuItem>
              ))}
            </TextField>

            {/* Description */}
            <TextField
              label="Description (Optional)"
              value={newWorkoutData.description}
              onChange={(e) => setNewWorkoutData(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              placeholder="Add workout instructions or notes..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setCreateWorkoutDialogOpen(false);
              setNewWorkoutData({ name: '', equipmentName: '', muscleFocus: '', description: '' });
            }}
            disabled={creatingWorkout}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateWorkout}
            variant="contained"
            disabled={creatingWorkout || !newWorkoutData.name.trim()}
            sx={{
              bgcolor: '#c4ff0d',
              color: '#000',
              '&:hover': {
                bgcolor: '#b0e00b',
              }
            }}
          >
            {creatingWorkout ? <CircularProgress size={20} /> : 'Create & Add to Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

