import { useEffect, useState } from "react";
import { useApp } from "../store/AppContext";
import { Card, Selo } from "../components/UI";
import { fmtMAS, nivelPorXp, patente } from "../lib/economia";

interface Linha {
  uid?: string;
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
  const { data, listarUsuarios } = useApp();
  const [lista, setLista] = useState<Linha[]>(BOTS);

  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      const reais = (await listarUsuarios()).map((u) => ({
        uid: u.uid,
        nome: u.nome,
        avatar: u.avatar,
        saldo: u.saldo,
        nivel: nivelPorXp(u.xp),
        eu: u.uid === data?.uid,
      }));
      const eu: Linha[] =
        data && !reais.some((r) => r.eu)
          ? [{ uid: data.uid, nome: data.nome, avatar: data.avatar, saldo: data.saldo, nivel: nivelPorXp(data.xp), eu: true }]
          : [];
      if (vivo) setLista([...BOTS, ...reais, ...eu].sort((a, b) => b.saldo - a.saldo).slice(0, 30));
    };
    carregar();
    const h = () => carregar();
    window.addEventListener("balanceUpdate", h);
    return () => {
      vivo = false;
      window.removeEventListener("balanceUpdate", h);
    };
  }, [data, listarUsuarios]);

  const medalha = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`);

  return (
    <div className="space-y-5">
      <Card glow className="overflow-hidden bg-[radial-gradient(120%_150%_at_0%_0%,rgba(245,158,11,0.18),transparent_55%)]">
        <h2 className="text-2xl font-black text-white">🏆 Ranking Global MAS</h2>
        <p className="text-sm text-slate-400">Os maiores detentores de MAScoin da rede — atualizado em tempo real.</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {lista.slice(0, 3).map((l, i) => {
          const pat = patente(l.nivel);
          return (
            <Card
              key={i}
              hover
              className={`text-center ${i === 0 ? "border-amber-400/50 bg-amber-400/[0.08] sm:-translate-y-2" : ""}`}
            >
              <div className="text-3xl">{medalha(i)}</div>
              <div className="mt-1 text-5xl">{l.avatar}</div>
              <p className="mt-2 font-black text-white">{l.nome}</p>
              <p className={`text-[11px] font-bold ${pat.cor}`}>
                {pat.emoji} {pat.nome} · Nv {l.nivel}
              </p>
              <p className="mt-1 font-black text-emerald-400">{fmtMAS(l.saldo)}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-0">
        {lista.map((l, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 border-b border-white/[0.05] px-4 py-3 transition last:border-0 hover:bg-white/[0.03] ${
              l.eu ? "bg-fuchsia-600/15" : ""
            }`}
          >
            <span className="w-9 shrink-0 text-sm font-black text-slate-400">{medalha(i)}</span>
            <span className="text-2xl">{l.avatar}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-white">
                {l.nome} {l.eu && <Selo tom="violeta">você</Selo>}
              </p>
              <p className="text-[11px] text-slate-500">Nível {l.nivel}</p>
            </div>
            <span className="shrink-0 font-black text-emerald-400">{fmtMAS(l.saldo)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
