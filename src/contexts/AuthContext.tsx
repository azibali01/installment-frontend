"use client";

import React, { createContext, useState, useEffect } from "react";
import type { User } from "../types";
import client from "../api/client";

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: string[];
  hasPermission: (p: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        try {
          client.defaults.headers.Authorization = `Bearer ${storedToken}`;
          const res = await client.get(`/roles/${parsed.role}`);
          setPermissions(res.data.permissions || []);
        } catch (err) {
          setPermissions([]);
        }
      }
      setIsLoading(false);
    };

    void init();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          (data && (data.error || data.message)) || "Login failed"
        );
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      try {
        const rp = await client.get(`/roles/${data.user.role}`);
        setPermissions(rp.data.permissions || []);
      } catch (err) {
        setPermissions([]);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setPermissions([]);
  };

  const hasPermission = (p: string) => {
    if (!permissions || permissions.length === 0) return false;
    return permissions.includes(p);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        hasPermission,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
