"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  auth, account, setToken, getToken, clearToken,
  setRefreshToken, clearRefreshToken,
  setAuthCache, getCachedPermissions, getCachedRoles, clearAuthCache,
  type GetUserResponse,
} from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthState {
  user: GetUserResponse | null;
  permissions: string[];
  roles: { roleID: number; roleName: string }[];
  loading: boolean;
  sessionId: number | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login: (userName: string, password: string) => Promise<{ requiresMfa?: boolean; mfaTicket?: string; error?: string }>;
  completeMfa: (mfaTicket: string, code: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  refreshUser: () => Promise<void>;
  register: (data: {
    userName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    gender?: string;
  }) => Promise<{ success: boolean; userID?: number; error?: string }>;
  verifyRegisterEmail: (userID: number, token: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    permissions: [],
    roles: [],
    loading: true,
    sessionId: null,
    token: null,
  });

  const refreshUser = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        setState((s) => ({ ...s, user: null, loading: false }));
        return;
      }

      const res = await account.getMe();
      if (res.errorCode === 200 && res.data) {
        setState((s) => ({ ...s, user: res.data, loading: false }));
      } else {
        clearToken();
        clearRefreshToken();
        clearAuthCache();
        setState({
          user: null,
          permissions: [],
          roles: [],
          loading: false,
          sessionId: null,
          token: null,
        });
      }
    } catch {
      setState((s) => ({ ...s, user: null, loading: false }));
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token) {
      // Khôi phục permissions/roles đã cache để hasPermission() hoạt động ngay
      // sau khi reload (không phải đợi đăng nhập lại).
      setState((s) => ({
        ...s,
        token,
        permissions: getCachedPermissions(),
        roles: getCachedRoles(),
      }));
      refreshUser();
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [refreshUser]);

  const login = useCallback(
    async (userName: string, password: string) => {
      try {
        let res = await auth.userLogin(userName, password);
        if (res.errorCode !== 200 || !res.data) {
          res = await auth.staffLogin(userName, password);
        }

        if (res.errorCode !== 200 || !res.data) {
          return { error: res.errorMessage || "Sai tài khoản hoặc mật khẩu" };
        }

        const d = res.data;

        if (d.requiresMFA) {
          return { requiresMfa: true, mfaTicket: d.mfaTicket };
        }

        setToken(d.token);
        if (d.refreshToken) setRefreshToken(d.refreshToken);
        setAuthCache(d.permissions ?? [], d.roles ?? []);
        setState((s) => ({
          ...s,
          token: d.token,
          permissions: d.permissions ?? [],
          roles: d.roles ?? [],
          sessionId: d.sessionId,
        }));

        await refreshUser();
        return {};
      } catch (error) {
        return { error: error instanceof Error ? error.message : "Lỗi kết nối" };
      }
    },
    [refreshUser]
  );

  const completeMfa = useCallback(
    async (mfaTicket: string, code: string) => {
      try {
        const res = await auth.verifyMFA(mfaTicket, code);

        if (res.errorCode !== 200 || !res.data) {
          return { error: res.errorMessage || "Mã MFA không đúng hoặc đã hết hạn" };
        }

        const d = res.data;
        setToken(d.token);
        if (d.refreshToken) setRefreshToken(d.refreshToken);
        setAuthCache(d.permissions ?? [], d.roles ?? []);
        setState((s) => ({
          ...s,
          token: d.token,
          permissions: d.permissions ?? [],
          roles: d.roles ?? [],
          sessionId: d.sessionId,
        }));

        await refreshUser();
        return {};
      } catch (error) {
        return { error: error instanceof Error ? error.message : "Lỗi kết nối" };
      }
    },
    [refreshUser]
  );

  const register = useCallback(
    async (data: {
      userName: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      gender?: string;
    }) => {
      try {
        const res = await auth.register(data);

        if (res.errorCode !== 200) {
          return { success: false, error: res.errorMessage || "Đăng ký thất bại" };
        }

        return { success: true, userID: res.data?.userID };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Lỗi kết nối" };
      }
    },
    []
  );

  const verifyRegisterEmail = useCallback(
    async (userID: number, token: string) => {
      try {
        const res = await auth.verifyRegisterEmail(userID, token);
        if (res.errorCode !== 200) {
          return { success: false, error: res.errorMessage || "Xác thực thất bại" };
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Lỗi kết nối" };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // Continue with logout even if API fails
    } finally {
      clearToken();
      clearRefreshToken();
      clearAuthCache();
      setState({
        user: null,
        permissions: [],
        roles: [],
        loading: false,
        sessionId: null,
        token: null,
      });
      router.push("/login");
    }
  }, [router]);

  // Vai trò "admin" là siêu quản trị — luôn có mọi quyền (an toàn kể cả khi
  // thiếu 1 code nào đó trong cache). Ngoài ra mới xét theo danh sách quyền.
  const isAdmin = state.roles.some((r) => r.roleName?.toLowerCase() === "admin");
  const hasPermission = useCallback(
    (code: string) => isAdmin || state.permissions.includes(code),
    [isAdmin, state.permissions]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        completeMfa,
        logout,
        hasPermission,
        refreshUser,
        register,
        verifyRegisterEmail,
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
