'use client';

import { Box, Typography, CircularProgress } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { memo } from 'react';

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

const smoothFadeIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

const smoothSpin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const Loader = memo(function Loader({ message = 'Loading...', fullScreen = false, size }) {
  const loaderSize = size || (fullScreen ? 60 : 40);
  
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: 3,
      }}
    >
      {/* Themed Circular Progress */}
      <Box
        sx={{
          animation: `${smoothFadeIn} 0.4s ease-out`,
        }}
      >
        <CircularProgress
          size={loaderSize}
          thickness={3.5}
          sx={{
            color: '#c4ff0d',
            animation: `${smoothSpin} 1.2s linear infinite`,
            filter: 'drop-shadow(0 0 8px rgba(196, 255, 13, 0.4))',
          }}
        />
      </Box>

      {message && (
        <Typography 
          variant={fullScreen ? "body1" : "body2"}
          sx={{ 
            color: '#c4ff0d',
            fontWeight: 500,
            textAlign: 'center',
            animation: `${pulse} 2s ease-in-out infinite, ${smoothFadeIn} 0.5s ease-out`,
            mt: 1,
          }}
        >
          {message}
        </Typography>
      )}
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
          background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)',
          zIndex: 9999,
          backdropFilter: 'blur(12px)',
          animation: `${smoothFadeIn} 0.3s ease-out`,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
});

export default Loader;
