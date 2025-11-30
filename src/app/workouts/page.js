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
  InputAdornment,
  Pagination,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
import { MUSCLE_GROUPS } from '@/constants/app';
import Loader from '@/components/common/Loader';
import MuscleBodyMap from '@/components/common/MuscleBodyMap';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect width="300" height="200" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';

export default function WorkoutsPage() {
  const dispatch = useDispatch();
  const router = useRouter();
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

  // Image upload state
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

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
        equipmentPhoto: workout.equipmentPhoto || '',
        muscleFocus: workout.muscleFocus || '',
        description: workout.description || '',
      });
      setImagePreview(workout.equipmentPhoto || null);
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
      setImagePreview(null);
    }
    setDialogOpen(true);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to ImageKit
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({ ...prev, equipmentPhoto: data.url }));
        setSnackbar({ open: true, message: 'Image uploaded successfully', severity: 'success' });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to upload image', severity: 'error' });
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/')}
          sx={{ color: '#c4ff0d' }}
        >
          Back
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Workouts</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Workout
        </Button>
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

      {/* Workouts Grid */}
      <Grid container spacing={3}>
        {paginatedWorkouts.map((workout) => (
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
                    />
                  </Box>
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
            
            {/* Image Upload Section */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Equipment Photo
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Image'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </Button>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<PhotoCameraIcon />}
                  disabled={uploading}
                >
                  Capture Photo
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                  />
                </Button>
              </Box>
              {imagePreview && (
                <Box sx={{ mt: 2, position: 'relative' }}>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{ 
                      width: '100%', 
                      maxHeight: '300px', 
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }} 
                  />
                </Box>
              )}
            </Box>
            {/* Muscle Focus Selection via Body Map */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Muscle Focus - Click on the muscle group below
              </Typography>
              {formData.muscleFocus && (
                <Chip 
                  label={`Selected: ${formData.muscleFocus}`}
                  color="primary"
                  onDelete={() => setFormData({ ...formData, muscleFocus: '' })}
                  sx={{ mb: 2 }}
                />
              )}
              <MuscleBodyMap 
                muscleDistribution={MUSCLE_GROUPS.map(m => ({ muscle: m, count: 1 }))}
                size="medium"
                showToggle={true}
                showBreakdown={true}
                showLegend={false}
                autoRotate={false}
                selectable={true}
                selectedMuscle={formData.muscleFocus}
                onMuscleSelect={(muscle) => setFormData({ ...formData, muscleFocus: muscle })}
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

