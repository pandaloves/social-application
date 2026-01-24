// Authentication Types
export type LoginRequest ={
  username: string;
  password: string;
}

export type LoginResponse = {
  token: string;
  refreshToken: string;
  success: boolean;
}

// User Types
export type User ={
  id: number;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  profileImagePath?: string;
  role: string;
}

export type UserResponseDto = {
  id: number;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  profileImagePath?: string;
  role: string;
}

export type UserRequestDto = {
  username: string;
  email: string;
  password: string;
  displayName: string;
  bio: string;
}

export type UserWithPostsResponseDto = {
  user: UserResponseDto;
  posts: PostResponseDto[];
}

// Post Types
export type Post = {
  id: number;
  content: string;
  createdAt: string;
  user: User;
}

export type PostResponseDto = {
  id: number;
  content: string;
  createdAt: string;
  author: UserResponseDto;
}

export type PostRequestDto = {
  content: string;
  userId: number;
}

// Comment Types
export type Comment = {
  id: number;
  text: string;
  createdAt: string;
  author: User;
  postId: number;
}

export type CommentResponseDto = {
  id: number;
  commentText: string;
  timestamp: string;
  user: {
    id: number;
    username: string;
    displayName: string;
  };
}

export type CommentRequestDto = {
  commentText: string;
  userId: number;
}

// Friendship Types
export type Friendship = {
  id: number;
  requester: User;
  addressee: User;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

// src/types.ts - Add these types
export type FriendshipDto ={
  id: number;
  requester: UserResponseDto;
  receiver: UserResponseDto;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export type FriendshipRequestDto = {
  requesterUserId: number;
  addresseeUserId: number;
    status?: string;
}

// Pagination Types
export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  last: boolean;
}

// Axios/HTTP Request Types
export type ApiRequest = {
  method?: string;
  url: string;
  data?: any;
  params?: any;
  headers?: Record<string, string>;
}

export type ApiResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
  request?: any;
}

// Component Prop Types
export type AuthContextProps = {
  children: React.ReactNode;
}

export type PostCardProps = {
  post: PostResponseDto;
  onEdit?: (id: number, content: string) => void;
  onDelete?: (id: number) => void;
  onComment?: (postId: number, comment: string) => void;
   onAddFriend?: (userId: number) => void;
  showActions?: boolean;
  isFriend?: boolean;
};

export type CreatePostDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  isLoading?: boolean;
}

export type LoginFormProps = {
  onSubmit: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
}

// Hook Types
export type UseAuthReturn = {
  user: UserResponseDto | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (userData: UserRequestDto) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

// Update existing types with proper structure
export type PageResponseDTO<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
  pageable?: {
    pageNumber: number;
    pageSize: number;
    offset: number;
    paged: boolean;
    unpaged: boolean;
    sort?: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    }
  };
  sort?: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
}

// Add UserDTO if missing (used in backend)
export type UserDTO = {
  id: number;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  role: string;
}

// Add PostDTO if missing (used in backend)
export type PostDTO = {
  id: number;
  content: string;
  createdAt: string;
  user: UserDTO;
}

// Add JWT Response Type
export type JwtResponseDTO = {
  token: string;
  refreshToken: string;
  success: boolean;
}

// Fix Friendship types consistency
export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

// Update FriendshipResponseDto to match your backend
export type FriendshipResponseDto = {
  id: number;
  requester: UserResponseDto;
  addressee: UserResponseDto;
  status: FriendshipStatus;
  createdAt: string;
}

// Error Types
export type ApiError = {
  message: string;
  status: number;
  data?: any;
  code?: string;
}

// Query/Mutation Types
export type QueryOptions = {
  enabled?: boolean;
  retry?: boolean | number;
  staleTime?: number;
  cacheTime?: number;
}

export type MutationOptions<TVariables = any> = {
  onSuccess?: (data: any, variables: TVariables) => void;
  onError?: (error: any, variables: TVariables) => void;
  onSettled?: (data: any, error: any, variables: TVariables) => void;
}