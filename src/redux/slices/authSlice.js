import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { post, get } from '@/services/api/apiClient';
import { API_ENDPOINTS } from '@/constants/app';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  viewingAs: null, // For trainers viewing trainee progress
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const data = await post(API_ENDPOINTS.AUTH.LOGIN, { username, password });
      return data.user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const data = await get(API_ENDPOINTS.AUTH.ME);
      return data.user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await post(API_ENDPOINTS.AUTH.LOGOUT);
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setViewingAs: (state, action) => {
      state.viewingAs = action.payload;
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('liftr_viewingAs', JSON.stringify(action.payload));
      }
    },
    clearViewingAs: (state) => {
      state.viewingAs = null;
      // Clear from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('liftr_viewingAs');
      }
    },
    loadViewingAs: (state) => {
      // Load from localStorage on app init
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('liftr_viewingAs');
        if (stored) {
          try {
            state.viewingAs = JSON.parse(stored);
          } catch (e) {
            // Invalid data, clear it
            localStorage.removeItem('liftr_viewingAs');
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Check Auth
    builder
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.loading = false;
        state.error = null;
        state.viewingAs = null;
        // Clear viewingAs from localStorage on logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('liftr_viewingAs');
        }
      });
  },
});

export const { clearError, setViewingAs, clearViewingAs, loadViewingAs } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectViewingAs = (state) => state.auth.viewingAs;
export const selectEffectiveUser = (state) => state.auth.viewingAs || state.auth.user;
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin';
export const selectIsTrainer = (state) => state.auth.user?.role === 'trainer';

