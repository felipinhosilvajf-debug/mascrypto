import { useCallback, useEffect, useRef, useState } from "react";
import { PREMIOS_DIARIOS, useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { Barra, Botao, Card, Estat, Selo, Sparkline, Vazio } from "../components/UI";
import { CONQUISTAS } from "../lib/types";
import {
  fmtBRL,
  fmtCompacto,
  fmtHS,
  fmtMAS,
  fmtNum,
  nivelPorXp,
  patente,
  progressoNivel,
} from "../lib/economia";

const hoje = () => new Date().toISOString().slice(0, 10);

/* Números-base da rede (para a home parecer viva mesmo com poucos usuários reais). */
const REDE_BASE = { usuarios: 1842, mas: 5213000, apostas: 128400, mineradores: 963 };

export default function Dashboard({ ir }: { ir: (p: string) => void }) {
  const { data, hashrate, detalheHash, precoMAS, historicoPreco, coletarDiario, listarUsuarios } = useApp();
  const { cfg } = useConfig();
  const [modal, setModal] = useState(false);
  const [resgatando, setResgatando] = useState(false);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [stats, setStats] = useState(REDE_BASE);
  const lastStats = useRef(0);

  /* Estatísticas da plataforma em tempo real (usuários reais + rede). */
  const carregarStats = useCallback(async () => {
    try {
      const us = await listarUsuarios();
      if (!us.length) return;
      setStats({
        usuarios: REDE_BASE.usuarios + us.length,
        mas: REDE_BASE.mas + us.reduce((a, u) => a + u.saldo, 0),
        apostas: REDE_BASE.apostas + us.reduce((a, u) => a + u.apostas, 0),
        mineradores: REDE_BASE.mineradores + us.filter((u) => u.totalMinerado > 0).length,
      });
    } catch {
      /* offline: mantém base */
    }
  }, [listarUsuarios]);

  useEffect(() => {
    carregarStats();
    const iv = setInterval(carregarStats, 30000);
    const h = () => {
      if (Date.now() - lastStats.current > 8000) {
        lastStats.current = Date.now();
        carregarStats();
      }
    };
    window.addEventListener("balanceUpdate", h);
    return () => {
      clearInterval(iv);
      window.removeEventListener("balanceUpdate", h);
    };
  }, [carregarStats]);

  /* Carrossel de banners da Home (gerenciados pelo Admin). */
  const banners = cfg.banners.filter((b) => b.ativo);
  useEffect(() => {
    if (banners.length <= 1) return;
    const iv = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(iv);
  }, [banners.length]);

  /* O estado do resgate vem do Firestore (lastDailyClaim), então limpar
     cookies/cache não libera um novo resgate no mesmo dia. */
  useEffect(() => {
    if (data && data.lastDailyClaim !== hoje()) setModal(true);
  }, [data]);

  if (!data) return null;

  const nivel = nivelPorXp(data.xp);
  const pat = patente(nivel);
  const prog = progressoNivel(data.xp);
  const variacao = historicoPreco.length > 1 ? ((precoMAS - historicoPreco[0]) / historicoPreco[0]) * 100 : 0;

  const resgatar = async () => {
    setResgatando(true);
    await coletarDiario(); // valida e grava no Firestore (anti-duplicação)
    setResgatando(false);
    setModal(false);
  };

  const moedas = [
    { s: "MAS", n: "MAScoin", p: precoMAS, v: variacao, e: "🟣" },
    { s: "BTC", n: "Bitcoin", p: 384520.33, v: 1.24, e: "🟠" },
    { s: "ETH", n: "Ethereum", p: 19870.11, v: -0.68, e: "🔷" },
    { s: "SOL", n: "Solana", p: 1204.7, v: 3.42, e: "🟩" },
    { s: "USDT", n: "Tether", p: 5.42, v: 0.01, e: "🟢" },
  ];

  return (
    <div className="space-y-5">
      {/* ---------- RECOMPENSA DIÁRIA ---------- */}
      {modal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <Card glow className="w-full max-w-lg animate-[subir_.35s_cubic-bezier(.2,.8,.2,1)] text-center">
            <div className="animate-[flutua_2.5s_ease-in-out_infinite] text-6xl">🎁</div>
            <h2 className="mt-3 text-2xl font-black text-white">Recompensa Diária</h2>
            <p className="mt-1 text-sm text-slate-400">Volte todo dia e multiplique seu prêmio!</p>
            <div className="mt-5 grid grid-cols-7 gap-1.5">
              {PREMIOS_DIARIOS.map((p, i) => {
                const ontem = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
                const streakAtual = data.lastDailyClaim === ontem ? Math.min(7, data.streakDays + 1) : 1;
                const ativo = i + 1 === streakAtual;
                const feito = i + 1 < streakAtual;
                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-2 text-[11px] font-black transition ${
                      ativo
                        ? "scale-110 animate-pulse border-amber-400 bg-amber-400/20 text-amber-200"
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
            <Botao variante="ouro" className="mt-6 w-full py-3" disabled={resgatando} onClick={resgatar}>
              {resgatando ? "Resgatando…" : "Coletar recompensa"}
            </Botao>
            <button onClick={() => setModal(false)} className="mt-2 text-xs font-bold text-slate-500 hover:text-slate-300">
              Agora não
            </button>
          </Card>
        </div>
      )}

      {cfg.anuncio && (
        <div className="flex items-center gap-2 overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/[0.07] px-4 py-2.5">
          <span className="shrink-0 text-lg">📢</span>
          <p className="truncate text-sm text-fuchsia-100/90">{cfg.anuncio}</p>
        </div>
      )}

      {/* ---------- BANNERS & AVISOS (gerenciados pelo Admin) ---------- */}
      {banners.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-[0_10px_60px_-20px_rgba(217,70,239,0.5)]">
          <div className={`relative flex h-44 overflow-hidden sm:h-52`}>
            {banners.map((b, i) => (
              <div
                key={b.id}
                className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-br ${b.cor} transition-all duration-700 ${
                  i === bannerIdx ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-8 opacity-0"
                }`}
              >
                {b.imagem && (
                  <img src={b.imagem} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="relative p-5">
                  <p className="text-lg font-black text-white drop-shadow sm:text-xl">{b.titulo}</p>
                  {b.desc && <p className="mt-1 line-clamp-2 max-w-xl text-xs text-slate-200 sm:text-sm">{b.desc}</p>}
                  {b.ctaTexto && (
                    <button
                      onClick={() => {
                        if (b.ctaLink?.startsWith("#/")) ir(b.ctaLink.slice(2));
                        else if (b.ctaLink) window.open(b.ctaLink, "_blank");
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-4 py-2 text-xs font-black text-slate-900 transition hover:bg-white"
                    >
                      {b.ctaTexto} →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {banners.length > 1 && (
            <>
              <div className="absolute bottom-3 right-4 flex gap-1.5">
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    onClick={() => setBannerIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === bannerIdx ? "w-6 bg-white" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setBannerIdx((i) => (i - 1 + banners.length) % banners.length)}
                className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/70"
              >
                ‹
              </button>
              <button
                onClick={() => setBannerIdx((i) => (i + 1) % banners.length)}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/70"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}

      {/* ---------- ESTATÍSTICAS DA PLATAFORMA ---------- */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ["👥", "Usuários na rede", fmtNum(stats.usuarios, 0)],
          ["🪙", "MAS em circulação", fmtCompacto(stats.mas)],
          ["🎲", "Apostas realizadas", fmtCompacto(stats.apostas)],
          ["⛏️", "Mineradores ativos", fmtNum(stats.mineradores, 0)],
        ].map(([e, t, v]) => (
          <div
            key={t as string}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 backdrop-blur-xl transition hover:border-fuchsia-400/40"
          >
            <span className="text-2xl">{e}</span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{t}</p>
              <p className="truncate text-lg font-black text-white">{v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- PERFIL + SALDO ---------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card glow className="overflow-hidden lg:col-span-2">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-600/25 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fuchsia-300/80">Saldo total</p>
              <p className="mt-1 text-4xl font-black text-white sm:text-5xl">{fmtMAS(data.saldo)}</p>
              <p className="mt-1 text-sm text-slate-400">
                ≈ {fmtBRL(data.saldo * precoMAS)} · Carteira: {fmtBRL(data.brl)}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <span className="text-4xl">{data.avatar}</span>
              <div>
                <p className="font-black text-white">{data.nome}</p>
                <p className={`text-xs font-bold ${pat.cor}`}>
                  {pat.emoji} {pat.nome} · Nível {nivel}
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-4">
            <div className="mb-1 flex justify-between text-[11px] text-slate-400">
              <span>
                Nível {nivel} · {fmtNum(prog.atual, 0)}/{fmtNum(prog.necessario, 0)} XP
              </span>
              <span>Nível {nivel + 1}</span>
            </div>
            <Barra pct={prog.pct} />
          </div>

          <div className="relative mt-5 flex flex-wrap gap-2">
            <Botao onClick={() => ir("mineracao")}>⛏️ Minerar</Botao>
            <Botao variante="ouro" onClick={() => ir("cassino")}>🎰 Cassino</Botao>
            <Botao variante="neon" onClick={() => ir("loja")}>🛒 Loja</Botao>
            <Botao variante="ghost" onClick={() => ir("carteira")}>💱 Carteira</Botao>
            <Botao variante="ghost" onClick={() => ir("quarto")}>🏠 Quarto</Botao>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MAS / BRL</p>
              <p className="text-3xl font-black text-white">{fmtBRL(precoMAS)}</p>
            </div>
            <Selo tom={variacao >= 0 ? "verde" : "vermelho"}>
              {variacao >= 0 ? "▲" : "▼"} {fmtNum(Math.abs(variacao), 2)}%
            </Selo>
          </div>
          <div className="mt-3 h-24">
            <Sparkline dados={historicoPreco} cor={variacao >= 0 ? "#34d399" : "#fb7185"} />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Cotação ao vivo · atualiza a cada 2s</p>
        </Card>
      </div>

      {/* ---------- ESTATÍSTICAS ---------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Estat
          emoji="⚡"
          titulo="Hashrate"
          valor={fmtHS(hashrate)}
          sub={`+${fmtNum(detalheHash.bonusPct * 100, 0)}% de bônus`}
          cor="text-cyan-300"
        />
        <Estat emoji="⛏️" titulo="Total minerado" valor={`${fmtCompacto(data.totalMinerado)} MAS`} cor="text-emerald-300" />
        <Estat
          emoji="🎲"
          titulo="Apostas"
          valor={fmtNum(data.apostas, 0)}
          sub={`${data.vitorias} vitórias`}
        />
        <Estat emoji="🔥" titulo="Streak diário" valor={`${data.streakDays} dias`} cor="text-amber-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-black text-white">📈 Mercado</h3>
          <div className="space-y-0.5">
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
                  <p className="font-bold text-white">{fmtBRL(m.p)}</p>
                  <p className={`text-xs font-bold ${m.v >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {m.v >= 0 ? "+" : ""}
                    {fmtNum(m.v, 2)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-black text-white">🏅 Conquistas</h3>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {CONQUISTAS.map((c) => {
              const ok = data.conquistas.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
                    ok ? "border-amber-400/40 bg-amber-400/10" : "border-white/10 bg-white/[0.03] opacity-60"
                  }`}
                >
                  <span className="text-xl">{ok ? c.emoji : "🔒"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{c.nome}</p>
                    <p className="truncate text-[11px] text-slate-400">{c.desc}</p>
                  </div>
                  <span className="shrink-0 text-xs font-black text-amber-300">+{c.premio}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-black text-white">🧾 Movimentações recentes</h3>
          <Botao variante="ghost" className="px-3 py-1.5 text-xs" onClick={() => ir("carteira")}>
            Ver extrato
          </Botao>
        </div>
        {data.historico.length === 0 ? (
          <Vazio emoji="📭" titulo="Nada por aqui ainda" texto="Comece minerando ou colete sua recompensa diária." />
        ) : (
          <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
            {data.historico.slice(0, 15).map((h, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                <div className="min-w-0">
                  <span className="font-bold text-white">{h.t}</span>
                  <span className="ml-2 text-xs text-slate-500">{h.d}</span>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`font-black ${h.v >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {h.v >= 0 ? "+" : "−"}
                    {h.moeda === "BRL" ? fmtBRL(Math.abs(h.v)) : fmtMAS(Math.abs(h.v))}
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
