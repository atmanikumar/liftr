'use client';

import { Box, Typography, ToggleButton, ToggleButtonGroup, Chip } from '@mui/material';
import { useState, useMemo, memo, useCallback } from 'react';
import Model from 'react-body-highlighter';

// Valid muscle names that the library accepts (from react-body-highlighter v2)
const VALID_LIBRARY_MUSCLES = [
  'trapezius', 'upper-back', 'lower-back', 'chest', 'biceps', 'triceps', 
  'forearm', 'back-deltoids', 'front-deltoids', 'abs', 'obliques', 
  'adductor', 'hamstring', 'quadriceps', 'abductors', 'calves', 'gluteal',
  'head', 'neck'
];

// Map our muscle names to the library's muscle names
const muscleToLibraryMapping = {
  // Chest
  'Chest': ['chest'],
  
  // Back
  'Back': ['trapezius', 'upper-back', 'lower-back'],
  'Upper Back': ['upper-back', 'trapezius'],
  'Lower Back': ['lower-back'],
  'Lats': ['upper-back'],
  
  // Shoulders/Deltoids
  'Shoulders': ['front-deltoids', 'back-deltoids'],
  'Deltoids': ['front-deltoids', 'back-deltoids'],
  'Delts': ['front-deltoids', 'back-deltoids'],
  
  // Arms
  'Biceps': ['biceps'],
  'Triceps': ['triceps'],
  'Forearms': ['forearm'],
  'Forearm': ['forearm'],
  
  // Core
  'Abs': ['abs'],
  'Core': ['abs', 'obliques'],
  'Obliques': ['obliques'],
  
  // Legs
  'Quads': ['quadriceps'],
  'Quadriceps': ['quadriceps'],
  'Hamstrings': ['hamstring'],
  'Hamstring': ['hamstring'],
  'Calves': ['calves'],
  'Glutes': ['gluteal'],
  'Gluteal': ['gluteal'],
  'Adductors': ['adductor'],
  'Adductor': ['adductor'],
  
  // Other
  'Trapezius': ['trapezius'],
  'Traps': ['trapezius'],
  'Neck': ['neck'],
  
  // Compound/Legacy mappings
  'Legs': ['quadriceps', 'hamstring', 'calves'],
  'Full Body': ['chest'], // Default fallback
};

// Reverse mapping for display: library muscle name -> our display name
const libraryToDisplayName = {
  'trapezius': 'Trapezius',
  'upper-back': 'Upper Back',
  'lower-back': 'Lower Back',
  'chest': 'Chest',
  'biceps': 'Biceps',
  'triceps': 'Triceps',
  'forearm': 'Forearms',
  'back-deltoids': 'Rear Delts',
  'front-deltoids': 'Front Delts',
  'abs': 'Abs',
  'obliques': 'Obliques',
  'adductor': 'Adductors',
  'hamstring': 'Hamstrings',
  'quadriceps': 'Quads',
  'abductors': 'Abductors',
  'calves': 'Calves',
  'gluteal': 'Glutes',
  'head': 'Head',
  'neck': 'Neck',
};

const MuscleBodyMap = memo(function MuscleBodyMap({ 
  muscleDistribution = [], 
  size = 'large', // 'small', 'medium', or 'large'
  showToggle = true,
  showLegend = true,
  showBreakdown = true,
  autoRotate = true, // Auto-rotate to back if back muscles are detected
  selectable = false, // Allow clicking to select muscles
  onMuscleSelect = null, // Callback when muscle is selected
  selectedMuscle = null, // Currently selected muscle
  useGradient = true, // Use gradient colors based on intensity
}) {
  const [clickedMuscle, setClickedMuscle] = useState(null);

  // Auto-detect if back muscles are present
  const hasBackMuscles = useMemo(() => {
    if (!autoRotate || !muscleDistribution) return false;
    
    const backMuscleKeywords = ['back', 'trapezius', 'traps', 'lats', 'hamstring', 'glutes', 'gluteal', 'posterior'];
    return muscleDistribution.some(m => 
      backMuscleKeywords.some(keyword => 
        m.muscle?.toLowerCase().includes(keyword)
      )
    );
  }, [muscleDistribution, autoRotate]);
  
  const [view, setView] = useState(hasBackMuscles ? 'posterior' : 'anterior');

  const validMuscleDistribution = useMemo(() => {
    if (!Array.isArray(muscleDistribution)) {
      return [];
    }
    return muscleDistribution.filter(m => 
      m && 
      typeof m === 'object' && 
      typeof m.muscle === 'string' && 
      typeof m.count === 'number' && 
      m.count > 0
    );
  }, [muscleDistribution]);

  // Calculate max count for normalization
  const maxCount = Math.max(...validMuscleDistribution.map(m => m.count), 1);

  // Convert muscle distribution to exercise data format for the library
  // Format: { name: 'Exercise Name', muscles: ['muscle1', 'muscle2'], frequency?: number }
  const exerciseData = useMemo(() => {
    if (!validMuscleDistribution || validMuscleDistribution.length === 0) {
      return [];
    }

    const exercises = [];
    
    validMuscleDistribution.forEach((muscle) => {
      const muscleName = muscle.muscle;
      
      // Find the library muscles for this muscle name
      let libraryMuscles = [];
      
      // Try exact match first
      if (muscleToLibraryMapping[muscleName]) {
        libraryMuscles = muscleToLibraryMapping[muscleName];
      } else {
        // Try partial matching
        const lowerName = muscleName.toLowerCase();
        for (const [key, value] of Object.entries(muscleToLibraryMapping)) {
          if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
            libraryMuscles = value;
            break;
          }
        }
      }
      
      // Filter to only valid library muscles
      const validMuscles = libraryMuscles.filter(m => VALID_LIBRARY_MUSCLES.includes(m));
      
      if (validMuscles.length > 0) {
        // If useGradient, use frequency to show intensity
        // Otherwise, just add 1 exercise per muscle
        if (useGradient) {
          // Add multiple exercises to increase the frequency/intensity shown
          for (let i = 0; i < muscle.count; i++) {
            exercises.push({
              name: `${muscleName} ${i + 1}`,
              muscles: validMuscles,
            });
          }
        } else {
          // Single exercise with full intensity
          exercises.push({
            name: muscleName,
            muscles: validMuscles,
            frequency: 5, // Max intensity
          });
        }
      }
    });
    
    return exercises;
  }, [validMuscleDistribution, useGradient]);

  // Handle muscle click callback from library
  const handleMuscleClick = useCallback((muscleStats) => {
    if (!muscleStats) return;
    
    const muscle = muscleStats.muscle;
    const displayName = libraryToDisplayName[muscle] || muscle;
    
    if (selectable && onMuscleSelect) {
      onMuscleSelect(displayName);
    } else {
      setClickedMuscle(displayName);
      setTimeout(() => setClickedMuscle(null), 3000);
    }
  }, [selectable, onMuscleSelect]);

  // Get size config for empty state too (to reserve height)
  const getEmptySizeConfig = () => {
    if (size === 'small') return { minHeight: 120 };
    if (size === 'medium') return { minHeight: 280 };
    return { minHeight: 420 };
  };

  // Don't render if no valid data - still reserve height to prevent CLS
  if (!validMuscleDistribution || validMuscleDistribution.length === 0) {
    const { minHeight: emptyMinHeight } = getEmptySizeConfig();
    return (
      <Box sx={{ 
        textAlign: 'center', 
        py: 4, 
        minHeight: emptyMinHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography variant="body2" color="text.secondary">
          No muscle data available
        </Typography>
      </Box>
    );
  }

  // Size configurations with reserved heights to prevent CLS
  // For large size, calculate based on viewport height to fit device screen
  const getSizeConfig = () => {
    if (size === 'small') {
      return { 
        maxWidth: '80px', 
        minHeight: 120, // Reserved height for small
        modelHeight: 100,
      };
    }
    if (size === 'medium') {
      return { 
        maxWidth: '200px', 
        minHeight: 280, // Reserved height for medium
        modelHeight: 250,
      };
    }
    // Large size - responsive to viewport height
    // Use CSS clamp for responsive sizing: min 280px, preferred 45vh, max 380px
    const isClient = typeof window !== 'undefined';
    const viewportHeight = isClient ? window.innerHeight : 800;
    // Calculate responsive height: 45% of viewport, but clamped between 280-380px
    const responsiveHeight = Math.min(380, Math.max(280, viewportHeight * 0.4));
    const responsiveWidth = Math.min(260, Math.max(200, viewportHeight * 0.35));
    
    return { 
      maxWidth: `${responsiveWidth}px`, 
      minHeight: responsiveHeight + 40, // Add padding for toggle/legend
      modelHeight: responsiveHeight,
    };
  };
  
  const { maxWidth, minHeight, modelHeight } = getSizeConfig();
  const toggleSize = size === 'small' ? 'small' : 'medium';

  // Generate highlight colors (5 levels from light to bright)
  const highlightedColors = [
    'rgba(196, 255, 13, 0.3)',  // Level 1 - lightest
    'rgba(196, 255, 13, 0.5)',  // Level 2
    'rgba(196, 255, 13, 0.65)', // Level 3
    'rgba(196, 255, 13, 0.8)',  // Level 4
    '#c4ff0d',                   // Level 5 - full brightness
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: size === 'small' ? 1 : 2, position: 'relative' }}>
      {/* Clicked Muscle Label - Top Right Corner */}
      {clickedMuscle && (
        <Chip
          label={clickedMuscle}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: '#c4ff0d',
            color: '#000',
            fontWeight: 'bold',
            fontSize: size === 'small' ? '0.75rem' : '0.875rem',
            px: 1.5,
            py: 0.5,
            height: 'auto',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            animation: 'fadeInRight 0.3s ease-in-out',
            '@keyframes fadeInRight': {
              '0%': { opacity: 0, transform: 'translateX(10px)' },
              '100%': { opacity: 1, transform: 'translateX(0)' },
            },
          }}
        />
      )}

      {/* View Toggle */}
      {showToggle && (
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(e, newView) => newView && setView(newView)}
          size={toggleSize}
          sx={{ mb: size === 'small' ? 1.5 : 3 }}
        >
          <ToggleButton 
            value="anterior" 
            sx={{ 
              px: size === 'small' ? 1.5 : 3,
              '&.Mui-selected': { 
                bgcolor: 'rgba(196, 255, 13, 0.2)',
                color: '#c4ff0d',
                '&:hover': {
                  bgcolor: 'rgba(196, 255, 13, 0.3)',
                }
              }
            }}
          >
            Front
          </ToggleButton>
          <ToggleButton 
            value="posterior"
            sx={{ 
              px: size === 'small' ? 1.5 : 3,
              '&.Mui-selected': { 
                bgcolor: 'rgba(196, 255, 13, 0.2)',
                color: '#c4ff0d',
                '&:hover': {
                  bgcolor: 'rgba(196, 255, 13, 0.3)',
                }
              }
            }}
          >
            Back
          </ToggleButton>
        </ToggleButtonGroup>
      )}

      {/* Body Model using react-body-highlighter - Reserved height to prevent CLS */}
      <Box 
        sx={{ 
          minHeight: modelHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {exerciseData.length > 0 ? (
          <Box 
            sx={{ 
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))',
              '& .rbh': {
                maxWidth: maxWidth,
                width: '100%',
              },
              '& .rbh polygon': {
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              },
            }}
          >
            <Model
              data={exerciseData}
              style={{ 
                width: '100%', 
                maxWidth: maxWidth,
                margin: '0 auto',
              }}
              bodyColor="#3f3f3f"
              highlightedColors={highlightedColors}
              type={view}
              onClick={handleMuscleClick}
            />
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Complete some workouts to see muscle distribution
            </Typography>
          </Box>
        )}
      </Box>

      {/* Legend - 5 Level Scale */}
      {showLegend && (
        <Box sx={{ mt: size === 'small' ? 1.5 : 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
            Intensity
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: size === 'small' ? 0.5 : 1, justifyContent: 'center' }}>
            {highlightedColors.map((color, index) => (
              <Box 
                key={index}
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <Box sx={{ 
                  width: size === 'small' ? 16 : 24, 
                  height: size === 'small' ? 16 : 24, 
                  bgcolor: color, 
                  borderRadius: 1, 
                  border: '1px solid rgba(196, 255, 13, 0.3)' 
                }} />
                {size !== 'small' && (
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                    {index + 1}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
          {size !== 'small' && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, px: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                Light
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                Intense
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Muscle List / Breakdown */}
      {showBreakdown && validMuscleDistribution.length > 0 && (
        <Box sx={{ mt: size === 'small' ? 2 : 3, width: '100%' }}>
          <Typography variant={size === 'small' ? 'caption' : 'subtitle2'} gutterBottom sx={{ textAlign: 'center', mb: size === 'small' ? 1 : 2 }}>
            {selectable ? 'Click to Select Muscle' : 'Workout Breakdown'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: size === 'small' ? 0.5 : 1 }}>
            {validMuscleDistribution
              .sort((a, b) => b.count - a.count)
              .map((muscle, idx) => (
                <Box 
                  key={idx}
                  onClick={() => selectable && onMuscleSelect && onMuscleSelect(muscle.muscle)}
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: size === 'small' ? 0.5 : 1,
                    borderRadius: 1,
                    backgroundColor: selectedMuscle === muscle.muscle 
                      ? 'rgba(196, 255, 13, 0.2)' 
                      : 'rgba(255, 255, 255, 0.02)',
                    border: selectedMuscle === muscle.muscle 
                      ? '2px solid #c4ff0d' 
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.3s ease',
                    cursor: selectable ? 'pointer' : 'default',
                  }}
                >
                  <Typography variant={size === 'small' ? 'caption' : 'body2'}>{muscle.muscle}</Typography>
                  {!selectable && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box 
                        sx={{ 
                          width: size === 'small' ? 40 : 60, 
                          height: size === 'small' ? 4 : 6, 
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <Box 
                          sx={{ 
                            width: `${(muscle.count / maxCount) * 100}%`, 
                            height: '100%', 
                            bgcolor: '#c4ff0d',
                            transition: 'width 0.3s ease',
                          }} 
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: size === 'small' ? 30 : 40, textAlign: 'right', fontSize: size === 'small' ? '0.65rem' : undefined }}>
                        {muscle.count} {size === 'small' ? '' : 'sets'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}
          </Box>
        </Box>
      )}
    </Box>
  );
});

export default MuscleBodyMap;
