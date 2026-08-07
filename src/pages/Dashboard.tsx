import { useEffect, useState } from "react";
import { useApp } from "../store/AppContext";
import { Botao, Card, Sparkline, fmt, fmtC } from "../components/UI";
import { CONQUISTAS } from "../lib/types";

const hoje = () => new Date().toISOString().slice(0, 10);
const PREMIOS = [150, 300, 500, 800, 1200, 2000, 5000];

export default function Dashboard({ ir }: { ir: (p: string) => void }) {
  const { data, atualizar, taxaMineracao, precoMAS, historicoPreco, toast } = useApp();
  const [modal, setModal] = useState(false);

  useEffect(() => {
    if (data && data.ultimoLogin !== hoje()) setModal(true);
  }, [data]);

  if (!data) return null;

  const coletarDiario = () => {
    const ontem = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const streak = data.ultimoLogin === ontem ? Math.min(7, data.streak + 1) : 1;
    const premio = PREMIOS[streak - 1];
    atualizar((d) => ({
      ...d,
      saldo: d.saldo + premio,
      streak,
      ultimoLogin: hoje(),
      xp: d.xp + 50,
      historico: [{ t: "Login Diário", v: premio, d: `Dia ${streak}`, ts: Date.now() }, ...d.historico].slice(0, 40),
    }));
    toast(`Recompensa diária: +${premio} MAS 🎁`, "ok");
    setModal(false);
  };

  const variacao =
    historicoPreco.length > 1
      ? ((precoMAS - historicoPreco[0]) / historicoPreco[0]) * 100
      : 0;
  const xpNivel = (data.nivel * data.nivel - 1) * 40;
  const xpProx = ((data.nivel + 1) * (data.nivel + 1) - 1) * 40;
  const prog = Math.min(100, ((data.xp - xpNivel) / (xpProx - xpNivel)) * 100);

  const moedas = [
    { s: "MAS", n: "MAScoin", p: precoMAS, v: variacao, e: "🟣" },
    { s: "BTC", n: "Bitcoin", p: 384520.33, v: 1.24, e: "🟠" },
    { s: "ETH", n: "Ethereum", p: 19870.11, v: -0.68, e: "🔷" },
    { s: "SOL", n: "Solana", p: 1204.7, v: 3.42, e: "🟩" },
    { s: "USDT", n: "Tether", p: 5.42, v: 0.01, e: "🟢" },
  ];

  return (
    <div className="space-y-6">
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <Card glow className="w-full max-w-lg bg-slate-950/95 text-center">
            <div className="text-5xl">🎁</div>
            <h2 className="mt-3 text-2xl font-black text-white">Recompensa Diária</h2>
            <p className="mt-1 text-sm text-slate-400">Volte todo dia para aumentar seu streak!</p>
            <div className="mt-5 grid grid-cols-7 gap-1.5">
              {PREMIOS.map((p, i) => {
                const ontem = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
                const streakAtual = data.ultimoLogin === ontem ? Math.min(7, data.streak + 1) : 1;
                const ativo = i + 1 === streakAtual;
                const feito = i + 1 < streakAtual;
                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-2 text-[11px] font-bold ${
                      ativo
                        ? "animate-pulse border-amber-400 bg-amber-400/20 text-amber-200"
                        : feito
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 bg-white/5 text-slate-500"
                    }`}
                  >
                    <div className="text-slate-400">D{i + 1}</div>
                    <div>{p}</div>
                  </div>
                );
              })}
            </div>
            <Botao variante="ouro" className="mt-6 w-full py-3" onClick={coletarDiario}>
              Coletar recompensa
            </Botao>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card glow className="lg:col-span-2 bg-gradient-to-br from-fuchsia-900/40 to-slate-950/60">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-fuchsia-300/80">Saldo total</p>
              <p className="mt-1 text-5xl font-black text-white">
                {fmt(data.saldo)} <span className="text-2xl text-fuchsia-400">MAS</span>
              </p>
              <p className="mt-1 text-sm text-slate-400">
                ≈ R$ {fmt(data.saldo * precoMAS)} · Carteira BRL: R$ {fmt(data.brl)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl">{data.avatar}</div>
              <p className="mt-1 font-bold text-white">{data.nome}</p>
              <p className="text-xs text-slate-400">Nível {data.nivel}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[11px] text-slate-400">
              <span>XP {data.xp}</span>
              <span>Nível {data.nivel + 1}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-fuchsia-500 to-amber-400" style={{ width: `${prog}%` }} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Botao onClick={() => ir("mineracao")}>⛏️ Minerar</Botao>
            <Botao variante="ouro" onClick={() => ir("cassino")}>🎰 Cassino</Botao>
            <Botao variante="ghost" onClick={() => ir("carteira")}>💱 Converter</Botao>
            <Botao variante="ghost" onClick={() => ir("quarto")}>🏠 Meu quarto</Botao>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">MAS/BRL</p>
              <p className="text-3xl font-black text-white">R$ {fmt(precoMAS, 4)}</p>
            </div>
            <span
              className={`rounded-lg px-2 py-1 text-sm font-bold ${
                variacao >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
              }`}
            >
              {variacao >= 0 ? "▲" : "▼"} {Math.abs(variacao).toFixed(2)}%
            </span>
          </div>
          <div className="mt-3 h-24">
            <Sparkline dados={historicoPreco} cor={variacao >= 0 ? "#34d399" : "#fb7185"} />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Cotação ao vivo · atualiza a cada 2s</p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["⚡", "Hashrate", `${fmt(taxaMineracao, 3)} MAS/s`],
          ["⛏️", "Total minerado", `${fmtC(data.totalMinerado)} MAS`],
          ["🎲", "Apostas", `${data.apostas} (${data.vitorias} 🏆)`],
          ["🔥", "Streak diário", `${data.streak} dias`],
        ].map(([e, t, v]) => (
          <Card key={t} className="flex items-center gap-3">
            <div className="text-3xl">{e}</div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{t}</p>
              <p className="text-lg font-bold text-white">{v}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-bold text-white">📈 Mercado</h3>
          <div className="space-y-1">
            {moedas.map((m) => (
              <div
                key={m.s}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{m.e}</span>
                  <div>
                    <p className="font-bold text-white">{m.s}</p>
                    <p className="text-xs text-slate-500">{m.n}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">R$ {fmt(m.p, m.p < 10 ? 4 : 2)}</p>
                  <p className={`text-xs font-bold ${m.v >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {m.v >= 0 ? "+" : ""}
                    {m.v.toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-bold text-white">🏅 Conquistas</h3>
          <div className="space-y-2">
            {CONQUISTAS.map((c) => {
              const ok = data.conquistas.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                    ok ? "border-amber-400/40 bg-amber-400/10" : "border-white/10 bg-white/5 opacity-60"
                  }`}
                >
                  <span className="text-xl">{ok ? c.emoji : "🔒"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{c.nome}</p>
                    <p className="text-[11px] text-slate-400">{c.desc}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-300">+{c.premio}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 font-bold text-white">🧾 Histórico recente</h3>
        {data.historico.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma transação ainda. Comece minerando!</p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {data.historico.map((h, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                <div>
                  <span className="font-semibold text-white">{h.t}</span>
                  <span className="ml-2 text-xs text-slate-500">{h.d}</span>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${h.v >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {h.v >= 0 ? "+" : ""}
                    {fmt(h.v)} MAS
                  </span>
                  <p className="text-[10px] text-slate-500">
                    {new Date(h.ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
