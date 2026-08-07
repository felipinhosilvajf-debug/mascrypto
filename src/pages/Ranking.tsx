import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useApp } from "../store/AppContext";
import { Card, fmt } from "../components/UI";

interface Linha {
  nome: string;
  avatar: string;
  saldo: number;
  nivel: number;
  eu?: boolean;
}

const BOTS: Linha[] = [
  { nome: "SatoshiBR", avatar: "🥷", saldo: 1284000, nivel: 42 },
  { nome: "CryptoLud", avatar: "🐳", saldo: 872400, nivel: 37 },
  { nome: "MinerKing", avatar: "🤠", saldo: 540900, nivel: 31 },
  { nome: "LuaCheia", avatar: "🦄", saldo: 302150, nivel: 27 },
  { nome: "Zé do Hash", avatar: "🦊", saldo: 188300, nivel: 24 },
  { nome: "PixelWhale", avatar: "👽", saldo: 96200, nivel: 19 },
  { nome: "BetMaster", avatar: "🐻", saldo: 61800, nivel: 16 },
  { nome: "NeonTrader", avatar: "🐧", saldo: 34900, nivel: 13 },
  { nome: "Mariazinha", avatar: "🐼", saldo: 19400, nivel: 11 },
  { nome: "HODLzada", avatar: "🧙", saldo: 8700, nivel: 8 },
];

export default function Ranking() {
  const { data } = useApp();
  const [lista, setLista] = useState<Linha[]>(BOTS);

  useEffect(() => {
    (async () => {
      let reais: Linha[] = [];
      try {
        const q = query(collection(db, "usuarios"), orderBy("saldo", "desc"), limit(30));
        const snap = await getDocs(q);
        reais = snap.docs.map((d) => {
          const u = d.data() as Linha & { uid: string };
          return { nome: u.nome, avatar: u.avatar, saldo: u.saldo, nivel: u.nivel, eu: u.uid === data?.uid };
        });
      } catch {
        /* offline */
      }
      const eu: Linha[] = data && !reais.some((r) => r.eu)
        ? [{ nome: data.nome, avatar: data.avatar, saldo: data.saldo, nivel: data.nivel, eu: true }]
        : [];
      setLista([...BOTS, ...reais, ...eu].sort((a, b) => b.saldo - a.saldo).slice(0, 30));
    })();
  }, [data]);

  const medalha = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`);

  return (
    <div className="space-y-6">
      <Card glow className="bg-gradient-to-r from-amber-900/30 to-slate-950/60">
        <h2 className="text-2xl font-black text-white">🏆 Ranking Global MAS</h2>
        <p className="text-sm text-slate-400">Os maiores detentores de MAScoin da rede. Atualizado em tempo real.</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {lista.slice(0, 3).map((l, i) => (
          <Card
            key={i}
            className={`text-center ${
              i === 0 ? "border-amber-400/50 bg-amber-400/10 sm:-translate-y-2" : ""
            }`}
          >
            <div className="text-3xl">{medalha(i)}</div>
            <div className="mt-1 text-4xl">{l.avatar}</div>
            <p className="mt-2 font-black text-white">{l.nome}</p>
            <p className="text-xs text-slate-400">Nível {l.nivel}</p>
            <p className="mt-1 font-bold text-emerald-400">{fmt(l.saldo, 0)} MAS</p>
          </Card>
        ))}
      </div>

      <Card className="p-0">
        {lista.map((l, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 border-b border-white/5 px-5 py-3 last:border-0 ${
              l.eu ? "bg-fuchsia-600/15" : ""
            }`}
          >
            <span className="w-10 text-sm font-bold text-slate-400">{medalha(i)}</span>
            <span className="text-2xl">{l.avatar}</span>
            <div className="flex-1">
              <p className="font-bold text-white">
                {l.nome} {l.eu && <span className="text-xs text-fuchsia-300">(você)</span>}
              </p>
              <p className="text-xs text-slate-500">Nível {l.nivel}</p>
            </div>
            <span className="font-bold text-emerald-400">{fmt(l.saldo, 0)} MAS</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
