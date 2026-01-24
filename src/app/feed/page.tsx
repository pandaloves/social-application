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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api, { postService } from "@/src/services/api";
import PostCard from "@/src/components/Post/PostCard";
import { friendshipService } from "@/src/services/api";
import CreatePostDialog from "@/src/components/Post/CreatePostDialog";
import { FriendshipResponseDto, PostResponseDto } from "@/src/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { userService } from "@/src/services/api";

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
  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["posts", "feed"],
    queryFn: async () => {
      try {
        console.log("Fetching feed posts...");
        const postsData = await postService.getPosts({
          page: 0,
          size: 50,
          sort: "createdAt,desc",
        });
        console.log("Feed posts fetched:", postsData?.length || 0, "posts");
        return Array.isArray(postsData) ? postsData : [];
      } catch (error) {
        console.error("Error fetching feed posts:", error);
        return [];
      }
    },
    enabled: isAuthenticated,
  });

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
    onSuccess: (updatedPost) => {
      // Update post in feed
      queryClient.setQueryData(["posts", "feed"], (oldData: any[] = []) => {
        return oldData.map((post) =>
          post.id === updatedPost.id ? updatedPost : post,
        );
      });

      // Also update in user's wall if needed
      if (user?.id && updatedPost.author?.id === user.id) {
        queryClient.setQueryData(
          ["posts", "user", user.id],
          (oldData: any[] = []) => {
            return oldData.map((post) =>
              post.id === updatedPost.id ? updatedPost : post,
            );
          },
        );
      }

      setSnackbar({
        open: true,
        message: "Post updated successfully!",
        severity: "success",
      });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: (id: number) => postService.deletePost(id),
    onMutate: async (postId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["posts", "feed"] });

      // Snapshot previous value
      const previousFeedPosts =
        queryClient.getQueryData(["posts", "feed"]) || [];

      // Optimistically remove from feed
      queryClient.setQueryData(["posts", "feed"], (oldData: any[] = []) => {
        return oldData.filter((post) => post.id !== postId);
      });

      return { previousFeedPosts };
    },
    onSuccess: (_, postId) => {
      // Also remove from user's wall if needed
      if (user?.id) {
        queryClient.setQueryData(
          ["posts", "user", user.id],
          (oldData: any[] = []) => {
            return oldData.filter((post) => post.id !== postId);
          },
        );
      }

      setSnackbar({
        open: true,
        message: "Post deleted successfully!",
        severity: "success",
      });
    },
    onError: (error, postId, context) => {
      console.error("Error deleting post:", error);

      // Rollback to previous value
      if (context?.previousFeedPosts) {
        queryClient.setQueryData(["posts", "feed"], context.previousFeedPosts);
      }
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

  console.log("Feed posts:", posts.length);
  console.log("Friendships for feed:", friendships.length);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Feed
        </Typography>
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
          />
        ))}

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
