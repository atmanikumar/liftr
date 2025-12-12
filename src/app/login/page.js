'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
} from '@mui/material';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { login, clearError, selectAuth } from '@/redux/slices/authSlice';
import Loader from '@/components/common/Loader';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const router = useRouter();
  const { loading, error, isAuthenticated } = useSelector(selectAuth);

  useEffect(() => {
    // Clear any previous errors on mount
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    // Redirect to home if already authenticated
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      return;
    }

    const result = await dispatch(login({ username, password }));
    
    if (login.fulfilled.match(result)) {
      router.push('/');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #000000 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 4, boxShadow: 6 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Logo and Title */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <FlashOnIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" fontWeight="bold">
                Spartans
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Train like a warrior
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch(clearError())}>
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.05)',
                    '&:hover fieldset': {
                      borderColor: '#10b981',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#10b981',
                    },
                  },
                }}
                required
                autoFocus
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.05)',
                    '&:hover fieldset': {
                      borderColor: '#10b981',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#10b981',
                    },
                  },
                }}
                required
                disabled={loading}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || !username || !password}
                sx={{ 
                  py: 1.8,
                  bgcolor: '#10b981',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  borderRadius: 3,
                  textTransform: 'none',
                  boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: '#059669',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)',
                    transform: 'translateY(-2px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.3)',
                    boxShadow: 'none',
                  }
                }}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            {/* Footer */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
              Your fitness journey starts here
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

