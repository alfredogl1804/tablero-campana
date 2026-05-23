/**
 * AccessibilityContext — "Modo Papá"
 * Toggle de accesibilidad para usuarios mayores (67+):
 *  - Tipografía global 30% mayor
 *  - Focus rings visibles y gruesos
 *  - Densidad reducida (más espaciado)
 *  - Contraste reforzado
 * Persistente en localStorage.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type AccessibilityMode = "default" | "papa";

interface AccessibilityContextValue {
  mode: AccessibilityMode;
  setMode: (mode: AccessibilityMode) => void;
  toggle: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(
  null
);

const STORAGE_KEY = "tablero-campana-mode-v1";

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AccessibilityMode>("default");

  // Cargar de localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "papa" || saved === "default") {
      setModeState(saved);
    }
  }, []);

  // Aplicar clase global al <html> para CSS targeting
  useEffect(() => {
    const html = document.documentElement;
    if (mode === "papa") {
      html.classList.add("modo-papa");
    } else {
      html.classList.remove("modo-papa");
    }
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = (m: AccessibilityMode) => setModeState(m);
  const toggle = () =>
    setModeState((current) => (current === "default" ? "papa" : "default"));

  return (
    <AccessibilityContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider"
    );
  }
  return ctx;
}
