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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
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
import Loader from '@/components/common/Loader';

export default function TrainingProgramsPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const programs = useSelector(selectTrainingPrograms);
  const workouts = useSelector(selectWorkouts);
  const loading = useSelector(selectTrainingProgramsLoading);

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

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    dispatch(fetchTrainingPrograms());
    dispatch(fetchWorkouts());
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

  const getWorkoutName = (workoutId) => {
    const workout = workouts.find(w => w.id === workoutId);
    return workout ? workout.name : 'Unknown Workout';
  };

  if (loading && programs.length === 0) {
    return <Loader fullScreen message="Loading training programs..." />;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1, minWidth: 'fit-content' }}>
          Workout Plans
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Create
        </Button>
      </Box>

      {/* Programs Grid */}
      <Grid container spacing={3}>
        {programs.map((program) => (
          <Grid item xs={12} sm={6} md={4} key={program.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {program.name}
                </Typography>
                
                {program.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {program.description}
                  </Typography>
                )}

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
                  startIcon={<PlayCircleOutlineIcon />}
                  onClick={() => router.push(`/active-workout/${program.id}`)}
                >
                  Start
                </Button>
                <Box>
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(program)}
                    title="Edit"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => openDeleteDialog(program)}
                    title="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {programs.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No workout plans yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a plan to group your workouts (e.g., Leg Day Quad, Upper Body Circuit)
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Create
          </Button>
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

            <FormControl fullWidth required>
              <InputLabel>Select Workouts</InputLabel>
              <Select
                multiple
                value={formData.workoutIds}
                onChange={(e) => setFormData({ ...formData, workoutIds: e.target.value })}
                input={<OutlinedInput label="Select Workouts" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={getWorkoutName(value)} size="small" />
                    ))}
                  </Box>
                )}
              >
                {workouts.map((workout) => (
                  <MenuItem key={workout.id} value={workout.id}>
                    {workout.name} {workout.muscleFocus && `(${workout.muscleFocus})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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
  );
}

