'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  ListItemIcon,
  InputAdornment,
  Pagination,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import {
  fetchTrainingPrograms,
  createTrainingProgram,
  updateTrainingProgram,
  deleteTrainingProgram,
  selectTrainingPrograms,
  selectTrainingProgramsLoading,
} from '@/redux/slices/trainingProgramsSlice';
import {
  fetchWorkouts,
  selectWorkouts,
} from '@/redux/slices/workoutsSlice';
import { selectUser } from '@/redux/slices/authSlice';
import Loader from '@/components/common/Loader';
import MuscleBodyMap from '@/components/common/MuscleBodyMap';
import PullToRefresh from '@/components/common/PullToRefresh';
import { hapticSuccess } from '@/lib/nativeFeatures';

export default function TrainingProgramsPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const programs = useSelector(selectTrainingPrograms);
  const workouts = useSelector(selectWorkouts);
  const loading = useSelector(selectTrainingProgramsLoading);
  const user = useSelector(selectUser);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    workoutIds: [],
    description: '',
  });

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  // Workout search in dialog
  const [workoutSearchQuery, setWorkoutSearchQuery] = useState('');

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Starting workout state - track which program is being started
  const [startingWorkoutId, setStartingWorkoutId] = useState(null);

  // Program completion counts
  const [programCounts, setProgramCounts] = useState({});

  // Permission checks - All edit/delete disabled
  const canAdd = user?.role === 'admin' || user?.role === 'trainer';
  const canEdit = false; // Disabled for all users
  const canDelete = false; // Disabled for all users

  useEffect(() => {
    dispatch(fetchTrainingPrograms());
    dispatch(fetchWorkouts());
    
    // Fetch program counts
    const fetchCounts = async () => {
      try {
        const response = await fetch('/api/program-counts');
        const data = await response.json();
        if (data.counts) {
          setProgramCounts(data.counts);
        }
      } catch (e) {
        console.error('Failed to fetch program counts:', e);
      }
    };
    fetchCounts();
  }, [dispatch]);

  const handleOpenDialog = (program = null) => {
    if (program) {
      setEditMode(true);
      setSelectedProgram(program);
      setFormData({
        name: program.name,
        workoutIds: program.workoutIds || [],
        description: program.description || '',
      });
    } else {
      setEditMode(false);
      setSelectedProgram(null);
      setFormData({
        name: '',
        workoutIds: [],
        description: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setSelectedProgram(null);
    setWorkoutSearchQuery(''); // Reset workout search when closing dialog
  };

  const handleSaveProgram = async () => {
    try {
      if (editMode) {
        await dispatch(updateTrainingProgram({ id: selectedProgram.id, ...formData })).unwrap();
        setSnackbar({ open: true, message: 'Program updated successfully', severity: 'success' });
      } else {
        await dispatch(createTrainingProgram(formData)).unwrap();
        setSnackbar({ open: true, message: 'Program created successfully', severity: 'success' });
      }
      handleCloseDialog();
    } catch (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
    }
  };

  const handleDeleteProgram = async () => {
    try {
      await dispatch(deleteTrainingProgram(selectedProgram.id)).unwrap();
      setDeleteDialogOpen(false);
      setSelectedProgram(null);
      setSnackbar({ open: true, message: 'Program deleted successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
    }
  };

  const openDeleteDialog = (program) => {
    setSelectedProgram(program);
    setDeleteDialogOpen(true);
  };

  const handleStartWorkout = async (program) => {
    // Prevent duplicate clicks
    if (startingWorkoutId) {
      return;
    }

    setStartingWorkoutId(program.id);
    
    try {
      // Initialize workout data
      const initialData = {};
      const workoutList = (program.workoutIds || []).map(id => 
        workouts.find(w => w.id === id)
      ).filter(Boolean);

      for (const workout of workoutList) {
        // Fetch last session for this specific exercise
        let lastExerciseData = null;
        try {
          const lastExerciseResponse = await fetch(`/api/last-exercise/${workout.id}`);
          const lastExerciseResult = await lastExerciseResponse.json();
          
          if (lastExerciseResult.lastSession) {
            lastExerciseData = lastExerciseResult.lastSession;
          }
        } catch (e) {
          // Ignore errors
        }
        
        const defaultSets = [
          { weight: 0, reps: 12, rir: 0, completed: false, previousWeight: 0 },
          { weight: 0, reps: 12, rir: 0, completed: false, previousWeight: 0 },
        ];
        
        initialData[workout.id] = {
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
      }

      // Create active workout session
      const response = await fetch('/api/active-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingProgramId: program.id,
          workoutData: initialData,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.activeWorkoutId) {
        router.push(`/active-workout/${data.activeWorkoutId}`);
      } else {
        setStartingWorkoutId(null);
        setSnackbar({ open: true, message: 'Failed to start workout', severity: 'error' });
      }
    } catch (error) {
      setStartingWorkoutId(null);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const getWorkoutName = (workoutId) => {
    const workout = workouts.find(w => w.id === workoutId);
    return workout ? workout.name : 'Unknown Workout';
  };

  // Get muscle distribution for a program
  const getProgramMuscles = (program) => {
    if (!program.workoutIds || program.workoutIds.length === 0) return [];
    
    const muscleCount = {};
    
    program.workoutIds.forEach(workoutId => {
      const workout = workouts.find(w => w.id === workoutId);
      if (workout && workout.muscleFocus) {
        const muscle = workout.muscleFocus;
        muscleCount[muscle] = (muscleCount[muscle] || 0) + 1;
      }
    });
    
    return Object.entries(muscleCount).map(([muscle, count]) => ({
      muscle,
      count
    }));
  };

  // Filter programs based on search
  const filteredPrograms = programs.filter(program =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    program.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Paginate programs
  const paginatedPrograms = filteredPrograms.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const totalPages = Math.ceil(filteredPrograms.length / rowsPerPage);

  const handlePageChange = (event, newPage) => {
    setPage(newPage - 1); // MUI Pagination is 1-indexed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter workouts for the dialog based on search
  const filteredWorkoutsForDialog = workouts.filter(workout =>
    workout.name.toLowerCase().includes(workoutSearchQuery.toLowerCase()) ||
    workout.muscleFocus?.toLowerCase().includes(workoutSearchQuery.toLowerCase()) ||
    workout.equipmentName?.toLowerCase().includes(workoutSearchQuery.toLowerCase())
  );

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    await dispatch(fetchTrainingPrograms());
    await dispatch(fetchWorkouts());
    hapticSuccess();
  };

  if (loading && programs.length === 0) {
    return <Loader fullScreen message="Loading training programs..." />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1, minWidth: 'fit-content' }}>
          Workout Plans
        </Typography>
        {canAdd && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Create
          </Button>
        )}
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search workout plans by name or description..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0); // Reset to first page on search
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Results count */}
      {searchQuery && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Found {filteredPrograms.length} workout plan{filteredPrograms.length !== 1 ? 's' : ''}
        </Typography>
      )}

      {/* Programs Grid */}
      <Grid container spacing={3}>
        {paginatedPrograms.map((program) => (
          <Grid item xs={12} sm={6} md={4} key={program.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {/* Completion count badge */}
              {programCounts[program.id] > 0 && (
                <Chip
                  label={`${programCounts[program.id]}x`}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: '#10b981',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                    height: 22,
                    zIndex: 1,
                  }}
                />
              )}
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1, pr: programCounts[program.id] > 0 ? 4 : 0 }}>
                    {program.name}
                  </Typography>
                  {program.equipmentTag && (
                    <Chip
                      label={program.equipmentTag}
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
                
                {program.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {program.description}
                  </Typography>
                )}

                {/* Muscle Map */}
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                  <MuscleBodyMap 
                    muscleDistribution={getProgramMuscles(program)}
                    size="small"
                    showToggle={false}
                    showBreakdown={false}
                    showLegend={false}
                    autoRotate={true}
                    useGradient={false}
                  />
                </Box>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Workouts ({program.workoutIds?.length || 0}):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {program.workoutIds?.map((workoutId) => (
                    <Chip
                      key={workoutId}
                      label={getWorkoutName(workoutId)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={startingWorkoutId === program.id ? null : <PlayCircleOutlineIcon />}
                  onClick={() => handleStartWorkout(program)}
                  disabled={startingWorkoutId !== null}
                  sx={{
                    minWidth: '90px',
                    opacity: startingWorkoutId && startingWorkoutId !== program.id ? 0.5 : 1,
                  }}
                >
                  {startingWorkoutId === program.id ? (
                    'Creating...'
                  ) : (
                    'Start'
                  )}
                </Button>
                <Box>
                  {canEdit && (
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(program)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                  {canDelete && (
                    <IconButton
                      color="error"
                      onClick={() => openDeleteDialog(program)}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Stack spacing={2} alignItems="center" sx={{ mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Stack>
      )}

      {filteredPrograms.length === 0 && searchQuery && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No workout plans found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search query
          </Typography>
        </Box>
      )}

      {programs.length === 0 && !loading && !searchQuery && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No workout plans yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {canAdd 
              ? 'Create a plan to group your workouts (e.g., Leg Day Quad, Upper Body Circuit)' 
              : 'No workout plans available yet'}
          </Typography>
          {canAdd && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
              Create
            </Button>
          )}
        </Box>
      )}

      {/* Add/Edit Program Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Training Program' : 'Create Training Program'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Program Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
              placeholder="e.g., Leg Day, Push Day, Full Body"
            />

            {/* Selected Workouts Count */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Selected Workouts: {formData.workoutIds.length}
              </Typography>
              {formData.workoutIds.length > 0 && (
                <Button
                  size="small"
                  onClick={() => setFormData({ ...formData, workoutIds: [] })}
                  color="error"
                >
                  Clear All
                </Button>
              )}
            </Box>

            {/* Workout Search Field */}
            <TextField
              placeholder="Search workouts by name, muscle, or equipment..."
              value={workoutSearchQuery}
              onChange={(e) => setWorkoutSearchQuery(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            {/* Workouts List with Checkboxes */}
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                maxHeight: 400,
                overflow: 'auto',
                bgcolor: 'background.paper',
              }}
            >
              {filteredWorkoutsForDialog.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No workouts found
                  </Typography>
                </Box>
              ) : (
                <List dense>
                  {filteredWorkoutsForDialog.map((workout) => (
                    <ListItem
                      key={workout.id}
                      button
                      onClick={() => {
                        const isSelected = formData.workoutIds.includes(workout.id);
                        if (isSelected) {
                          setFormData({
                            ...formData,
                            workoutIds: formData.workoutIds.filter(id => id !== workout.id)
                          });
                        } else {
                          setFormData({
                            ...formData,
                            workoutIds: [...formData.workoutIds, workout.id]
                          });
                        }
                      }}
                      sx={{
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                        bgcolor: formData.workoutIds.includes(workout.id) ? 'action.selected' : 'transparent',
                      }}
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={formData.workoutIds.includes(workout.id)}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={workout.name}
                        secondary={`${workout.muscleFocus}${workout.equipmentName ? ` • ${workout.equipmentName}` : ''}`}
                        primaryTypographyProps={{
                          fontWeight: formData.workoutIds.includes(workout.id) ? 600 : 400,
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            {/* Show count of filtered workouts */}
            <Typography variant="caption" color="text.secondary">
              {workoutSearchQuery 
                ? `Showing ${filteredWorkoutsForDialog.length} of ${workouts.length} workouts`
                : `Total ${workouts.length} workouts available`
              }
            </Typography>

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
              placeholder="Optional notes about this program"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveProgram}
            variant="contained"
            disabled={!formData.name || formData.workoutIds.length === 0}
          >
            {editMode ? 'Update' : 'Create'} Program
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Training Program</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedProgram?.name}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteProgram} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
    </PullToRefresh>
  );
}

