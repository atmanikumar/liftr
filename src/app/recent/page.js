'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  TextField,
  Pagination,
  Chip,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TimelineIcon from '@mui/icons-material/Timeline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useRouter } from 'next/navigation';
import { ListItemSkeleton } from '@/components/common/SkeletonLoader';
import PullToRefresh from '@/components/common/PullToRefresh';
import { hapticSuccess } from '@/lib/nativeFeatures';

export default function RecentWorkoutsPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    fetchWorkouts();
  }, [page, searchDate]);

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20', // Increased to 20 since cards are simpler now
      });
      
      if (searchDate) {
        params.append('date', searchDate);
      }

      const response = await fetch(`/api/recent-workouts?${params}`);
      const data = await response.json();
      
      if (data.workouts) {
        setWorkouts(data.workouts);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchDateChange = (e) => {
    setSearchDate(e.target.value);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchDate('');
    setPage(1);
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    await fetchWorkouts();
    hapticSuccess();
  };

  if (loading && workouts.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>Recent Workouts</Typography>
        <ListItemSkeleton count={8} />
      </Box>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Recent Workouts</Typography>
        
        <TextField
          type="text"
          label="Search by Date"
          placeholder="e.g., 17, April, 2025, Nov 30..."
          value={searchDate}
          onChange={handleSearchDateChange}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchDate && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
      </Box>

      {searchDate && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`Searching: "${searchDate}"`}
            onDelete={handleClearSearch}
            color="primary"
          />
        </Box>
      )}

      {workouts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <TimelineIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No workouts found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchDate ? 'Try selecting a different date' : 'Start working out to see your history here!'}
          </Typography>
        </Paper>
      ) : (
        <>
          <Stack spacing={2}>
            {workouts.map((workout, idx) => (
              <Card 
                key={idx}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                  },
                }}
                onClick={() => router.push(`/workout-summary/${encodeURIComponent(workout.sessionId)}`)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ mb: 0.5 }}>
                        {workout.programName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(workout.completedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        {' at '}
                        {new Date(workout.completedAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </Typography>
                    </Box>
                    
                    <TimelineIcon sx={{ color: '#10b981', fontSize: 32 }} />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={(e, value) => setPage(value)}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}
    </Box>
    </PullToRefresh>
  );
}
