import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ThemeMode = Theme | 'contrast';

interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  hasUserInteracted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('maison_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'contrast') return saved;
  } catch {}
  return getSystemTheme();
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const [hasUserInteracted, setHasUserInteracted] = useState(() => {
    try { return localStorage.getItem('maison_theme') !== null; } catch { return false; }
  });
  const [mounted, setMounted] = useState(false);

  const isDark = theme === 'dark' || theme === 'contrast';

  useEffect(() => {
    setMounted(true);
  }, []);

  const applyTheme = useCallback((t: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove('dark', 'contrast', 'light-theme');
    root.style.removeProperty('--color-brand-500');
    if (t === 'dark') {
      root.classList.add('dark');
    } else if (t === 'contrast') {
      root.classList.add('contrast', 'dark');
      root.style.setProperty('--color-brand-500', '#FFD700');
    } else {
      root.classList.add('light-theme');
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!hasUserInteracted) {
        const newTheme = e.matches ? 'dark' : 'light';
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [hasUserInteracted, applyTheme]);

  const setTheme = useCallback((t: ThemeMode) => {
    setHasUserInteracted(true);
    setThemeState(t);
    try { localStorage.setItem('maison_theme', t); } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
  }, [isDark, setTheme]);

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme, hasUserInteracted }}>
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { ThemeProvider, useTheme };
