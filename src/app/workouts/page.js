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
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  InputAdornment,
  Pagination,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import {
  fetchWorkouts,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  selectWorkouts,
  selectWorkoutsLoading,
} from '@/redux/slices/workoutsSlice';
import { selectUser } from '@/redux/slices/authSlice';
import { MUSCLE_GROUPS } from '@/constants/app';
import Loader from '@/components/common/Loader';
import MuscleBodyMap from '@/components/common/MuscleBodyMap';

export default function WorkoutsPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const workouts = useSelector(selectWorkouts);
  const loading = useSelector(selectWorkoutsLoading);
  const user = useSelector(selectUser);

  // Permission checks - All edit/delete disabled
  const canAdd = user?.role === 'admin' || user?.role === 'trainer';
  const canEdit = false; // Disabled for all users
  const canDelete = false; // Disabled for all users

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    equipmentName: '',
    muscleFocus: '',
    description: '',
  });

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);

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
        muscleFocus: workout.muscleFocus || '',
        description: workout.description || '',
      });
    } else {
      setEditMode(false);
      setSelectedWorkout(null);
      setFormData({
        name: '',
        equipmentName: '',
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

  // Filter workouts based on search
  const filteredWorkouts = workouts.filter(workout =>
    workout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workout.equipmentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workout.muscleFocus?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Paginate workouts
  const paginatedWorkouts = filteredWorkouts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const totalPages = Math.ceil(filteredWorkouts.length / rowsPerPage);

  if (loading && workouts.length === 0) {
    return <Loader fullScreen />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Workouts</Typography>
        {canAdd && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Workout
          </Button>
        )}
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search workouts by name, equipment, or muscle group..."
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
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {paginatedWorkouts.length} of {filteredWorkouts.length} workouts
      </Typography>

      {/* Workouts Grid - 2 columns per row on all devices */}
      <Grid container spacing={3}>
        {paginatedWorkouts.map((workout) => (
          <Grid item xs={6} sm={6} key={workout.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(196, 255, 13, 0.15)',
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 600,
                    minHeight: '3.6em', // Reserve space for 2 lines
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.4
                  }}
                >
                  {workout.name}
                </Typography>
                
                {workout.equipmentName && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Equipment: {workout.equipmentName}
                  </Typography>
                )}
                
                {/* Muscle Map */}
                {workout.muscleFocus && (
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MuscleBodyMap 
                      muscleDistribution={[{ muscle: workout.muscleFocus, count: 1 }]}
                      size="small"
                      showToggle={false}
                      showBreakdown={false}
                      showLegend={false}
                      autoRotate={true}
                      useGradient={false}
                    />
                  </Box>
                )}
                
                {workout.muscleFocus && (
                  <Chip
                    label={workout.muscleFocus}
                    size="small"
                    sx={{ 
                      mt: 1,
                      bgcolor: 'rgba(196, 255, 13, 0.15)',
                      color: '#c4ff0d',
                      border: '1px solid rgba(196, 255, 13, 0.3)'
                    }}
                  />
                )}
                
                {workout.description && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mt: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {workout.description}
                  </Typography>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                {canEdit && (
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(workout)}
                    title="Edit"
                    sx={{ 
                      color: '#c4ff0d',
                      '&:hover': { bgcolor: 'rgba(196, 255, 13, 0.1)' }
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                {canDelete && (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => openDeleteDialog(workout)}
                    title="Delete"
                    sx={{ 
                      '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.1)' }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Stack spacing={2}>
            <Pagination
              count={totalPages}
              page={page + 1}
              onChange={(e, value) => setPage(value - 1)}
              color="primary"
              size="large"
            />
          </Stack>
        </Box>
      )}

      {filteredWorkouts.length === 0 && !loading && searchQuery && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No workouts found for &quot;{searchQuery}&quot;
          </Typography>
          <Button variant="outlined" onClick={() => setSearchQuery('')}>
            Clear Search
          </Button>
        </Box>
      )}

      {workouts.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No workouts yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {canAdd ? 'Create your first workout to get started' : 'No workouts available yet'}
          </Typography>
          {canAdd && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
              Add Workout
            </Button>
          )}
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
            
            {/* Muscle Focus Selection - Dropdown OR Body Map */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                Muscle Focus
              </Typography>
              
              {/* Dropdown Selection */}
              <TextField
                select
                label="Select from List"
                value={formData.muscleFocus}
                onChange={(e) => setFormData({ ...formData, muscleFocus: e.target.value })}
                fullWidth
                sx={{ mb: 3 }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {MUSCLE_GROUPS.map((muscle) => (
                  <MenuItem key={muscle} value={muscle}>
                    {muscle}
                  </MenuItem>
                ))}
              </TextField>

              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block', textAlign: 'center' }}>
                OR Click on the muscle map below
              </Typography>
              
              {/* Visual Muscle Map Selection */}
              {formData.muscleFocus && (
                <Chip 
                  label={`Selected: ${formData.muscleFocus}`}
                  color="primary"
                  onDelete={() => setFormData({ ...formData, muscleFocus: '' })}
                  sx={{ mb: 2 }}
                />
              )}
              <MuscleBodyMap 
                muscleDistribution={formData.muscleFocus 
                  ? [{ muscle: formData.muscleFocus, count: 1 }]
                  : MUSCLE_GROUPS.map(m => ({ muscle: m, count: 1 }))
                }
                size="medium"
                showToggle={true}
                showBreakdown={true}
                showLegend={false}
                autoRotate={false}
                selectable={true}
                selectedMuscle={formData.muscleFocus}
                onMuscleSelect={(muscle) => setFormData({ ...formData, muscleFocus: muscle })}
                useGradient={false}
              />
            </Box>
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

