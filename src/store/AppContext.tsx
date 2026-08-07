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
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { CONQUISTAS, ITENS, RIGS, novoUsuario, type UserData } from "../lib/types";

interface Toast {
  id: number;
  msg: string;
  tipo: "ok" | "erro" | "info";
}

interface Ctx {
  user: User | null;
  data: UserData | null;
  carregando: boolean;
  online: boolean;
  toasts: Toast[];
  toast: (msg: string, tipo?: Toast["tipo"]) => void;
  entrar: (email: string, senha: string) => Promise<void>;
  registrar: (nome: string, email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  atualizar: (fn: (d: UserData) => UserData) => void;
  registrarAposta: (jogo: string, aposta: number, ganho: number) => void;
  taxaMineracao: number;
  precoMAS: number;
  historicoPreco: number[];
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

const LS = (uid: string) => `mascrypto:${uid}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
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

  const toast = useCallback((msg: string, tipo: Toast["tipo"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  // ---- auth ----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setData(null);
        setCarregando(false);
        return;
      }
      let d: UserData | null = null;
      try {
        const snap = await getDoc(doc(db, "usuarios", u.uid));
        if (snap.exists()) d = snap.data() as UserData;
        setOnline(true);
      } catch {
        setOnline(false);
      }
      if (!d) {
        const local = localStorage.getItem(LS(u.uid));
        if (local) d = JSON.parse(local) as UserData;
      }
      if (!d) d = novoUsuario(u.uid, u.displayName || "Anônimo", u.email || "");
      d = { ...novoUsuario(u.uid, d.nome, d.email), ...d };
      setData(d);
      setCarregando(false);
    });
    return unsub;
  }, []);

  // ---- persistência ----
  useEffect(() => {
    if (!data) return;
    localStorage.setItem(LS(data.uid), JSON.stringify(data));
    dirty.current = true;
  }, [data]);

  useEffect(() => {
    const i = setInterval(async () => {
      if (!dirty.current || !data) return;
      dirty.current = false;
      try {
        await setDoc(doc(db, "usuarios", data.uid), data, { merge: true });
        setOnline(true);
      } catch {
        setOnline(false);
      }
    }, 6000);
    return () => clearInterval(i);
  }, [data]);

  // ---- preço simulado do MAS ----
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

  const atualizar = useCallback((fn: (d: UserData) => UserData) => {
    setData((d) => (d ? checarConquistas(fn(d)) : d));
  }, []);

  const taxaMineracao = useMemo(() => {
    if (!data) return 0;
    let base = 0;
    for (const r of RIGS) base += (data.rigs[r.id] || 0) * r.taxa;
    let bonus = 1 + (data.nivel - 1) * 0.02;
    if (data.itens.includes("gato")) bonus += 0.02;
    if (data.itens.includes("robo")) bonus += 0.05;
    if (data.itens.includes("dragao")) bonus += 0.08;
    return base * bonus;
  }, [data]);

  const registrarAposta = useCallback(
    (jogo: string, aposta: number, ganho: number) => {
      atualizar((d) => {
        const lucro = ganho - aposta;
        const xp = d.xp + Math.max(1, Math.floor(aposta / 10));
        return {
          ...d,
          saldo: Math.max(0, d.saldo + lucro),
          apostas: d.apostas + 1,
          vitorias: d.vitorias + (lucro > 0 ? 1 : 0),
          maiorGanho: Math.max(d.maiorGanho, lucro),
          xp,
          nivel: Math.max(d.nivel, Math.floor(Math.sqrt(xp / 40)) + 1),
          historico: [
            { t: jogo, v: lucro, d: lucro > 0 ? "Vitória" : "Derrota", ts: Date.now() },
            ...d.historico,
          ].slice(0, 40),
        };
      });
    },
    [atualizar],
  );

  const entrar = async (email: string, senha: string) => {
    await signInWithEmailAndPassword(auth, email, senha);
  };

  const registrar = async (nome: string, email: string, senha: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(cred.user, { displayName: nome });
    const d = novoUsuario(cred.user.uid, nome, email);
    localStorage.setItem(LS(cred.user.uid), JSON.stringify(d));
    setData(d);
    try {
      await setDoc(doc(db, "usuarios", cred.user.uid), d);
    } catch {
      setOnline(false);
    }
  };

  const sair = async () => {
    await signOut(auth);
  };

  return (
    <AppCtx.Provider
      value={{
        user,
        data,
        carregando,
        online,
        toasts,
        toast,
        entrar,
        registrar,
        sair,
        atualizar,
        registrarAposta,
        taxaMineracao,
        precoMAS,
        historicoPreco,
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
  check("primeiro", true);
  check("minerador", d.totalMinerado >= 1000);
  check("baleia", d.saldo >= 100000);
  check("sortudo", d.vitorias >= 10);
  check("highroller", d.maiorGanho >= 10000);
  check("fiel", d.streak >= 7);
  check("decorador", d.itens.filter((i) => ITENS.some((x) => x.id === i)).length >= 5);
  if (!novas.length) return d;
  return { ...d, conquistas: [...d.conquistas, ...novas], saldo: d.saldo + premio };
}
