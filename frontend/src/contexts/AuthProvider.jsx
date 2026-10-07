import { useCallback, useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext";
import { hasPermission, loginWithSession, normalizeUser } from "./authState";
import * as api from "../services/api";
import { notifyThemeChange, startThemeSync } from "../services/themeSync";

function sameSessionUser(current, next) {
  const keys = new Set([...Object.keys(current ?? {}), ...Object.keys(next ?? {})]);
  return [...keys].every((key) => {
    if (Array.isArray(current?.[key]) || Array.isArray(next?.[key])) {
      return JSON.stringify(current?.[key] ?? []) === JSON.stringify(next?.[key] ?? []);
    }
    return current?.[key] === next?.[key];
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [initialCheckFailed, setInitialCheckFailed] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const busy = useRef(false);
  const sessionSyncInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    const stopListeningForUnauthorized = api.onUnauthorized(() => {
      if (active) setUser(null);
    });
    api.getSession().then(
      (sessionUser) => { if (active) setUser(normalizeUser(sessionUser)); },
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

  const refreshSession = useCallback(async () => {
    if (!mounted.current || !userId || busy.current || sessionSyncInFlight.current) return;
    sessionSyncInFlight.current = true;
    try {
      const sessionUser = await api.getSession();
      if (!mounted.current) return;
      setUser((current) => {
        if (!current) return current;
        if (!sessionUser || sessionUser.id !== current.id) return null;
        const next = normalizeUser(sessionUser, current);
        return sameSessionUser(current, next) ? current : next;
      });
    } catch {
      // Temporary network failures must not log out the current user.
    } finally {
      sessionSyncInFlight.current = false;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || initialLoading) return undefined;

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") refreshSession();
    };
    const intervalId = window.setInterval(refreshSession, 10000);
    window.addEventListener("focus", refreshSession);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshSession);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [userId, initialLoading, refreshSession]);

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
        setUser(normalizeUser(nextUser, user));
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
        permissions: Array.isArray(updatedUser.permissions)
          ? normalizeUser(updatedUser).permissions
          : current.permissions ?? [],
      };
    });
  }, []);

  const value = {
    reconcileUser,
    refreshSession,
    user,
    hasPermission: (code) => hasPermission(user, code),
    isAuthenticated: Boolean(user),
    initialLoading,
    initialCheckFailed,
    operationLoading,
    error,
    login: (username, password) => perform(
      () => loginWithSession(username, password, api), "login",
    ),
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
