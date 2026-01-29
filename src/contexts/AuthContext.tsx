"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { UserResponseDto } from "../types";
import { authService, userService } from "../services/api";

type AuthContextType = {
  user: UserResponseDto | null;
  isAuthenticated: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  updateUserContext: (user: UserResponseDto) => void;
  isLoading: boolean;
  sendRequestOpen: boolean;
  setSendRequestOpen: React.Dispatch<React.SetStateAction<boolean>>;
  friendUsername: string;
  setFriendUsername: React.Dispatch<React.SetStateAction<string>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

type AuthProviderProps = {
  children: ReactNode;
};

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sendRequestOpen, setSendRequestOpen] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (storedUser && token) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.clear();
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login({ username, password });
      if (response.success) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("refreshToken", response.refreshToken);

        // Fetch user by username to get full user data
        const usersResponse = await userService.getUsers();
        const foundUser = usersResponse.find(
          (u: UserResponseDto) => u.username === username,
        );

        if (foundUser) {
          localStorage.setItem("user", JSON.stringify(foundUser));
          setUser(foundUser);
          return { success: true };
        }
      }
      return { success: false, error: "Invalid credentials" };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  const register = async (userData: any) => {
    try {
      const response = await authService.register(userData);
      return { success: true, data: response };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Registration failed",
      };
    }
  };

  const updateUserContext = (user: UserResponseDto) => {
    setUser(user);
    localStorage.setItem("user", JSON.stringify(user));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        updateUserContext,
        isLoading,
        sendRequestOpen,
        setSendRequestOpen,
        friendUsername,
        setFriendUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
