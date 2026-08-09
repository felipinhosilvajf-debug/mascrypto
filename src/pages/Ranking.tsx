import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { normalizar, type UserData } from "../lib/types";
import { useApp } from "../store/AppContext";
import { Abas, Card, Selo, Vazio } from "../components/UI";
import { fmtMAS, fmtNum, nivelPorXp, patente } from "../lib/economia";

type Ordem = "saldo" | "nivel" | "conquistas";

export default function Ranking() {
  const { data } = useApp();
  const [usuarios, setUsuarios] = useState<UserData[]>([]);
  const [ordem, setOrdem] = useState<Ordem>("saldo");
  const [carregando, setCarregando] = useState(true);

  /* Apenas usuários reais da coleção users, em tempo real. */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setUsuarios(
          snap.docs
            .map((s) => normalizar(s.data() as Partial<UserData>, s.id))
            .filter((u) => !u.banido && u.nome.trim().length > 0),
        );
        setCarregando(false);
      },
      () => setCarregando(false),
    );
    return unsub;
  }, []);

  const lista = useMemo(() => {
    return [...usuarios].sort((a, b) => {
      if (ordem === "nivel") return nivelPorXp(b.xp) - nivelPorXp(a.xp) || b.xp - a.xp;
      if (ordem === "conquistas") return b.conquistas.length - a.conquistas.length || b.saldo - a.saldo;
      return b.saldo - a.saldo;
    });
  }, [usuarios, ordem]);

  const medalha = (i: number) => (i === 0 ? "1" : i === 1 ? "2" : i === 2 ? "3" : `${i + 1}`);

  return (
    <div className="space-y-5">
      <Card glow className="overflow-hidden bg-[radial-gradient(120%_150%_at_0%_0%,rgba(245,158,11,.18),transparent_55%)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-white">Ranking Global MAS</h2>
            <p className="text-sm text-slate-400">Somente contas reais da rede — atualizado em tempo real.</p>
          </div>
          <Selo tom="verde">● {usuarios.length} usuários reais</Selo>
        </div>
      </Card>

      <Abas
        abas={[
          { id: "saldo" as const, nome: "Maior saldo", emoji: "₥" },
          { id: "nivel" as const, nome: "Maior nível", emoji: "▲" },
          { id: "conquistas" as const, nome: "Mais conquistas", emoji: "★" },
        ]}
        ativa={ordem}
        onChange={setOrdem}
      />

      {carregando ? (
        <Card><Vazio emoji="…" titulo="Carregando ranking" /></Card>
      ) : lista.length === 0 ? (
        <Card><Vazio emoji="∅" titulo="Nenhum usuário no ranking" texto="As contas reais aparecerão aqui após o cadastro." /></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {lista.slice(0, 3).map((u, i) => {
              const nivel = nivelPorXp(u.xp);
              const pat = patente(nivel);
              return (
                <Card key={u.uid} hover className={`text-center ${i === 0 ? "border-amber-400/50 bg-amber-400/[0.08] sm:-translate-y-2" : ""}`}>
                  <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${i === 0 ? "bg-amber-400 text-slate-950" : i === 1 ? "bg-slate-300 text-slate-900" : "bg-orange-700 text-white"}`}>#{medalha(i)}</div>
                  <div className="mt-2 text-5xl">{u.avatar}</div>
                  <p className="mt-2 font-black text-white">{u.nome}</p>
                  <p className={`text-[11px] font-bold ${pat.cor}`}>{pat.emoji} {pat.nome} · Nv {nivel}</p>
                  <p className="mt-1 font-black text-emerald-400">{fmtMAS(u.saldo)}</p>
                  <p className="text-[10px] text-amber-300">★ {u.conquistas.length} conquistas</p>
                </Card>
              );
            })}
          </div>

          <Card className="p-0">
            {lista.map((u, i) => {
              const nivel = nivelPorXp(u.xp);
              return (
                <div key={u.uid} className={`flex items-center gap-3 border-b border-white/[0.05] px-4 py-3 transition last:border-0 hover:bg-white/[0.03] ${u.uid === data?.uid ? "bg-fuchsia-600/15" : ""}`}>
                  <span className="w-9 shrink-0 text-sm font-black text-slate-400">#{medalha(i)}</span>
                  <span className="text-2xl">{u.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{u.nome} {u.uid === data?.uid && <Selo tom="violeta">você</Selo>}</p>
                    <p className="text-[11px] text-slate-500">Nível {nivel} · {fmtNum(u.xp, 0)} XP · ★ {u.conquistas.length}</p>
                  </div>
                  <span className="shrink-0 font-black text-emerald-400">{fmtMAS(u.saldo)}</span>
                </div>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
}