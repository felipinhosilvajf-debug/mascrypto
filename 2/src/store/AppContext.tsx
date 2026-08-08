import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { collection, doc, getDocs, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { CONQUISTAS, normalizar, novoUsuario, type Transacao, type UserData } from "../lib/types";
import { nivelPorXp } from "../lib/economia";
import { infoCategoria, type ConfigGlobal, type ItemLoja } from "../lib/catalogo";
import { useConfig } from "./ConfigContext";

/* Código de desbloqueio administrativo (demonstração — em produção use
   custom claims do Firebase Auth + regras de segurança no servidor). */
export const CODIGO_ADMIN = "mas3510";
const ADMIN_EMAILS = ["felipe.apsilva@outlook.com"];

interface Toast {
  id: number;
  msg: string;
  tipo: "ok" | "erro" | "info";
}

/** Payload de qualquer movimentação financeira do app. */
export interface Movimento {
  mas?: number;
  brl?: number;
  titulo: string;
  detalhe?: string;
  xp?: number;
  origem?: string;
}

interface Ctx {
  user: User | null;
  data: UserData | null;
  carregando: boolean;
  online: boolean;
  ehAdmin: boolean;
  toasts: Toast[];
  toast: (msg: string, tipo?: Toast["tipo"]) => void;
  entrar: (email: string, senha: string) => Promise<void>;
  registrar: (nome: string, email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  atualizar: (fn: (d: UserData) => UserData) => void;
  /** ÚNICA porta de entrada para alterar saldos. Dispara `balanceUpdate`. */
  mover: (m: Movimento) => boolean;
  registrarAposta: (jogo: string, aposta: number, ganho: number) => void;
  comprarItem: (item: ItemLoja) => boolean;
  equipar: (itemId: string) => void;
  desequipar: (slot: string) => void;
  posicionarNoQuarto: (itemId: string, x: number, y: number) => void;
  removerDoQuarto: (itemId: string) => void;
  hashrate: number;
  detalheHash: { rigs: number; itens: number; bonusPct: number; total: number };
  precoMAS: number;
  historicoPreco: number[];
  desbloquearAdmin: (codigo: string) => boolean;
  listarUsuarios: () => Promise<UserData[]>;
  adminSalvarUsuario: (u: UserData) => Promise<void>;
  adminExcluirUsuario: (uid: string) => Promise<void>;
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

const LS = (uid: string) => `mascrypto:user:${uid}`;

/** Hashrate total — FONTE ÚNICA (rigs + itens equipados + bônus de nível/pets). */
export function calcularHash(d: UserData | null, cfg: ConfigGlobal) {
  if (!d) return { rigs: 0, itens: 0, bonusPct: 0, total: 0 };
  let rigs = 0;
  for (const r of cfg.rigs) rigs += (d.rigs[r.id] || 0) * (r.ativo === false ? 0 : r.taxa);
  let itens = 0;
  let bonusPct = (nivelPorXp(d.xp) - 1) * 0.02;
  for (const slot of Object.keys(d.equipados || {})) {
    const it = cfg.itens.find((i) => i.id === d.equipados[slot]);
    if (!it || !it.ativo) continue;
    itens += it.hs || 0;
    bonusPct += it.bonusPct || 0;
  }
  const total = (rigs + itens) * (1 + bonusPct) * (cfg.mineracao.multiplicadorGlobal || 1);
  return { rigs, itens, bonusPct, total };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { cfg } = useConfig();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<UserData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [online, setOnline] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [precoMAS, setPrecoMAS] = useState(1.87);
  const [historicoPreco, setHistoricoPreco] = useState<number[]>(() =>
    Array.from({ length: 60 }, (_, i) => 1.87 + Math.sin(i / 5) * 0.08 + Math.random() * 0.05),
  );
  const dirty = useRef(false);
  const revLocal = useRef(0);
  const dataRef = useRef<UserData | null>(null);
  dataRef.current = data;

  const toast = useCallback((msg: string, tipo: Toast["tipo"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-4), { id, msg, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  /* ---------------- AUTENTICAÇÃO + CARGA ---------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setData(null);
        setCarregando(false);
        return;
      }
      // cache novo ou, se não existir, cache da versão anterior (migração)
      const local = localStorage.getItem(LS(u.uid)) || localStorage.getItem(`mascrypto:${u.uid}`);
      if (local) {
        try {
          const d = normalizar(JSON.parse(local), u.uid);
          revLocal.current = d.adminRev || 0;
          setData(d);
          localStorage.setItem(LS(u.uid), JSON.stringify(d));
        } catch {
          /* ignora cache corrompido */
        }
      }
      setCarregando(false);
    });
    return unsub;
  }, []);

  /* Firestore como fonte oficial: escuta o próprio documento.
     Alterações do Admin (adminRev++) são adotadas na hora. */
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "usuarios", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setOnline(true);
        if (!snap.exists()) {
          const base = normalizar(
            { nome: user.displayName || "Anônimo", email: user.email || "" },
            user.uid,
          );
          setData((atual) => atual ?? base);
          setDoc(ref, dataRef.current ?? base, { merge: true }).catch(() => {});
          return;
        }
        const remoto = normalizar(snap.data() as Partial<UserData>, user.uid);
        setData((atual) => {
          if (!atual) return remoto;
          // Admin mexeu nesta conta → adota o remoto imediatamente
          if ((remoto.adminRev || 0) > revLocal.current) {
            revLocal.current = remoto.adminRev || 0;
            toast("⚡ Sua conta foi atualizada pela administração", "info");
            queueMicrotask(() => window.dispatchEvent(new Event("balanceUpdate")));
            return remoto;
          }
          // Sessão mais recente em outro dispositivo
          if ((remoto.atualizadoEm || 0) > (atual.atualizadoEm || 0) + 15000) return remoto;
          return atual;
        });
      },
      () => setOnline(false),
    );
    return unsub;
  }, [user, toast]);

  /* ---------------- PERSISTÊNCIA ---------------- */
  useEffect(() => {
    if (!data) return;
    localStorage.setItem(LS(data.uid), JSON.stringify(data));
    dirty.current = true;
  }, [data]);

  useEffect(() => {
    const i = setInterval(() => {
      const d = dataRef.current;
      if (!dirty.current || !d) return;
      dirty.current = false;
      setDoc(doc(db, "usuarios", d.uid), d, { merge: true })
        .then(() => setOnline(true))
        .catch(() => setOnline(false));
    }, 5000);
    return () => clearInterval(i);
  }, []);

  /* ---------------- COTAÇÃO SIMULADA ---------------- */
  useEffect(() => {
    const i = setInterval(() => {
      setPrecoMAS((p) => {
        const novo = Math.max(0.4, p * (1 + (Math.random() - 0.487) * 0.022));
        setHistoricoPreco((h) => [...h.slice(-79), novo]);
        return novo;
      });
    }, 2000);
    return () => clearInterval(i);
  }, []);

  /* ---------------- MUTAÇÃO CENTRAL ---------------- */
  const atualizar = useCallback((fn: (d: UserData) => UserData) => {
    setData((d) => {
      if (!d) return d;
      const novo = pos(fn(d));
      queueMicrotask(() => window.dispatchEvent(new Event("balanceUpdate")));
      return novo;
    });
  }, []);

  /** Pós-processamento: nível derivado do XP + conquistas + timestamp. */
  const pos = (d: UserData): UserData => {
    let n: UserData = {
      ...d,
      saldo: Math.max(0, Number(d.saldo) || 0),
      brl: Math.max(0, Number(d.brl) || 0),
      xp: Math.max(0, Math.floor(Number(d.xp) || 0)),
      atualizadoEm: Date.now(),
    };
    n.nivel = nivelPorXp(n.xp);
    n = checarConquistas(n);
    return n;
  };

  /** ÚNICA porta de entrada para dinheiro. Retorna false se saldo insuficiente. */
  const mover = useCallback(
    (m: Movimento): boolean => {
      const d = dataRef.current;
      if (!d) return false;
      const mas = m.mas || 0;
      const brl = m.brl || 0;
      if (d.saldo + mas < -1e-9 || d.brl + brl < -1e-9) {
        toast("Saldo insuficiente para esta operação", "erro");
        return false;
      }
      atualizar((u) => {
        const hist: Transacao[] = [];
        if (mas !== 0)
          hist.push({ t: m.titulo, v: mas, d: m.detalhe || "", ts: Date.now(), moeda: "MAS" });
        if (brl !== 0)
          hist.push({ t: m.titulo, v: brl, d: m.detalhe || "", ts: Date.now(), moeda: "BRL" });
        return {
          ...u,
          saldo: u.saldo + mas,
          brl: u.brl + brl,
          xp: u.xp + (m.xp || 0),
          historico: [...hist, ...u.historico].slice(0, 60),
        };
      });
      return true;
    },
    [atualizar, toast],
  );

  const detalheHash = useMemo(() => calcularHash(data, cfg), [data, cfg]);

  const registrarAposta = useCallback(
    (jogo: string, aposta: number, ganho: number) => {
      const lucro = ganho - aposta;
      atualizar((d) => ({
        ...d,
        saldo: Math.max(0, d.saldo + lucro),
        apostas: d.apostas + 1,
        vitorias: d.vitorias + (lucro > 0 ? 1 : 0),
        maiorGanho: Math.max(d.maiorGanho, lucro),
        xp: d.xp + Math.max(1, Math.floor(aposta * (cfg.xpPorAposta || 0.1))),
        historico: [
          {
            t: `Cassino · ${jogo}`,
            v: lucro,
            d: lucro > 0 ? "Vitória" : "Derrota",
            ts: Date.now(),
            moeda: "MAS" as const,
          },
          ...d.historico,
        ].slice(0, 60),
      }));
    },
    [atualizar, cfg.xpPorAposta],
  );

  /* ---------------- LOJA / INVENTÁRIO ---------------- */
  const comprarItem = useCallback(
    (item: ItemLoja): boolean => {
      const d = dataRef.current;
      if (!d) return false;
      if (!cfg.lojaAtiva) return toast("A loja está temporariamente fechada", "erro"), false;
      if (!item.ativo) return toast("Item indisponível no momento", "erro"), false;
      if (d.itens.includes(item.id)) return toast("Você já possui este item", "info"), false;
      if (nivelPorXp(d.xp) < item.nivelMin)
        return toast(`Requer nível ${item.nivelMin} — você é nível ${nivelPorXp(d.xp)}`, "erro"), false;
      if (item.estoque === 0) return toast("Item esgotado", "erro"), false;
      if (d.saldo < item.preco) return toast("Saldo em MAS insuficiente", "erro"), false;

      atualizar((u) => ({
        ...u,
        saldo: u.saldo - item.preco,
        itens: [...u.itens, item.id],
        xp: u.xp + 15,
        historico: [
          { t: "Loja · Compra", v: -item.preco, d: item.nome, ts: Date.now(), moeda: "MAS" as const },
          ...u.historico,
        ].slice(0, 60),
      }));
      toast(`${item.nome} adicionado ao inventário!`, "ok");
      return true;
    },
    [atualizar, cfg.lojaAtiva, toast],
  );

  const equipar = useCallback(
    (itemId: string) => {
      const d = dataRef.current;
      const item = cfg.itens.find((i) => i.id === itemId);
      if (!d || !item) return;
      if (!d.itens.includes(itemId)) return toast("Você não possui este item", "erro");
      if (nivelPorXp(d.xp) < item.nivelMin) return toast(`Requer nível ${item.nivelMin}`, "erro");
      const slot = item.slot || infoCategoria(item.categoria).slot;
      if (!slot) return toast("Este item é decorativo — posicione-o no quarto", "info");
      atualizar((u) => ({ ...u, equipados: { ...u.equipados, [slot]: itemId } }));
      toast(`${item.nome} equipado`, "ok");
    },
    [atualizar, cfg.itens, toast],
  );

  const desequipar = useCallback(
    (slot: string) => {
      atualizar((u) => {
        const e = { ...u.equipados };
        delete e[slot];
        return { ...u, equipados: e };
      });
    },
    [atualizar],
  );

  const posicionarNoQuarto = useCallback(
    (itemId: string, x: number, y: number) => {
      const d = dataRef.current;
      if (!d || !d.itens.includes(itemId)) return;
      atualizar((u) => ({ ...u, quarto: { ...u.quarto, [itemId]: { x, y } } }));
    },
    [atualizar],
  );

  const removerDoQuarto = useCallback(
    (itemId: string) => {
      atualizar((u) => {
        const q = { ...u.quarto };
        delete q[itemId];
        return { ...u, quarto: q };
      });
    },
    [atualizar],
  );

  /* ---------------- AUTH ACTIONS ---------------- */
  const entrar = async (email: string, senha: string) => {
    await signInWithEmailAndPassword(auth, email, senha);
  };

  const registrar = async (nome: string, email: string, senha: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(cred.user, { displayName: nome });
    const d = novoUsuario(cred.user.uid, nome, email);
    d.admin = ADMIN_EMAILS.includes(email.toLowerCase());
    localStorage.setItem(LS(cred.user.uid), JSON.stringify(d));
    setData(d);
    setDoc(doc(db, "usuarios", cred.user.uid), d).catch(() => setOnline(false));
  };

  const sair = async () => {
    const d = dataRef.current;
    if (d) await setDoc(doc(db, "usuarios", d.uid), d, { merge: true }).catch(() => {});
    await signOut(auth);
  };

  /* ---------------- ADMIN ---------------- */
  const ehAdmin = !!data && (data.admin || ADMIN_EMAILS.includes((data.email || "").toLowerCase()));

  const desbloquearAdmin = useCallback(
    (codigo: string) => {
      if (codigo.trim() !== CODIGO_ADMIN) return false;
      atualizar((u) => ({ ...u, admin: true }));
      return true;
    },
    [atualizar],
  );

  const listarUsuarios = useCallback(async (): Promise<UserData[]> => {
    try {
      const snap = await getDocs(collection(db, "usuarios"));
      return snap.docs.map((s) => normalizar(s.data() as Partial<UserData>, s.id));
    } catch {
      const d = dataRef.current;
      return d ? [d] : [];
    }
  }, []);

  const adminSalvarUsuario = useCallback(
    async (u: UserData) => {
      const alvo = normalizar({ ...u, adminRev: (u.adminRev || 0) + 1 }, u.uid);
      alvo.atualizadoEm = Date.now();
      await setDoc(doc(db, "usuarios", u.uid), alvo, { merge: true }).catch(() => {
        throw new Error("Sem conexão com o banco");
      });
      // se o admin editou a própria conta, reflete na hora
      if (dataRef.current?.uid === u.uid) {
        revLocal.current = alvo.adminRev;
        setData(alvo);
        window.dispatchEvent(new Event("balanceUpdate"));
      }
    },
    [],
  );

  const adminExcluirUsuario = useCallback(async (uid: string) => {
    await deleteDoc(doc(db, "usuarios", uid));
    localStorage.removeItem(LS(uid));
  }, []);

  return (
    <AppCtx.Provider
      value={{
        user,
        data,
        carregando,
        online,
        ehAdmin,
        toasts,
        toast,
        entrar,
        registrar,
        sair,
        atualizar,
        mover,
        registrarAposta,
        comprarItem,
        equipar,
        desequipar,
        posicionarNoQuarto,
        removerDoQuarto,
        hashrate: detalheHash.total,
        detalheHash,
        precoMAS,
        historicoPreco,
        desbloquearAdmin,
        listarUsuarios,
        adminSalvarUsuario,
        adminExcluirUsuario,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

function checarConquistas(d: UserData): UserData {
  const novas: string[] = [];
  let premio = 0;
  const check = (id: string, cond: boolean) => {
    if (cond && !d.conquistas.includes(id) && !novas.includes(id)) {
      novas.push(id);
      premio += CONQUISTAS.find((c) => c.id === id)?.premio || 0;
    }
  };
  const roupas = ["camisa", "calca", "sapato", "chapeu", "oculos"].filter((s) => d.equipados?.[s]).length;
  check("primeiro", true);
  check("minerador", d.totalMinerado >= 1000);
  check("baleia", d.saldo >= 100000);
  check("sortudo", d.vitorias >= 10);
  check("highroller", d.maiorGanho >= 10000);
  check("fiel", d.streak >= 7);
  check("decorador", d.itens.length >= 5);
  check("fashion", roupas >= 4);
  check("clicker", (d.cliquesMinerados || 0) >= 1000);
  if (!novas.length) return d;
  return { ...d, conquistas: [...d.conquistas, ...novas], saldo: d.saldo + premio };
}

/** Hook utilitário: força re-render em qualquer alteração de saldo. */
export function useSaldoSync() {
  const { data } = useApp();
  const [, tick] = useState(0);
  useEffect(() => {
    const h = () => tick((t) => t + 1);
    window.addEventListener("balanceUpdate", h);
    return () => window.removeEventListener("balanceUpdate", h);
  }, []);
  return { saldoMAS: data?.saldo ?? 0, saldoBRL: data?.brl ?? 0 };
}
