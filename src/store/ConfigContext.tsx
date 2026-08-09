import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  BANNERS_PADRAO,
  CONFIG_GRAFICO_PADRAO,
  CONFIG_PADRAO,
  ITENS_PADRAO,
  JOGOS_META,
  RIGS_PADRAO,
  jogoPadrao,
  type Banner,
  type ConfigGlobal,
  type ItemLoja,
  type JogoConfig,
  type Rig,
} from "../lib/catalogo";

const LS_CONFIG = "mascrypto:config";

interface CtxConfig {
  cfg: ConfigGlobal;
  salvarConfig: (patch: Partial<ConfigGlobal>) => void;
  salvarItem: (item: ItemLoja) => void;
  excluirItem: (id: string) => void;
  salvarRig: (rig: Rig) => void;
  excluirRig: (id: string) => void;
  salvarJogo: (jogo: JogoConfig) => void;
  toggleJogo: (id: string, ativo: boolean) => void;
  jogo: (id: string) => JogoConfig;
  jogoAtivo: (id: string) => boolean;
  salvarBanner: (banner: Banner) => void;
  excluirBanner: (id: string) => void;
  item: (id: string) => ItemLoja | undefined;
  restaurarPadrao: () => void;
  configOnline: boolean;
}

const Ctx = createContext<CtxConfig>(null as unknown as CtxConfig);
export const useConfig = () => useContext(Ctx);

/** Mescla config salva com os padrões — migra versões antigas com segurança. */
function mesclar(bruto: Partial<ConfigGlobal> | null | undefined): ConfigGlobal {
  const c: ConfigGlobal = {
    ...CONFIG_PADRAO,
    ...(bruto || {}),
    mineracao: { ...CONFIG_PADRAO.mineracao, ...(bruto?.mineracao || {}) },
    grafico: { ...CONFIG_GRAFICO_PADRAO, ...(bruto?.grafico || {}) },
    recompensaDiaria: { ...CONFIG_PADRAO.recompensaDiaria, ...(bruto?.recompensaDiaria || {}) },
    bilheteria: { ...CONFIG_PADRAO.bilheteria, ...(bruto?.bilheteria || {}) },
    overrides: { ...CONFIG_PADRAO.overrides, ...(bruto?.overrides || {}) },
    visual: { ...CONFIG_PADRAO.visual, ...(bruto?.visual || {}) },
    modulos: { ...CONFIG_PADRAO.modulos, ...(bruto?.modulos || {}) },
    custoSlotHardware: bruto?.custoSlotHardware ?? CONFIG_PADRAO.custoSlotHardware,
    limiteSlotHardwareGlobal: bruto?.limiteSlotHardwareGlobal ?? CONFIG_PADRAO.limiteSlotHardwareGlobal,
  };
  // Garante limites saudáveis (evita loops travados por config inválida)
  if (c.grafico.intervaloMs < 500) c.grafico.intervaloMs = 500;
  if (c.grafico.intervaloMs > 60000) c.grafico.intervaloMs = 60000;
  if (c.grafico.amplitude < 0) c.grafico.amplitude = 0;
  if (c.grafico.amplitude > 0.6) c.grafico.amplitude = 0.6;
  if (c.grafico.picoAmplitude < c.grafico.amplitude) c.grafico.picoAmplitude = c.grafico.amplitude;
  if (c.grafico.janela < 20) c.grafico.janela = 20;
  if (c.grafico.janela > 240) c.grafico.janela = 240;
  if (c.grafico.suavizacao < 0) c.grafico.suavizacao = 0;
  if (c.grafico.suavizacao > 0.98) c.grafico.suavizacao = 0.98;
  c.itens = Array.isArray(bruto?.itens) && bruto!.itens.length ? bruto!.itens : ITENS_PADRAO;
  c.rigs = Array.isArray(bruto?.rigs) && bruto!.rigs.length ? bruto!.rigs : RIGS_PADRAO;
  c.banners = Array.isArray(bruto?.banners) && bruto!.banners.length ? bruto!.banners : BANNERS_PADRAO;

  // Migra jogos: versões antigas guardavam boolean (ativo); agora guardam JogoConfig completo.
  const brutos = (bruto?.jogos || {}) as Record<string, boolean | Partial<JogoConfig>>;
  c.jogos = {};
  for (const meta of JOGOS_META) {
    const b = brutos[meta.id];
    c.jogos[meta.id] =
      typeof b === "boolean"
        ? { ...jogoPadrao(meta.id), ativo: b }
        : { ...jogoPadrao(meta.id), ...(b || {}) };
  }

  if (typeof c.saldoInicial !== "number" || c.saldoInicial < 0) c.saldoInicial = CONFIG_PADRAO.saldoInicial;
  if (typeof c.cotacaoMAS !== "number" || c.cotacaoMAS <= 0) c.cotacaoMAS = CONFIG_PADRAO.cotacaoMAS;
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

  // Firestore é a fonte oficial; localStorage é apenas cache/fallback offline.
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

  const salvarItem = useCallback((item: ItemLoja) => {
    setCfg((atual) => {
      const existe = atual.itens.some((i) => i.id === item.id);
      const itens = existe ? atual.itens.map((i) => (i.id === item.id ? item : i)) : [...atual.itens, item];
      const novo = mesclar({ ...atual, itens, atualizadoEm: Date.now() });
      localStorage.setItem(LS_CONFIG, JSON.stringify(novo));
      window.dispatchEvent(new Event("configUpdate"));
      setDoc(doc(db, "config", "global"), novo, { merge: true }).catch(() => {});
      return novo;
    });
  }, []);

  const excluirItem = useCallback((id: string) => aplicar({ itens: cfg.itens.filter((i) => i.id !== id) }), [aplicar, cfg.itens]);

  const salvarRig = useCallback(
    (rig: Rig) => aplicar({ rigs: cfg.rigs.some((r) => r.id === rig.id) ? cfg.rigs.map((r) => (r.id === rig.id ? rig : r)) : [...cfg.rigs, rig] }),
    [aplicar, cfg.rigs],
  );

  const excluirRig = useCallback((id: string) => aplicar({ rigs: cfg.rigs.filter((r) => r.id !== id) }), [aplicar, cfg.rigs]);

  const salvarJogo = useCallback(
    (jogo: JogoConfig) => aplicar({ jogos: { ...cfg.jogos, [jogo.id]: jogo } }),
    [aplicar, cfg.jogos],
  );

  const toggleJogo = useCallback(
    (id: string, ativo: boolean) => aplicar({ jogos: { ...cfg.jogos, [id]: { ...cfg.jogos[id], ativo } } }),
    [aplicar, cfg.jogos],
  );

  const jogo = useCallback((id: string): JogoConfig => cfg.jogos[id] || jogoPadrao(id), [cfg.jogos]);

  const jogoAtivo = useCallback(
    (id: string) => cfg.cassinoAtivo && cfg.jogos[id]?.ativo !== false,
    [cfg.cassinoAtivo, cfg.jogos],
  );

  const salvarBanner = useCallback(
    (banner: Banner) => {
      const existe = cfg.banners.some((b) => b.id === banner.id);
      aplicar({
        banners: existe ? cfg.banners.map((b) => (b.id === banner.id ? banner : b)) : [...cfg.banners, banner],
      });
    },
    [aplicar, cfg.banners],
  );

  const excluirBanner = useCallback(
    (id: string) => aplicar({ banners: cfg.banners.filter((b) => b.id !== id) }),
    [aplicar, cfg.banners],
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
        salvarJogo,
        toggleJogo,
        jogo,
        jogoAtivo,
        salvarBanner,
        excluirBanner,
        item,
        restaurarPadrao,
        configOnline,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
