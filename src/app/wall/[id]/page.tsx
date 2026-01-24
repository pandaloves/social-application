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
} from "@mui/material";
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { postService, userService } from "@/src/services/api";
import PostCard from "@/src/components/Post/PostCard";
import CreatePostDialog from "@/src/components/Post/CreatePostDialog";
import { PostResponseDto, UserResponseDto } from "@/src/types";
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

  // Fetch posts for this user
  const {
    data: postsData = [],
    isLoading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useQuery({
    queryKey: ["user-posts", id],
    queryFn: async () => {
      try {
        // Get all posts
        const allPosts = await postService.getPosts();
        console.log("All the auth posts:", allPosts);

        // Filter posts by author
        const userPosts = Array.isArray(allPosts)
          ? allPosts.filter((post: any) => post.author?.id === id)
          : allPosts?.content?.filter((post: any) => post.author?.id === id) ||
            [];

        console.log("User posts:", userPosts);
        return userPosts;
      } catch (error) {
        console.error("Error fetching posts:", error);
        return [];
      }
    },
    enabled: !!id && !!userData && isAuthenticated,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (content: string) =>
      postService.createPost({
        content,
        userId: currentUser?.id || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-posts", id] });
      setCreateDialogOpen(false);
    },
  });

  // Update post mutation
  const updatePostMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      postService.updatePost(id, {
        content,
        userId: currentUser?.id || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-posts", id] });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: (id: number) => postService.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-posts", id] });
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
        const updatedUserData = await refetchUser();
        // Redirect to new username URL
        router.push(`/wall/${id}`);
        return; // Stop execution here since we're redirecting
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
    // Add createdAt if available
    createdAt: userData?.createdAt || new Date().toISOString(),
  };

  // Use optional chaining for posts
  const posts = postsData || [];

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
              <Chip label={`${posts.length} posts`} variant="outlined" />
              <Chip label="0 friends" variant="outlined" />
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
            {posts.length > 0 && (
              <Typography
                component="span"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                ({posts.length})
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
            posts.map((post: PostResponseDto) => (
              <PostCard
                key={post.id}
                post={post}
                onEdit={isOwnWall ? handleEditPost : undefined}
                onDelete={isOwnWall ? handleDeletePost : undefined}
                showActions={isOwnWall}
              />
            ))
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
    </Container>
  );
}
