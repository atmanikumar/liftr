// Application-wide constants

// Authentication
export const JWT_EXPIRY = '90d'; // 3 months
export const COOKIE_NAME = 'liftr_auth_token';

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

// Muscle Groups
export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Calves',
  'Glutes',
  'Abs',
  'Forearms',
  'Legs',
  'Cardio',
  'Full Body',
];

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  USERS: '/api/users',
  WORKOUTS: '/api/workouts',
  TRAINING_PROGRAMS: '/api/training-programs',
  WORKOUT_SESSIONS: '/api/workout-sessions',
  INIT_DB: '/api/init-db',
};

// Navigation Menu Items
export const MENU_ITEMS = [
  {
    title: 'Workouts',
    path: '/workouts',
    icon: 'FitnessCenterIcon',
    adminOnly: false,
  },
  {
    title: 'Training Programs',
    path: '/training-programs',
    icon: 'CalendarMonthIcon',
    adminOnly: false,
  },
  {
    title: 'My Progress',
    path: '/progress',
    icon: 'TrendingUpIcon',
    adminOnly: false,
  },
  {
    title: 'Recent Workouts',
    path: '/recent',
    icon: 'HistoryIcon',
    adminOnly: false,
  },
  {
    title: 'Users',
    path: '/users',
    icon: 'PeopleIcon',
    adminOnly: true,
  },
];

// Theme Colors
export const THEME_COLORS = {
  PRIMARY: '#c4ff0d', // Neon green
  SECONDARY: '#8b5cf6', // Purple
  DARK_BG: '#000000',
  DARK_PAPER: '#0a0a0a',
};

// Loading Messages
export const LOADING_MESSAGES = {
  LOGIN: 'Logging in...',
  LOADING: 'Loading...',
  SAVING: 'Saving...',
  DELETING: 'Deleting...',
  UPDATING: 'Updating...',
};

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  INVALID_CREDENTIALS: 'Invalid username or password.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
};

