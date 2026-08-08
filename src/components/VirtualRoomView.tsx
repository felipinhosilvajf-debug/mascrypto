import { useCallback, useEffect, useState } from "react";
import { Backpack, Box, Cat, Glasses, HardHat, MonitorCog, Shirt, Sparkles } from "lucide-react";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { AVATARES, SLOTS, STATUS_QUARTO, TEMAS } from "../lib/types";
import { fmtHS, fmtMAS, nivelPorXp, patente, progressoNivel } from "../lib/economia";
import { ArteItem, Barra, Botao, Card, Input, Modal } from "./UI";

const COLS = 9;
const ROWS = 7;
const TILE_W = 70;
const TILE_H = 34;
const CENTRO_X = 50;
const CENTRO_Y = 10;

const slotIcone: Record<string, React.ComponentType<{ className?: string }>> = {
  chapeu: HardHat,
  oculos: Glasses,
  camisa: Shirt,
  calca: Sparkles,
  sapato: Sparkles,
  gpu: MonitorCog,
  periferico: Box,
  pet: Cat,
};

function iso(x: number, y: number) {
  return {
    left: `calc(${CENTRO_X}% + ${(x - y) * (TILE_W / 2)}px)`,
    top: `${CENTRO_Y + (x + y) * (TILE_H / 2)}px`,
  };
}

export default function VirtualRoomView() {
  const {
    data,
    atualizar,
    posicionarNoQuarto,
    removerDoQuarto,
    equipar,
    desequipar,
    hashrate,
    detalheHash,
    toast,
  } = useApp();
  const { cfg } = useConfig();
  const [sel, setSel] = useState<string | null>(null);
  const [editar, setEditar] = useState(false);
  const [nome, setNome] = useState(data?.nome || "");
  const [abaLateral, setAbaLateral] = useState<"rpg" | "decoracao">("rpg");

  const moverAvatar = useCallback(
    (x: number, y: number) => {
      if (!data) return;
      const nx = Math.max(0, Math.min(COLS - 1, x));
      const ny = Math.max(0, Math.min(ROWS - 1, y));
      atualizar((d) => ({ ...d, avatarPos: { x: nx, y: ny } }));
    },
    [atualizar, data],
  );

  /* WASD/setas movem o avatar um tile por vez. */
  useEffect(() => {
    if (!data) return;
    const h = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      const { x, y } = data.avatarPos;
      if (["ArrowUp", "w", "W"].includes(e.key)) moverAvatar(x, y - 1);
      else if (["ArrowDown", "s", "S"].includes(e.key)) moverAvatar(x, y + 1);
      else if (["ArrowLeft", "a", "A"].includes(e.key)) moverAvatar(x - 1, y);
      else if (["ArrowRight", "d", "D"].includes(e.key)) moverAvatar(x + 1, y);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [data, moverAvatar]);

  if (!data) return null;

  const nivel = nivelPorXp(data.xp);
  const pat = patente(nivel);
  const prog = progressoNivel(data.xp);
  const tema = TEMAS.find((t) => t.id === data.tema) || TEMAS[0];
  const decorativos = cfg.itens.filter((i) => data.itens.includes(i.id) && (i.decorativo || i.categoria === "movel"));
  const naoPosicionados = decorativos.filter((i) => !data.quarto[i.id]);

  const clicarTile = (x: number, y: number) => {
    const itemAqui = Object.entries(data.quarto).find(([, p]) => p.x === x && p.y === y);
    if (sel && !itemAqui) {
      posicionarNoQuarto(sel, x, y);
      setSel(null);
      return;
    }
    moverAvatar(x, y);
  };

  return (
    <div className="space-y-4">
      <Card glow className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[conic-gradient(from_180deg,rgba(217,70,239,.5),rgba(56,189,248,.4),rgba(217,70,239,.5))] text-4xl shadow-[0_0_25px_-8px_rgba(217,70,239,.9)]">
            {data.avatar}
            <span className="absolute -bottom-1.5 -right-1.5 rounded-lg bg-slate-950 px-1.5 py-0.5 text-[10px] font-black text-fuchsia-300 ring-1 ring-fuchsia-500/40">Nv {nivel}</span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-white sm:text-2xl">
              {data.nome} <span className="text-slate-600">//</span>{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">{data.status}</span>
            </h2>
            <p className={`text-xs font-bold ${pat.cor}`}>{pat.emoji} {pat.nome} · use WASD/setas ou clique no piso para andar</p>
          </div>
        </div>
        <Botao variante="ghost" onClick={() => setEditar(true)}>Personalizar</Botao>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_350px]">
        {/* ---------------- AMBIENTE ISOMÉTRICO ---------------- */}
        <Card className="overflow-hidden p-0">
          <div className={`relative h-[520px] overflow-hidden bg-gradient-to-b ${tema.classe}`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(255,255,255,.15),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 border-b border-white/10 bg-black/20 [clip-path:polygon(0_0,100%_0,90%_100%,10%_100%)]" />

            {/* Prateleiras da parede exibem itens equipados/armazenados. */}
            <div className="absolute left-1/2 top-7 flex -translate-x-1/2 gap-3">
              {SLOTS.slice(0, 6).map((s) => {
                const it = cfg.itens.find((i) => i.id === data.equipados[s.id]);
                return (
                  <div key={s.id} className="flex h-14 w-14 flex-col items-center justify-center border-b-4 border-fuchsia-950 bg-black/25 shadow-[0_8px_12px_-8px_black]">
                    {it ? <ArteItem emoji={it.emoji} imagem={it.imagem} tamanho="text-2xl" className="h-7 w-7" /> : <span className="text-[9px] text-white/25">{s.nome}</span>}
                  </div>
                );
              })}
            </div>

            {/* Piso: projeção isométrica real por coordenadas. */}
            <div className="absolute inset-0 top-28">
              {Array.from({ length: COLS * ROWS }, (_, i) => {
                const x = i % COLS;
                const y = Math.floor(i / COLS);
                const item = Object.entries(data.quarto).find(([, p]) => p.x === x && p.y === y);
                return (
                  <button
                    key={i}
                    onClick={() => clicarTile(x, y)}
                    className={`absolute h-[34px] w-[70px] -translate-x-1/2 origin-center rotate-[30deg] skew-y-[-15deg] border transition-all duration-200 ${
                      sel && !item ? "border-fuchsia-300/60 bg-fuchsia-500/20 hover:bg-fuchsia-400/40" : "border-white/[0.12] bg-slate-900/45 hover:bg-cyan-500/20"
                    }`}
                    style={iso(x, y)}
                    aria-label={`Mover para ${x}, ${y}`}
                  />
                );
              })}

              {/* Móveis e itens no plano isométrico. */}
              {Object.entries(data.quarto).map(([id, p]) => {
                const it = cfg.itens.find((i) => i.id === id);
                if (!it) return null;
                return (
                  <button
                    key={id}
                    onClick={() => removerDoQuarto(id)}
                    title={`${it.nome} · clique para guardar`}
                    className="absolute z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-8 items-center justify-center text-4xl drop-shadow-[0_12px_8px_rgba(0,0,0,.8)] transition hover:-translate-y-10 hover:scale-110"
                    style={iso(p.x, p.y)}
                  >
                    <ArteItem emoji={it.emoji} imagem={it.imagem} tamanho="text-4xl" className="h-12 w-12" />
                  </button>
                );
              })}

              {/* Avatar anda livremente no plano. */}
              <div
                className="pointer-events-none absolute z-30 flex -translate-x-1/2 -translate-y-10 flex-col items-center transition-all duration-300 ease-out"
                style={iso(data.avatarPos.x, data.avatarPos.y)}
              >
                <div className="relative text-5xl drop-shadow-[0_12px_8px_rgba(0,0,0,.9)]">
                  {data.avatar}
                  {data.equipados.chapeu && <span className="absolute -right-3 -top-3 text-xl">{cfg.itens.find((i) => i.id === data.equipados.chapeu)?.emoji}</span>}
                  {data.equipados.pet && <span className="absolute -right-7 bottom-0 text-2xl">{cfg.itens.find((i) => i.id === data.equipados.pet)?.emoji}</span>}
                </div>
                <p className="rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-black text-white backdrop-blur">{data.nome}</p>
                <span className="mt-1 h-2 w-10 rounded-full bg-black/40 blur-[2px]" />
              </div>
            </div>

            <div className="absolute bottom-3 left-3 rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-[10px] text-slate-300 backdrop-blur">
              {sel ? "Selecione um tile livre para posicionar o móvel" : "Clique no piso para andar · clique no móvel para guardar"}
            </div>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Móveis na mochila ({naoPosicionados.length})</p>
              {sel && <button onClick={() => setSel(null)} className="text-[10px] font-bold text-rose-300">cancelar posicionamento</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              {naoPosicionados.length === 0 && <p className="text-xs text-slate-500">Todos os móveis estão no quarto. Compre mais na Loja.</p>}
              {naoPosicionados.map((i) => (
                <button key={i.id} onClick={() => setSel(sel === i.id ? null : i.id)} title={i.nome} className={`flex h-12 w-12 items-center justify-center rounded-xl border transition ${sel === i.id ? "scale-110 border-fuchsia-400 bg-fuchsia-500/25" : "border-white/10 bg-white/5 hover:border-fuchsia-400/50"}`}>
                  <ArteItem emoji={i.emoji} imagem={i.imagem} tamanho="text-2xl" className="h-7 w-7" />
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* ---------------- PAINEL RPG ---------------- */}
        <div className="space-y-3">
          <div className="flex rounded-xl bg-white/5 p-1">
            {(["rpg", "decoracao"] as const).map((a) => (
              <button key={a} onClick={() => setAbaLateral(a)} className={`flex-1 rounded-lg py-2 text-xs font-black transition ${abaLateral === a ? "bg-fuchsia-600/30 text-white" : "text-slate-500"}`}>
                {a === "rpg" ? "Equipamento RPG" : "Inventário"}
              </button>
            ))}
          </div>

          {abaLateral === "rpg" ? (
            <Card className="p-4">
              <div className="mb-4 text-center">
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-fuchsia-400/40 bg-[radial-gradient(circle,rgba(217,70,239,.25),transparent_70%)] text-6xl shadow-[0_0_35px_-10px_rgba(217,70,239,.9)]">{data.avatar}</div>
                <p className="mt-2 font-black text-white">{data.nome}</p>
                <p className={`text-[11px] font-bold ${pat.cor}`}>{pat.emoji} {pat.nome} · Nv {nivel}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SLOTS.map((s) => {
                  const it = cfg.itens.find((i) => i.id === data.equipados[s.id]);
                  const Icone = slotIcone[s.id] || Backpack;
                  return (
                    <div key={s.id} className={`relative rounded-2xl border p-2.5 ${it ? "border-fuchsia-400/35 bg-fuchsia-500/[0.08]" : "border-white/10 bg-black/20"}`}>
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/35">
                          {it ? <ArteItem emoji={it.emoji} imagem={it.imagem} tamanho="text-2xl" className="h-7 w-7" /> : <Icone className="h-5 w-5 text-slate-600" />}
                        </div>
                        <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase text-slate-500">{s.nome}</p><p className="truncate text-[11px] font-black text-white">{it?.nome || "Vazio"}</p></div>
                      </div>
                      {it && <button onClick={() => desequipar(s.id)} className="absolute right-1 top-1 text-[9px] text-rose-300">×</button>}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 rounded-xl bg-black/30 p-3 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Poder de mineração</span><b className="text-cyan-300">{fmtHS(hashrate)}</b></div>
                <div className="mt-1 flex justify-between"><span className="text-slate-500">Bônus equipado</span><b className="text-emerald-300">+{Math.round(detalheHash.bonusPct * 100)}%</b></div>
              </div>
            </Card>
          ) : (
            <Card className="p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Itens equipáveis na mochila</p>
              <div className="max-h-[470px] space-y-2 overflow-y-auto pr-1">
                {cfg.itens.filter((i) => data.itens.includes(i.id) && i.slot).map((i) => {
                  const equipado = Object.values(data.equipados).includes(i.id);
                  return (
                    <div key={i.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                      <ArteItem emoji={i.emoji} imagem={i.imagem} tamanho="text-2xl" className="h-8 w-8" />
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{i.nome}</p><p className="text-[10px] text-slate-500">{i.slot}{i.hs > 0 ? ` · ${fmtHS(i.hs)}` : ""}</p></div>
                      <Botao variante={equipado ? "ghost" : "sucesso"} className="px-2 py-1 text-[10px]" disabled={equipado} onClick={() => equipar(i.id)}>{equipado ? "Equipado" : "Equipar"}</Botao>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex justify-between text-xs"><span className="font-bold text-white">Nível {nivel}</span><span className="text-slate-500">{prog.atual}/{prog.necessario} XP</span></div>
            <div className="mt-2"><Barra pct={prog.pct} /></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-white/5 p-2"><p className="text-[9px] uppercase text-slate-500">Saldo</p><p className="text-xs font-black text-emerald-300">{fmtMAS(data.saldo)}</p></div><div className="rounded-xl bg-white/5 p-2"><p className="text-[9px] uppercase text-slate-500">Posição</p><p className="text-xs font-black text-white">{data.avatarPos.x}, {data.avatarPos.y}</p></div></div>
          </Card>
        </div>
      </div>

      <Modal aberto={editar} onFechar={() => setEditar(false)} titulo="Personalizar perfil">
        <div className="space-y-4">
          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Avatar</p><div className="grid grid-cols-8 gap-1.5">{AVATARES.map((a) => <button key={a} onClick={() => atualizar((d) => ({ ...d, avatar: a }))} className={`flex h-10 items-center justify-center rounded-xl border text-xl transition ${data.avatar === a ? "border-fuchsia-400 bg-fuchsia-500/25" : "border-white/10 bg-white/5"}`}>{a}</button>)}</div></div>
          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</p><div className="flex flex-wrap gap-1.5">{STATUS_QUARTO.map((s) => <button key={s} onClick={() => atualizar((d) => ({ ...d, status: s }))} className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${data.status === s ? "border-cyan-400 bg-cyan-500/20 text-cyan-200" : "border-white/10 bg-white/5 text-slate-400"}`}>{s}</button>)}</div></div>
          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Ambiente</p><div className="flex flex-wrap gap-2">{TEMAS.map((t) => <button key={t.id} onClick={() => atualizar((d) => ({ ...d, tema: t.id }))} title={t.nome} className={`h-9 w-9 rounded-xl bg-gradient-to-br ${t.classe} ring-2 ${data.tema === t.id ? "scale-110 ring-fuchsia-400" : "ring-white/10"}`} />)}</div></div>
          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Nome de exibição</p><div className="flex gap-2"><Input value={nome} onChange={(e) => setNome(e.target.value)} /><Botao onClick={() => { if (nome.trim().length < 2) return toast("Nome muito curto", "erro"); atualizar((d) => ({ ...d, nome: nome.trim() })); setEditar(false); }}>Salvar</Botao></div></div>
        </div>
      </Modal>
    </div>
  );
}