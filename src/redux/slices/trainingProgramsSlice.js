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
export const fetchTrainingPrograms = createAsyncThunk(
  'trainingPrograms/fetchTrainingPrograms',
  async (_, { rejectWithValue }) => {
    try {
      const data = await get(API_ENDPOINTS.TRAINING_PROGRAMS);
      return data.programs;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createTrainingProgram = createAsyncThunk(
  'trainingPrograms/createTrainingProgram',
  async (program, { rejectWithValue }) => {
    try {
      const data = await post(API_ENDPOINTS.TRAINING_PROGRAMS, program);
      return data.program;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateTrainingProgram = createAsyncThunk(
  'trainingPrograms/updateTrainingProgram',
  async ({ id, ...program }, { rejectWithValue }) => {
    try {
      const data = await put(`${API_ENDPOINTS.TRAINING_PROGRAMS}/${id}`, program);
      return data.program;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteTrainingProgram = createAsyncThunk(
  'trainingPrograms/deleteTrainingProgram',
  async (id, { rejectWithValue }) => {
    try {
      await del(`${API_ENDPOINTS.TRAINING_PROGRAMS}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const trainingProgramsSlice = createSlice({
  name: 'trainingPrograms',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch training programs
    builder
      .addCase(fetchTrainingPrograms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrainingPrograms.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTrainingPrograms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create training program
    builder
      .addCase(createTrainingProgram.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });

    // Update training program
    builder
      .addCase(updateTrainingProgram.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });

    // Delete training program
    builder
      .addCase(deleteTrainingProgram.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload);
      });
  },
});

export const { clearError } = trainingProgramsSlice.actions;
export default trainingProgramsSlice.reducer;

// Selectors
export const selectTrainingPrograms = (state) => state.trainingPrograms.items;
export const selectTrainingProgramsLoading = (state) => state.trainingPrograms.loading;
export const selectTrainingProgramsError = (state) => state.trainingPrograms.error;

