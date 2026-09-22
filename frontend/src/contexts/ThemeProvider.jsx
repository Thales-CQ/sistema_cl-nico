import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./ThemeContext";
import { useAuth } from "../hooks/useAuth";

const THEME_STORAGE_KEY = "clinic-ui-theme";
const THEME_VALUES = Object.freeze({
  LIGHT: "light",
  DARK: "dark",
});

function isTheme(value) {
  return value === THEME_VALUES.LIGHT || value === THEME_VALUES.DARK;
}

function getStoredTheme() {
  if (typeof window === "undefined") return null;

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function getSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return THEME_VALUES.LIGHT;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? THEME_VALUES.DARK
    : THEME_VALUES.LIGHT;
}

function getInitialTheme() {
  // The login screen starts light unless a previous session left a choice.
  return getStoredTheme() ?? THEME_VALUES.LIGHT;
}

export default function ThemeProvider({ children }) {
  const { user, updateTheme, operationLoading } = useAuth();
  const [guestTheme, setGuestTheme] = useState(getInitialTheme);
  const theme = user
    ? (isTheme(user.theme) ? user.theme : getSystemTheme())
    : (getStoredTheme() ?? guestTheme);

  useEffect(() => {
    if (!user || !isTheme(user.theme) || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, user.theme);
    } catch {
      // A storage failure must not prevent the account preference from applying.
    }
  }, [user]);

  const setTheme = useCallback((nextTheme) => {
    if (!isTheme(nextTheme)) return;
    if (user) return updateTheme(nextTheme);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // A storage failure must not prevent the theme from being applied.
      }
    }
    setGuestTheme(nextTheme);
  }, [updateTheme, user]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === THEME_VALUES.DARK ? THEME_VALUES.LIGHT : THEME_VALUES.DARK);
  }, [setTheme, theme]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    document.documentElement.dataset.theme = theme;
    return undefined;
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme,
    themeValues: THEME_VALUES,
    themeUpdating: operationLoading,
  }), [operationLoading, setTheme, theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
