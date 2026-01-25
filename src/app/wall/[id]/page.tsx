"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Container,
  Box,
  Typography,
  Paper,
  Avatar,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  Grid,
  Chip,
  Tabs,
  Tab,
  Snackbar,
} from "@mui/material";
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward,
} from "@mui/icons-material";
import MuiAlert from "@mui/material/Alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, {
  friendshipService,
  postService,
  userService,
} from "@/src/services/api";
import PostCard from "@/src/components/Post/PostCard";
import CreatePostDialog from "@/src/components/Post/CreatePostDialog";
import {
  PostResponseDto,
  PostsPaginatedResponse,
  UserResponseDto,
} from "@/src/types";
import { useAuth } from "@/src/contexts/AuthContext";
import FriendsList from "@/src/components/Friends/FriendsList";
import EditProfileDialog from "@/src/components/EditProfileDialog";

export default function WallPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Pagination state
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  // Check if this is the current user's wall
  const isOwnWall = currentUser?.id === id;

  // Fetch user data
  const {
    data: userData,
    isLoading: userLoading,
    error: userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      console.log("Fetching user for id:", id);

      try {
        // Get all users to find the correct user
        const users = await userService.getUsers();
        console.log("All users:", users);

        const foundUser = users.find((u: UserResponseDto) => u.id === id);
        console.log("Found user:", foundUser);

        if (!foundUser) {
          throw new Error(`User with id ${id} not found`);
        }

        return foundUser;
      } catch (error) {
        console.error("Error in user query:", error);
        throw error;
      }
    },
    enabled: !!id && isAuthenticated,
  });

  // Fetch posts for this user with pagination - CHANGED to use pagination query
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useQuery({
    queryKey: ["posts", "user", id, page, PAGE_SIZE],
    queryFn: async () => {
      console.log("Fetching posts for user id:", id, "page:", page);

      // Use getAuthUserPostsPagination with authorId parameter
      const response = await postService.getAuthUserPostsPagination({
        userId: id,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      });

      console.log("Posts response for user", id, ":", {
        totalElements: response.totalElements,
        contentLength: response.content?.length,
        totalPages: response.totalPages,
        currentPage: response.number,
      });

      return response;
    },
    enabled: !!id && !!userData && isAuthenticated,
  });

  // Extract posts and pagination info
  const posts: PostResponseDto[] = postsData?.content || [];
  const totalPages = postsData?.totalPages || 0;
  const currentPage = postsData?.number || 0;
  const totalElements = postsData?.totalElements || 0;

  const { data: friendships = [] } = useQuery({
    queryKey: ["friendships", id],
    queryFn: () => friendshipService.getFriendships(id),
    enabled: !!id,
  });

  const friendsCount = friendships.filter(
    (f: any) => f.status === "ACCEPTED",
  ).length;

  // Create post mutation - UPDATED to update cache with pagination
  const createPostMutation = useMutation({
    mutationFn: (content: string) =>
      postService.createPost({
        content,
        userId: currentUser?.id || 0,
      }),
    onMutate: async (content) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["posts", "user", id] });
      await queryClient.cancelQueries({ queryKey: ["posts", "feed"] });

      // Snapshot previous values
      const previousWallPosts = queryClient.getQueryData([
        "posts",
        "user",
        id,
        page,
        PAGE_SIZE,
      ]) || { content: [] };
      const previousFeedPosts =
        queryClient.getQueryData(["posts", "feed"]) || [];

      // Create optimistic post
      const optimisticPost = {
        id: Date.now(), // Temporary ID
        content,
        author: currentUser,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
      };

      // Optimistically update wall posts (add to first page)
      queryClient.setQueryData(
        ["posts", "user", id, 0, PAGE_SIZE],
        (old: any) => {
          if (!old) return old;

          return {
            ...old,
            content: [optimisticPost, ...old.content],
            totalElements: old.totalElements + 1,
          };
        },
      );

      // Optimistically update feed posts
      queryClient.setQueryData(["posts", "feed"], (oldData: any[] = []) => {
        console.log("Optimistically adding post to feed");
        return [optimisticPost, ...oldData];
      });

      return { previousWallPosts, previousFeedPosts };
    },
    onSuccess: (newPost) => {
      console.log("Post created successfully:", newPost);

      // Replace optimistic posts with real ones in wall (first page)
      queryClient.setQueryData(
        ["posts", "user", id, 0, PAGE_SIZE],
        (old: any) => {
          if (!old) return old;

          const filteredContent = old.content.filter(
            (post: any) => post.id !== Date.now(),
          );
          return {
            ...old,
            content: [newPost, ...filteredContent],
          };
        },
      );

      // Replace optimistic posts with real ones in feed
      queryClient.setQueryData(["posts", "feed"], (oldData: any[] = []) => {
        const filtered = oldData.filter((post) => post.id !== Date.now());
        return [newPost, ...filtered];
      });

      // Invalidate both queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["posts", "user", id] });
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });

      setCreateDialogOpen(false);
      setSnackbar({
        open: true,
        message: "Post created successfully!",
        severity: "success",
      });
      // Reset to first page after creating a new post
      setPage(0);
    },
    onError: (error, content, context) => {
      console.error("Error creating post:", error);

      // Rollback to previous values
      if (context?.previousWallPosts) {
        queryClient.setQueryData(
          ["posts", "user", id, page, PAGE_SIZE],
          context.previousWallPosts,
        );
      }

      if (context?.previousFeedPosts) {
        queryClient.setQueryData(["posts", "feed"], context.previousFeedPosts);
      }

      setSnackbar({
        open: true,
        message: "Failed to create post",
        severity: "error",
      });
    },
  });

  // Update post mutation
  // Update post mutation - FIXED error handling
  const updatePostMutation = useMutation({
    mutationFn: ({ id: postId, content }: { id: number; content: string }) =>
      postService.updatePost(postId, {
        content,
        userId: currentUser?.id || 0,
      }),
    onMutate: async ({ id: postId, content }) => {
      // Cancel all related queries
      await queryClient.cancelQueries({ queryKey: ["posts", "user", id] });
      await queryClient.cancelQueries({ queryKey: ["posts", "feed"] });

      // Snapshot previous values
      const previousWallData = queryClient.getQueryData<PostsPaginatedResponse>(
        ["posts", "user", id, page, PAGE_SIZE],
      ) || {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: page,
        size: PAGE_SIZE,
        first: true,
        last: true,
      };

      const previousFeedData = queryClient.getQueryData<PostsPaginatedResponse>(
        ["posts", "feed", 0],
      ) || {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: PAGE_SIZE,
        first: true,
        last: true,
      };

      // Find the post to update
      const postToUpdate = previousWallData.content.find(
        (post: PostResponseDto) => post.id === postId,
      );

      if (!postToUpdate) {
        throw new Error("Post not found in cache");
      }

      // Create optimistic updated post - FIX: Don't overwrite createdAt
      const optimisticUpdatedPost: PostResponseDto = {
        ...postToUpdate,
        content,
        createdAt: new Date().toISOString(), // Only update updatedAt, keep createdAt
      };

      // Optimistically update in wall
      queryClient.setQueryData<PostsPaginatedResponse>(
        ["posts", "user", id, page, PAGE_SIZE],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            content: oldData.content.map((post: PostResponseDto) =>
              post.id === postId ? optimisticUpdatedPost : post,
            ),
          };
        },
      );

      // Optimistically update in feed (first page)
      queryClient.setQueryData<PostsPaginatedResponse>(
        ["posts", "feed", 0],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            content: oldData.content.map((post: PostResponseDto) =>
              post.id === postId ? optimisticUpdatedPost : post,
            ),
          };
        },
      );

      // Also update in feed for all pages (not just page 0)
      queryClient.setQueriesData<PostsPaginatedResponse>(
        { queryKey: ["posts", "feed"] },
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            content: oldData.content.map((post: PostResponseDto) =>
              post.id === postId ? optimisticUpdatedPost : post,
            ),
          };
        },
      );

      return { previousWallData, previousFeedData, optimisticUpdatedPost };
    },
    onSuccess: (updatedPost, variables, context) => {
      console.log("Post updated successfully:", updatedPost);

      // Show success message
      setSnackbar({
        open: true,
        message: "Post updated successfully!",
        severity: "success",
      });

      // Replace optimistic update with real data in wall
      queryClient.setQueryData<PostsPaginatedResponse>(
        ["posts", "user", id, page, PAGE_SIZE],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            content: oldData.content.map((post: PostResponseDto) =>
              post.id === updatedPost.id ? updatedPost : post,
            ),
          };
        },
      );

      // Replace optimistic update with real data in feed (first page)
      queryClient.setQueryData<PostsPaginatedResponse>(
        ["posts", "feed", 0],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            content: oldData.content.map((post: PostResponseDto) =>
              post.id === updatedPost.id ? updatedPost : post,
            ),
          };
        },
      );

      // Replace optimistic update with real data in all feed pages
      queryClient.setQueriesData<PostsPaginatedResponse>(
        { queryKey: ["posts", "feed"] },
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            content: oldData.content.map((post: PostResponseDto) =>
              post.id === updatedPost.id ? updatedPost : post,
            ),
          };
        },
      );

      // Invalidate queries to ensure fresh data (but don't show error if invalidation fails)
      setTimeout(() => {
        queryClient
          .invalidateQueries({ queryKey: ["posts", "user", id] })
          .catch(console.error);
        queryClient
          .invalidateQueries({ queryKey: ["posts", "feed"] })
          .catch(console.error);
      }, 100);
    },
    onError: (error: any, variables, context) => {
      console.error("Error updating post:", error);

      // Check if it's an Axios error
      const isAxiosError = error.isAxiosError;
      const response = error.response;
      const status = response?.status;
      const data = response?.data;

      if (isAxiosError) {
        // It's an Axios error, we can access response
        const errorMessage =
          data?.message || error.message || "Failed to update post";

        if (status && status >= 400) {
          setSnackbar({
            open: true,
            message: errorMessage,
            severity: "error",
          });
        } else if (!response) {
          // Network error
          console.log(
            "Network error during update, post may still be updated on server",
          );
        }
      } else {
        // Regular JavaScript error
        setSnackbar({
          open: true,
          message: error.message || "Failed to update post",
          severity: "error",
        });
      }

      // Rollback to previous values
      if (context?.previousWallData) {
        queryClient.setQueryData(
          ["posts", "user", id, page, PAGE_SIZE],
          context.previousWallData,
        );
      }

      if (context?.previousFeedData) {
        queryClient.setQueryData(
          ["posts", "feed", 0],
          context.previousFeedData,
        );
      }
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: (postId: number) => postService.deletePost(postId),
    onMutate: async (postId) => {
      // Cancel all related queries
      await queryClient.cancelQueries({ queryKey: ["posts", "user", id] });
      await queryClient.cancelQueries({ queryKey: ["posts", "feed"] });

      // Snapshot previous values with proper typing
      const previousWallData = queryClient.getQueryData<PostsPaginatedResponse>(
        ["posts", "user", id, page, PAGE_SIZE],
      ) || {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: page,
        size: PAGE_SIZE,
        first: true,
        last: true,
      };

      const previousFeedData = queryClient.getQueryData<PostsPaginatedResponse>(
        ["posts", "feed", 0],
      ) || {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: PAGE_SIZE,
        first: true,
        last: true,
      };

      // Optimistically remove from wall
      queryClient.setQueryData<PostsPaginatedResponse>(
        ["posts", "user", id, page, PAGE_SIZE],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            content: oldData.content.filter(
              (post: PostResponseDto) => post.id !== postId,
            ),
            totalElements: oldData.totalElements - 1,
          };
        },
      );

      // Optimistically remove from feed (first page)
      queryClient.setQueryData<PostsPaginatedResponse>(
        ["posts", "feed", 0],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            content: oldData.content.filter(
              (post: PostResponseDto) => post.id !== postId,
            ),
            totalElements: oldData.totalElements - 1,
          };
        },
      );

      // Also remove from all other pages of feed
      queryClient.setQueriesData<PostsPaginatedResponse>(
        { queryKey: ["posts", "feed"] },
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            content: oldData.content.filter(
              (post: PostResponseDto) => post.id !== postId,
            ),
            totalElements: oldData.totalElements - 1,
          };
        },
      );

      return { previousWallData, previousFeedData };
    },
    onSuccess: () => {
      // Show success message
      setSnackbar({
        open: true,
        message: "Post deleted successfully!",
        severity: "success",
      });

      // Invalidate both queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["posts", "user", id] });
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
    },
    onError: (error, postId, context) => {
      console.error("Error deleting post:", error);

      // Rollback to previous values
      if (context?.previousWallData) {
        queryClient.setQueryData(
          ["posts", "user", id, page, PAGE_SIZE],
          context.previousWallData,
        );
      }

      if (context?.previousFeedData) {
        queryClient.setQueryData(
          ["posts", "feed", 0],
          context.previousFeedData,
        );
      }

      setSnackbar({
        open: true,
        message: "Failed to delete post",
        severity: "error",
      });
    },
  });

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setPage(currentPage - 1);
    }
  };

  const handleCreatePost = (content: string) => {
    createPostMutation.mutate(content);
  };

  const handleEditPost = (postId: number, content: string) => {
    updatePostMutation.mutate({ id: postId, content });
  };

  const handleDeletePost = (postId: number) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      deletePostMutation.mutate(postId);
    }
  };

  const handleBackToFeed = () => {
    router.push("/feed");
  };

  // Handle profile update success
  const handleProfileUpdated = async () => {
    try {
      // Invalidate and refetch user data
      await queryClient.invalidateQueries({ queryKey: ["user", id] });

      // If this is the current user's wall
      if (isOwnWall && currentUser) {
        // Force a refetch of the user data
        await refetchUser();
        // Redirect to new username URL
        router.push(`/wall/${id}`);
        return;
      } else {
        console.error("No updated user data received");
      }

      // Refetch posts to ensure they're updated
      await refetchPosts();
    } catch (error) {
      console.error("Error in handleProfileUpdated:", error);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  if (userLoading) {
    return (
      <Container
        maxWidth="lg"
        sx={{ py: 4, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (userError || !userData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          <AlertTitle>User Not Found</AlertTitle>
          The user you're looking for doesn't exist or you don't have permission
          to view this page.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToFeed}
          sx={{ mt: 2 }}
        >
          Back to Feed
        </Button>
      </Container>
    );
  }

  // Create a safe user object with fallback values
  const safeUser = {
    id: userData?.id || 0,
    username: userData?.username || "unknown",
    displayName: userData?.displayName || userData?.username || "User",
    email: userData?.email || "",
    bio: userData?.bio || "",
    createdAt: userData?.createdAt || new Date().toISOString(),
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={handleBackToFeed}
        sx={{ mb: 3 }}
      >
        Back to Feed
      </Button>

      {/* User Profile Header */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid sx={{ xs: 12, md: 5 }}>
            <Avatar
              sx={{
                width: 120,
                height: 120,
                bgcolor: "primary.main",
                fontSize: "2.5rem",
              }}
            >
              {safeUser.displayName.charAt(0).toUpperCase()}
            </Avatar>
          </Grid>
          <Grid sx={{ xs: 12, md: 7 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Typography variant="h3" component="h1">
                {safeUser.displayName}
              </Typography>
              {isOwnWall && (
                <Button
                  startIcon={<EditIcon sx={{ color: "primary.main" }} />}
                  variant="outlined"
                  size="small"
                  onClick={() => setEditProfileOpen(true)}
                >
                  Edit Profile
                </Button>
              )}
            </Box>

            {safeUser.bio && (
              <Typography paragraph sx={{ mt: 2, mb: 3 }}>
                {safeUser.bio}
              </Typography>
            )}

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Chip label={`${totalElements} posts`} variant="outlined" />
              <Chip label={`${friendsCount} friends`} variant="outlined" />
              <Chip label="Member" color="primary" variant="outlined" />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 4, borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="fullWidth"
        >
          <Tab label="Posts" />
          <Tab label="About" />
          <Tab label="Friends" />
        </Tabs>
      </Paper>

      {/* Posts Tab */}
      {tabValue === 0 && (
        <>
          {/* Create Post Section (only on own wall) */}
          {isOwnWall && (
            <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    mr: 2,
                    bgcolor: "primary.main",
                  }}
                >
                  {currentUser?.displayName?.charAt(0) || "U"}
                </Avatar>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setCreateDialogOpen(true)}
                  sx={{ justifyContent: "flex-start", textAlign: "left" }}
                >
                  What's on your mind, {currentUser?.displayName}?
                </Button>
              </Box>
            </Paper>
          )}

          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            {isOwnWall ? "Your Posts" : "Posts"}
            {totalElements > 0 && (
              <Typography
                component="span"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                ({totalElements})
              </Typography>
            )}
          </Typography>

          {/* Loading state for posts */}
          {postsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : postsError ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to load posts. Please try again.
            </Alert>
          ) : posts.length > 0 ? (
            <>
              {posts.map((post: PostResponseDto) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onEdit={isOwnWall ? handleEditPost : undefined}
                  onDelete={isOwnWall ? handleDeletePost : undefined}
                  showActions={isOwnWall}
                />
              ))}

              {/* Pagination Controls */}
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 2,
                    mt: 4,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Button
                    startIcon={<ArrowBackIcon />}
                    disabled={currentPage === 0}
                    onClick={handlePrevPage}
                    variant="outlined"
                  >
                    Previous
                  </Button>

                  <Typography
                    variant="body1"
                    sx={{ minWidth: 120, textAlign: "center" }}
                  >
                    Page {currentPage + 1} of {totalPages}
                  </Typography>

                  <Button
                    endIcon={<ArrowForward />}
                    disabled={currentPage + 1 >= totalPages}
                    onClick={handleNextPage}
                    variant="outlined"
                  >
                    Next
                  </Button>
                </Box>
              )}
            </>
          ) : (
            <Alert severity="info">
              <AlertTitle>
                {isOwnWall
                  ? "You haven't created any posts yet"
                  : "No posts yet"}
              </AlertTitle>
              {isOwnWall
                ? "Create your first post to share with the community!"
                : "This user hasn't created any posts yet."}
            </Alert>
          )}
        </>
      )}

      {/* About Tab */}
      {tabValue === 1 && (
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom>
            About {safeUser.displayName}
          </Typography>

          <Grid container spacing={3}>
            <Grid sx={{ xs: 12, md: 6 }}>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="primary.main"
                  gutterBottom
                >
                  Bio
                </Typography>
                <Typography>{safeUser.bio || "No bio provided"}</Typography>
              </Box>
            </Grid>

            <Grid sx={{ xs: 12, md: 6 }}>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="primary.main"
                  gutterBottom
                >
                  Username
                </Typography>
                <Typography>{safeUser.username}</Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="primary.main"
                  gutterBottom
                >
                  Member Since
                </Typography>
                <Typography>
                  {new Date(safeUser.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Friends Tab */}
      {tabValue === 2 && (
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Friends
          </Typography>

          {/* Friends List */}
          <FriendsList userId={safeUser.id} isOwnWall={isOwnWall} />
        </Paper>
      )}

      {/* Create Post Dialog */}
      {isOwnWall && (
        <CreatePostDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSubmit={handleCreatePost}
          isLoading={createPostMutation.isPending}
        />
      )}

      {/* Edit Profile Dialog */}
      {isOwnWall && (
        <EditProfileDialog
          open={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          user={{
            id: safeUser.id,
            username: safeUser.username,
            displayName: safeUser.displayName,
            bio: safeUser.bio,
            email: safeUser.email,
          }}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Container>
  );
}
