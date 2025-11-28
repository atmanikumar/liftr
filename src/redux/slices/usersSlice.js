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
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const data = await get(API_ENDPOINTS.USERS);
      return data.users;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (user, { rejectWithValue }) => {
    try {
      const data = await post(API_ENDPOINTS.USERS, user);
      return data.user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const resetUserPassword = createAsyncThunk(
  'users/resetUserPassword',
  async ({ userId, newPassword }, { rejectWithValue }) => {
    try {
      const data = await put(`${API_ENDPOINTS.USERS}/${userId}/reset-password`, { newPassword });
      return data.user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id, { rejectWithValue }) => {
    try {
      await del(`${API_ENDPOINTS.USERS}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create user
    builder
      .addCase(createUser.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });

    // Reset password
    builder
      .addCase(resetUserPassword.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });

    // Delete user
    builder
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload);
      });
  },
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;

// Selectors
export const selectUsers = (state) => state.users.items;
export const selectUsersLoading = (state) => state.users.loading;
export const selectUsersError = (state) => state.users.error;

