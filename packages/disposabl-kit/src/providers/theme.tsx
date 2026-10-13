import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light" | "system";
type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};
type ThemeProviderState = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // Restricted browser storage should not prevent theme changes.
    }
    const root = window.document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.classList.remove("light", "dark");
      root.classList.add(
        theme === "system" ? (media.matches ? "dark" : "light") : theme,
      );
    };
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, storageKey]);

  return (
    <ThemeProviderContext value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
