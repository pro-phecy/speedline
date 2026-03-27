// src/context/AuthContext.tsx
import React, { createContext, useContext, useState } from "react";
import {
  User,
  loginUser,
  registerUser,
  setCurrentUserId,
} from "../services/api";
import { socketManager } from "../services/socket";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, full_name: string, role?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  async function login(username: string, password: string) {
    const u = await loginUser(username, password);
    setCurrentUserId(u.id);
    setUser(u);
    socketManager.connect();
  }

  async function register(username: string, password: string, full_name: string, role?: string) {
    const u = await registerUser(username, password, full_name, role);
    setCurrentUserId(u.id);
    setUser(u);
    socketManager.connect();
  }

  function logout() {
    setCurrentUserId(null);
    setUser(null);
    socketManager.disconnect();
  }

  return (
    <AuthContext.Provider value={{ user, loading: false, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
