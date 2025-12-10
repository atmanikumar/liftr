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
  IconButton,
  Button,
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import Loader from '@/components/common/Loader';
import MuscleBodyMap from '@/components/common/MuscleBodyMap';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

export default function RecentWorkoutsPage() {
  const router = useRouter();
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
            <Card 
              key={idx}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '1px solid rgba(196, 255, 13, 0.3)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: (theme) => `0 6px 20px ${theme.palette.primary.main}40`,
                },
              }}
              onClick={() => router.push(`/workout-summary/${encodeURIComponent(workout.sessionId)}`)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                        {workout.programName}
                      </Typography>
                      <Box sx={{ ml: 2, textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(workout.completedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {new Date(workout.completedAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                      {workout.totalCalories > 0 && (
                        <Chip
                          icon={<LocalFireDepartmentIcon />}
                          label={`${Math.round(workout.totalCalories)} cal`}
                          size="small"
                          sx={{ 
                            borderColor: 'rgba(196, 255, 13, 0.5)',
                            color: '#c4ff0d',
                            bgcolor: 'rgba(196, 255, 13, 0.1)',
                          }}
                          variant="outlined"
                        />
                      )}
                      {workout.totalSets > 0 && (
                        <Chip
                          label={`${workout.totalSets} sets`}
                          size="small"
                          sx={{ 
                            borderColor: 'rgba(196, 255, 13, 0.5)',
                            color: '#c4ff0d',
                            bgcolor: 'rgba(196, 255, 13, 0.1)',
                          }}
                          variant="outlined"
                        />
                      )}
                      <Chip
                        icon={<FitnessCenterIcon />}
                        label={`${workout.workouts.length} workouts`}
                        size="small"
                        sx={{ 
                          borderColor: 'rgba(196, 255, 13, 0.5)',
                          color: '#c4ff0d',
                          bgcolor: 'rgba(196, 255, 13, 0.1)',
                        }}
                        variant="outlined"
                      />
                    </Box>

                    {/* Show exercise names */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {workout.workouts.map(w => w.workoutName).join(' • ')}
                    </Typography>
                  </Box>
                  
                  {workout.muscleDistribution && workout.muscleDistribution.length > 0 && (
                    <Box 
                      sx={{ 
                        width: '60px',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <MuscleBodyMap 
                        muscleDistribution={workout.muscleDistribution}
                        size="small"
                        showToggle={false}
                        showBreakdown={false}
                        showLegend={false}
                        autoRotate={true}
                        useGradient={false}
                      />
                    </Box>
                  )}
                </Box>

                {/* Expandable Workout Details */}
                <Stack spacing={1}>
                  {workout.workouts.map((exercise, exIdx) => {
                    const isExpanded = expandedWorkout === `${idx}-${exIdx}`;
                    return (
                      <Box key={exIdx}>
                        <Box
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedWorkout(isExpanded ? null : `${idx}-${exIdx}`);
                          }}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1.5,
                            bgcolor: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.08)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {exercise.workoutName}
                            </Typography>
                            {exercise.muscleFocus && (
                              <Chip 
                                label={exercise.muscleFocus} 
                                size="small" 
                                sx={{ width: 'fit-content', height: 20 }}
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={`${exercise.sets.length} sets`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <ExpandMoreIcon 
                              sx={{ 
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                              }} 
                            />
                          </Box>
                        </Box>
                        
                        <Collapse in={isExpanded}>
                          <Box sx={{ pl: 2, pr: 2, pt: 1, pb: 1 }}>
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
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  })}
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
