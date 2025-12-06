'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Snackbar,
  Collapse,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import {
  fetchUsers,
  createUser,
  resetUserPassword,
  deleteUser,
  selectUsers,
  selectUsersLoading,
} from '@/redux/slices/usersSlice';
import { selectUser, selectViewingAs, setViewingAs, clearViewingAs } from '@/redux/slices/authSlice';
import Loader from '@/components/common/Loader';
import { formatDateTimeIST } from '@/lib/timezone';

export default function UsersPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const users = useSelector(selectUsers);
  const loading = useSelector(selectUsersLoading);
  const currentUser = useSelector(selectUser);
  const viewingAs = useSelector(selectViewingAs);
  const isAdmin = currentUser?.role === 'admin';
  const isTrainer = currentUser?.role === 'trainer';

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    trainerId: null,
  });
  const [newPassword, setNewPassword] = useState('');

  // Expanded user state
  const [expandedUser, setExpandedUser] = useState(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleAddUser = async () => {
    try {
      // Add username as name if name is not provided
      const userData = {
        ...formData,
        name: formData.username, // Use username as name
      };
      
      // If trainer is creating a user, auto-assign themselves as the trainer
      if (isTrainer && formData.role === 'user') {
        userData.trainerId = currentUser.id;
      }
      
      await dispatch(createUser(userData)).unwrap();
      setAddDialogOpen(false);
      setFormData({ username: '', password: '', role: 'user', trainerId: null });
      setSnackbar({ open: true, message: 'User created successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
    }
  };

  const handleResetPassword = async () => {
    try {
      await dispatch(
        resetUserPassword({ userId: selectedUser.id, newPassword })
      ).unwrap();
      setResetDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
      setSnackbar({ open: true, message: 'Password reset successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
    }
  };

  const handleDeleteUser = async () => {
    try {
      await dispatch(deleteUser(selectedUser.id)).unwrap();
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      setSnackbar({ open: true, message: 'User deleted successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
    }
  };

  const openResetDialog = (user) => {
    setSelectedUser(user);
    setResetDialogOpen(true);
  };

  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleViewAs = (user) => {
    dispatch(setViewingAs(user));
    setSnackbar({ 
      open: true, 
      message: `Now viewing as ${user.username}`, 
      severity: 'info' 
    });
    // Navigate to home page to see the user's view
    router.push('/');
  };

  const handleViewAsMyself = () => {
    dispatch(clearViewingAs());
    setSnackbar({ 
      open: true, 
      message: `Viewing as yourself (${currentUser?.username})`, 
      severity: 'success' 
    });
    router.push('/');
  };

  if (loading && users.length === 0) {
    return <Loader fullScreen message="Loading users..." />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Users Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isAdmin && viewingAs && (
            <Button
              variant="outlined"
              onClick={handleViewAsMyself}
              sx={{
                color: '#c4ff0d',
                borderColor: '#c4ff0d',
                '&:hover': {
                  borderColor: '#c4ff0d',
                  bgcolor: 'rgba(196, 255, 13, 0.1)',
                }
              }}
            >
              View As Myself
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add
          </Button>
        </Box>
      </Box>

      {/* Users Table - Simplified with Collapsible Details */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Username</strong></TableCell>
              <TableCell><strong>Last Login</strong></TableCell>
              <TableCell width={50}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <>
                <TableRow 
                  key={user.id} 
                  hover 
                  onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {user.username}
                      {user.role === 'admin' && (
                        <Chip label="Admin" color="secondary" size="small" />
                      )}
                      {user.role === 'trainer' && (
                        <Chip label="Trainer" sx={{ bgcolor: '#c4ff0d', color: '#000' }} size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {user.lastLogin 
                      ? formatDateTimeIST(user.lastLogin)
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isAdmin && user.role !== 'admin' && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAs(user);
                          }}
                          title="View As This User"
                          sx={{ 
                            color: '#c4ff0d',
                            '&:hover': {
                              bgcolor: 'rgba(196, 255, 13, 0.1)',
                            }
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton size="small">
                        {expandedUser === user.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow key={`${user.id}-details`}>
                  <TableCell colSpan={3} sx={{ py: 0, borderBottom: expandedUser === user.id ? undefined : 'none' }}>
                    <Collapse in={expandedUser === user.id} timeout="auto" unmountOnExit>
                      <Box sx={{ py: 2, px: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                        <Stack spacing={2}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Full Name
                            </Typography>
                            <Typography variant="body2">{user.name || 'N/A'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Created At
                            </Typography>
                            <Typography variant="body2">
                              {user.createdAt ? formatDateTimeIST(user.createdAt) : 'N/A'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Role
                            </Typography>
                            <Typography variant="body2">{user.role}</Typography>
                          </Box>
                          {user.trainerId && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Trainer
                              </Typography>
                              <Typography variant="body2">
                                {users.find(u => u.id === user.trainerId)?.username || 'N/A'}
                              </Typography>
                            </Box>
                          )}
                          {isAdmin && (
                            <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                              {user.role !== 'admin' && (
                                <IconButton
                                  sx={{ 
                                    color: '#c4ff0d',
                                    '&:hover': {
                                      bgcolor: 'rgba(196, 255, 13, 0.1)',
                                    }
                                  }}
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewAs(user);
                                  }}
                                  title="View As This User"
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              )}
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openResetDialog(user);
                                }}
                                title="Reset Password"
                              >
                                <LockResetIcon fontSize="small" />
                              </IconButton>
                              {/* Delete button disabled for all users */}
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {users.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">No users found</Typography>
        </Box>
      )}

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              fullWidth
              helperText="Minimum 6 characters"
            />
            <TextField
              select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              fullWidth
            >
              <MenuItem value="user">User</MenuItem>
              {isAdmin && <MenuItem value="trainer">Trainer</MenuItem>}
              {isAdmin && <MenuItem value="admin">Admin</MenuItem>}
            </TextField>
            {isTrainer && formData.role === 'user' && (
              <Alert severity="info" sx={{ mt: 1 }}>
                This user will be automatically assigned to you as their trainer.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddUser}
            variant="contained"
            disabled={!formData.username || !formData.password}
          >
            Add User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Resetting password for: <strong>{selectedUser?.username}</strong>
            </Typography>
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              fullWidth
              helperText="Minimum 6 characters"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleResetPassword}
            variant="contained"
            color="primary"
            disabled={!newPassword || newPassword.length < 6}
          >
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user <strong>{selectedUser?.username}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">
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

