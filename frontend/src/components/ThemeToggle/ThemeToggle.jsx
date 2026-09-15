import { useTheme } from "../../hooks/useTheme";
import "./ThemeToggle.css";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const nextThemeLabel = isDark ? "claro" : "escuro";
  const currentThemeLabel = isDark ? "escuro" : "claro";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Ativar tema ${nextThemeLabel}`}
      aria-pressed={isDark}
      onClick={toggleTheme}
    >
      Tema {currentThemeLabel}
    </button>
  );
}
