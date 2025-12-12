'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Grid,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CelebrationIcon from '@mui/icons-material/Celebration';
import Loader from '@/components/common/Loader';
import { CardSkeleton } from '@/components/common/SkeletonLoader';

export default function AchievementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        if (!sessionId) {
          // Redirect to home if no session ID
          router.push('/');
          return;
        }

        const response = await fetch(`/api/achievements/today`);
        const data = await response.json();
        
        if (data.achievements) {
          setAchievements(data.achievements);
        }
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [sessionId, router]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>Workout Achievements</Typography>
        <CardSkeleton count={3} />
      </Box>
    );
  }

  if (achievements.length === 0) {
    // No achievements, redirect to home
    router.push('/');
    return null;
  }

  return (
    <Box>
      {/* Hero Section */}
      <Paper sx={{ 
        p: 4, 
        mb: 3, 
        bgcolor: 'rgba(196, 255, 13, 0.08)', 
        border: '2px solid rgba(196, 255, 13, 0.3)',
        textAlign: 'center'
      }}>
        <CelebrationIcon sx={{ fontSize: 80, color: '#10b981', mb: 2 }} />
        <Typography variant="h3" sx={{ color: '#10b981', fontWeight: 'bold', mb: 2 }}>
          Congratulations! 🎉
        </Typography>
        <Typography variant="h6" color="text.secondary">
          You achieved {achievements.length} personal record{achievements.length > 1 ? 's' : ''} today!
        </Typography>
      </Paper>

      {/* Achievements List */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        {achievements.map((achievement, idx) => {
          const achievementType = achievement.achievementType || 'weight';
          
          return (
            <Card 
              key={idx} 
              sx={{ 
                bgcolor: '#000', 
                border: '2px solid #10b981',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: '0 8px 24px rgba(196, 255, 13, 0.3)',
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CheckCircleIcon sx={{ fontSize: 40, color: '#10b981' }} />
                  <Typography variant="h5" gutterBottom sx={{ color: '#fff', fontWeight: 'bold', mb: 0 }}>
                    {achievement.exerciseName}
                  </Typography>
                </Box>
                
                {achievementType === 'weight' && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      <Typography variant="h6" sx={{ color: '#fff' }}>
                        {achievement.previousValue} {achievement.unit}
                      </Typography>
                      <TrendingUpIcon sx={{ color: '#10b981', fontSize: 24 }} />
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#fff' }}>
                        {achievement.newValue} {achievement.unit}
                      </Typography>
                    </Box>
                    <Chip 
                      label={`+${achievement.improvement} ${achievement.unit} increase`}
                      size="medium"
                      icon={<TrendingUpIcon />}
                      sx={{ 
                        bgcolor: '#10b981', 
                        color: '#000', 
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                      }}
                    />
                  </Box>
                )}
                
                {achievementType === 'reps' && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      <Typography variant="h6" sx={{ color: '#fff' }}>
                        {achievement.previousValue} reps
                      </Typography>
                      <TrendingUpIcon sx={{ color: '#10b981', fontSize: 24 }} />
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#fff' }}>
                        {achievement.newValue} reps
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        @ {achievement.unit}
                      </Typography>
                    </Box>
                    <Chip 
                      label={`+${achievement.improvement} more reps`}
                      size="medium"
                      icon={<TrendingUpIcon />}
                      sx={{ 
                        bgcolor: '#10b981', 
                        color: '#000', 
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                      }}
                    />
                  </Box>
                )}
                
                {achievementType === 'rir' && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      <Typography variant="h6" sx={{ color: '#fff' }}>
                        RIR {achievement.previousValue}
                      </Typography>
                      <TrendingDownIcon sx={{ color: '#10b981', fontSize: 24 }} />
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#fff' }}>
                        RIR {achievement.newValue}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        @ {achievement.unit}
                      </Typography>
                    </Box>
                    <Chip 
                      label={`-${achievement.improvement} RIR (Better endurance)`}
                      size="medium"
                      icon={<TrendingDownIcon />}
                      sx={{ 
                        bgcolor: '#10b981', 
                        color: '#000', 
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          onClick={() => router.push('/progress')}
          sx={{
            borderColor: '#10b981',
            color: '#10b981',
            '&:hover': {
              borderColor: '#10b981',
              bgcolor: 'rgba(196, 255, 13, 0.1)',
            }
          }}
        >
          View All Progress
        </Button>
        <Button
          variant="contained"
          onClick={() => router.push('/')}
          sx={{
            bgcolor: '#10b981',
            color: '#000',
            '&:hover': {
              bgcolor: '#b0e00b',
            }
          }}
        >
          Back to Home
        </Button>
      </Box>
    </Box>
  );
}

