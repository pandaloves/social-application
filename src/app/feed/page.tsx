"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  AlertTitle,
  Fab,
  Button,
} from "@mui/material";
import {
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import MuiAlert from "@mui/material/Alert";
import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api, { postService } from "@/src/services/api";
import PostCard from "@/src/components/Post/PostCard";
import { friendshipService } from "@/src/services/api";
import CreatePostDialog from "@/src/components/Post/CreatePostDialog";
import { FriendshipResponseDto, PostResponseDto } from "@/src/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { PostsPaginatedResponse } from "@/src/types";

export default function FeedPage() {
  const {
    user,
    isAuthenticated,
    sendRequestOpen,
    setSendRequestOpen,
    friendUsername,
    setFriendUsername,
  } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Fetch friendships instead of just friends
  const { data: friendships = [] } = useQuery<FriendshipResponseDto[]>({
    queryKey: ["friendships", user?.id],
    queryFn: () => friendshipService.getFriendships(user!.id),
    enabled: !!user?.id,
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Helper function to check if two users are friends
  const isFriend = (authorId: number) => {
    if (!friendships || !authorId || !user?.id) return false;

    return friendships.some((friendship) => {
      const isAccepted = friendship.status === "ACCEPTED";
      const involvesAuthor =
        friendship.requester?.id === authorId ||
        friendship.addressee?.id === authorId;
      const involvesCurrentUser =
        friendship.requester?.id === user.id ||
        friendship.addressee?.id === user.id;

      return isAccepted && involvesAuthor && involvesCurrentUser;
    });
  };

  // Helper function to check if there's a pending request from current user to author
  const isRequestPending = (authorId: number) => {
    if (!friendships || !authorId || !user?.id) return false;

    return friendships.some((friendship) => {
      const isPending = friendship.status === "PENDING";
      const isFromCurrentUser = friendship.requester?.id === user.id;
      const isToAuthor = friendship.addressee?.id === authorId;

      return isPending && isFromCurrentUser && isToAuthor;
    });
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Fetch posts - FIXED: Use the same query key pattern as WallPage
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["posts", "feed", page],
    queryFn: async () => {
      const response = await postService.getPostsWithPagination({
        page,
        size: pageSize,
        sort: "createdAt,desc",
      });

      return response;
    },
    placeholderData: (previousData) => previousData,
    enabled: isAuthenticated,
  });

  const posts: PostResponseDto[] = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const currentPage = data?.number || 0;

  const addFriendMutation = useMutation({
    mutationFn: (receiverId: number) =>
      friendshipService.createFriendship({
        requesterUserId: user!.id,
        addresseeUserId: receiverId,
      }),
    onMutate: async (receiverId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["friendships", user?.id] });

      // Snapshot previous value
      const previousFriendships =
        queryClient.getQueryData(["friendships", user?.id]) || [];

      // Create optimistic friendship
      const optimisticFriendship = {
        id: Date.now(), // Temporary ID
        status: "PENDING",
        requester: user,
        addressee: { id: receiverId },
        createdAt: new Date().toISOString(),
      };

      // Optimistically update friendships
      queryClient.setQueryData(
        ["friendships", user?.id],
        (oldData: any[] = []) => {
          console.log("Optimistically adding friendship to feed");
          return [...oldData, optimisticFriendship];
        },
      );

      return { previousFriendships };
    },
    onSuccess: () => {
      // Invalidate friendships query to get fresh data
      queryClient.invalidateQueries({ queryKey: ["friendships", user?.id] });

      setSnackbar({
        open: true,
        message: "Friend request sent successfully!",
        severity: "success",
      });
    },
    onError: (error, receiverId, context) => {
      console.error("Error sending friend request:", error);

      // Rollback to previous value
      if (context?.previousFriendships) {
        queryClient.setQueryData(
          ["friendships", user?.id],
          context.previousFriendships,
        );
      }

      setSnackbar({
        open: true,
        message: "Failed to send friend request",
        severity: "error",
      });
    },
  });

  const handleAddFriend = (receiverId: number) => {
    if (!user?.id) return;

    // Check if already friends
    if (isFriend(receiverId)) {
      setSnackbar({
        open: true,
        message: "You are already friends with this user",
        severity: "info",
      });
      return;
    }

    // Check if request already pending
    if (isRequestPending(receiverId)) {
      setSnackbar({
        open: true,
        message: "Friend request already sent",
        severity: "info",
      });
      return;
    }

    addFriendMutation.mutate(receiverId);
  };

  // Create post mutation - UPDATED to properly update cache
  const createPostMutation = useMutation({
    mutationFn: (content: string) =>
      postService.createPost({
        content,
        userId: user?.id || 0,
      }),
    onMutate: async (content) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["posts", "feed"] });

      // Snapshot previous value
      const previousFeedPosts =
        queryClient.getQueryData(["posts", "feed"]) || [];

      // Create optimistic post
      const optimisticPost = {
        id: Date.now(), // Temporary ID
        content,
        author: user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
      };

      // Optimistically update feed posts
      queryClient.setQueryData(["posts", "feed"], (oldData: any[] = []) => {
        console.log("Optimistically adding post to feed (from FeedPage)");
        return [optimisticPost, ...oldData];
      });

      return { previousFeedPosts };
    },
    onSuccess: (newPost) => {
      console.log("Post created successfully from FeedPage:", newPost);

      // Replace optimistic post with real one
      queryClient.setQueryData(["posts", "feed"], (oldData: any[] = []) => {
        const filtered = oldData.filter((post) => post.id !== Date.now());
        return [newPost, ...filtered];
      });

      // Also update user's wall cache if viewing own wall
      if (user?.id) {
        queryClient.setQueryData(
          ["posts", "user", user.id],
          (oldData: any[] = []) => {
            const filtered = oldData.filter((post) => post.id !== Date.now());
            return [newPost, ...filtered];
          },
        );
      }

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ["posts", "user", user.id] });
      }

      setCreateDialogOpen(false);
      setSnackbar({
        open: true,
        message: "Post created successfully!",
        severity: "success",
      });
      setPage(0);
    },
    onError: (error, content, context) => {
      console.error("Error creating post from FeedPage:", error);

      // Rollback to previous value
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
  const updatePostMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      postService.updatePost(id, { content, userId: user?.id || 0 }),
    onMutate: async ({ id: postId, content }) => {
      // Cancel all related queries
      await queryClient.cancelQueries({ queryKey: ["posts", "feed"] });
      await queryClient.cancelQueries({ queryKey: ["posts", "user"] });

      // Snapshot previous values
      const previousFeedData = queryClient.getQueryData<PostsPaginatedResponse>(
        ["posts", "feed", page],
      ) || {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: page,
        size: pageSize,
        first: true,
        last: true,
      };

      // Find the post to get its author
      const postToUpdate = previousFeedData.content.find(
        (post: PostResponseDto) => post.id === postId,
      );
      const authorId = postToUpdate?.author?.id;

      // Create optimistic updated post
      const optimisticUpdatedPost: PostResponseDto = {
        ...postToUpdate!,
        content,
        createdAt: new Date().toISOString(),
      };

      // OPTIMISTIC UPDATE FOR FEED
      queryClient.setQueryData<PostsPaginatedResponse>(
        ["posts", "feed", page],
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

      // ALSO UPDATE WALL CACHE FOR THE AUTHOR
      if (authorId) {
        queryClient.setQueriesData<PostsPaginatedResponse>(
          { queryKey: ["posts", "user", authorId] },
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
      }

      return { previousFeedData, authorId, optimisticUpdatedPost };
    },
    onSuccess: (updatedPost) => {
      console.log("Post updated successfully from Feed:", updatedPost);

      // REPLACE OPTIMISTIC UPDATE WITH REAL DATA IN FEED
      queryClient.setQueryData<PostsPaginatedResponse>(
        ["posts", "feed", page],
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

      // ALSO UPDATE IN AUTHOR'S WALL
      if (updatedPost.author?.id) {
        queryClient.setQueriesData<PostsPaginatedResponse>(
          { queryKey: ["posts", "user", updatedPost.author.id] },
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
      }

      // INVALIDATE BOTH QUERIES
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
      if (updatedPost.author?.id) {
        queryClient.invalidateQueries({
          queryKey: ["posts", "user", updatedPost.author.id],
        });
      }

      setSnackbar({
        open: true,
        message: "Post updated successfully!",
        severity: "success",
      });
    },
    onError: (error, variables, context) => {
      console.error("Error updating post from Feed:", error);

      // Rollback feed posts
      if (context?.previousFeedData) {
        queryClient.setQueryData(
          ["posts", "feed", page],
          context.previousFeedData,
        );
      }

      setSnackbar({
        open: true,
        message: "Failed to update post",
        severity: "error",
      });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: (postId: number) => postService.deletePost(postId),
    onMutate: async (postId) => {
      // Cancel all related queries
      await queryClient.cancelQueries({ queryKey: ["posts", "feed"] });
      await queryClient.cancelQueries({ queryKey: ["posts", "user"] });

      // Snapshot previous values with proper typing
      const previousFeedData = queryClient.getQueryData<PostsPaginatedResponse>(
        ["posts", "feed", page],
      ) || {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: page,
        size: pageSize,
        first: true,
        last: true,
      };

      // Find the post to get its author
      const postToDelete = previousFeedData.content?.find(
        (post: PostResponseDto) => post.id === postId,
      );
      const authorId = postToDelete?.author?.id;

      // Optimistically remove from feed (handle paginated format)
      queryClient.setQueryData<PostsPaginatedResponse>(
        ["posts", "feed", page],
        (oldData) => {
          if (!oldData) return oldData;

          const newContent = oldData.content.filter(
            (post: PostResponseDto) => post.id !== postId,
          );

          return {
            ...oldData,
            content: newContent,
            totalElements: oldData.totalElements - 1,
          };
        },
      );

      // Also remove from author's wall if we know the author
      if (authorId) {
        // Remove from all pages of author's wall
        queryClient.setQueriesData<PostsPaginatedResponse>(
          { queryKey: ["posts", "user", authorId] },
          (oldData) => {
            if (!oldData) return oldData;

            const newContent = oldData.content.filter(
              (post: PostResponseDto) => post.id !== postId,
            );

            return {
              ...oldData,
              content: newContent,
              totalElements: oldData.totalElements - 1,
            };
          },
        );
      }

      return { previousFeedData, authorId };
    },
    onSuccess: (_, postId, context) => {
      // Show success message
      setSnackbar({
        open: true,
        message: "Post deleted successfully!",
        severity: "success",
      });

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
      if (context?.authorId) {
        queryClient.invalidateQueries({
          queryKey: ["posts", "user", context.authorId],
        });
      }
    },
    onError: (error, postId, context) => {
      console.error("Error deleting post:", error);

      // Rollback feed posts
      if (context?.previousFeedData) {
        queryClient.setQueryData(
          ["posts", "feed", page],
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

  const handleCreatePost = (content: string) => {
    createPostMutation.mutate(content);
  };

  const handleEditPost = (id: number, content: string) => {
    updatePostMutation.mutate({ id, content });
  };

  const handleDeletePost = (id: number) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      deletePostMutation.mutate(id);
    }
  };

  const handleComment = (postId: number, comment: string) => {
    // Implement comment functionality
    console.log("Comment on post", postId, comment);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <Container
        maxWidth="md"
        sx={{ mt: 4, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          Failed to load posts. Please try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Feed
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              // Refetch posts
              refetch();

              // Refetch friendships
              queryClient.invalidateQueries({
                queryKey: ["friendships", user?.id],
              });
            }}
          >
            Refresh
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Latest posts from everyone in the community
        </Typography>
      </Box>

      {/* Empty state */}
      {(!posts || posts.length === 0) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>No posts yet</AlertTitle>
          Be the first to create a post and start the conversation!
        </Alert>
      )}

      {/* Posts list */}
      {Array.isArray(posts) &&
        posts.length > 0 &&
        posts.map((post: PostResponseDto) => (
          <PostCard
            key={post.id}
            post={post}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onComment={handleComment}
            onAddFriend={handleAddFriend}
            showActions={user?.id === post.author.id}
            isFriend={isFriend(post.author.id)}
            isPending={isRequestPending(post.author.id)}
          />
        ))}

      {totalPages > 1 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            mt: 4,
          }}
        >
          <Button
            startIcon={<ArrowBack />}
            disabled={currentPage === 0}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Prev
          </Button>

          <Typography variant="body1">
            Page {currentPage + 1} of {totalPages}
          </Typography>

          <Button
            endIcon={<ArrowForward />}
            disabled={currentPage + 1 >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </Button>
        </Box>
      )}

      {/* Create Post FAB */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
        }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreatePost}
        isLoading={createPostMutation.isPending}
      />

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
