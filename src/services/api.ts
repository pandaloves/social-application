import axios from 'axios';
import type {
  LoginRequest,
  UserRequestDto,
  PostRequestDto,
  CommentRequestDto,
  FriendshipRequestDto,
  UserResponseDto,
  RefreshTokenRequest,
  RefreshTokenResponse
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if a refresh is in progress
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If refresh is already in progress, wait for it
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh token endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { token, refreshToken: newRefreshToken } = response.data;

        // Store new tokens
        localStorage.setItem('token', token);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Update authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Process queued requests
        processQueue(null, token);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, logout user
        processQueue(refreshError, null);
        
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For other errors, just reject
    return Promise.reject(error);
  }
);

// Auth Service - UPDATED to handle refresh token
export const authService = {
  login: async (credentials: LoginRequest) => {
    const response = await api.post('/users/login', credentials);
    
    // Store both tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.token);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    
    return response.data;
  },
  
  register: async (userData: UserRequestDto) => {
    const response = await api.post('/users/', userData);
    
    // Store both tokens after registration if provided
    if (response.data.token && typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.token);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    
    return response.data;
  },
  
  logout: () => {
    if (typeof window !== 'undefined') {
      // Optionally call logout endpoint to invalidate tokens
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        // Call logout endpoint if your backend has one
        // api.post('/auth/logout', { refreshToken }).catch(console.error);
      }
      
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },
  
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await api.post('/auth/refresh', { refreshToken });
    
    // Store new tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.token);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    
    return response.data;
  },
  
  getCurrentUser: (): UserResponseDto | null => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    }
    return null;
  },
};

// User Service - UPDATED to handle token refresh automatically
export const userService = {
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getUserById: async (id: number) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  updateUser: async (id: number, userData: UserRequestDto) => {
    const response = await api.put(`/users/${id}`, userData);
    
    // Update stored user data
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    
    return response.data;
  },
  
 deleteUser: async (id: number) => {
    // Get current user from localStorage to verify ownership
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const currentUser = JSON.parse(storedUser);
        
        // Check if the current user is trying to delete their own account
        if (currentUser.id !== id) {
          throw new Error('You can only delete your own account');
        }
      }
    }
    
    const response = await api.delete(`/users/${id}`);
    
    // Clear storage after successful deletion
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
    
    return response.data;
  },
  
  createPostForUser: async (userId: number, postData: PostRequestDto) => {
    const response = await api.post(`/users/${userId}/posts`, postData);
    return response.data;
  },
  
  // This should now work with token refresh
  getFriends: async (id: number) => {
    const response = await api.get(`/users/${id}/friends`);
    return response.data;
  },
  
  // Alternative: Get friends via friendships endpoint
  getFriendsViaFriendships: async (id: number) => {
    const response = await api.get(`/friendships/${id}/friends`);
    return response.data;
  },
};

// Post Service
export const postService = {
 getAuthUserPostsPagination: async (params?: { userId: number;page?: number; size?: number; sort?: string }) => {
    const response = await api.get('/posts', { params });
    return response.data;
  },

  getPostsWithPagination: async (params?: { page?: number; size?: number; sort?: string }) => {
    const response = await api.get('/posts', { params });
    return response.data;
  },
  
  getPostById: async (id: number) => {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },
  
  createPost: async (postData: PostRequestDto) => {
    const response = await api.post('/posts', postData);
    return response.data;
  },
  
  updatePost: async (id: number, postData: PostRequestDto) => {
    const response = await api.put(`/posts/${id}`, postData);
    return response.data;
  },
  
  deletePost: async (id: number) => {
    await api.delete(`/posts/${id}`);
  },
};

// Comment Service
export const commentService = {
  getComments: async (postId: number) => {
    const response = await api.get(`/posts/${postId}/comments`);
    return response.data;
  },
  
  createComment: async (postId: number, commentData: CommentRequestDto) => {
    const response = await api.post(`/posts/${postId}/comments`, commentData);
    return response.data;
  },
};

// Friendship Service (no changes needed)
export const friendshipService = {
  getFriendships: async (userId: number) => {
    const response = await api.get(`/friendships/${userId}`);
    return response.data;
  },
  
  createFriendship: async (friendshipData: FriendshipRequestDto) => {
    const response = await api.post('/friendships', friendshipData);
    return response.data;
  },
  
  acceptFriendship: async (id: number) => {
    const response = await api.put(`/friendships/${id}/accept`);
    return response.data;
  },
  
  rejectFriendship: async (id: number) => {
    const response = await api.put(`/friendships/${id}/reject`);
    return response.data;
  },
};

// Export convenience functions
export const fetchComments = (postId: number) => commentService.getComments(postId);
export const createComment = (postId: number, commentData: CommentRequestDto) => 
  commentService.createComment(postId, commentData);

// Also export other commonly used functions
export const login = (credentials: LoginRequest) => authService.login(credentials);
export const register = (userData: UserRequestDto) => authService.register(userData);
export const logout = () => authService.logout();
export const refreshToken = (refreshToken: string) => authService.refreshToken(refreshToken);
export const getCurrentUser = () => authService.getCurrentUser();
export const fetchUserProfile = (userId: number) => userService.getUserById(userId);
export const fetchFriends = (userId: number) => userService.getFriends(userId);

export default api;