import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Tema = "dark" | "light" | "neon";

interface TemaCtx {
  tema: Tema;
  setTema: (t: Tema) => void;
}

const Ctx = createContext<TemaCtx>({ tema: "dark", setTema: () => {} });
export const useTema = () => useContext(Ctx);

const LS_TEMA = "mascrypto:tema";

const CLASSES: Record<Tema, { bg: string; text: string; label: string; emoji: string }> = {
  dark: {
    bg: "bg-[#05040c]",
    text: "text-slate-200",
    label: "Dark Cyberpunk",
    emoji: "🌌",
  },
  light: {
    bg: "bg-[#eef0ff]",
    text: "text-slate-900",
    label: "Branco Futurista",
    emoji: "☀️",
  },
  neon: {
    bg: "bg-[#00060f]",
    text: "text-cyan-50",
    label: "Neon Tecnológico",
    emoji: "🟢",
  },
};

export const TEMA_CLASSES = CLASSES;

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTemaState] = useState<Tema>(() => {
    try {
      return (localStorage.getItem(LS_TEMA) as Tema) || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
  }, [tema]);

  const setTema = useCallback((t: Tema) => {
    setTemaState(t);
    localStorage.setItem(LS_TEMA, t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  return <Ctx.Provider value={{ tema, setTema }}>{children}</Ctx.Provider>;
}

export { CLASSES as TEMAS_UI };
