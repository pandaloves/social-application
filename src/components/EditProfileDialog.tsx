"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
} from "@mui/icons-material";
import { useMutation } from "@tanstack/react-query";
import { userService } from "@/src/services/api";
import { useAuth } from "../contexts/AuthContext";
import { UserResponseDto } from "../types";

type EditProfileDialogProps = {
  open: boolean;
  onClose: () => void;
  user: {
    id: number;
    username: string;
    displayName: string;
    bio?: string;
    email?: string;
  };
  onProfileUpdated?: (updatedUser: UserResponseDto) => void;
};

export default function EditProfileDialog({
  open,
  onClose,
  user,
  onProfileUpdated,
}: EditProfileDialogProps) {
  const [username, setUsername] = useState(user.username || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [email, setEmail] = useState(user.email || "");
  const { updateUserContext } = useAuth();

  useEffect(() => {
    // Reset fields when dialog opens
    if (open) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setEmail(user.email || "");
    }
  }, [open, user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: {
      username: string;
      email: string;
      password: string;
      displayName: string;
      bio: string;
    }) => userService.updateUser(user.id, data),

    onSuccess: (updatedUser) => {
      updateUserContext(updatedUser);
      onProfileUpdated?.(updatedUser);
      onClose();
    },
  });

  const handleSubmit = () => {
    updateProfileMutation.mutate({
      username,
      password,
      displayName,
      bio,
      email,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ mt: 1 }}>Edit Profile</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Username"
          fullWidth
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mt: 1 }}
        />
        <TextField
          fullWidth
          label="Password *"
          name="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          required
          disabled={isLoading}
          helperText="Enter new password"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="Email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Display Name"
          fullWidth
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <TextField
          label="Bio"
          fullWidth
          multiline
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ mb: 2, mr: 2 }}>
        <Button onClick={onClose} disabled={updateProfileMutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={updateProfileMutation.isPending || !displayName.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
