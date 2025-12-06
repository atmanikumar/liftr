'use client';

import { Box, Typography, ToggleButton, ToggleButtonGroup, Chip } from '@mui/material';
import { useState, useMemo, memo } from 'react';
import Model from 'react-body-highlighter';

// Valid muscle names that the library accepts (from DEFAULT_MUSCLE_DATA)
const VALID_LIBRARY_MUSCLES = [
  'trapezius', 'upper-back', 'lower-back', 'chest', 'biceps', 'triceps', 
  'forearm', 'back-deltoids', 'front-deltoids', 'abs', 'obliques', 
  'adductor', 'hamstring', 'quadriceps', 'abductors', 'calves', 'gluteal',
  'head', 'neck', 'knees', 'left-soleus', 'right-soleus'
];

// Map our muscle names to the library's muscle names
const muscleMapping = {
  'Chest': 'chest',
  'Shoulders': ['front-deltoids', 'back-deltoids'],
  'Back': ['trapezius', 'upper-back', 'lower-back'],
  'Biceps': 'biceps',
  'Triceps': 'triceps',
  'Forearms': 'forearm',
  'Forearm': 'forearm',
  'Abs': 'abs',
  'Obliques': 'obliques',
  'Quads': 'quadriceps',
  'Quadriceps': 'quadriceps',
  'Hamstrings': 'hamstring',
  'Hamstring': 'hamstring',
  'Calves': 'calves',
  'Glutes': 'gluteal',
  'Gluteal': 'gluteal',
  'Lats': 'upper-back',
  'Traps': 'trapezius',
  'Trapezius': 'trapezius',
  'Lower Back': 'lower-back',
  'Adductors': 'adductor',
  'Adductor': 'adductor',
  'Legs': ['quadriceps', 'hamstring', 'calves'],
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
  useGradient = true, // Use 5-shade gradient (home page) vs direct max highlight (other pages)
}) {
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
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
  const [renderError, setRenderError] = useState(null);

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

  const exerciseData = useMemo(() => {
    if (!validMuscleDistribution || validMuscleDistribution.length === 0) {
      return [];
    }

    try {
      const exercises = [];
      
      validMuscleDistribution.forEach((muscle) => {
        const muscleName = muscle.muscle;
        let mappedMuscles = [];
        
        const exactMatch = Object.keys(muscleMapping).find(
          key => key.toLowerCase() === muscleName.toLowerCase()
        );
        
        if (exactMatch) {
          const mapped = muscleMapping[exactMatch];
          if (Array.isArray(mapped)) {
            mappedMuscles.push(...mapped);
          } else if (typeof mapped === 'string') {
            mappedMuscles.push(mapped);
          }
        } else {
          Object.keys(muscleMapping).forEach(key => {
            if (muscleName.toLowerCase().includes(key.toLowerCase())) {
              const mapped = muscleMapping[key];
              if (Array.isArray(mapped)) {
                mappedMuscles.push(...mapped);
              } else if (typeof mapped === 'string') {
                mappedMuscles.push(mapped);
              }
            }
          });
        }
        
        if (mappedMuscles.length === 0) {
          mappedMuscles.push(muscleName.toLowerCase().replace(/\s+/g, '-'));
        }
        
      const uniqueMuscles = [...new Set(mappedMuscles)]
        .filter(m => typeof m === 'string' && m.length > 0 && VALID_LIBRARY_MUSCLES.includes(m));
      
      // IMPORTANT: Only add exercises if we have valid muscles array
      if (Array.isArray(uniqueMuscles) && uniqueMuscles.length > 0 && muscle.count > 0) {
        // If useGradient is false, add only 1 exercise per muscle (no intensity)
        // If useGradient is true, add exercises based on count (for intensity shading)
        const countToAdd = useGradient ? muscle.count : 1;
        
        for (let i = 0; i < countToAdd; i++) {
          const exercise = {
            name: `${muscleName} Exercise ${i + 1}`,
            muscles: uniqueMuscles  // Must be a valid array of library-recognized muscles
          };
          
          // Double-check the exercise structure before adding
          if (exercise.name && Array.isArray(exercise.muscles) && exercise.muscles.length > 0) {
            exercises.push(exercise);
          }
        }
      }
      });
      
    const validExercises = exercises.filter(ex => 
      ex && 
      typeof ex === 'object' &&
      typeof ex.name === 'string' && 
      Array.isArray(ex.muscles) && 
      ex.muscles.length > 0 &&
      ex.muscles.every(m => typeof m === 'string' && VALID_LIBRARY_MUSCLES.includes(m))
    );
    
    return validExercises;
    } catch (error) {
      return [];
    }
  }, [validMuscleDistribution, useGradient]);

  const highlightedColors = useMemo(() => {
    if (!validMuscleDistribution || validMuscleDistribution.length === 0) {
      return ['#c4ff0d'];
    }

    const baseColor = { r: 196, g: 255, b: 13 }; // #c4ff0d
    
    // If useGradient is false, use full bright color for all muscles
    if (!useGradient) {
      return [`rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 1.0)`]; // Full brightness
    }

    // For gradient mode: 5 fixed shades from lightest to darkest
    // Level 1 (lightest): 20% opacity
    // Level 2: 40% opacity
    // Level 3: 60% opacity
    // Level 4: 80% opacity
    // Level 5 (darkest): 100% opacity (pure #c4ff0d)
    const shades = [
      `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.2)`,  // Level 1 - lightest
      `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.4)`,  // Level 2
      `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.6)`,  // Level 3
      `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.8)`,  // Level 4
      `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 1.0)`,  // Level 5 - darkest (full color)
    ];
    
    // Map each muscle count to its corresponding shade (1 workout = level 1, 2 workouts = level 2, etc.)
    const colors = [];
    const maxSets = Math.max(...validMuscleDistribution.map(m => m.count), 1);
    
    for (let i = 1; i <= maxSets; i++) {
      // Map count to shade level (1-5), capping at 5
      const shadeIndex = Math.min(i, 5) - 1;
      colors.push(shades[shadeIndex]);
    }
    
    return colors.length > 0 ? colors : [shades[4]]; // Default to darkest shade
  }, [validMuscleDistribution, useGradient]);

  // Don't render if no valid data
  if (!validMuscleDistribution || validMuscleDistribution.length === 0) {
          return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No muscle data available
        </Typography>
                  </Box>
    );
  }

  // Make large size responsive to device height
  const getMaxWidth = () => {
    if (size === 'small') return '60px';
    if (size === 'medium') return '250px';
    // For large size, make it responsive to viewport height
    if (typeof window !== 'undefined') {
      const vh = window.innerHeight;
      return `${Math.min(400, vh * 0.5)}px`; // Max 400px or 50% of viewport height
    }
    return '400px';
  };
  
  const maxWidth = getMaxWidth();
  const toggleSize = size === 'small' ? 'small' : 'medium';
  
  // Handle muscle click for selection mode
  const handleMuscleClick = (muscleData) => {
    if (selectable && onMuscleSelect && muscleData?.muscle) {
      onMuscleSelect(muscleData.muscle);
    }
  };

  // Handle muscle click on body map to show name
  const handleBodyMapClick = (e) => {
    // Get the clicked polygon element
    const polygon = e.target.closest('polygon');
    if (!polygon) return;

    // Try to find which muscle was clicked based on the polygon's fill color
    const fill = polygon.getAttribute('fill');
    if (!fill || fill === '#B6BDC3') return; // Ignore body color clicks

    // Get the muscle ID from the polygon's data attributes or class
    const polygonId = polygon.getAttribute('id') || polygon.getAttribute('data-id');
    
    // Map polygon IDs to our muscle names
    let muscleName = null;
    
    if (polygonId) {
      // Try to match the polygon ID with our muscle mapping
      for (const [key, value] of Object.entries(muscleMapping)) {
        const mappedMuscles = Array.isArray(value) ? value : [value];
        if (mappedMuscles.some(m => polygonId.toLowerCase().includes(m))) {
          muscleName = key;
          break;
        }
      }
    }
    
    // If we couldn't determine from polygon ID, check if the color matches any of our muscles
    if (!muscleName && validMuscleDistribution.length > 0) {
      // Find muscle based on color intensity - check if fill color is in our highlighted colors
      const isHighlighted = highlightedColors.some(color => fill.includes(color.split(',')[0]));
      if (isHighlighted) {
        // Use the most prominent muscle (highest count)
        const sortedMuscles = [...validMuscleDistribution].sort((a, b) => b.count - a.count);
        muscleName = sortedMuscles[0].muscle;
      }
    }
    
    if (muscleName) {
      setClickedMuscle(muscleName);
      
      // Clear after 3 seconds
      setTimeout(() => setClickedMuscle(null), 3000);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: size === 'small' ? 1 : 2, position: 'relative' }}>
      {/* Clicked Muscle Label */}
      {clickedMuscle && (
        <Chip
          label={clickedMuscle}
          sx={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: '#c4ff0d',
            color: '#000',
            fontWeight: 'bold',
            fontSize: '1rem',
            px: 2,
            py: 1,
            height: 'auto',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease-in-out',
            '@keyframes fadeIn': {
              '0%': { opacity: 0, transform: 'translateX(-50%) translateY(-10px)' },
              '100%': { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
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

      {/* Body Model using react-body-highlighter */}
      {exerciseData && Array.isArray(exerciseData) && exerciseData.length > 0 ? (
        <Box 
          onClick={handleBodyMapClick}
          sx={{ 
            '& .rbh': {
              maxWidth: maxWidth,
              width: '70%',
            },
            '& .rbh polygon': {
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            },
          }}
        >
          {(() => {
            try {
              return (
          <Model
            data={exerciseData}
            bodyColor="#B6BDC3"
                  style={{
              width: '100%', 
              maxWidth: maxWidth,
              margin: '0 auto',
              textAlign: 'center',
            }}
            highlightedColors={highlightedColors}
            type={view}
          />
              );
            } catch (error) {
              return (
                <Typography variant="body2" color="error" sx={{ textAlign: 'center' }}>
                  Error displaying muscle map
                </Typography>
              );
            }
          })()}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Complete some workouts to see muscle distribution
          </Typography>
        </Box>
      )}

      {/* Legend - 5 Level Scale */}
      {showLegend && (
        <Box sx={{ mt: size === 'small' ? 1.5 : 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
            Intensity
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: size === 'small' ? 0.5 : 1, justifyContent: 'center' }}>
            {/* Show all 5 levels */}
            {[
              { level: 1, color: 'rgba(196, 255, 13, 0.2)' },
              { level: 2, color: 'rgba(196, 255, 13, 0.4)' },
              { level: 3, color: 'rgba(196, 255, 13, 0.6)' },
              { level: 4, color: 'rgba(196, 255, 13, 0.8)' },
              { level: 5, color: 'rgba(196, 255, 13, 1.0)' },
            ].map(({ level, color }) => (
              <Box 
                key={level}
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
                    {level}
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

      {/* Muscle List */}
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
                  onClick={() => selectable && handleMuscleClick(muscle)}
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
                  onMouseEnter={() => setHoveredMuscle(muscle.muscle)}
                  onMouseLeave={() => setHoveredMuscle(null)}
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
