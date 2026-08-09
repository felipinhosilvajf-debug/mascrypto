import { useEffect, useMemo, useState } from "react";
import Bilheteria from "../games/Bilheteria";
import { Card, Selo, Vazio } from "./UI";
import { Bomb, Building2, CircleDot, Coins, Dice5, Disc3, GitFork, Rocket, Spade, type LucideIcon } from "lucide-react";
import { CaraCoroa, Crash, Dados, Double, Mines, Plinko, Roleta, Slots, Torre } from "../games/Jogos";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { fmtMAS, fmtNum } from "../lib/economia";

const COMPONENTES: Record<string, React.ComponentType> = {
  crash: Crash,
  mines: Mines,
  slots: Slots,
  dados: Dados,
  roleta: Roleta,
  moeda: CaraCoroa,
  torre: Torre,
  double: Double,
  plinko: Plinko,
};

const ICONES: Record<string, LucideIcon> = {
  crash: Rocket,
  mines: Bomb,
  slots: Spade,
  dados: Dice5,
  roleta: CircleDot,
  moeda: Coins,
  torre: Building2,
  double: Disc3,
  plinko: GitFork,
};

const BRILHOS: Record<string, string> = {
  crash: "from-rose-500/25 to-orange-500/10",
  mines: "from-emerald-500/25 to-teal-500/10",
  slots: "from-amber-400/25 to-yellow-500/10",
  dados: "from-sky-500/25 to-indigo-500/10",
  roleta: "from-fuchsia-500/25 to-purple-500/10",
  moeda: "from-yellow-400/25 to-amber-600/10",
  torre: "from-violet-500/25 to-blue-500/10",
};

export default function CasinoView() {
  const { data, ehAdmin } = useApp();
  const { cfg, jogoAtivo } = useConfig();
  const [ativo, setAtivo] = useState<string | null>(null);
  const [, force] = useState(0);

  // Reage às mudanças do Admin (Firestore onSnapshot) sem precisar de F5
  useEffect(() => {
    const h = () => force((n) => n + 1);
    window.addEventListener("configUpdate", h);
    window.addEventListener("balanceUpdate", h);
    return () => {
      window.removeEventListener("configUpdate", h);
      window.removeEventListener("balanceUpdate", h);
    };
  }, []);

  const disponiveis = useMemo(
    () => Object.values(cfg.jogos).filter((j) => j.ativo && cfg.cassinoAtivo),
    [cfg.jogos, cfg.cassinoAtivo],
  );

  /* Bloqueio real: se o jogo aberto for desativado, o acesso é encerrado. */
  useEffect(() => {
    if (ativo && !jogoAtivo(ativo)) setAtivo(null);
  }, [ativo, jogoAtivo]);

  if (!data) return null;

  const Jogo = ativo && jogoAtivo(ativo) ? COMPONENTES[ativo] : null;
  const taxaVitoria = data.apostas ? (data.vitorias / data.apostas) * 100 : 0;

  if (!cfg.cassinoAtivo)
    return (
      <Card glow>
        <Vazio
          emoji="🛑"
          titulo="Cassino em manutenção"
          texto="A administração desativou temporariamente o cassino. Volte em breve!"
        />
      </Card>
    );

  return (
    <div className="space-y-5">
      <Card glow className="overflow-hidden bg-[radial-gradient(130%_150%_at_20%_0%,rgba(245,158,11,0.18),transparent_55%)]">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              🎰 MAS <span className="bg-gradient-to-r from-amber-300 to-fuchsia-400 bg-clip-text text-transparent">Casino Royale</span>
            </h2>
            <p className="text-sm text-slate-400">
              {disponiveis.length} jogos ativos · RTP configurável pela administração · pagamentos instantâneos em MAS
            </p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-right">
              <p className="text-[10px] font-bold uppercase text-emerald-400/80">Saldo</p>
              <p className="text-lg font-black text-emerald-300">{fmtMAS(data.saldo)}</p>
            </div>
            <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right sm:block">
              <p className="text-[10px] font-bold uppercase text-slate-400">Vitórias</p>
              <p className="text-lg font-black text-white">{fmtNum(taxaVitoria, 0)}%</p>
            </div>
          </div>
        </div>
      </Card>

      {disponiveis.length === 0 ? (
        <Card>
          <Vazio emoji="🚧" titulo="Nenhum jogo disponível" texto="Todos os jogos foram desativados pela administração." />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {disponiveis.map((j) => (
            (() => {
              const Icone = ICONES[j.id] || CircleDot;
              return <button
              key={j.id}
              onClick={() => setAtivo(ativo === j.id ? null : j.id)}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                ativo === j.id
                  ? "border-fuchsia-400/70 bg-fuchsia-600/20 shadow-[0_0_30px_-10px_rgba(217,70,239,0.9)]"
                  : "border-white/10 bg-white/[0.04] hover:-translate-y-1.5 hover:border-fuchsia-400/40"
              }`}
            >
              {/* capa/imagem ou gif configurados pelo Admin */}
              {j.gif || j.capa ? (
                <div className="pointer-events-none absolute inset-0 opacity-25 transition-opacity duration-300 group-hover:opacity-45">
                  <img
                    src={j.gif || j.capa}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                  />
                </div>
              ) : (
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
                    BRILHOS[j.id] || "from-fuchsia-500/20 to-transparent"
                  }`}
                />
              )}
              <span className="absolute right-2 top-2 rounded-full bg-black/50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-300">
                {j.tag}
              </span>
              <div className="relative transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6">
                <Icone className="h-10 w-10 stroke-[1.6] text-fuchsia-200 drop-shadow-[0_0_10px_rgba(232,121,249,.7)]" />
              </div>
              <p className="relative mt-2 text-sm font-black text-white">{j.nome}</p>
              <p className="relative text-[10px] leading-tight text-slate-400">{j.desc}</p>
              {ehAdmin && (
                <Selo tom="ciano" className="relative mt-1.5">
                  RTP {Math.round((j.rtp ?? 0.97) * 100)}%
                </Selo>
              )}
            </button>;
            })()
          ))}
        </div>
      )}

      {Jogo ? (
        <div className="animate-[subir_.35s_cubic-bezier(.2,.8,.2,1)]">
          <Jogo />
        </div>
      ) : (
        disponiveis.length > 0 && (
          <Card className="overflow-hidden py-14 text-center">
            <div className="animate-[flutua_3s_ease-in-out_infinite] text-6xl">🎲</div>
            <p className="mt-4 text-lg font-black text-white">Escolha um jogo para começar</p>
            <p className="text-sm text-slate-400">Todos os prêmios caem direto na sua carteira MAS.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Selo tom="verde">Pagamento instantâneo</Selo>
              <Selo tom="ciano">Provably fair</Selo>
              <Selo tom="ouro">RTP dinâmico</Selo>
            </div>
          </Card>
        )
      )}

      {/* ── Bilheteria em destaque ── */}
      {cfg.bilheteria.ativa && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-0.5 text-[11px] font-black uppercase tracking-widest text-amber-300">
              🎟️ Jogo em Destaque
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          </div>
          <Bilheteria />
        </div>
      )}

      <p className="text-center text-[11px] text-slate-600">
        🔞 Jogue com responsabilidade. Valores fictícios de demonstração.
      </p>
    </div>
  );
}
