import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  CONFIG_PADRAO,
  ITENS_PADRAO,
  JOGOS_META,
  RIGS_PADRAO,
  type ConfigGlobal,
  type ItemLoja,
  type Rig,
} from "../lib/catalogo";

const LS_CONFIG = "mascrypto:config";

interface CtxConfig {
  cfg: ConfigGlobal;
  salvarConfig: (patch: Partial<ConfigGlobal>) => void;
  /** Cria ou atualiza um item do catálogo (Admin). */
  salvarItem: (item: ItemLoja) => void;
  excluirItem: (id: string) => void;
  salvarRig: (rig: Rig) => void;
  excluirRig: (id: string) => void;
  toggleJogo: (id: string, ativo: boolean) => void;
  jogoAtivo: (id: string) => boolean;
  item: (id: string) => ItemLoja | undefined;
  restaurarPadrao: () => void;
  configOnline: boolean;
}

const Ctx = createContext<CtxConfig>(null as unknown as CtxConfig);
export const useConfig = () => useContext(Ctx);

/** Mescla config salva com os padrões (novos campos não quebram versões antigas). */
function mesclar(bruto: Partial<ConfigGlobal> | null | undefined): ConfigGlobal {
  const c: ConfigGlobal = {
    ...CONFIG_PADRAO,
    ...(bruto || {}),
    mineracao: { ...CONFIG_PADRAO.mineracao, ...(bruto?.mineracao || {}) },
  };
  c.itens = Array.isArray(bruto?.itens) && bruto!.itens.length ? bruto!.itens : ITENS_PADRAO;
  c.rigs = Array.isArray(bruto?.rigs) && bruto!.rigs.length ? bruto!.rigs : RIGS_PADRAO;
  // garante que todo jogo conhecido tenha uma flag
  c.jogos = { ...Object.fromEntries(JOGOS_META.map((j) => [j.id, true])), ...(bruto?.jogos || {}) };
  return c;
}

function lerLocal(): ConfigGlobal {
  try {
    return mesclar(JSON.parse(localStorage.getItem(LS_CONFIG) || "null"));
  } catch {
    return mesclar(null);
  }
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = useState<ConfigGlobal>(lerLocal);
  const [configOnline, setConfigOnline] = useState(false);

  // Firestore é a fonte oficial; localStorage é cache/fallback offline.
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "config", "global"),
      (snap) => {
        setConfigOnline(true);
        if (!snap.exists()) return;
        const remoto = mesclar(snap.data() as Partial<ConfigGlobal>);
        const local = lerLocal();
        if ((remoto.atualizadoEm || 0) >= (local.atualizadoEm || 0)) {
          localStorage.setItem(LS_CONFIG, JSON.stringify(remoto));
          setCfg(remoto);
          window.dispatchEvent(new Event("configUpdate"));
        }
      },
      () => setConfigOnline(false),
    );
    return unsub;
  }, []);

  // Sincroniza entre abas do navegador
  useEffect(() => {
    const h = (e: StorageEvent) => {
      if (e.key === LS_CONFIG) setCfg(lerLocal());
    };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  const aplicar = useCallback((patch: Partial<ConfigGlobal>) => {
    setCfg((atual) => {
      const novo = mesclar({ ...atual, ...patch, atualizadoEm: Date.now() });
      localStorage.setItem(LS_CONFIG, JSON.stringify(novo));
      window.dispatchEvent(new Event("configUpdate"));
      setDoc(doc(db, "config", "global"), novo, { merge: true }).catch(() => {});
      return novo;
    });
  }, []);

  const salvarItem = useCallback(
    (item: ItemLoja) => {
      setCfg((atual) => {
        const existe = atual.itens.some((i) => i.id === item.id);
        const itens = existe ? atual.itens.map((i) => (i.id === item.id ? item : i)) : [...atual.itens, item];
        const novo = mesclar({ ...atual, itens, atualizadoEm: Date.now() });
        localStorage.setItem(LS_CONFIG, JSON.stringify(novo));
        window.dispatchEvent(new Event("configUpdate"));
        setDoc(doc(db, "config", "global"), novo, { merge: true }).catch(() => {});
        return novo;
      });
    },
    [],
  );

  const excluirItem = useCallback(
    (id: string) => aplicar({ itens: cfg.itens.filter((i) => i.id !== id) }),
    [aplicar, cfg.itens],
  );

  const salvarRig = useCallback(
    (rig: Rig) => {
      const existe = cfg.rigs.some((r) => r.id === rig.id);
      aplicar({ rigs: existe ? cfg.rigs.map((r) => (r.id === rig.id ? rig : r)) : [...cfg.rigs, rig] });
    },
    [aplicar, cfg.rigs],
  );

  const excluirRig = useCallback(
    (id: string) => aplicar({ rigs: cfg.rigs.filter((r) => r.id !== id) }),
    [aplicar, cfg.rigs],
  );

  const toggleJogo = useCallback(
    (id: string, ativo: boolean) => aplicar({ jogos: { ...cfg.jogos, [id]: ativo } }),
    [aplicar, cfg.jogos],
  );

  const jogoAtivo = useCallback(
    (id: string) => cfg.cassinoAtivo && cfg.jogos[id] !== false,
    [cfg.cassinoAtivo, cfg.jogos],
  );

  const item = useCallback((id: string) => cfg.itens.find((i) => i.id === id), [cfg.itens]);

  const restaurarPadrao = useCallback(() => {
    localStorage.removeItem(LS_CONFIG);
    aplicar({ ...CONFIG_PADRAO });
  }, [aplicar]);

  return (
    <Ctx.Provider
      value={{
        cfg,
        salvarConfig: aplicar,
        salvarItem,
        excluirItem,
        salvarRig,
        excluirRig,
        toggleJogo,
        jogoAtivo,
        item,
        restaurarPadrao,
        configOnline,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
