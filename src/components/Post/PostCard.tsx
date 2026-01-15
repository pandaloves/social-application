"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Avatar,
  Typography,
  Button,
  IconButton,
  Box,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Favorite as LikeIcon,
  Comment as CommentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { PostResponseDto } from "@/src/types";
import { useAuth } from "@/src/contexts/AuthContext";

type PostCardProps = {
  post: PostResponseDto;
  onEdit?: (id: number, content: string) => void;
  onDelete?: (id: number) => void;
  onComment?: (postId: number, comment: string) => void;
  showActions?: boolean;
};

export default function PostCard({
  post,
  onEdit,
  onDelete,
  onComment,
  showActions = true,
}: PostCardProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isOwnPost = user?.id === post.author.id;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== "") {
      onEdit(post.id, editContent);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(post.content);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setShowDeleteDialog(true);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(post.id);
      setShowDeleteDialog(false);
    }
  };

  const handleComment = () => {
    if (onComment && commentText.trim() !== "") {
      onComment(post.id, commentText);
      setCommentText("");
      setShowCommentForm(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={
            <Link href={`/wall/${post.author.username}`} passHref>
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  cursor: "pointer",
                  "&:hover": { opacity: 0.8 },
                }}
              >
                {post.author.displayName?.charAt(0) || "U"}
              </Avatar>
            </Link>
          }
          title={
            <Link href={`/wall/${post.author.username}`} passHref>
              <Typography
                variant="subtitle1"
                sx={{
                  cursor: "pointer",
                  fontWeight: "bold",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {post.author.displayName}
              </Typography>
            </Link>
          }
          subheader={
            <Typography variant="caption" color="text.secondary">
              {formatDate(post.createdAt)}
            </Typography>
          }
          action={
            isOwnPost &&
            showActions && (
              <>
                <IconButton onClick={handleMenuOpen}>
                  <MoreIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={handleEdit}>
                    <EditIcon sx={{ mr: 1 }} fontSize="small" />
                    Edit
                  </MenuItem>
                  <MenuItem onClick={handleDeleteClick}>
                    <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
                    Delete
                  </MenuItem>
                </Menu>
              </>
            )
          }
        />

        <CardContent>
          {isEditing ? (
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button size="small" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                >
                  Save
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
              {post.content}
            </Typography>
          )}
        </CardContent>

        {showActions && (
          <CardActions disableSpacing sx={{ pt: 0 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <IconButton aria-label="like" size="small">
                <LikeIcon fontSize="small" />
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  0
                </Typography>
              </IconButton>

              <IconButton
                aria-label="comment"
                size="small"
                onClick={() => setShowCommentForm(!showCommentForm)}
              >
                <CommentIcon fontSize="small" />
              </IconButton>

              <IconButton aria-label="share" size="small">
                <ShareIcon fontSize="small" />
              </IconButton>
            </Box>
          </CardActions>
        )}

        {showCommentForm && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Add a comment
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button size="small" onClick={() => setShowCommentForm(false)}>
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleComment}
                disabled={!commentText.trim()}
              >
                Comment
              </Button>
            </Box>
          </Box>
        )}
      </Card>

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>Delete Post</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this post? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
