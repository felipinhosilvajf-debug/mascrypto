import { useState } from "react";
import { AppProvider, useApp } from "./store/AppContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Mineracao from "./pages/Mineracao";
import Cassino from "./pages/Cassino";
import Carteira from "./pages/Carteira";
import Quarto from "./pages/Quarto";
import Ranking from "./pages/Ranking";
import { fmt } from "./components/UI";

const NAV = [
  { id: "inicio", nome: "Início", emoji: "🏦" },
  { id: "mineracao", nome: "Mineração", emoji: "⛏️" },
  { id: "cassino", nome: "Cassino", emoji: "🎰" },
  { id: "carteira", nome: "Carteira", emoji: "💱" },
  { id: "quarto", nome: "Meu Quarto", emoji: "🏠" },
  { id: "ranking", nome: "Ranking", emoji: "🏆" },
];

function Shell() {
  const { user, data, carregando, sair, toasts, precoMAS, online, taxaMineracao } = useApp();
  const [pag, setPag] = useState("inicio");
  const [menu, setMenu] = useState(false);

  if (carregando)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07060f]">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-fuchsia-500/30 border-t-fuchsia-500" />
          <p className="mt-4 font-bold text-white">Conectando à rede MAS…</p>
        </div>
      </div>
    );

  if (!user || !data) return <Login />;

  return (
    <div className="min-h-screen bg-[#07060f] text-slate-200">
      <div className="pointer-events-none fixed -left-40 top-0 h-[600px] w-[600px] rounded-full bg-fuchsia-800/15 blur-[150px]" />
      <div className="pointer-events-none fixed -right-40 bottom-0 h-[600px] w-[600px] rounded-full bg-indigo-700/15 blur-[150px]" />

      <div className="fixed right-4 top-4 z-[100] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-[entrar_.25s_ease-out] rounded-xl border px-4 py-3 text-sm font-bold shadow-xl backdrop-blur-xl ${
              t.tipo === "ok"
                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                : t.tipo === "erro"
                  ? "border-rose-400/40 bg-rose-500/20 text-rose-200"
                  : "border-white/20 bg-slate-800/80 text-white"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07060f]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button onClick={() => setPag("inicio")} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 font-black text-white">
              M
            </div>
            <span className="text-lg font-black text-white">
              MAS<span className="text-fuchsia-400">crypto</span>
            </span>
          </button>

          <nav className="ml-4 hidden gap-1 lg:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setPag(n.id)}
                className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                  pag === n.id ? "bg-fuchsia-600/25 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {n.emoji} {n.nome}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-right sm:block">
              <p className="text-[10px] uppercase text-slate-400">Saldo</p>
              <p className="text-sm font-black text-emerald-400">{fmt(data.saldo)} MAS</p>
            </div>
            <div className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-right md:block">
              <p className="text-[10px] uppercase text-slate-400">MAS/BRL</p>
              <p className="text-sm font-black text-white">R$ {fmt(precoMAS, 3)}</p>
            </div>
            <button onClick={() => setMenu(!menu)} className="text-2xl">
              {data.avatar}
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-t border-white/5 px-3 py-2 lg:hidden">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setPag(n.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold ${
                pag === n.id ? "bg-fuchsia-600/25 text-white" : "text-slate-400"
              }`}
            >
              {n.emoji} {n.nome}
            </button>
          ))}
        </div>

        {menu && (
          <div className="absolute right-4 top-16 w-64 rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
            <p className="font-black text-white">{data.avatar} {data.nome}</p>
            <p className="text-xs text-slate-400">{data.email}</p>
            <div className="my-3 space-y-1 text-xs text-slate-400">
              <p>Nível <b className="text-white">{data.nivel}</b> · XP {data.xp}</p>
              <p>Hashrate <b className="text-emerald-400">{fmt(taxaMineracao, 3)} MAS/s</b></p>
              <p>Status: {online ? "🟢 Sincronizado" : "🟡 Modo local"}</p>
            </div>
            <button
              onClick={() => { setMenu(false); setPag("quarto"); }}
              className="w-full rounded-lg bg-white/5 py-2 text-sm font-bold text-white hover:bg-white/10"
            >
              ⚙️ Editar perfil
            </button>
            <button
              onClick={sair}
              className="mt-2 w-full rounded-lg bg-rose-600/20 py-2 text-sm font-bold text-rose-300 hover:bg-rose-600/30"
            >
              Sair da conta
            </button>
          </div>
        )}
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6">
        {pag === "inicio" && <Dashboard ir={setPag} />}
        {pag === "mineracao" && <Mineracao />}
        {pag === "cassino" && <Cassino />}
        {pag === "carteira" && <Carteira />}
        {pag === "quarto" && <Quarto />}
        {pag === "ranking" && <Ranking />}
      </main>

      <footer className="relative border-t border-white/10 py-8 text-center text-xs text-slate-500">
        <p className="font-bold text-slate-400">MAScrypto · a rede brasileira do MAScoin 🟣</p>
        <p className="mt-1">Jogue com responsabilidade · +18 · Valores fictícios de demonstração</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
