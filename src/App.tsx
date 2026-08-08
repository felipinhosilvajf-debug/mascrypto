import { useEffect, useState } from "react";
import { AppProvider, useApp } from "./store/AppContext";
import { ConfigProvider } from "./store/ConfigContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Ranking from "./pages/Ranking";
import MiningView from "./components/MiningView";
import CasinoView from "./components/CasinoView";
import WalletView from "./components/WalletView";
import VirtualRoomView from "./components/VirtualRoomView";
import LojaView from "./components/LojaView";
import AdminView from "./components/AdminView";
import SuporteView from "./components/SuporteView";
import { Botao, Card, Input, PillSaldo } from "./components/UI";
import { fmtBRL, fmtHS, fmtMAS, fmtNum, nivelPorXp, patente, progressoNivel } from "./lib/economia";

const NAV = [
  { id: "inicio", nome: "Início", emoji: "🏦" },
  { id: "mineracao", nome: "Mineração", emoji: "⛏️" },
  { id: "cassino", nome: "Cassino", emoji: "🎰" },
  { id: "loja", nome: "Loja", emoji: "🛒" },
  { id: "quarto", nome: "Quarto", emoji: "🏠" },
  { id: "carteira", nome: "Carteira", emoji: "💱" },
  { id: "suporte", nome: "Suporte", emoji: "🎧" },
  { id: "ranking", nome: "Ranking", emoji: "🏆" },
];

function Shell() {
  const { user, data, carregando, sair, toasts, toast, precoMAS, online, hashrate, ehAdmin, desbloquearAdmin } =
    useApp();
  const [pag, setPag] = useState("inicio");
  const [menu, setMenu] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [, forcar] = useState(0);

  /* Sincronização global: qualquer alteração de saldo re-renderiza o header. */
  useEffect(() => {
    const h = () => forcar((n) => n + 1);
    window.addEventListener("balanceUpdate", h);
    window.addEventListener("configUpdate", h);
    return () => {
      window.removeEventListener("balanceUpdate", h);
      window.removeEventListener("configUpdate", h);
    };
  }, []);

  useEffect(() => {
    if (pag === "admin" && !ehAdmin) setPag("inicio");
  }, [pag, ehAdmin]);

  if (carregando)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05040c]">
        <div className="text-center">
          <div className="relative mx-auto h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-fuchsia-500/20 border-t-fuchsia-500" />
            <div className="absolute inset-3 animate-pulse rounded-full bg-fuchsia-500/20" />
          </div>
          <p className="mt-4 font-black text-white">Conectando à rede MAS…</p>
        </div>
      </div>
    );

  if (!user || !data) return <Login />;

  if (data.banido)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05040c] p-4">
        <Card glow className="max-w-md text-center">
          <div className="text-6xl">🚫</div>
          <h2 className="mt-3 text-2xl font-black text-white">Conta suspensa</h2>
          <p className="mt-2 text-sm text-slate-400">
            Sua conta foi suspensa pela administração. Entre em contato com o suporte.
          </p>
          <Botao variante="ghost" className="mt-5 w-full" onClick={sair}>
            Sair
          </Botao>
        </Card>
      </div>
    );

  const nivel = nivelPorXp(data.xp);
  const pat = patente(nivel);
  const prog = progressoNivel(data.xp);
  const navCompleta = ehAdmin ? [...NAV, { id: "admin", nome: "Admin", emoji: "🛡️" }] : NAV;

  return (
    <div className="min-h-screen bg-[#05040c] text-slate-200">
      {/* Fundo vivo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[620px] w-[620px] animate-[flutua_14s_ease-in-out_infinite] rounded-full bg-fuchsia-700/[0.14] blur-[150px]" />
        <div className="absolute -right-40 bottom-0 h-[620px] w-[620px] animate-[flutua_18s_ease-in-out_infinite_reverse] rounded-full bg-cyan-600/[0.12] blur-[150px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      {/* Toasts */}
      <div className="fixed right-3 top-3 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-[entrar_.25s_ease-out] rounded-2xl border px-4 py-3 text-sm font-bold shadow-2xl backdrop-blur-xl ${
              t.tipo === "ok"
                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                : t.tipo === "erro"
                  ? "border-rose-400/40 bg-rose-500/20 text-rose-100"
                  : "border-white/20 bg-slate-800/85 text-white"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#05040c]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-4">
          <button onClick={() => setPag("inicio")} className="flex shrink-0 items-center gap-2">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[conic-gradient(from_140deg,#d946ef,#6366f1,#22d3ee,#d946ef)] font-black text-white shadow-[0_0_24px_-6px_rgba(217,70,239,0.9)]">
              <span className="absolute inset-[2px] rounded-[14px] bg-[#08061a]" />
              <span className="relative">M</span>
            </div>
            <span className="hidden text-lg font-black tracking-tight text-white sm:block">
              MAS<span className="text-fuchsia-400">crypto</span>
            </span>
          </button>

          <nav className="ml-2 hidden gap-1 xl:flex">
            {navCompleta.map((n) => (
              <button
                key={n.id}
                onClick={() => setPag(n.id)}
                className={`rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                  pag === n.id
                    ? "bg-fuchsia-600/25 text-white shadow-[inset_0_0_0_1px_rgba(217,70,239,0.35)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {n.emoji} {n.nome}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <PillSaldo mas={data.saldo} brl={data.brl} />
            <button
              onClick={() => setMenu(!menu)}
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl transition hover:bg-white/10"
            >
              {data.avatar}
              <span className="absolute -bottom-1 -right-1 rounded-md bg-slate-950 px-1 text-[9px] font-black text-fuchsia-300 ring-1 ring-fuchsia-500/40">
                {nivel}
              </span>
            </button>
          </div>
        </div>

        {/* Nav mobile */}
        <div className="flex gap-1 overflow-x-auto border-t border-white/[0.05] px-2 py-2 xl:hidden">
          {navCompleta.map((n) => (
            <button
              key={n.id}
              onClick={() => setPag(n.id)}
              className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                pag === n.id ? "bg-fuchsia-600/25 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {n.emoji} {n.nome}
            </button>
          ))}
        </div>

        {/* Menu do perfil */}
        {menu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
            <div className="absolute right-2 top-[60px] z-40 w-72 rounded-3xl border border-white/10 bg-slate-950/97 p-4 shadow-2xl backdrop-blur-2xl sm:right-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{data.avatar}</span>
                <div className="min-w-0">
                  <p className="truncate font-black text-white">{data.nome}</p>
                  <p className="truncate text-[11px] text-slate-400">{data.email}</p>
                </div>
              </div>

              <div className={`mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs`}>
                <p className={`font-black ${pat.cor}`}>
                  {pat.emoji} {pat.nome} · Nível {nivel}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-400"
                    style={{ width: `${prog.pct}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  {fmtNum(prog.atual, 0)}/{fmtNum(prog.necessario, 0)} XP para o nível {nivel + 1}
                </p>
              </div>

              <div className="mt-2 space-y-1 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-[11px] text-slate-400">
                <p className="flex justify-between">
                  <span>Saldo MAS</span> <b className="text-emerald-300">{fmtMAS(data.saldo)}</b>
                </p>
                <p className="flex justify-between">
                  <span>Saldo R$</span> <b className="text-sky-300">{fmtBRL(data.brl)}</b>
                </p>
                <p className="flex justify-between">
                  <span>Hashrate</span> <b className="text-cyan-300">{fmtHS(hashrate)}</b>
                </p>
                <p className="flex justify-between">
                  <span>Cotação</span> <b className="text-white">{fmtBRL(precoMAS)}</b>
                </p>
                <p className="flex justify-between">
                  <span>Sincronia</span>
                  <b className={online ? "text-emerald-300" : "text-amber-300"}>
                    {online ? "🟢 Online" : "🟡 Local"}
                  </b>
                </p>
              </div>

              <div className="mt-2 space-y-1.5">
                <button
                  onClick={() => {
                    setMenu(false);
                    setPag("quarto");
                  }}
                  className="w-full rounded-xl bg-white/5 py-2 text-sm font-bold text-white hover:bg-white/10"
                >
                  ⚙️ Editar perfil
                </button>
                {ehAdmin ? (
                  <button
                    onClick={() => {
                      setMenu(false);
                      setPag("admin");
                    }}
                    className="w-full rounded-xl bg-cyan-500/15 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-500/25"
                  >
                    🛡️ Painel administrativo
                  </button>
                ) : (
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Código admin"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="py-1.5 text-xs"
                    />
                    <Botao
                      variante="ghost"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => {
                        if (desbloquearAdmin(codigo)) {
                          toast("Modo administrador liberado 🛡️", "ok");
                          setMenu(false);
                        } else toast("Código inválido", "erro");
                        setCodigo("");
                      }}
                    >
                      OK
                    </Botao>
                  </div>
                )}
                <button
                  onClick={sair}
                  className="w-full rounded-xl bg-rose-600/20 py-2 text-sm font-bold text-rose-300 hover:bg-rose-600/30"
                >
                  Sair da conta
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      <main className="relative mx-auto max-w-7xl px-3 py-5 sm:px-4">
        {pag === "inicio" && <Dashboard ir={setPag} />}
        {pag === "mineracao" && <MiningView />}
        {pag === "cassino" && <CasinoView />}
        {pag === "loja" && <LojaView />}
        {pag === "quarto" && <VirtualRoomView />}
        {pag === "carteira" && <WalletView />}
        {pag === "suporte" && <SuporteView />}
        {pag === "ranking" && <Ranking />}
        {pag === "admin" && ehAdmin && <AdminView />}
      </main>

      <footer className="relative border-t border-white/[0.07] py-8 text-center text-xs text-slate-500">
        <p className="font-bold text-slate-400">MAScrypto · a rede brasileira do MAScoin 🟣</p>
        <p className="mt-1">Jogue com responsabilidade · +18 · Valores fictícios de demonstração</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </ConfigProvider>
  );
}
