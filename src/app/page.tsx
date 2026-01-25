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
    <Container
      maxWidth="lg"
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
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
    </Container>
  );
}
