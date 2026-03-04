import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest } from "./queryClient";

interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  loginEmail: string;
  authRole: "admin" | "project_manager" | "team_member";
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  requestCode: (email: string) => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
  isAdmin: boolean;
  isProjectManager: boolean;
  isTeamMember: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) setUser(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const requestCode = useCallback(async (email: string) => {
    const res = await apiRequest("POST", "/api/auth/request-code", { email });
    const data = await res.json();
    return data;
  }, []);

  const login = useCallback(async (email: string, code: string) => {
    const res = await apiRequest("POST", "/api/auth/verify-code", {
      email,
      code,
    });
    const data = await res.json();
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
    window.location.reload();
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) return false;
      return roles.includes(user.authRole);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        requestCode,
        hasRole,
        isAdmin: user?.authRole === "admin",
        isProjectManager: user?.authRole === "project_manager",
        isTeamMember: user?.authRole === "team_member",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
