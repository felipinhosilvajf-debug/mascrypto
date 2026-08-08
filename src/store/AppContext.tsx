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
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import {
  CONQUISTAS,
  SALDO_INICIAL_MAS,
  normalizar,
  novoUsuario,
  type Transacao,
  type UserData,
} from "../lib/types";
import { nivelPorXp } from "../lib/economia";
import { infoCategoria, type ConfigGlobal, type ItemLoja } from "../lib/catalogo";
import { useConfig } from "./ConfigContext";

/* ============================================================
   FONTE ÚNICA DA VERDADE: Firestore → users/{uid}
   Nenhum saldo/estado de usuário é lido ou gravado em localStorage.
   Toda mutação passa por uma transação atômica e a UI é atualizada
   pelo onSnapshot + evento global `balanceUpdate`.
   ============================================================ */
export const COLECAO = "users";
const COLECAO_LEGADA = "usuarios";
export const refUsuario = (uid: string) => doc(db, COLECAO, uid);

export const CODIGO_ADMIN = "MAS-ADMIN-2026";
const ADMIN_EMAILS = ["admin@mascrypto.com"];

/** Dispara o evento global de atualização de saldo/UI. */
export function emitirBalanceUpdate() {
  window.dispatchEvent(new Event("balanceUpdate"));
}

export const hojeISO = () => new Date().toISOString().slice(0, 10);
const ontemISO = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);
export const PREMIOS_DIARIOS = [150, 300, 500, 800, 1200, 2000, 5000];

interface Toast {
  id: number;
  msg: string;
  tipo: "ok" | "erro" | "info";
}

export interface Movimento {
  mas?: number;
  brl?: number;
  titulo: string;
  detalhe?: string;
  xp?: number;
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
  /** Mutação atômica no Firestore (com atualização otimista da UI). */
  atualizar: (fn: (d: UserData) => UserData) => void;
  /** ÚNICA porta de entrada para saldos MAS/R$. */
  mover: (m: Movimento) => boolean;
  registrarAposta: (jogo: string, aposta: number, ganho: number) => void;
  minerarClique: (mas: number) => void;
  coletarDiario: () => Promise<void>;
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
  creditarUsuario: (uid: string, mas: number, brl: number, motivo: string) => Promise<void>;
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

/** Hashrate total — FONTE ÚNICA (rigs + itens equipados + bônus). */
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

/** Pós-processamento comum a cliente e servidor: nível ← XP, conquistas, timestamp. */
function posProcessar(d: UserData): UserData {
  const n: UserData = {
    ...d,
    saldo: Math.max(0, Number(d.saldo) || 0),
    brl: Math.max(0, Number(d.brl) || 0),
    xp: Math.max(0, Math.floor(Number(d.xp) || 0)),
    atualizadoEm: Date.now(),
  };
  n.nivel = nivelPorXp(n.xp);
  return checarConquistas(n);
}

/**
 * Cria o documento do usuário SE ele ainda não existir.
 * O saldo inicial é definido pelo Admin (config/global → saldoInicial,
 * padrão 10 MAS) e aplicado UMA ÚNICA VEZ, aqui.
 * Recarregar a página, relogar ou limpar o cache NUNCA recria o documento.
 */
export async function createUserDocument(uid: string, nome: string, email: string): Promise<UserData> {
  const ref = refUsuario(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return normalizar(snap.data() as Partial<UserData>, uid);

  // Migração transparente da coleção antiga (não recria saldo inicial)
  try {
    const antigo = await getDoc(doc(db, COLECAO_LEGADA, uid));
    if (antigo.exists()) {
      const migrado = normalizar(antigo.data() as Partial<UserData>, uid);
      await setDoc(ref, migrado);
      return migrado;
    }
  } catch {
    /* sem permissão/rede: segue para criação nova */
  }

  // Consulta o saldo inicial configurado pelo Admin no Firestore (autoritativo)
  let saldoInicial = SALDO_INICIAL_MAS;
  try {
    const c = await getDoc(doc(db, "config", "global"));
    if (c.exists()) {
      const v = (c.data() as { saldoInicial?: unknown }).saldoInicial;
      if (typeof v === "number" && v >= 0) saldoInicial = v;
    }
  } catch {
    /* sem acesso à config: usa o padrão */
  }

  const novo = novoUsuario(uid, nome, email, saldoInicial);
  novo.admin = ADMIN_EMAILS.includes(email.toLowerCase());
  await setDoc(ref, novo);
  return novo;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { cfg } = useConfig();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<UserData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [online, setOnline] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  /* Cotação oficial vem da config do Admin (config/global) — atualiza em
     tempo real via onSnapshot no ConfigContext. O histórico alimenta o gráfico. */
  const precoMAS = cfg.cotacaoMAS;
  const [historicoPreco, setHistoricoPreco] = useState<number[]>(() =>
    Array.from({ length: 60 }, (_, i) => cfg.cotacaoMAS + Math.sin(i / 5) * 0.06 + (i % 7) * 0.012),
  );

  useEffect(() => {
    setHistoricoPreco((h) => [...h.slice(-79), cfg.cotacaoMAS]);
  }, [cfg.cotacaoMAS]);

  const dataRef = useRef<UserData | null>(null);
  dataRef.current = data;
  const userRef = useRef<User | null>(null);
  userRef.current = user;
  /** Fila serial de transações — evita corridas entre operações simultâneas. */
  const fila = useRef<Promise<unknown>>(Promise.resolve());
  const pendentes = useRef(0);
  /** Acúmulo de cliques de mineração (evita 1 escrita por clique). */
  const bufferClique = useRef({ mas: 0, cliques: 0, timer: 0 as unknown as ReturnType<typeof setTimeout> | 0 });

  const toast = useCallback((msg: string, tipo: Toast["tipo"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-4), { id, msg, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  /* ---------------- AUTENTICAÇÃO ---------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setData(null);
        setCarregando(false);
        emitirBalanceUpdate();
        return;
      }
      try {
        // Garante a existência do documento (saldo inicial aplicado 1x)
        const d = await createUserDocument(u.uid, u.displayName || "Anônimo", u.email || "");
        setData(d);
        setOnline(true);
      } catch {
        setOnline(false);
      } finally {
        setCarregando(false);
        emitirBalanceUpdate();
      }
    });
    return unsub;
  }, []);

  /* ------- ESCUTA EM TEMPO REAL: users/{uid} é a verdade -------
     Reflete instantaneamente qualquer alteração — inclusive as feitas
     pelo Painel Admin — no header, carteira, dashboard, quarto etc. */
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      refUsuario(user.uid),
      { includeMetadataChanges: false },
      (snap) => {
        setOnline(true);
        if (!snap.exists()) return;
        // Enquanto houver escrita local pendente, a transação é a autoridade
        if (pendentes.current > 0) return;
        const remoto = normalizar(snap.data() as Partial<UserData>, user.uid);
        setData((atual) => {
          if (atual && atual.atualizadoEm === remoto.atualizadoEm && atual.saldo === remoto.saldo)
            return atual;
          if (atual && (remoto.adminRev || 0) > (atual.adminRev || 0))
            toast("⚡ Sua conta foi atualizada pela administração", "info");
          return remoto;
        });
        emitirBalanceUpdate();
      },
      () => setOnline(false),
    );
    return unsub;
  }, [user, toast]);

  /* ============================================================
     MUTAÇÃO CENTRAL — transação atômica em users/{uid}
     1) aplica otimista na UI  2) grava atômico  3) confirma
     ============================================================ */
  const atualizar = useCallback(
    (fn: (d: UserData) => UserData) => {
      const u = userRef.current;
      if (!u) return;

      // 1) atualização otimista (UI instantânea)
      setData((d) => (d ? posProcessar(fn(d)) : d));
      emitirBalanceUpdate();

      // 2) transação serializada
      pendentes.current++;
      fila.current = fila.current
        .then(() =>
          runTransaction(db, async (tx) => {
            const ref = refUsuario(u.uid);
            const snap = await tx.get(ref);
            const base = snap.exists()
              ? normalizar(snap.data() as Partial<UserData>, u.uid)
              : novoUsuario(u.uid, u.displayName || "Anônimo", u.email || "");
            const novo = posProcessar(fn(base));
            tx.set(ref, novo);
            return novo;
          }),
        )
        .then((novo) => {
          // 3) o resultado do servidor é a verdade final
          setData(novo as UserData);
          setOnline(true);
        })
        .catch(() => {
          setOnline(false);
          toast("Sem conexão com o banco — tentando novamente…", "erro");
        })
        .finally(() => {
          pendentes.current = Math.max(0, pendentes.current - 1);
          emitirBalanceUpdate();
        });
    },
    [toast],
  );

  /** ÚNICA porta de entrada para dinheiro (MAS e R$). */
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
        // revalidação no servidor: nunca deixa o saldo negativo
        if (u.saldo + mas < -1e-9 || u.brl + brl < -1e-9) return u;
        const hist: Transacao[] = [];
        if (mas !== 0) hist.push({ t: m.titulo, v: mas, d: m.detalhe || "", ts: Date.now(), moeda: "MAS" });
        if (brl !== 0) hist.push({ t: m.titulo, v: brl, d: m.detalhe || "", ts: Date.now(), moeda: "BRL" });
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

  /* ---------------- CASSINO ---------------- */
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

  /* ---------------- MINERAÇÃO POR CLIQUE ----------------
     UI soma na hora; a gravação é agrupada (1 transação por rajada). */
  const minerarClique = useCallback(
    (mas: number) => {
      const b = bufferClique.current;
      b.mas += mas;
      b.cliques += 1;

      setData((d) =>
        d
          ? {
              ...d,
              saldo: d.saldo + mas,
              totalMinerado: d.totalMinerado + mas,
              cliquesMinerados: (d.cliquesMinerados || 0) + 1,
              xp: d.xp + 1,
            }
          : d,
      );
      emitirBalanceUpdate();

      if (b.timer) clearTimeout(b.timer as ReturnType<typeof setTimeout>);
      b.timer = setTimeout(() => {
        const total = b.mas;
        const n = b.cliques;
        b.mas = 0;
        b.cliques = 0;
        b.timer = 0;
        if (total <= 0) return;
        atualizar((d) => ({
          ...d,
          saldo: d.saldo + total,
          totalMinerado: d.totalMinerado + total,
          cliquesMinerados: (d.cliquesMinerados || 0) + n,
          xp: d.xp + n,
        }));
      }, 900);
    },
    [atualizar],
  );

  /* ---------------- RECOMPENSA DIÁRIA (validada no servidor) ---------------- */
  const coletarDiario = useCallback(async () => {
    const u = userRef.current;
    if (!u) return;
    pendentes.current++;
    try {
      const resultado = await runTransaction(db, async (tx) => {
        const ref = refUsuario(u.uid);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error("sem documento");
        const base = normalizar(snap.data() as Partial<UserData>, u.uid);
        // guarda anti-duplicação: o servidor decide se já resgatou hoje
        if (base.lastDailyClaim === hojeISO()) return { ja: true, premio: 0, streak: base.streakDays };
        const streak = base.lastDailyClaim === ontemISO() ? Math.min(7, base.streakDays + 1) : 1;
        const premio = PREMIOS_DIARIOS[streak - 1];
        const novo = posProcessar({
          ...base,
          saldo: base.saldo + premio,
          streakDays: streak,
          lastDailyClaim: hojeISO(),
          xp: base.xp + 50,
          historico: [
            { t: "Recompensa diária", v: premio, d: `Dia ${streak}`, ts: Date.now(), moeda: "MAS" as const },
            ...base.historico,
          ].slice(0, 60),
        });
        tx.set(ref, novo);
        return { ja: false, premio, streak, novo };
      });

      if (resultado.ja) {
        toast("Você já resgatou a recompensa de hoje 😉", "info");
      } else {
        if (resultado.novo) setData(resultado.novo);
        toast(`Recompensa diária: +${resultado.premio} MAS 🎁 (dia ${resultado.streak})`, "ok");
      }
      setOnline(true);
    } catch {
      setOnline(false);
      toast("Não foi possível resgatar agora. Verifique sua conexão.", "erro");
    } finally {
      pendentes.current = Math.max(0, pendentes.current - 1);
      emitirBalanceUpdate();
    }
  }, [toast]);

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

      atualizar((u) => {
        // revalidação atômica no servidor
        if (u.itens.includes(item.id) || u.saldo < item.preco || nivelPorXp(u.xp) < item.nivelMin) return u;
        return {
          ...u,
          saldo: u.saldo - item.preco,
          itens: [...u.itens, item.id],
          xp: u.xp + 15,
          historico: [
            { t: "Loja · Compra", v: -item.preco, d: item.nome, ts: Date.now(), moeda: "MAS" as const },
            ...u.historico,
          ].slice(0, 60),
        };
      });
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
      atualizar((u) =>
        u.itens.includes(itemId) ? { ...u, equipados: { ...u.equipados, [slot]: itemId } } : u,
      );
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
      atualizar((u) => (u.itens.includes(itemId) ? { ...u, quarto: { ...u.quarto, [itemId]: { x, y } } } : u));
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
    const d = await createUserDocument(cred.user.uid, nome, email);
    setData(d);
    emitirBalanceUpdate();
  };

  const sair = async () => {
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
      const snap = await getDocs(collection(db, COLECAO));
      return snap.docs.map((s) => normalizar(s.data() as Partial<UserData>, s.id));
    } catch {
      const d = dataRef.current;
      return d ? [d] : [];
    }
  }, []);

  /** Admin grava direto no Firestore → o onSnapshot do usuário reflete na hora. */
  const adminSalvarUsuario = useCallback(async (u: UserData) => {
    await runTransaction(db, async (tx) => {
      const ref = refUsuario(u.uid);
      const snap = await tx.get(ref);
      const atualRev = snap.exists() ? ((snap.data() as UserData).adminRev || 0) : 0;
      const alvo = normalizar({ ...u, adminRev: atualRev + 1 }, u.uid);
      alvo.atualizadoEm = Date.now();
      tx.set(ref, alvo);
    });
    emitirBalanceUpdate();
  }, []);

  const adminExcluirUsuario = useCallback(async (uid: string) => {
    await deleteDoc(refUsuario(uid));
  }, []);

  /** Ação rápida do suporte: credita MAS e/ou R$ direto na conta do usuário. */
  const creditarUsuario = useCallback(
    async (uid: string, mas: number, brl: number, motivo: string) => {
      await runTransaction(db, async (tx) => {
        const ref = refUsuario(uid);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error("Usuário sem documento");
        const base = normalizar(snap.data() as Partial<UserData>, uid);
        const hist: Transacao[] = [];
        if (mas) hist.push({ t: "Suporte · Crédito", v: mas, d: motivo, ts: Date.now(), moeda: "MAS" });
        if (brl) hist.push({ t: "Suporte · Crédito", v: brl, d: motivo, ts: Date.now(), moeda: "BRL" });
        const novo = posProcessar({
          ...base,
          saldo: base.saldo + (mas || 0),
          brl: base.brl + (brl || 0),
          adminRev: (base.adminRev || 0) + 1,
          historico: [...hist, ...base.historico].slice(0, 60),
        });
        tx.set(ref, novo);
      });
      emitirBalanceUpdate();
    },
    [],
  );

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
        minerarClique,
        coletarDiario,
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
        creditarUsuario,
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
  check("fiel", d.streakDays >= 7);
  check("decorador", d.itens.length >= 5);
  check("fashion", roupas >= 4);
  check("clicker", (d.cliquesMinerados || 0) >= 1000);
  if (!novas.length) return d;
  return { ...d, conquistas: [...d.conquistas, ...novas], saldo: d.saldo + premio };
}

/** Hook utilitário: re-renderiza o componente a cada `balanceUpdate`. */
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
