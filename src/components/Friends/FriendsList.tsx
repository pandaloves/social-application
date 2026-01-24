"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Button,
  Typography,
  Alert,
  Chip,
  IconButton,
} from "@mui/material";
import {
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Chat as ChatIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { friendshipService } from "@/src/services/api";
import { useAuth } from "@/src/contexts/AuthContext";
import { useRouter } from "next/navigation";
import SendFriendRequestDialog from "../SendFriendRequestDialog";

interface FriendsListProps {
  userId: number;
  isOwnWall: boolean;
}

export default function FriendsList({ userId, isOwnWall }: FriendsListProps) {
  const {
    user: currentUser,
    sendRequestOpen,
    setSendRequestOpen,
    friendUsername,
    setFriendUsername,
  } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Debug: Log to see what's happening
  useEffect(() => {
    console.log("FriendsList mounted with userId:", userId);
    console.log("Current user:", currentUser);
  }, [userId, currentUser]);

  // Fetch friendships
  const {
    data: friendships,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["friendships", userId],
    queryFn: () => friendshipService.getFriendships(userId),
    enabled: !!userId,
  });

  // Debug friendships data
  useEffect(() => {
    if (friendships) {
      console.log("=== FRIENDSHIPS DATA ===");
      console.log("Raw data:", friendships);
      console.log("Is array?", Array.isArray(friendships));
      if (Array.isArray(friendships) && friendships.length > 0) {
        console.log("First friendship:", friendships[0]);
        console.log("Has addressee?", "addressee" in friendships[0]);
        console.log("Has receiver?", "receiver" in friendships[0]);
      }
    }
  }, [friendships]);

  // Helper to get the other person in the friendship
  const getOtherPerson = (friendship: any) => {
    if (!friendship) return null;

    // Check which user is NOT the profile owner
    if (friendship.requester?.id === userId) {
      return friendship.addressee || friendship.receiver;
    } else {
      return friendship.requester;
    }
  };

  // Helper to get receiver/addressee
  const getReceiver = (friendship: any) => {
    return friendship.addressee || friendship.receiver; // Prefer addressee
  };

  // Safe filter for pending requests where current user is the receiver/addressee
  const pendingRequests = useMemo(() => {
    if (!Array.isArray(friendships)) return [];
    return friendships.filter((f: any) => {
      const receiver = getReceiver(f);
      return f?.status === "PENDING" && receiver?.id === currentUser?.id;
    });
  }, [friendships, currentUser]);

  // Safe filter for sent requests where current user is the requester
  const sentRequests = useMemo(() => {
    if (!Array.isArray(friendships)) return [];
    return friendships.filter(
      (f: any) =>
        f?.status === "PENDING" && f?.requester?.id === currentUser?.id,
    );
  }, [friendships, currentUser]);

  // Safe filter for accepted friends
  const acceptedFriends = useMemo(() => {
    if (!Array.isArray(friendships)) return [];
    return friendships.filter((f: any) => f?.status === "ACCEPTED");
  }, [friendships]);

  // Send friend request mutation
  const sendRequestMutation = useMutation({
    mutationFn: (targetUserId: number) =>
      friendshipService.createFriendship({
        requesterUserId: currentUser?.id || 0,
        addresseeUserId: targetUserId,
        status: "PENDING",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendships", userId] });
      setSendRequestOpen(false);
      setFriendUsername("");
    },
  });

  // Accept friendship mutation
  const acceptMutation = useMutation({
    mutationFn: (friendshipId: number) =>
      friendshipService.acceptFriendship(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendships", userId] });
    },
  });

  // Reject friendship mutation
  const rejectMutation = useMutation({
    mutationFn: (friendshipId: number) =>
      friendshipService.rejectFriendship(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendships", userId] });
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <Typography>Loading friends...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load friends. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Action buttons for own wall */}
      {isOwnWall && (
        <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setSendRequestOpen(true)}
          >
            Send Friend Request
          </Button>
        </Box>
      )}

      {/* Pending requests (only shown to current user) */}
      {isOwnWall && pendingRequests.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom color="primary">
            Friend Requests ({pendingRequests.length})
          </Typography>
          <List>
            {pendingRequests.map((request: any) => {
              const requester = request.requester;
              if (!requester) return null;

              return (
                <ListItem
                  key={request.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "primary.light",
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: "primary.50",
                  }}
                  secondaryAction={
                    <Box>
                      <IconButton
                        color="success"
                        onClick={() => acceptMutation.mutate(request.id)}
                        sx={{ mr: 1 }}
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => rejectMutation.mutate(request.id)}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Avatar>
                      {requester.displayName?.charAt(0) ||
                        requester.username?.charAt(0) || <PersonIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      requester.displayName ||
                      requester.username ||
                      "Unknown User"
                    }
                    secondary={`@${
                      requester.username || "unknown"
                    } wants to be your friend`}
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
      )}

      {/* Sent requests (only shown to current user) */}
      {isOwnWall && sentRequests.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom color="text.secondary">
            Sent Requests ({sentRequests.length})
          </Typography>
          <List>
            {sentRequests.map((request: any) => {
              const receiver = getReceiver(request);
              if (!receiver) return null;

              return (
                <ListItem
                  key={request.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "grey.300",
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>
                      {receiver.displayName?.charAt(0) ||
                        receiver.username?.charAt(0) || <PersonIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      receiver.displayName ||
                      receiver.username ||
                      "Unknown User"
                    }
                    secondary={`Waiting for @${
                      receiver.username || "unknown"
                    } to accept`}
                  />
                  <Chip label="Pending" size="small" color="warning" />
                </ListItem>
              );
            })}
          </List>
        </Box>
      )}

      {/* Accepted friends */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Friends ({acceptedFriends.length})
        </Typography>

        {acceptedFriends.length > 0 ? (
          <List>
            {acceptedFriends.map((friendship: any) => {
              const friend = getOtherPerson(friendship);
              if (!friend) return null;

              return (
                <ListItem
                  key={friendship.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "grey.200",
                    borderRadius: 1,
                    mb: 1,
                    "&:hover": {
                      bgcolor: "action.hover",
                      cursor: "pointer",
                    },
                  }}
                  onClick={() =>
                    friend.username && router.push(`/wall/${friend.id}`)
                  }
                  secondaryAction={
                    isOwnWall ? (
                      <IconButton edge="end" sx={{ color: "primary.main" }}>
                        <ChatIcon />
                      </IconButton>
                    ) : null
                  }
                >
                  <ListItemAvatar>
                    <Avatar>
                      {friend.displayName?.charAt(0) ||
                        friend.username?.charAt(0) || <PersonIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      friend.displayName || friend.username || "Unknown Friend"
                    }
                    secondary={`@${friend.username || "unknown"}`}
                  />
                  <Chip
                    label="Friend"
                    size="small"
                    color="success"
                    sx={{ mr: 2 }}
                  />
                </ListItem>
              );
            })}
          </List>
        ) : (
          <Alert severity="info">
            {isOwnWall
              ? "You haven't added any friends yet. Use the 'Send Friend Request' button to connect with others!"
              : "This user hasn't added any friends yet."}
          </Alert>
        )}
      </Box>

      {/* Send Friend Request Dialog */}
      <SendFriendRequestDialog
        sendRequestOpen={sendRequestOpen}
        setSendRequestOpen={setSendRequestOpen}
        friendUsername={friendUsername}
        setFriendUsername={setFriendUsername}
      />
    </Box>
  );
}
