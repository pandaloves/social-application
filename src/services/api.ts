import axios from 'axios';
import type {
  LoginRequest,
  UserRequestDto,
  PostRequestDto,
  CommentRequestDto,
  FriendshipRequestDto,
  UserResponseDto
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  login: async (credentials: LoginRequest) => {
    const response = await api.post('/users/login', credentials);
    return response.data;
  },
  
  register: async (userData: UserRequestDto) => {
    const response = await api.post('/users/', userData);
    return response.data;
  },
  
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },
  
  getCurrentUser: (): UserResponseDto | null => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    }
    return null;
  },
};

// User Service - ADD getUsers method here
export const userService = {
  // Add this method
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getUserById: async (id: number) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  getUserWithPosts: async (id: number) => {
    const response = await api.get(`/users/${id}/with-posts`);
    return response.data;
  },
  
  updateUser: async (id: number, userData: UserRequestDto) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },
  
  deleteUser: async (id: number) => {
    await api.delete(`/users/${id}`);
  },
  
  createPostForUser: async (userId: number, postData: PostRequestDto) => {
    const response = await api.post(`/users/${userId}/posts`, postData);
    return response.data;
  },
  
  getFriends: async (id: number) => {
    const response = await api.get(`/users/${id}/friends`);
    return response.data;
  },
};

// Post Service
export const postService = {
  getPosts: async (params?: { page?: number; size?: number; sort?: string }) => {
    const response = await api.get('/posts', { params });
    
    if (response.data && response.data.content) {
      return response.data.content; 
    }
    
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

// Friendship Service
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

export default api;