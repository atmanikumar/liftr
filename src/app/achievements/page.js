'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';
import HomeIcon from '@mui/icons-material/Home';
import { useSelector } from 'react-redux';
import { selectUser } from '@/redux/slices/authSlice';
import Loader from '@/components/common/Loader';

export default function AchievementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSelector(selectUser);
  const sessionId = searchParams.get('session');
  
  const [improvements, setImprovements] = useState([]);
  const [decreases, setDecreases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/achievements?session=${sessionId}`);
        const data = await response.json();
        
        if (data.improvements) {
          setImprovements(data.improvements);
        }
        if (data.decreases) {
          setDecreases(data.decreases);
        }
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [sessionId]);

  if (loading) {
    return <Loader fullScreen message="Loading achievements..." />;
  }

  const hasImprovements = improvements.length > 0;
  const hasDecreases = decreases.length > 0;
  const hasAnyChanges = hasImprovements || hasDecreases;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Paper sx={{ maxWidth: 600, width: '100%', p: 4 }}>
        {/* Header */}
        {hasImprovements && (
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: '#c4ff0d', mb: 2 }} />
            <Typography variant="h4" gutterBottom sx={{ color: '#c4ff0d', fontWeight: 'bold' }}>
              🎉 Congratulations, {user?.name || user?.username}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You&apos;ve improved your strength today!
            </Typography>
          </Box>
        )}

        {hasDecreases && !hasImprovements && (
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <WarningIcon sx={{ fontSize: 80, color: '#ef4444', mb: 2 }} />
            <Typography variant="h4" gutterBottom sx={{ color: '#ef4444', fontWeight: 'bold' }}>
              Weight Decrease Detected
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You lifted less weight than last time. Keep pushing!
            </Typography>
          </Box>
        )}

        {!hasAnyChanges && (
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Great Job!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You maintained the same weights as last session.
            </Typography>
          </Box>
        )}

        {/* Improvements */}
        {hasImprovements && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUpIcon sx={{ color: '#c4ff0d' }} />
              Improvements 💪
            </Typography>
            <Stack spacing={2}>
              {improvements.map((imp, idx) => (
                <Card key={idx} sx={{ bgcolor: 'rgba(196, 255, 13, 0.1)', border: '2px solid #c4ff0d' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {imp.exercise}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <Chip 
                        label={`Previous: ${imp.previousWeight} ${imp.unit}`}
                        size="small"
                        sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }}
                      />
                      <TrendingUpIcon sx={{ color: '#c4ff0d' }} />
                      <Chip 
                        label={`New: ${imp.newWeight} ${imp.unit}`}
                        size="small"
                        sx={{ bgcolor: '#c4ff0d', color: '#000', fontWeight: 'bold' }}
                      />
                      <Chip 
                        label={`+${imp.improvement} ${imp.unit}`}
                        size="medium"
                        icon={<TrendingUpIcon />}
                        sx={{ 
                          ml: 'auto',
                          bgcolor: 'rgba(196, 255, 13, 0.3)', 
                          color: '#c4ff0d', 
                          fontWeight: 'bold', 
                          border: '2px solid #c4ff0d',
                          fontSize: '1rem',
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      You improved from <strong>{imp.previousWeight} {imp.unit}</strong> to <strong>{imp.newWeight} {imp.unit}</strong>
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        )}

        {/* Decreases */}
        {hasDecreases && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingDownIcon sx={{ color: '#ef4444' }} />
              Weight Decreases
            </Typography>
            <Stack spacing={2}>
              {decreases.map((dec, idx) => (
                <Card key={idx} sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {dec.exercise}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <Chip 
                        label={`Previous: ${dec.previousWeight} ${dec.unit}`}
                        size="small"
                        sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }}
                      />
                      <TrendingDownIcon sx={{ color: '#ef4444' }} />
                      <Chip 
                        label={`New: ${dec.newWeight} ${dec.unit}`}
                        size="small"
                        sx={{ bgcolor: '#ef4444', color: '#fff', fontWeight: 'bold' }}
                      />
                      <Chip 
                        label={`-${dec.decrease} ${dec.unit}`}
                        size="medium"
                        icon={<TrendingDownIcon />}
                        sx={{ 
                          ml: 'auto',
                          bgcolor: 'rgba(239, 68, 68, 0.3)', 
                          color: '#ef4444', 
                          fontWeight: 'bold', 
                          border: '2px solid #ef4444',
                          fontSize: '1rem',
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      You went back from <strong>{dec.previousWeight} {dec.unit}</strong> to <strong>{dec.newWeight} {dec.unit}</strong>. Don&apos;t worry, you&apos;ll get it next time!
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        )}

        {/* Actions */}
        <Stack spacing={2} sx={{ mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<HomeIcon />}
            onClick={() => router.push('/')}
            fullWidth
          >
            Go to Home
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => router.push('/progress')}
            fullWidth
            sx={{ 
              borderColor: '#c4ff0d',
              color: '#c4ff0d',
              '&:hover': {
                borderColor: '#c4ff0d',
                bgcolor: 'rgba(196, 255, 13, 0.1)',
              }
            }}
          >
            View All Progress
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

