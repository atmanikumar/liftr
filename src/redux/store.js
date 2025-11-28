import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import workoutsReducer from './slices/workoutsSlice';
import trainingProgramsReducer from './slices/trainingProgramsSlice';
import usersReducer from './slices/usersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workouts: workoutsReducer,
    trainingPrograms: trainingProgramsReducer,
    users: usersReducer,
  },
});

