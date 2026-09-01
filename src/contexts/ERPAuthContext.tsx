import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  getAuthState,
  setAuthState,
  hashPassword,
  verifyPassword,
  isSetupComplete,
  completeSetup,
  logActivity,
  getBusinessSettings,
  saveBusinessSettings,
  getAppSettings,
  saveAppSettings,
} from "@/lib/db";
import type { AuthState, BusinessSettings, AppSettings } from "@/types/erp";

interface AuthContextValue {
  auth: AuthState;
  businessSettings: BusinessSettings;
  appSettings: AppSettings;
  login: (userId: string, password: string) => boolean;
  logout: () => void;
  setupComplete: boolean;
  finishSetup: (
    userId: string,
    password: string,
    business: BusinessSettings,
  ) => void;
  updateBusinessSettings: (s: BusinessSettings) => void;
  updateAppSettings: (s: AppSettings) => void;
  changePassword: (currentPassword: string, newPassword: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_KEY = "erp_admin_credentials";

function getStoredCredentials(): {
  userId: string;
  passwordHash: string;
} | null {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredCredentials(userId: string, password: string) {
  localStorage.setItem(
    ADMIN_KEY,
    JSON.stringify({ userId, passwordHash: hashPassword(password) }),
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => getAuthState());
  const [businessSettings, setBusinessSettingsState] =
    useState<BusinessSettings>(getBusinessSettings);
  const [appSettings, setAppSettingsState] =
    useState<AppSettings>(getAppSettings);
  const [setupComplete, setSetupComplete] = useState<boolean>(isSetupComplete);

  useEffect(() => {
    setAuthState(auth);
  }, [auth]);

  const login = useCallback((userId: string, password: string): boolean => {
    const creds = getStoredCredentials();
    if (!creds) return false;
    if (
      creds.userId === userId &&
      verifyPassword(password, creds.passwordHash)
    ) {
      setAuth({
        isAuthenticated: true,
        userId,
        role: "admin",
        isSetupComplete: true,
      });
      logActivity("login", `User "${userId}" logged in`);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setAuth({
      isAuthenticated: false,
      userId: "",
      role: "admin",
      isSetupComplete: true,
    });
  }, []);

  const finishSetup = useCallback(
    (userId: string, password: string, business: BusinessSettings) => {
      setStoredCredentials(userId, password);
      saveBusinessSettings(business);
      setBusinessSettingsState(business);
      completeSetup();
      setSetupComplete(true);
      setAuth({
        isAuthenticated: true,
        userId,
        role: "admin",
        isSetupComplete: true,
      });
      logActivity("login", `Setup completed, user "${userId}" logged in`);
    },
    [],
  );

  const updateBusinessSettings = useCallback((s: BusinessSettings) => {
    saveBusinessSettings(s);
    setBusinessSettingsState(s);
  }, []);

  const updateAppSettings = useCallback((s: AppSettings) => {
    saveAppSettings(s);
    setAppSettingsState(s);
  }, []);

  const changePassword = useCallback(
    (currentPassword: string, newPassword: string): boolean => {
      const creds = (() => {
        try {
          const raw = localStorage.getItem("erp_admin_credentials");
          if (!raw) return null;
          return JSON.parse(raw) as { userId: string; passwordHash: string };
        } catch {
          return null;
        }
      })();
      if (!creds) return false;
      if (!verifyPassword(currentPassword, creds.passwordHash)) return false;
      localStorage.setItem(
        "erp_admin_credentials",
        JSON.stringify({
          userId: creds.userId,
          passwordHash: hashPassword(newPassword),
        }),
      );
      logActivity("login", `Password changed for user "${creds.userId}"`);
      return true;
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        auth,
        businessSettings,
        appSettings,
        login,
        logout,
        setupComplete,
        finishSetup,
        updateBusinessSettings,
        updateAppSettings,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
