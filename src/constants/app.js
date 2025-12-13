// Application-wide constants

// Authentication
export const JWT_EXPIRY = '90d'; // 3 months
export const COOKIE_NAME = 'liftr_auth_token';

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

// Muscle Groups - Based on react-body-highlighter supported body parts
// These are the muscle groups users can select when creating workouts
export const MUSCLE_GROUPS = [
  'Chest',
  'Upper Back',
  'Lower Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Abs',
  'Obliques',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Adductors',
  'Trapezius',
  'Neck',
];

// Exercise to Muscle Mapping Guide
// Use this guide to update existing workouts with specific muscle focus
// Maps exercise keywords to muscle groups
// Order matters - more specific keywords should come first
export const EXERCISE_MUSCLE_MAP = {
  // TRICEPS EXERCISES - Check these first (before general 'curl' matches)
  'tricep extension': 'Triceps',
  'tricep pushdown': 'Triceps',
  'triceps pushdown': 'Triceps',
  'rope pushdown': 'Triceps',
  'cable pushdown': 'Triceps',
  'pushdown': 'Triceps',
  'overhead extension': 'Triceps',
  'tricep overhead': 'Triceps',
  'skull crusher': 'Triceps',
  'skullcrusher': 'Triceps',
  'dip': 'Triceps',
  'dips': 'Triceps',
  'bench dip': 'Triceps',
  'close grip bench': 'Triceps',
  'close-grip bench': 'Triceps',
  'close grip press': 'Triceps',
  'close-grip press': 'Triceps',
  'tricep kickback': 'Triceps',
  'kickback tricep': 'Triceps',
  'kickback': 'Triceps', // Dumbbell kickbacks are usually triceps
  'dumbbell kickback': 'Triceps',

  // CHEST EXERCISES
  'bench press': 'Chest',
  'dumbbell press': 'Chest',
  'chest press': 'Chest',
  'incline press': 'Chest',
  'decline press': 'Chest',
  'chest fly': 'Chest',
  'pec deck': 'Chest',
  'pec fly': 'Chest',
  'pec flys': 'Chest',
  'cable fly': 'Chest',
  'cable flys': 'Chest',
  'cable crossover': 'Chest',
  'push up': 'Chest',
  'push-up': 'Chest',
  'pushup': 'Chest',
  'floor press': 'Chest',
  'smith machine incline': 'Chest',
  
  // BACK EXERCISES - UPPER BACK (LATS)
  'pull up': 'Upper Back',
  'pullup': 'Upper Back',
  'chin up': 'Upper Back',
  'chinup': 'Upper Back',
  'lat pulldown': 'Upper Back',
  'pulldown': 'Upper Back',
  'barbell row': 'Upper Back',
  'dumbbell row': 'Upper Back',
  'bent over row': 'Upper Back',
  'bent-over row': 'Upper Back',
  'cable row': 'Upper Back',
  'seated row': 'Upper Back',
  't-bar row': 'Upper Back',
  'face pull': 'Upper Back',
  'straight arm pulldown': 'Upper Back',
  'straight arm pull': 'Upper Back',
  'single arm row': 'Upper Back',
  'single-arm row': 'Upper Back',
  'renegade row': 'Upper Back',
  'cable pull': 'Upper Back',
  'single arm cable pull': 'Upper Back',
  
  // HAMSTRINGS - specific deadlift variations (check BEFORE general deadlift)
  'romanian deadlift': 'Hamstrings',
  'stiff leg deadlift': 'Hamstrings',
  'stiff-leg deadlift': 'Hamstrings',
  
  // BACK EXERCISES - LOWER BACK
  'deadlift': 'Lower Back',
  'good morning': 'Lower Back',
  'back extension': 'Lower Back',
  'hyperextension': 'Lower Back',
  'superman': 'Lower Back',
  
  // TRAPEZIUS
  'shrug': 'Trapezius',
  'upright row': 'Trapezius',
  
  // SHOULDER EXERCISES
  'shoulder press': 'Shoulders',
  'overhead press': 'Shoulders',
  'military press': 'Shoulders',
  'lateral raise': 'Shoulders',
  'side raise': 'Shoulders',
  'front raise': 'Shoulders',
  'rear delt': 'Shoulders',
  'reverse fly': 'Shoulders',
  'reverse flys': 'Shoulders',
  'arnold press': 'Shoulders',
  'delt raise': 'Shoulders',
  'around-the-world': 'Shoulders',
  'around the world': 'Shoulders',
  'shoulder lateral': 'Shoulders',
  'smith machine overhead': 'Shoulders',
  
  // BICEPS EXERCISES
  'bicep curl': 'Biceps',
  'biceps curl': 'Biceps',
  'hammer curl': 'Biceps',
  'preacher curl': 'Biceps',
  'concentration curl': 'Biceps',
  'cable curl': 'Biceps',
  'barbell curl': 'Biceps',
  'dumbbell curl': 'Biceps',
  'bayesian curl': 'Biceps',
  'bayesian bicep': 'Biceps',
  'spider curl': 'Biceps',
  'incline curl': 'Biceps',
  'ez bar curl': 'Biceps',
  'reverse curl': 'Biceps',
  
  // FOREARM EXERCISES
  'wrist curl': 'Forearms',
  'farmer walk': 'Forearms',
  'farmers walk': 'Forearms',
  'farmer carry': 'Forearms',
  'suitcase carry': 'Forearms',
  'grip': 'Forearms',
  
  // LEG EXERCISES - QUADS
  'squat': 'Quads',
  'front squat': 'Quads',
  'goblet squat': 'Quads',
  'sumo squat': 'Quads',
  'leg press': 'Quads',
  'leg extension': 'Quads',
  'lunge': 'Quads',
  'lunges': 'Quads',
  'bulgarian split': 'Quads',
  'hack squat': 'Quads',
  'step up': 'Quads',
  'step-up': 'Quads',
  'walking lunge': 'Quads',
  'sissy squat': 'Quads',
  
  // LEG EXERCISES - HAMSTRINGS
  'leg curl': 'Hamstrings',
  'lying leg curl': 'Hamstrings',
  'seated leg curl': 'Hamstrings',
  'nordic curl': 'Hamstrings',
  
  // LEG EXERCISES - GLUTES
  'hip thrust': 'Glutes',
  'hip thruster': 'Glutes',
  'glute bridge': 'Glutes',
  'cable kickback': 'Glutes',
  'glute kickback': 'Glutes',
  'donkey kick': 'Glutes',
  'hip abduction': 'Glutes',
  'abduction': 'Glutes',
  'adduction': 'Adductors',
  'pull through': 'Glutes',
  'swing': 'Glutes', // Dumbbell/Kettlebell swings
  'swings': 'Glutes',
  'thruster': 'Glutes', // Thrusters work glutes primarily
  
  // LEG EXERCISES - CALVES
  'calf raise': 'Calves',
  'seated calf': 'Calves',
  'standing calf': 'Calves',
  
  // CORE EXERCISES - ABS
  'ab crunch': 'Abs',
  'crunch': 'Abs',
  'crunches': 'Abs',
  'plank': 'Abs',
  'planks': 'Abs',
  'sit up': 'Abs',
  'sit-up': 'Abs',
  'leg raise': 'Abs',
  'hanging leg raise': 'Abs',
  'cable crunch': 'Abs',
  'ab wheel': 'Abs',
  'ab rollout': 'Abs',
  'mountain climber': 'Abs',
  'woodchopper': 'Abs',
  
  // CORE EXERCISES - OBLIQUES
  'russian twist': 'Obliques',
  'side plank': 'Obliques',
  'oblique': 'Obliques',
  'wood chop': 'Obliques',
  'woodchop': 'Obliques',
};

// Helper function to detect muscle group from exercise name
export const detectMuscleFromExercise = (exerciseName) => {
  if (!exerciseName) return 'Chest';
  
  const lowerName = exerciseName.toLowerCase().trim();
  
  // Check exact keyword matches first (more specific) - order matters
  for (const [keyword, muscle] of Object.entries(EXERCISE_MUSCLE_MAP)) {
    if (lowerName.includes(keyword)) {
      return muscle;
    }
  }
  
  // Default fallback based on common keywords (order matters - specific first)
  // Triceps checks before 'curl' to avoid matching 'tricep curl' as bicep
  if (lowerName.includes('tricep') || lowerName.includes('pushdown') || lowerName.includes('extension')) return 'Triceps';
  if (lowerName.includes('bicep') || lowerName.includes('curl')) return 'Biceps';
  if (lowerName.includes('chest') || lowerName.includes('pec') || lowerName.includes('fly') || lowerName.includes('flys')) return 'Chest';
  if (lowerName.includes('lat') || lowerName.includes('row') || lowerName.includes('pull')) return 'Upper Back';
  if (lowerName.includes('back')) return 'Upper Back';
  if (lowerName.includes('shoulder') || lowerName.includes('delt') || lowerName.includes('raise')) return 'Shoulders';
  if (lowerName.includes('quad') || lowerName.includes('squat')) return 'Quads';
  if (lowerName.includes('hamstring')) return 'Hamstrings';
  if (lowerName.includes('calf') || lowerName.includes('calves')) return 'Calves';
  if (lowerName.includes('glute') || lowerName.includes('hip') || lowerName.includes('thrust')) return 'Glutes';
  if (lowerName.includes('ab') || lowerName.includes('core') || lowerName.includes('crunch')) return 'Abs';
  if (lowerName.includes('oblique') || lowerName.includes('twist')) return 'Obliques';
  if (lowerName.includes('trap') || lowerName.includes('shrug')) return 'Trapezius';
  if (lowerName.includes('forearm') || lowerName.includes('wrist') || lowerName.includes('grip') || lowerName.includes('carry') || lowerName.includes('walk')) return 'Forearms';
  if (lowerName.includes('leg') && !lowerName.includes('raise')) return 'Quads'; // Default legs to quads
  if (lowerName.includes('press')) return 'Chest'; // Generic press defaults to chest
  
  return 'Chest'; // Default fallback to a valid muscle instead of "Full Body"
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

