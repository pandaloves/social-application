"use client";

import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Container,
} from "@mui/material";
import {
  Home as HomeIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import DeleteAccountDialog from "../DeleteAccountDialog";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    router.push("/login");
  };

  const handleMyWall = () => {
    if (user) {
      router.push(`/wall/${user.id}`);
    }
    handleMenuClose();
  };

  const handleDeleteAccountClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <AppBar position="sticky" elevation={1}>
        <Container maxWidth="lg">
          <Toolbar disableGutters>
            <Link
              href="/"
              passHref
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <HomeIcon sx={{ mr: 1 }} />
                <Typography
                  variant="h6"
                  component="div"
                  sx={{ flexGrow: 1, fontWeight: "bold" }}
                >
                  SocialApp
                </Typography>
              </Box>
            </Link>

            <Box sx={{ flexGrow: 1 }} />

            {isAuthenticated ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Link href="/feed" passHref>
                  <Button sx={{ fontSize: "1rem", color: "white" }}>
                    Feed
                  </Button>
                </Link>

                <IconButton
                  size="large"
                  edge="end"
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenuOpen}
                  color="inherit"
                >
                  <Avatar
                    sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}
                  >
                    {user?.displayName?.charAt(0) || <PersonIcon />}
                  </Avatar>
                </IconButton>

                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      mt: 1.5,
                      minWidth: 200,
                    },
                  }}
                >
                  <MenuItem onClick={handleMyWall}>
                    <PersonIcon sx={{ mr: 1.5, fontSize: 20 }} />
                    My Wall
                  </MenuItem>

                  <MenuItem
                    onClick={handleLogout}
                    sx={{ color: "primary.main" }}
                  >
                    Logout
                  </MenuItem>

                  <Box
                    sx={{ borderTop: 1, borderColor: "divider", mt: 1, pt: 1 }}
                  >
                    <MenuItem
                      onClick={handleDeleteAccountClick}
                      sx={{
                        color: "error.main",
                        "&:hover": {
                          backgroundColor: "error.light",
                          color: "error.contrastText",
                        },
                      }}
                    >
                      <DeleteIcon sx={{ mr: 1.5, fontSize: 20 }} />
                      Delete Account
                    </MenuItem>
                  </Box>
                </Menu>
              </Box>
            ) : (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Link href="/login" passHref>
                  <Button sx={{ fontSize: "1rem", color: "white" }}>
                    Login
                  </Button>
                </Link>
                <Link href="/register" passHref>
                  <Button
                    variant="contained"
                    color="inherit"
                    sx={{ fontSize: "1rem" }}
                  >
                    Register
                  </Button>
                </Link>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        isOpen={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
      />
    </>
  );
}
