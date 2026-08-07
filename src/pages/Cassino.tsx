import { useState } from "react";
import { Card, fmt } from "../components/UI";
import { CaraCoroa, Crash, Dados, Mines, Roleta, Slots, Torre } from "../games/Jogos";
import { useApp } from "../store/AppContext";

const JOGOS = [
  { id: "crash", nome: "Crash", emoji: "🚀", desc: "Saque antes da explosão", tag: "Popular", comp: Crash },
  { id: "mines", nome: "Mines", emoji: "💣", desc: "Ache os diamantes", tag: "Estratégia", comp: Mines },
  { id: "slots", nome: "Caça-níqueis", emoji: "🎰", desc: "Até 50x no 7️⃣", tag: "Jackpot", comp: Slots },
  { id: "dados", nome: "Dados", emoji: "🎲", desc: "Chance customizável", tag: "Clássico", comp: Dados },
  { id: "roleta", nome: "Roleta", emoji: "🎡", desc: "Vermelho ou preto?", tag: "Clássico", comp: Roleta },
  { id: "moeda", nome: "Cara ou Coroa", emoji: "🪙", desc: "50/50 · 1.96x", tag: "Rápido", comp: CaraCoroa },
  { id: "torre", nome: "Torre da Sorte", emoji: "🗼", desc: "8 andares de tensão", tag: "Novo", comp: Torre },
];

export default function Cassino() {
  const [ativo, setAtivo] = useState<string | null>(null);
  const { data } = useApp();
  const Jogo = JOGOS.find((j) => j.id === ativo)?.comp;

  return (
    <div className="space-y-6">
      <Card glow className="bg-gradient-to-r from-amber-900/40 via-fuchsia-900/30 to-slate-950/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">🎰 MAS Casino Royale</h2>
            <p className="text-sm text-slate-400">
              7 jogos provably fair · RTP médio 97% · aposte com responsabilidade
            </p>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-xs text-slate-400">Saldo</p>
              <p className="text-xl font-black text-emerald-400">{fmt(data?.saldo ?? 0)} MAS</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Taxa de vitória</p>
              <p className="text-xl font-black text-white">
                {data && data.apostas ? ((data.vitorias / data.apostas) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {JOGOS.map((j) => (
          <button
            key={j.id}
            onClick={() => setAtivo(ativo === j.id ? null : j.id)}
            className={`group relative w-40 overflow-hidden rounded-2xl border p-4 text-left transition ${
              ativo === j.id
                ? "border-fuchsia-400 bg-fuchsia-600/20"
                : "border-white/10 bg-white/5 hover:-translate-y-1 hover:border-fuchsia-400/50"
            }`}
          >
            <span className="absolute right-2 top-2 rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-black uppercase text-amber-300">
              {j.tag}
            </span>
            <div className="text-4xl">{j.emoji}</div>
            <p className="mt-2 font-bold text-white">{j.nome}</p>
            <p className="text-[11px] text-slate-400">{j.desc}</p>
          </button>
        ))}
      </div>

      {Jogo ? (
        <Jogo />
      ) : (
        <Card className="py-16 text-center">
          <div className="text-6xl">🎲</div>
          <p className="mt-3 text-lg font-bold text-white">Escolha um jogo acima para começar</p>
          <p className="text-sm text-slate-400">Todos os jogos pagam em MAS diretamente na sua carteira.</p>
        </Card>
      )}
    </div>
  );
}
