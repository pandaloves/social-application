"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "@/src/contexts/AuthContext";

type CreatePostDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  isLoading: boolean;
};

export default function CreatePostDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
}: CreatePostDialogProps) {
  const [content, setContent] = useState("");
  const { user } = useAuth();

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content);
      setContent("");
    }
  };

  const handleClose = () => {
    setContent("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Post</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Posting as: {user?.displayName}
          </Typography>
        </Box>
        <TextField
          autoFocus
          fullWidth
          multiline
          rows={4}
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isLoading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!content.trim() || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? "Posting..." : "Post"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
