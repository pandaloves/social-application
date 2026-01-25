// components/DeleteAccountDialog.tsx (Material-UI version)
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useDeleteUser } from "../hooks/useDeleteUser";

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteAccountDialog({
  isOpen,
  onClose,
}: DeleteAccountDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const { user } = useAuth();
  const { deleteUser, isLoading, error } = useDeleteUser();

  const handleDelete = async () => {
    if (!user) return;

    if (confirmation !== "DELETE") {
      alert('Please type "DELETE" to confirm');
      return;
    }

    const result = await deleteUser(user.id);
    if (result.success) {
      onClose();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setConfirmation("");
      onClose();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" color="error.main">
          <WarningIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" component="span" fontWeight="bold">
            Delete Account
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} icon={<ErrorIcon />}>
            {error}
          </Alert>
        )}

        <DialogContentText sx={{ mb: 2, color: "text.primary" }}>
          This action <strong>cannot be undone</strong>. This will permanently
          delete:
        </DialogContentText>

        <List dense sx={{ mb: 3, pl: 1 }}>
          <ListItem sx={{ px: 0, py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Box component="span" sx={{ color: "error.main" }}>
                •
              </Box>
            </ListItemIcon>
            <ListItemText primary="Your profile and account information" />
          </ListItem>
          <ListItem sx={{ px: 0, py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Box component="span" sx={{ color: "error.main" }}>
                •
              </Box>
            </ListItemIcon>
            <ListItemText primary="All your posts and comments" />
          </ListItem>
          <ListItem sx={{ px: 0, py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Box component="span" sx={{ color: "error.main" }}>
                •
              </Box>
            </ListItemIcon>
            <ListItemText primary="Your friend connections and messages" />
          </ListItem>
        </List>

        <DialogContentText sx={{ mb: 2, color: "text.primary" }}>
          To confirm, please type{" "}
          <strong style={{ color: "error.main" }}>DELETE</strong> below:
        </DialogContentText>

        <TextField
          autoFocus
          fullWidth
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="Type DELETE here"
          disabled={isLoading}
          error={!!error && confirmation !== "DELETE"}
          helperText={error && confirmation !== "DELETE" ? error : " "}
          onKeyDown={(e) => {
            if (e.key === "Enter" && confirmation === "DELETE" && !isLoading) {
              handleDelete();
            }
          }}
          sx={{ mb: 1 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={isLoading}
          variant="outlined"
          startIcon={<CancelIcon />}
          sx={{ minWidth: 100 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          disabled={isLoading || confirmation !== "DELETE"}
          variant="contained"
          color="error"
          startIcon={
            isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <DeleteIcon />
            )
          }
          sx={{
            minWidth: 180,
            "&.Mui-disabled": {
              backgroundColor: "error.light",
              color: "rgba(255, 255, 255, 0.7)",
            },
          }}
        >
          {isLoading ? "Deleting..." : "Delete Account"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
