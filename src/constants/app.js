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

// Exercise to Muscle Mapping Guide
// Use this guide to update existing workouts with specific muscle focus
export const EXERCISE_MUSCLE_MAP = {
  // CHEST EXERCISES
  'bench press': 'Chest',
  'dumbbell press': 'Chest',
  'chest press': 'Chest',
  'incline press': 'Chest',
  'decline press': 'Chest',
  'chest fly': 'Chest',
  'pec deck': 'Chest',
  'cable crossover': 'Chest',
  'push up': 'Chest',
  
  // BACK EXERCISES
  'pull up': 'Back',
  'chin up': 'Back',
  'lat pulldown': 'Back',
  'barbell row': 'Back',
  'dumbbell row': 'Back',
  'cable row': 'Back',
  'seated row': 'Back',
  'deadlift': 'Back',
  't-bar row': 'Back',
  'face pull': 'Back',
  
  // SHOULDER EXERCISES
  'shoulder press': 'Shoulders',
  'overhead press': 'Shoulders',
  'military press': 'Shoulders',
  'lateral raise': 'Shoulders',
  'front raise': 'Shoulders',
  'rear delt': 'Shoulders',
  'arnold press': 'Shoulders',
  'upright row': 'Shoulders',
  
  // ARM EXERCISES
  'bicep curl': 'Biceps',
  'hammer curl': 'Biceps',
  'preacher curl': 'Biceps',
  'concentration curl': 'Biceps',
  'tricep extension': 'Triceps',
  'tricep pushdown': 'Triceps',
  'overhead extension': 'Triceps',
  'dip': 'Triceps',
  'close grip': 'Triceps',
  'skull crusher': 'Triceps',
  
  // LEG EXERCISES - QUADS
  'squat': 'Quads',
  'front squat': 'Quads',
  'leg press': 'Quads',
  'leg extension': 'Quads',
  'lunge': 'Quads',
  'bulgarian split': 'Quads',
  'hack squat': 'Quads',
  
  // LEG EXERCISES - HAMSTRINGS
  'leg curl': 'Hamstrings',
  'romanian deadlift': 'Hamstrings',
  'good morning': 'Hamstrings',
  'nordic curl': 'Hamstrings',
  
  // LEG EXERCISES - GLUTES
  'hip thrust': 'Glutes',
  'glute bridge': 'Glutes',
  'cable kickback': 'Glutes',
  
  // LEG EXERCISES - CALVES
  'calf raise': 'Calves',
  'seated calf': 'Calves',
  'standing calf': 'Calves',
  
  // CORE EXERCISES
  'crunch': 'Abs',
  'plank': 'Abs',
  'sit up': 'Abs',
  'leg raise': 'Abs',
  'russian twist': 'Abs',
  'cable crunch': 'Abs',
  
  // CARDIO
  'treadmill': 'Cardio',
  'elliptical': 'Cardio',
  'bike': 'Cardio',
  'rowing': 'Cardio',
  'running': 'Cardio',
};

// Helper function to detect muscle group from exercise name
export const detectMuscleFromExercise = (exerciseName) => {
  const lowerName = exerciseName.toLowerCase();
  
  for (const [keyword, muscle] of Object.entries(EXERCISE_MUSCLE_MAP)) {
    if (lowerName.includes(keyword)) {
      return muscle;
    }
  }
  
  // Default fallback based on common keywords
  if (lowerName.includes('chest') || lowerName.includes('pec')) return 'Chest';
  if (lowerName.includes('back') || lowerName.includes('lat')) return 'Back';
  if (lowerName.includes('shoulder') || lowerName.includes('delt')) return 'Shoulders';
  if (lowerName.includes('bicep')) return 'Biceps';
  if (lowerName.includes('tricep')) return 'Triceps';
  if (lowerName.includes('quad')) return 'Quads';
  if (lowerName.includes('hamstring')) return 'Hamstrings';
  if (lowerName.includes('calf')) return 'Calves';
  if (lowerName.includes('glute')) return 'Glutes';
  if (lowerName.includes('ab') || lowerName.includes('core')) return 'Abs';
  if (lowerName.includes('leg') && !lowerName.includes('raise')) return 'Quads'; // Default legs to quads
  
  return 'Full Body'; // Default fallback
};

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

