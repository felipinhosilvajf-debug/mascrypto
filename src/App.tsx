import { useEffect, useState } from "react";
import { AppProvider, useApp } from "./store/AppContext";
import { ConfigProvider, useConfig } from "./store/ConfigContext";
import { TemaProvider, useTema, TEMA_CLASSES, type Tema } from "./store/ThemeContext";
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
import MundoView from "./components/MundoView";
import TermosModal, { TERMOS_VERSAO } from "./components/TermosModal";
import { AvatarVisual, Botao, Card, Input, PillSaldo } from "./components/UI";
import { fmtBRL, fmtHS, fmtMAS, fmtNum, nivelPorXp, patente, progressoNivel } from "./lib/economia";
import { cn } from "./utils/cn";

/** Itens base do menu — o Admin pode desativar qualquer módulo via cfg.modulos. */
const NAV_BASE = [
  { id: "inicio",    nome: "Início",    emoji: "🏦", mod: null        },
  { id: "mineracao", nome: "Mineração", emoji: "⛏️", mod: "mineracao" },
  { id: "cassino",   nome: "Cassino",   emoji: "🎰", mod: "cassino"   },
  { id: "loja",      nome: "Loja",      emoji: "🛒", mod: "loja"      },
  { id: "quarto",    nome: "Quarto",    emoji: "🏠", mod: "quarto"    },
  { id: "mundo",     nome: "Mundo",     emoji: "🌐", mod: "mundo"     },
  { id: "carteira",  nome: "Carteira",  emoji: "💱", mod: "carteira"  },
  { id: "suporte",   nome: "Suporte",   emoji: "🎧", mod: "suporte"   },
  { id: "ranking",   nome: "Ranking",   emoji: "🏆", mod: "ranking"   },
] as const;

/** Moeda 3D girando — usada no logo e na index */
export function CoinMAS({ size = 40 }: { size?: number }) {
  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        perspective: "400px",
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          backgroundImage:
            "conic-gradient(from 140deg, #d946ef, #6366f1, #22d3ee, #fbbf24, #d946ef)",
          animation: "coin3d 3s linear infinite",
          transformStyle: "preserve-3d",
          borderRadius: "50%",
        }}
      />
      <div
        className="absolute rounded-full bg-[#08061a] flex items-center justify-center font-black text-white"
        style={{
          inset: Math.round(size * 0.06),
          fontSize: Math.round(size * 0.42),
          borderRadius: "50%",
        }}
      >
        M
      </div>
    </div>
  );
}

/** Seletor de tema compacto */
/** Botão + indicador de mineração global, exibido no cabeçalho em todas as páginas. */
function MineracaoGlobal({ compacto = false }: { compacto?: boolean }) {
  const { minerandoManual, siteVisivel, minerandoAtivo, toggleMineracao, toast } = useApp();

  const estado = !minerandoManual
    ? { cls: "border-white/10 bg-white/5 text-slate-300", dot: "bg-slate-400", txt: "Pausado", icon: "⚪" }
    : !siteVisivel
      ? { cls: "border-amber-400/30 bg-amber-400/15 text-amber-300", dot: "bg-amber-400 animate-pulse", txt: "Site Inativo", icon: "🟡" }
      : { cls: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 shadow-[0_0_14px_-3px_#10b981]", dot: "bg-emerald-400 animate-pulse", txt: "Minerando...", icon: "🟢" };

  return (
    <button
      onClick={() => {
        toggleMineracao();
        toast(minerandoManual ? "Mineração pausada" : "Mineração iniciada — continua ativa em todo o site ⛏️", "info");
      }}
      title={minerandoAtivo ? "Clique para pausar a mineração" : "Clique para iniciar a mineração"}
      className={cn(
        "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide transition-all active:scale-95",
        estado.cls,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", estado.dot)} />
      {!compacto && <span className="hidden sm:inline">{estado.txt}</span>}
      <span className="text-sm">{minerandoManual ? "⏸" : "▶"}</span>
    </button>
  );
}

function SeletorTema() {
  const { tema, setTema } = useTema();
  const temas: Tema[] = ["dark", "neon", "light"];
  return (
    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
      {temas.map((t) => {
        const info = TEMA_CLASSES[t];
        return (
          <button
            key={t}
            onClick={() => setTema(t)}
            title={info.label}
            className={cn(
              "rounded-lg px-2 py-1 text-[11px] font-bold transition-all",
              tema === t
                ? "bg-fuchsia-600/50 text-white shadow-[0_0_10px_rgba(217,70,239,0.6)]"
                : "text-slate-400 hover:text-white",
            )}
          >
            {info.emoji}
          </button>
        );
      })}
    </div>
  );
}

function Shell() {
  const {
    user,
    data,
    carregando,
    sair,
    toasts,
    toast,
    precoMAS,
    online,
    hashrate,
    ehAdmin,
    desbloquearAdmin,
    aceitarTermos,
  } = useApp();
  const { tema } = useTema();
  const [pag, setPag] = useState("inicio");
  /** UID do quarto que está sendo visitado (null = próprio quarto / anfitrião). */
  const [quartoVisitado, setQuartoVisitado] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [, forcar] = useState(0);

  const temaInfo = TEMA_CLASSES[tema];

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
    // Sair da aba Quarto encerra a visita e volta ao modo anfitrião
    if (pag !== "quarto") setQuartoVisitado(null);
  }, [pag, ehAdmin]);

  if (carregando)
    return (
      <div className={cn("flex min-h-screen items-center justify-center", temaInfo.bg)}>
        <div className="text-center">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-fuchsia-500/20 border-t-fuchsia-500" />
            <CoinMAS size={40} />
          </div>
          <p className="mt-4 font-black text-white">Conectando à rede MAS…</p>
        </div>
      </div>
    );

  if (!user || !data) return <Login />;

  if (data.banido)
    return (
      <div className={cn("flex min-h-screen items-center justify-center p-4", temaInfo.bg)}>
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

  /* Aceite obrigatório dos Termos de Uso — bloqueia a navegação até confirmar. */
  if (data.termosVersao !== TERMOS_VERSAO)
    return (
      <div className={cn("min-h-screen", temaInfo.bg)}>
        <TermosModal
          onAceitar={() => {
            aceitarTermos(TERMOS_VERSAO);
            toast("Termos aceitos. Bem-vindo à rede MAS! 🚀", "ok");
          }}
          onRecusar={sair}
        />
      </div>
    );

  const nivel = nivelPorXp(data.xp);
  const pat = patente(nivel);
  const prog = progressoNivel(data.xp);
  const { cfg } = useConfig();
  const modulos = cfg.modulos || {};
  const NAV = NAV_BASE.filter((n) => {
    if (n.mod !== null && modulos[n.mod as keyof typeof modulos] === false) return false;
    if (n.id === "mundo" && nivelPorXp(data.xp) < (cfg.requisitosNivel?.acessarMundo || 1)) return false;
    return true;
  });
  const navCompleta = ehAdmin ? [...NAV, { id: "admin", nome: "Admin", emoji: "🛡️" }] : NAV;

  /* Estilos por tema */
  const bgMain =
    tema === "light"
      ? "bg-gradient-to-br from-indigo-50 via-white to-blue-50"
      : tema === "neon"
        ? "bg-[#00060f]"
        : "bg-[#05040c]";

  const textMain = tema === "light" ? "text-slate-900" : "text-slate-200";

  const headerBg =
    tema === "light"
      ? "bg-white/80 border-indigo-200/60"
      : tema === "neon"
        ? "bg-[#00060f]/90 border-cyan-400/20"
        : "bg-[#05040c]/85 border-white/[0.07]";

  const orb1 =
    tema === "neon"
      ? "bg-cyan-500/20"
      : tema === "light"
        ? "bg-indigo-300/30"
        : "bg-fuchsia-700/[0.14]";
  const orb2 =
    tema === "neon"
      ? "bg-emerald-400/15"
      : tema === "light"
        ? "bg-purple-300/20"
        : "bg-cyan-600/[0.12]";

  return (
    <div className={cn("min-h-screen", bgMain, textMain)}>
      {/* Fundo vivo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={cn("absolute -left-40 top-0 h-[620px] w-[620px] animate-[flutua_14s_ease-in-out_infinite] rounded-full blur-[150px]", orb1)} />
        <div className={cn("absolute -right-40 bottom-0 h-[620px] w-[620px] animate-[flutua_18s_ease-in-out_infinite_reverse] rounded-full blur-[150px]", orb2)} />
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      {/* Toasts */}
      <div className="fixed right-3 top-3 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-[entrar_.25s_ease-out] rounded-2xl border px-4 py-3 text-sm font-bold shadow-2xl backdrop-blur-xl",
              t.tipo === "ok"
                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                : t.tipo === "erro"
                  ? "border-rose-400/40 bg-rose-500/20 text-rose-100"
                  : "border-white/20 bg-slate-800/85 text-white",
            )}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* HEADER */}
      <header className={cn("sticky top-0 z-40 border-b backdrop-blur-2xl", headerBg)}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-4">
          <button onClick={() => setPag("inicio")} className="flex shrink-0 items-center gap-2">
            <CoinMAS size={40} />
            <span className={cn("hidden text-lg font-black tracking-tight sm:block", tema === "light" ? "text-slate-900" : "text-white")}>
              MAS<span className="text-fuchsia-400">crypto</span>
            </span>
          </button>

          <nav className="ml-2 hidden gap-1 xl:flex">
            {navCompleta.map((n) => (
              <button
                key={n.id}
                onClick={() => setPag(n.id)}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-bold transition-all",
                  pag === n.id
                    ? "bg-fuchsia-600/25 text-white shadow-[inset_0_0_0_1px_rgba(217,70,239,0.35)]"
                    : tema === "light"
                      ? "text-slate-600 hover:bg-indigo-100 hover:text-indigo-800"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                )}
              >
                {n.emoji} {n.nome}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <MineracaoGlobal />
            <SeletorTema />
            <PillSaldo mas={data.saldo} brl={data.brl} />
            <button
              onClick={() => setMenu(!menu)}
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl transition hover:bg-white/10"
            >
              <AvatarVisual avatar={data.avatar} imagem={data.avatarImg} className="h-8 w-8" emojiClassName="text-xl" />
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
              className={cn(
                "shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition",
                pag === n.id ? "bg-fuchsia-600/25 text-white" : "text-slate-400 hover:text-white",
              )}
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
                <AvatarVisual avatar={data.avatar} imagem={data.avatarImg} className="h-10 w-10" emojiClassName="text-3xl" />
                <div className="min-w-0">
                  <p className="truncate font-black text-white">{data.nome}</p>
                  <p className="truncate text-[11px] text-slate-400">{data.email}</p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs">
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

              {/* Seletor de tema no menu */}
              <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Tema visual</p>
                <SeletorTema />
              </div>

              <div className="mt-2 space-y-1.5">
                <button
                  onClick={() => { setMenu(false); setPag("quarto"); }}
                  className="w-full rounded-xl bg-white/5 py-2 text-sm font-bold text-white hover:bg-white/10"
                >
                  ⚙️ Editar perfil
                </button>
                {ehAdmin ? (
                  <button
                    onClick={() => { setMenu(false); setPag("admin"); }}
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
        {pag === "quarto" && (
          <VirtualRoomView
            hostId={quartoVisitado ?? undefined}
            onSair={() => setQuartoVisitado(null)}
          />
        )}
        {pag === "mundo" && (
          <MundoView
            onEntrarQuarto={(hostId) => {
              setQuartoVisitado(hostId === data.uid ? null : hostId);
              setPag("quarto");
            }}
          />
        )}
        {pag === "carteira" && <WalletView />}
        {pag === "suporte" && <SuporteView />}
        {pag === "ranking" && <Ranking />}
        {pag === "admin" && ehAdmin && <AdminView />}
      </main>

      <footer className="relative border-t border-white/[0.07] py-8 text-center text-xs text-slate-500">
        <p className="flex items-center justify-center gap-2 font-bold text-slate-400">
          <CoinMAS size={18} />
          MAScrypto · a rede brasileira do MAScoin
        </p>
        <p className="mt-1">Jogue com responsabilidade · +18 · Valores fictícios de demonstração</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <TemaProvider>
      <ConfigProvider>
        <AppProvider>
          <Shell />
        </AppProvider>
      </ConfigProvider>
    </TemaProvider>
  );
}
