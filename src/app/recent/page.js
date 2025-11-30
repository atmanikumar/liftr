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
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import Loader from '@/components/common/Loader';

export default function RecentWorkoutsPage() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchDate, setSearchDate] = useState('');
  const [expandedWorkout, setExpandedWorkout] = useState(null);

  useEffect(() => {
    fetchWorkouts();
  }, [page, searchDate]);

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
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

  if (loading && workouts.length === 0) {
    return <Loader fullScreen />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Recent Workouts</Typography>
        
        <TextField
          type="date"
          label="Search by Date"
          value={searchDate}
          onChange={handleSearchDateChange}
          size="small"
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CalendarTodayIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />
      </Box>

      {searchDate && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`Showing workouts for: ${new Date(searchDate).toLocaleDateString()}`}
            onDelete={handleClearSearch}
            color="primary"
          />
        </Box>
      )}

      {workouts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FitnessCenterIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No workouts found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchDate ? 'Try selecting a different date' : 'Start working out to see your history here!'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {workouts.map((workout, idx) => (
            <Card key={idx}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="h6">{workout.programName}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip
                        icon={<CalendarTodayIcon />}
                        label={new Date(workout.date).toLocaleDateString()}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${workout.workouts.length} exercises`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Workout Details */}
                <Stack spacing={1}>
                  {workout.workouts.map((exercise, exIdx) => (
                    <Accordion
                      key={exIdx}
                      sx={{ 
                        bgcolor: 'background.default',
                        '&:before': { display: 'none' },
                        boxShadow: 'none',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      expanded={expandedWorkout === `${idx}-${exIdx}`}
                      onChange={() => setExpandedWorkout(
                        expandedWorkout === `${idx}-${exIdx}` ? null : `${idx}-${exIdx}`
                      )}
                    >
                      <AccordionSummary 
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.05)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2, gap: 2 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {exercise.workoutName}
                            </Typography>
                            {exercise.muscleFocus && (
                              <Chip 
                                label={exercise.muscleFocus} 
                                size="small" 
                                sx={{ width: 'fit-content' }}
                              />
                            )}
                          </Box>
                          <Chip
                            label={`${exercise.sets.length} sets`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 2 }}>
                        <Stack spacing={1}>
                          {exercise.sets.map((set, setIdx) => (
                            <Box
                              key={setIdx}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 1.5,
                                bgcolor: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 2,
                                gap: 2,
                              }}
                            >
                              {/* Set Number */}
                              <Box sx={{ minWidth: '40px' }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Set
                                </Typography>
                                <Typography variant="h6" fontWeight="bold">
                                  {set.setNumber}
                                </Typography>
                              </Box>

                              {/* Weight with change indicator */}
                              <Box sx={{ flex: 1, minWidth: '120px' }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Weight
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                  <Typography variant="body1" fontWeight="bold">
                                    {typeof set.weight === 'number' ? set.weight : set.weight || 0} {set.unit || 'lbs'}
                                  </Typography>
                                  {set.weightChange && set.weightChange !== 0 && (
                                    <Chip
                                      label={`${set.weightChange > 0 ? '+' : ''}${set.weightChange}`}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold',
                                        bgcolor: set.weightChange > 0 ? '#c4ff0d' : '#ef4444',
                                        color: set.weightChange > 0 ? '#000000' : '#ffffff',
                                        border: 'none',
                                        ml: 0.5
                                      }}
                                    />
                                  )}
                                </Box>
                              </Box>

                              {/* Reps */}
                              <Box sx={{ minWidth: '60px' }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Reps
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                  {typeof set.reps === 'number' ? set.reps : set.reps || 0}
                                </Typography>
                              </Box>

                              {/* RIR */}
                              <Box sx={{ minWidth: '50px' }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  RIR
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                  {typeof set.rir === 'number' ? set.rir : set.rir || 0}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}
