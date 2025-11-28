'use client';

import { Box } from '@mui/material';

export default function DumbbellIcon({ size = 24, color = 'currentColor' }) {
  const scale = size / 24; // Base size is 24px
  
  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={size}
        height={size * 0.7}
        viewBox="0 0 36 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left Weight Plate */}
        <rect
          x="1"
          y="4"
          width="7"
          height="16"
          rx="2"
          fill={color}
          fillOpacity="0.9"
        />
        <circle
          cx="4.5"
          cy="12"
          r="2.5"
          fill="none"
          stroke={color}
          strokeWidth="1"
          opacity="0.4"
        />
        
        {/* Bar/Handle */}
        <rect
          x="8"
          y="9"
          width="20"
          height="6"
          rx="3"
          fill={color}
          fillOpacity="0.7"
        />
        {/* Grip texture */}
        <line x1="13" y1="10" x2="13" y2="14" stroke={color} strokeWidth="0.5" opacity="0.3" />
        <line x1="15" y1="10" x2="15" y2="14" stroke={color} strokeWidth="0.5" opacity="0.3" />
        <line x1="17" y1="10" x2="17" y2="14" stroke={color} strokeWidth="0.5" opacity="0.3" />
        <line x1="19" y1="10" x2="19" y2="14" stroke={color} strokeWidth="0.5" opacity="0.3" />
        <line x1="21" y1="10" x2="21" y2="14" stroke={color} strokeWidth="0.5" opacity="0.3" />
        <line x1="23" y1="10" x2="23" y2="14" stroke={color} strokeWidth="0.5" opacity="0.3" />
        
        {/* Right Weight Plate */}
        <rect
          x="28"
          y="4"
          width="7"
          height="16"
          rx="2"
          fill={color}
          fillOpacity="0.9"
        />
        <circle
          cx="31.5"
          cy="12"
          r="2.5"
          fill="none"
          stroke={color}
          strokeWidth="1"
          opacity="0.4"
        />
      </svg>
    </Box>
  );
}

