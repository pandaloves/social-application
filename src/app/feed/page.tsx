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

  const { data: friends = [] } = useQuery<FriendshipResponseDto[]>({
    queryKey: ["friends", user?.id],
    queryFn: () => userService.getFriends(user!.id),
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

  const isFriend = (authorId: number) => {
    if (!friends || !authorId) return false;

    return friends.some((friend) => friend.id === authorId);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Fetch posts
  const {
    data: postsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      try {
        const response = await api.get("/posts", {
          params: {
            page: 0,
            size: 10,
            sort: "createdAt,desc",
          },
        });

        return response.data.content || response.data || [];
      } catch (error) {
        console.error("Error fetching posts:", error);
        return [];
      }
    },
    enabled: isAuthenticated,
  });

  // Extract posts from postsData (which should now be an array)
  const posts = postsData || [];

  const addFriendMutation = useMutation({
    mutationFn: (receiverId: number) =>
      friendshipService.createFriendship({
        requesterUserId: user!.id,
        addresseeUserId: receiverId,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });

      setSnackbar({
        open: true,
        message: "Friend request sent successfully!",
        severity: "success",
      });
    },

    onError: () => {
      setSnackbar({
        open: true,
        message: "Failed to send friend request",
        severity: "error",
      });
    },
  });

  const handleAddFriend = (receiverId: number) => {
    if (!user?.id) return;

    addFriendMutation.mutate(receiverId);
  };

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (content: string) =>
      postService.createPost({
        content,
        userId: user?.id || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setCreateDialogOpen(false);
    },
  });

  // Update post mutation
  const updatePostMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      postService.updatePost(id, { content, userId: user?.id || 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: (id: number) => postService.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const handleCreatePost = (content: string) => {
    createPostMutation.mutate(content);
  };

  const handleEditPost = (id: number, content: string) => {
    updatePostMutation.mutate({ id, content });
  };

  const handleDeletePost = (id: number) => {
    deletePostMutation.mutate(id);
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

  console.log("Friends:", friends);

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
