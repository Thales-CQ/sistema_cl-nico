import { useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext";
import * as api from "../services/api";

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
    api.getSession().then(
      (sessionUser) => { if (active) setUser(sessionUser); },
      () => { if (active) setInitialCheckFailed(true); },
    ).finally(() => {
      if (active) setInitialLoading(false);
    });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);

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
        // Synchronize once. The user must explicitly retry the original action.
        try {
          const sessionUser = await api.getSession();
          if (mounted.current) {
            setUser(sessionUser);
            setError(sessionUser ? "Tente a operação novamente." : "");
          }
        } catch (syncFailure) {
          if (mounted.current) setError(syncFailure.message);
        }
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

  const value = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
