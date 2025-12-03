'use client';

import { Box, Typography, CircularProgress } from '@mui/material';
import { keyframes } from '@mui/material/styles';

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

export default function Loader({ message = 'Loading...', fullScreen = false, size }) {
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
      <CircularProgress
        size={loaderSize}
        thickness={4}
        sx={{
          color: '#c4ff0d',
          animationDuration: '1.5s',
        }}
      />

      {message && (
        <Typography 
          variant={fullScreen ? "body1" : "body2"}
          sx={{ 
            color: '#c4ff0d',
            fontWeight: 500,
            textAlign: 'center',
            animation: `${pulse} 2s ease-in-out infinite`,
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
          background: '#000000',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
}
