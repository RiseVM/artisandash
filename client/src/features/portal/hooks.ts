import { createContext, useContext, useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ClientPortalUser } from "@shared/schema";

// Re-export the types for convenience
export type { ClientPortalUser };

interface PortalAuthContextType {
  user: ClientPortalUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const PortalAuthContext = createContext<PortalAuthContextType | null>(null);

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);
  if (!context) {
    throw new Error("usePortalAuth must be used within a PortalAuthProvider");
  }
  return context;
}

// Provider logic extracted for use in PortalAuthProvider component
export function usePortalAuthState() {
  const [user, setUser] = useState<ClientPortalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/portal/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? data);
      } else {
        // Check if admin session exists (admin preview mode)
        const adminRes = await fetch("/api/auth/me", { credentials: "include" });
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          if (adminData.user && (adminData.user.role === "admin" || adminData.user.role === "owner")) {
            setUser({
              id: "admin-preview",
              email: adminData.user.email,
              is_active: "yes",
              customer: { id: 0, name: "Admin Preview" },
              isAdminPreview: true,
            } as any);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Login failed");
      }

      const data = await res.json();
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/portal/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}

// ── Portal Data Mutations ────────────────────────

export function useSendPortalSetupEmail() {
  return useMutation<
    { success: boolean },
    Error,
    { customer_email: string; customer_name: string; context: string; context_details: string }
  >({
    mutationFn: (data) => api.post("/api/send-portal-setup-email", data),
  });
}
