import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { get, post, put, del } from '@/services/api/apiClient';
import { API_ENDPOINTS } from '@/constants/app';

// Initial state
const initialState = {
  items: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchWorkouts = createAsyncThunk(
  'workouts/fetchWorkouts',
  async (_, { rejectWithValue }) => {
    try {
      const data = await get(API_ENDPOINTS.WORKOUTS);
      return data.workouts;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createWorkout = createAsyncThunk(
  'workouts/createWorkout',
  async (workout, { rejectWithValue }) => {
    try {
      const data = await post(API_ENDPOINTS.WORKOUTS, workout);
      return data.workout;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateWorkout = createAsyncThunk(
  'workouts/updateWorkout',
  async ({ id, ...workout }, { rejectWithValue }) => {
    try {
      const data = await put(`${API_ENDPOINTS.WORKOUTS}/${id}`, workout);
      return data.workout;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteWorkout = createAsyncThunk(
  'workouts/deleteWorkout',
  async (id, { rejectWithValue }) => {
    try {
      await del(`${API_ENDPOINTS.WORKOUTS}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const workoutsSlice = createSlice({
  name: 'workouts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch workouts
    builder
      .addCase(fetchWorkouts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkouts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchWorkouts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create workout
    builder
      .addCase(createWorkout.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });

    // Update workout
    builder
      .addCase(updateWorkout.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });

    // Delete workout
    builder
      .addCase(deleteWorkout.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload);
      });
  },
});

export const { clearError } = workoutsSlice.actions;
export default workoutsSlice.reducer;

// Selectors
export const selectWorkouts = (state) => state.workouts.items;
export const selectWorkoutsLoading = (state) => state.workouts.loading;
export const selectWorkoutsError = (state) => state.workouts.error;

