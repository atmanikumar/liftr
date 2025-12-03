import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#c4ff0d', // Neon green/lime like FitHive
      light: '#d4ff4d',
      dark: '#a8e00a',
      contrastText: '#000000',
    },
    secondary: {
      main: '#8b5cf6', // Purple accent
      light: '#a78bfa',
      dark: '#7c3aed',
      contrastText: '#ffffff',
    },
    success: {
      main: '#c4ff0d', // Same neon green for success
      light: '#d4ff4d',
      dark: '#a8e00a',
      contrastText: '#000000',
    },
    warning: {
      main: '#fbbf24', // Amber
      light: '#fcd34d',
      dark: '#f59e0b',
      contrastText: '#000000',
    },
    error: {
      main: '#ef4444', // Red
      light: '#f87171',
      dark: '#dc2626',
      contrastText: '#ffffff',
    },
    background: {
      default: '#000000', // Pure black
      paper: 'rgba(20, 20, 20, 0.95)', // Very dark with slight transparency
    },
    text: {
      primary: '#ffffff', // Pure white
      secondary: 'rgba(255, 255, 255, 0.6)', // Gray text
    },
    divider: 'rgba(255, 255, 255, 0.08)', // Subtle dividers
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: 'clamp(1.5rem, 4vw, 2rem)',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
      fontWeight: 600,
    },
    h6: {
      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
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
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
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
          borderRadius: 12,
          padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
          fontWeight: 600,
          boxShadow: 'none',
          textTransform: 'none',
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform, box-shadow',
          '&:hover': {
            boxShadow: 'none',
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          background: '#c4ff0d',
          color: '#000000',
          '&:hover': {
            background: '#d4ff4d',
            boxShadow: '0 8px 24px rgba(196, 255, 13, 0.3)',
          },
          '&.MuiButton-containedPrimary': {
            background: '#c4ff0d',
            color: '#000000',
            '&:hover': {
              background: '#d4ff4d',
            },
          },
        },
        outlined: {
          borderWidth: 2,
          borderColor: '#c4ff0d',
          color: '#c4ff0d',
          '&:hover': {
            borderWidth: 2,
            borderColor: '#d4ff4d',
            backgroundColor: 'rgba(196, 255, 13, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          background: 'rgba(20, 20, 20, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            border: '1px solid rgba(196, 255, 13, 0.2)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'rgba(20, 20, 20, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          borderRadius: 20,
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
          borderRadius: 8,
          fontWeight: 600,
          backdropFilter: 'blur(10px)',
          fontSize: '0.8125rem',
        },
        filled: {
          background: 'rgba(196, 255, 13, 0.15)',
          border: '1px solid rgba(196, 255, 13, 0.3)',
          color: '#c4ff0d',
          '&:hover': {
            background: 'rgba(196, 255, 13, 0.25)',
          },
        },
        outlined: {
          borderWidth: 1,
          borderColor: 'rgba(196, 255, 13, 0.5)',
          color: '#c4ff0d',
        },
        colorSuccess: {
          background: 'rgba(196, 255, 13, 0.2)',
          color: '#c4ff0d',
          border: '1px solid rgba(196, 255, 13, 0.4)',
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
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(196, 255, 13, 0.1)',
          boxShadow: '0 2px 20px rgba(0, 0, 0, 0.5)',
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
          borderRadius: 12,
          margin: '4px 12px',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: 'rgba(196, 255, 13, 0.05)',
          },
          '&.Mui-selected': {
            background: 'rgba(196, 255, 13, 0.15)',
            borderLeft: '3px solid #c4ff0d',
            '&:hover': {
              background: 'rgba(196, 255, 13, 0.2)',
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
            background: 'rgba(196, 255, 13, 0.1)',
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
