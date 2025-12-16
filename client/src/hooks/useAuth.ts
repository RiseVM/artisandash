import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface RolePermission {
  id: number;
  role: string;
  permission: string;
  enabled: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: permissions = [] } = useQuery<RolePermission[]>({
    queryKey: ["/api/role-permissions"],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    
    const perm = permissions.find(
      p => p.role === user.role && p.permission === permission
    );
    return perm?.enabled === "yes";
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isManager: user?.role === "admin" || user?.role === "manager",
    hasPermission,
    logout,
  };
}
