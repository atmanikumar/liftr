import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff6b35', // Orange (like the bars in the image)
      light: '#ff8c5a',
      dark: '#e55a2b',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#22d3ee', // Cyan
      light: '#67e8f9',
      dark: '#06b6d4',
      contrastText: '#000000',
    },
    success: {
      main: '#10b981', // Emerald green - darker, better contrast with black
      light: '#34d399',
      dark: '#059669',
    },
    warning: {
      main: '#ff6b35', // Orange
      light: '#ff8c5a',
      dark: '#e55a2b',
    },
    error: {
      main: '#ef4444', // Red (for high values)
      light: '#f87171',
      dark: '#dc2626',
    },
    background: {
      default: '#000000', // Pure black like Apple Health
      paper: 'rgba(28, 28, 30, 0.95)', // Very dark gray with slight transparency
    },
    text: {
      primary: '#ffffff', // Pure white
      secondary: 'rgba(255, 255, 255, 0.6)', // Gray text
    },
    divider: 'rgba(255, 255, 255, 0.1)', // Subtle dividers
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: '#000000',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 500,
          boxShadow: 'none',
          textTransform: 'none',
          fontSize: '0.9375rem',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.15)',
          },
        },
        outlined: {
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          '&:hover': {
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          background: 'rgba(28, 28, 30, 0.95)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.01)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'rgba(28, 28, 30, 0.95)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
              borderWidth: 1,
            },
            '&.Mui-focused': {
              background: 'rgba(255, 255, 255, 0.08)',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          backdropFilter: 'blur(10px)',
          fontSize: '0.8125rem',
        },
        filled: {
          background: 'rgba(255, 107, 53, 0.15)',
          border: '1px solid rgba(255, 107, 53, 0.2)',
          color: '#ff6b35',
          '&:hover': {
            background: 'rgba(255, 107, 53, 0.2)',
          },
        },
        outlined: {
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          background: 'rgba(28, 28, 30, 0.95)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '0.8125rem',
          textTransform: 'none',
          letterSpacing: '0.01em',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          color: 'rgba(255, 255, 255, 0.6)',
        },
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(40px) saturate(180%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(40px) saturate(180%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.05)',
          },
          '&.Mui-selected': {
            background: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.12)',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.1)',
            background: 'rgba(99, 102, 241, 0.1)',
          },
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiAlert-root': {
            borderRadius: 12,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
  },
});
