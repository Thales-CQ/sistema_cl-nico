import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./ThemeContext";

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
  return getStoredTheme() ?? getSystemTheme();
}

export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  const setTheme = useCallback((nextTheme) => {
    if (!isTheme(nextTheme)) return;

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // A storage failure must not prevent the theme from being applied.
      }
    }
    setThemeState(nextTheme);
  }, []);

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
  }), [setTheme, theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
