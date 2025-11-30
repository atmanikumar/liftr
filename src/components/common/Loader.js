'use client';

import { Box, Typography } from '@mui/material';
import Image from 'next/image';
import { keyframes } from '@mui/material/styles';

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

export default function Loader({ message = 'Loading...', fullScreen = false }) {
  const size = fullScreen ? 120 : 80;
  
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: 4,
      }}
    >
      <Image 
        src="/loader.gif" 
        alt="Loading..." 
        width={size} 
        height={size}
        unoptimized
        priority
      />

      {message && (
        <Typography 
          variant={fullScreen ? "h6" : "body1"}
          sx={{ 
            color: '#c4ff0d',
            fontWeight: 500,
            textAlign: 'center',
            animation: `${pulse} 2s ease-in-out infinite`
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
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
}
