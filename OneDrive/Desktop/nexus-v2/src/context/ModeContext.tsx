import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface ModeContextValue {
  isDemoMode: boolean;
  toggle: () => void;
  setDemoMode: (v: boolean) => void;
}

const ModeContext = createContext<ModeContextValue>({
  isDemoMode: true,
  toggle: () => {},
  setDemoMode: () => {},
});

const STORAGE_KEY = "nexus-v2-mode";

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : false; // default: Live Mode
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(isDemoMode)); } catch { /* */ }
  }, [isDemoMode]);

  const toggle = useCallback(() => setIsDemoMode((v: boolean) => !v), []);
  const setDemoMode = useCallback((v: boolean) => setIsDemoMode(v), []);

  return (
    <ModeContext.Provider value={{ isDemoMode, toggle, setDemoMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
