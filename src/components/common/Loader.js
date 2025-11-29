'use client';

import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';

// Dumbbell rotation animation - smoother with more frames
const rotateDumbbell = keyframes`
  0% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(90deg);
  }
  50% {
    transform: rotate(180deg);
  }
  75% {
    transform: rotate(270deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

// Pulse animation for glow
const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.7;
  }
`;

// Shine effect
const shine = keyframes`
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
`;

// Custom CSS Dumbbell Component
function CssDumbbell({ size = 60 }) {
  const scale = size / 60; // Base size is 60px
  
  return (
    <Box
      sx={{
      position: 'relative',
      width: size * 1.5,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: `${rotateDumbbell} 3s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
      willChange: 'transform',
      }}
    >
      {/* Left Weight Plate - More realistic */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          width: size * 0.38,
          height: size * 0.8,
          background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 50%, #0a0e14 100%)',
          borderRadius: '10px',
          boxShadow: `
            inset 0 3px 6px rgba(255, 255, 255, 0.15),
            inset 0 -3px 6px rgba(0, 0, 0, 0.6),
            0 6px 16px rgba(34, 211, 238, 0.4),
            0 0 24px rgba(132, 204, 22, 0.25),
            0 2px 4px rgba(0, 0, 0, 0.8)
          `,
          border: '2.5px solid rgba(34, 211, 238, 0.25)',
          zIndex: 2,
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '50%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
            animation: `${shine} 2s ease-in-out infinite`,
          },
        }}
      >
        {/* Inner circle detail */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '50%',
            height: '50%',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          }}
        />
      </Box>

      {/* Bar/Handle - More metallic, FULL WIDTH */}
      <Box
        sx={{
          position: 'absolute',
          left: '0',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '100%',
          height: size * 0.28,
          background: 'linear-gradient(180deg, #a8b4c4 0%, #7d8694 35%, #5a6270 65%, #3d4552 100%)',
          borderRadius: '14px',
          boxShadow: `
            inset 0 3px 6px rgba(255, 255, 255, 0.5),
            inset 0 -3px 6px rgba(0, 0, 0, 0.5),
            0 3px 10px rgba(0, 0, 0, 0.4)
          `,
          border: '1.5px solid rgba(160, 174, 192, 0.4)',
          zIndex: 1,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '25%',
            left: '8%',
            right: '8%',
            height: '3px',
            background: 'rgba(255, 255, 255, 0.6)',
            borderRadius: '2px',
            boxShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '25%',
            left: '8%',
            right: '8%',
            height: '2px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '1px',
          },
        }}
      >
        {/* Knurling/Grip texture */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '55%',
            height: '75%',
            background: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 1.5px,
              rgba(0, 0, 0, 0.15) 1.5px,
              rgba(0, 0, 0, 0.15) 2.5px
            )`,
            borderRadius: '4px',
          }}
        />
      </Box>

      {/* Right Weight Plate - More realistic */}
      <Box
        sx={{
          position: 'absolute',
          right: 0,
          width: size * 0.38,
          height: size * 0.8,
          background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 50%, #0a0e14 100%)',
          borderRadius: '10px',
          boxShadow: `
            inset 0 3px 6px rgba(255, 255, 255, 0.15),
            inset 0 -3px 6px rgba(0, 0, 0, 0.6),
            0 6px 16px rgba(34, 211, 238, 0.4),
            0 0 24px rgba(132, 204, 22, 0.25),
            0 2px 4px rgba(0, 0, 0, 0.8)
          `,
          border: '2.5px solid rgba(34, 211, 238, 0.25)',
          zIndex: 2,
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '50%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
            animation: `${shine} 2s ease-in-out infinite`,
            animationDelay: '0.5s',
          },
        }}
      >
        {/* Weight plate hole */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '45%',
            height: '45%',
            borderRadius: '50%',
            border: '2.5px solid rgba(255, 255, 255, 0.25)',
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.5) 0%, rgba(255, 255, 255, 0.05) 70%)',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)',
          }}
        />
        {/* Weight ridges */}
        <Box
          sx={{
            position: 'absolute',
            top: '15%',
            left: '20%',
            right: '20%',
            height: '2px',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '15%',
            left: '20%',
            right: '20%',
            height: '2px',
            background: 'rgba(0, 0, 0, 0.4)',
          }}
        />
      </Box>
    </Box>
  );
}

export default function Loader({ message = 'Loading...', fullScreen = false }) {
  const size = fullScreen ? 80 : 60;
  
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: 4,
      }}
    >
      {/* Rotating Dumbbell with Glow */}
      <Box
        sx={{
          position: 'relative',
          width: size * 1.5,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer glow ring - Cyan */}
        <Box
          sx={{
            position: 'absolute',
            width: size * 2,
            height: size * 2,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.5) 0%, rgba(6, 182, 212, 0.3) 40%, transparent 70%)',
            animation: `${pulse} 2.5s ease-in-out infinite`,
          }}
        />
        
        {/* Secondary glow - Electric Lime */}
        <Box
          sx={{
            position: 'absolute',
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(132, 204, 22, 0.4) 0%, transparent 60%)',
            animation: `${pulse} 2.5s ease-in-out infinite`,
            animationDelay: '0.5s',
          }}
        />
        
        {/* Custom CSS Dumbbell */}
        <CssDumbbell size={size} />
      </Box>

    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          zIndex: 9999,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
}
