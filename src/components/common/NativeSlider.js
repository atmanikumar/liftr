/**
 * Native-style Slider Component
 * Provides iOS-native feel with haptic feedback
 */

import { Box, Typography, Stack } from '@mui/material';
import { useState, useRef, useCallback, useEffect } from 'react';
import { hapticSelection, hapticLight } from '@/lib/nativeFeatures';

export default function NativeSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  unit = '',
  marks = [],
  color = '#c4ff0d',
  disabled = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const sliderRef = useRef(null);
  const lastHapticValue = useRef(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const calculateValue = useCallback((clientX) => {
    if (!sliderRef.current) return value;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const range = max - min;
    const rawValue = min + (percentage * range);
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.max(min, Math.min(max, steppedValue));
  }, [min, max, step, value]);

  const handleStart = useCallback((e) => {
    if (disabled) return;
    
    setIsDragging(true);
    hapticLight();
    
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const newValue = calculateValue(clientX);
    setTempValue(newValue);
    lastHapticValue.current = newValue;
  }, [disabled, calculateValue]);

  const handleMove = useCallback((e) => {
    if (!isDragging || disabled) return;

    e.preventDefault();
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const newValue = calculateValue(clientX);
    
    setTempValue(newValue);
    
    // Haptic feedback on value change
    if (Math.abs(newValue - lastHapticValue.current) >= step) {
      hapticSelection();
      lastHapticValue.current = newValue;
    }
  }, [isDragging, disabled, calculateValue, step]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    hapticLight();
    
    if (onChange && tempValue !== value) {
      onChange(tempValue);
    }
  }, [isDragging, tempValue, value, onChange]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove);
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  const percentage = ((tempValue - min) / (max - min)) * 100;

  return (
    <Box sx={{ width: '100%', opacity: disabled ? 0.5 : 1 }}>
      {label && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {label}
          </Typography>
          <Typography variant="body2" fontWeight="bold" sx={{ color }}>
            {tempValue} {unit}
          </Typography>
        </Stack>
      )}

      <Box sx={{ position: 'relative', py: 1.5 }}>
        {/* Track */}
        <Box
          ref={sliderRef}
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          sx={{
            position: 'relative',
            height: 8,
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
            cursor: disabled ? 'not-allowed' : 'pointer',
            touchAction: 'none',
          }}
        >
          {/* Fill */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${percentage}%`,
              bgcolor: color,
              borderRadius: 4,
              transition: isDragging ? 'none' : 'width 0.1s ease',
            }}
          />

          {/* Thumb */}
          <Box
            sx={{
              position: 'absolute',
              left: `${percentage}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: isDragging ? 32 : 28,
              height: isDragging ? 32 : 28,
              bgcolor: '#fff',
              borderRadius: '50%',
              boxShadow: isDragging 
                ? `0 4px 12px ${color}80, 0 0 0 8px ${color}20`
                : '0 2px 8px rgba(0, 0, 0, 0.3)',
              transition: isDragging ? 'none' : 'all 0.2s ease',
              border: `3px solid ${color}`,
              cursor: disabled ? 'not-allowed' : 'grab',
              '&:active': {
                cursor: disabled ? 'not-allowed' : 'grabbing',
              },
            }}
          />
        </Box>

        {/* Marks */}
        {marks.length > 0 && (
          <Box sx={{ position: 'relative', mt: 1 }}>
            {marks.map((mark, index) => {
              const markPercentage = ((mark.value - min) / (max - min)) * 100;
              return (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    left: `${markPercentage}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 10 }}>
                    {mark.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}

