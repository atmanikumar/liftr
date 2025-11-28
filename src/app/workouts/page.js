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
  CardMedia,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchWorkouts,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  selectWorkouts,
  selectWorkoutsLoading,
} from '@/redux/slices/workoutsSlice';
import { MUSCLE_GROUPS } from '@/constants/app';
import Loader from '@/components/common/Loader';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect width="300" height="200" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';

export default function WorkoutsPage() {
  const dispatch = useDispatch();
  const workouts = useSelector(selectWorkouts);
  const loading = useSelector(selectWorkoutsLoading);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    equipmentName: '',
    equipmentPhoto: '',
    muscleFocus: '',
    description: '',
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    dispatch(fetchWorkouts());
  }, [dispatch]);

  const handleOpenDialog = (workout = null) => {
    if (workout) {
      setEditMode(true);
      setSelectedWorkout(workout);
      setFormData({
        name: workout.name,
        equipmentName: workout.equipmentName || '',
        equipmentPhoto: workout.equipmentPhoto || '',
        muscleFocus: workout.muscleFocus || '',
        description: workout.description || '',
      });
    } else {
      setEditMode(false);
      setSelectedWorkout(null);
      setFormData({
        name: '',
        equipmentName: '',
        equipmentPhoto: '',
        muscleFocus: '',
        description: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setSelectedWorkout(null);
  };

  const handleSaveWorkout = async () => {
    try {
      if (editMode) {
        await dispatch(updateWorkout({ id: selectedWorkout.id, ...formData })).unwrap();
        setSnackbar({ open: true, message: 'Workout updated successfully', severity: 'success' });
      } else {
        await dispatch(createWorkout(formData)).unwrap();
        setSnackbar({ open: true, message: 'Workout created successfully', severity: 'success' });
      }
      handleCloseDialog();
    } catch (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
    }
  };

  const handleDeleteWorkout = async () => {
    try {
      await dispatch(deleteWorkout(selectedWorkout.id)).unwrap();
      setDeleteDialogOpen(false);
      setSelectedWorkout(null);
      setSnackbar({ open: true, message: 'Workout deleted successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
    }
  };

  const openDeleteDialog = (workout) => {
    setSelectedWorkout(workout);
    setDeleteDialogOpen(true);
  };

  if (loading && workouts.length === 0) {
    return <Loader fullScreen message="Loading workouts..." />;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Workouts</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Workout
        </Button>
      </Box>

      {/* Workouts Grid */}
      <Grid container spacing={3}>
        {workouts.map((workout) => (
          <Grid item xs={12} sm={6} md={4} key={workout.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                height="200"
                image={workout.equipmentPhoto || PLACEHOLDER_IMAGE}
                alt={workout.name}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {workout.name}
                </Typography>
                {workout.equipmentName && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Equipment: {workout.equipmentName}
                  </Typography>
                )}
                {workout.muscleFocus && (
                  <Chip
                    label={workout.muscleFocus}
                    color="primary"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                )}
                {workout.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {workout.description}
                  </Typography>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <IconButton
                  color="primary"
                  onClick={() => handleOpenDialog(workout)}
                  title="Edit"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => openDeleteDialog(workout)}
                  title="Delete"
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {workouts.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SelfImprovementIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No workouts yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first workout to get started
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add Workout
          </Button>
        </Box>
      )}

      {/* Add/Edit Workout Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Workout' : 'Add New Workout'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Workout Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Equipment Name"
              value={formData.equipmentName}
              onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Equipment Photo URL"
              value={formData.equipmentPhoto}
              onChange={(e) => setFormData({ ...formData, equipmentPhoto: e.target.value })}
              fullWidth
              helperText="Enter image URL or leave empty"
            />
            <TextField
              select
              label="Muscle Focus"
              value={formData.muscleFocus}
              onChange={(e) => setFormData({ ...formData, muscleFocus: e.target.value })}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {MUSCLE_GROUPS.map((muscle) => (
                <MenuItem key={muscle} value={muscle}>
                  {muscle}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveWorkout}
            variant="contained"
            disabled={!formData.name}
          >
            {editMode ? 'Update' : 'Add'} Workout
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Workout</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedWorkout?.name}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteWorkout} variant="contained" color="error">
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

