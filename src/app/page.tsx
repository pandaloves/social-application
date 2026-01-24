"use client";

import React, { useEffect } from "react";
import { Container, Box, Typography, Button, Grid, Paper } from "@mui/material";
import {
  Feed as FeedIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Chat as ChatIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to feed
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/feed");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box
        sx={{
          my: { xs: 6, md: 10 },
          textAlign: "center",
          px: { xs: 2, md: 0 },
        }}
      >
        <Typography
          variant="h2"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: "bold",
            background: "linear-gradient(45deg, #1976d2 30%, #2196f3 90%)",
            backgroundClip: "text",
            textFillColor: "transparent",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Welcome to SocialApp
        </Typography>
        <Typography
          variant="h5"
          color="text.secondary"
          paragraph
          sx={{ maxWidth: "800px", mx: "auto", mb: 4 }}
        >
          Connect with friends, share your thoughts, and discover amazing
          content in our vibrant social community.
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href="/register" passHref>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{ px: 4, py: 1.5 }}
            >
              Get Started
            </Button>
          </Link>
          <Link href="/login" passHref>
            <Button variant="outlined" size="large" sx={{ px: 4, py: 1.5 }}>
              Sign In
            </Button>
          </Link>
        </Box>
      </Box>

      {/* Features Section */}
      <Grid container spacing={4} sx={{ mb: 10 }}>
        <Grid sx={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: 4,
              height: "100%",
              borderRadius: 3,
              transition: "transform 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              },
            }}
          >
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <FeedIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
              <Typography
                variant="h5"
                gutterBottom
                fontWeight="bold"
                sx={{ color: "white" }}
              >
                Feed
              </Typography>
            </Box>
            <Typography align="center">
              Browse through posts from all users in chronological order. Stay
              updated with what's happening in your network.
            </Typography>
          </Paper>
        </Grid>

        <Grid sx={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: 4,
              height: "100%",
              borderRadius: 3,
              transition: "transform 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              },
            }}
          >
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <PersonIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Personal Wall
              </Typography>
            </Box>
            <Typography align="center">
              Your personal space to share thoughts, create posts, and manage
              your content. Express yourself freely!
            </Typography>
          </Paper>
        </Grid>

        <Grid sx={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: 4,
              height: "100%",
              borderRadius: 3,
              transition: "transform 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              },
            }}
          >
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <GroupIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Friends & Connections
              </Typography>
            </Box>
            <Typography align="center">
              Connect with friends, send friend requests, and build your social
              network. Grow your community!
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Call to Action */}
      <Box
        sx={{
          bgcolor: "primary.main",
          color: "white",
          p: 6,
          borderRadius: 3,
          textAlign: "center",
          mb: 8,
        }}
      >
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Ready to Join Our Community?
        </Typography>
        <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
          Sign up now and start connecting with amazing people
        </Typography>
        <Link href="/register" passHref>
          <Button
            variant="contained"
            size="large"
            sx={{
              bgcolor: "white",
              color: "primary.main",
              "&:hover": {
                bgcolor: "grey.100",
              },
              px: 5,
              py: 1.5,
            }}
          >
            Create Free Account
          </Button>
        </Link>
      </Box>
    </Container>
  );
}
