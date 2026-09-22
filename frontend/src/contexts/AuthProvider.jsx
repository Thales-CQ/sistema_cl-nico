import { useCallback, useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext";
import * as api from "../services/api";
import { notifyThemeChange, startThemeSync } from "../services/themeSync";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [initialCheckFailed, setInitialCheckFailed] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const busy = useRef(false);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    const stopListeningForUnauthorized = api.onUnauthorized(() => {
      if (active) setUser(null);
    });
    api.getSession().then(
      (sessionUser) => { if (active) setUser(sessionUser); },
      () => { if (active) setInitialCheckFailed(true); },
    ).finally(() => {
      if (active) setInitialLoading(false);
    });
    return () => {
      active = false;
      mounted.current = false;
      stopListeningForUnauthorized();
    };
  }, []);

  const userId = user?.id;

  useEffect(() => {
    if (!userId || initialLoading) return;
    return startThemeSync({
      userId,
      onTheme: (theme) => {
        if (busy.current) return;
        setUser((current) => (
          current?.id === userId && current.theme !== theme
            ? { ...current, theme }
            : current
        ));
      },
    });
  }, [userId, initialLoading]);

  async function perform(action, kind) {
    if (busy.current || initialLoading) return false;
    busy.current = true;
    setOperationLoading(true);
    setError("");
    try {
      const nextUser = await action();
      if (mounted.current) {
        setUser(nextUser);
        if (kind === "session") setInitialCheckFailed(false);
      }
      return true;
    } catch (failure) {
      if (!mounted.current) return false;
      if (failure.isCsrf) {
        // An expired or stale CSRF token requires a fresh login.
        setUser(null);
        setError("");
      } else if (kind === "session") {
        setInitialCheckFailed(true);
      } else {
        if (failure.status === 401) setUser(null);
        setError(kind === "login" && failure.status === 401
          ? "Credenciais inválidas."
          : failure.status === 401 ? "" : failure.message);
      }
      return false;
    } finally {
      busy.current = false;
      if (mounted.current) setOperationLoading(false);
    }
  }

  const reconcileUser = useCallback((updatedUser) => {
    setUser((current) => {
      if (!current || current.id !== updatedUser.id) return current;
      if (!updatedUser.is_active) return null;
      return {
        ...current, username: updatedUser.username,
        full_name: updatedUser.full_name, is_admin: updatedUser.is_admin,
      };
    });
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const sessionUser = await api.getSession();
      if (mounted.current) setUser((current) => (
        current && (!sessionUser || current.id === sessionUser.id) ? sessionUser : current
      ));
    } catch {
      // A failed administrative screen remains blocked on transient errors.
    }
  }, []);

  const value = {
    reconcileUser,
    refreshSession,
    user,
    isAuthenticated: Boolean(user),
    initialLoading,
    initialCheckFailed,
    operationLoading,
    error,
    login: (username, password) => perform(async () => {
      const data = await api.login(username, password);
      return data.user;
    }, "login"),
    logout: () => perform(async () => {
      await api.logout();
      return null;
    }, "logout"),
    retrySessionCheck: () => perform(api.getSession, "session"),
    updateTheme: (theme) => perform(async () => {
      const data = await api.updateTheme(theme);
      notifyThemeChange(data.user.id);
      return data.user;
    }, "theme"),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
