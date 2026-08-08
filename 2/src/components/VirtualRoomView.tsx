import { useState } from "react";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { AVATARES, SLOTS, STATUS_QUARTO, TEMAS } from "../lib/types";
import { fmtHS, fmtMAS, nivelPorXp, patente, progressoNivel } from "../lib/economia";
import { ArteItem, Barra, Botao, Card, Input, Modal, Selo } from "./UI";

const COLS = 10;
const ROWS = 6;

export default function VirtualRoomView() {
  const { data, atualizar, posicionarNoQuarto, removerDoQuarto, hashrate, detalheHash, toast } = useApp();
  const { cfg } = useConfig();
  const [sel, setSel] = useState<string | null>(null);
  const [editar, setEditar] = useState(false);
  const [nome, setNome] = useState(data?.nome || "");

  if (!data) return null;

  const nivel = nivelPorXp(data.xp);
  const pat = patente(nivel);
  const prog = progressoNivel(data.xp);
  const tema = TEMAS.find((t) => t.id === data.tema) || TEMAS[0];
  const decorativos = cfg.itens.filter(
    (i) => data.itens.includes(i.id) && (i.decorativo || i.categoria === "movel"),
  );
  const naoPosicionados = decorativos.filter((i) => !data.quarto[i.id]);
  const equipados = SLOTS.map((s) => ({ slot: s, item: cfg.itens.find((i) => i.id === data.equipados[s.id]) })).filter(
    (x) => x.item,
  );

  return (
    <div className="space-y-4">
      {/* ---------- CABEÇALHO LIMPO: Nome // Status ---------- */}
      <Card glow className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[conic-gradient(from_180deg,rgba(217,70,239,0.45),rgba(56,189,248,0.35),rgba(217,70,239,0.45))] text-4xl">
              {data.avatar}
            </div>
            <span className="absolute -bottom-1.5 -right-1.5 rounded-lg bg-slate-950 px-1.5 py-0.5 text-[10px] font-black text-fuchsia-300 ring-1 ring-fuchsia-500/40">
              Nv {nivel}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-white sm:text-2xl">
              {data.nome} <span className="text-slate-600">//</span>{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                {data.status}
              </span>
            </h2>
            <p className={`text-xs font-bold ${pat.cor}`}>
              {pat.emoji} {pat.nome}
            </p>
          </div>
        </div>
        <Botao variante="ghost" onClick={() => setEditar(true)}>
          ⚙️ Personalizar
        </Botao>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* ---------- O QUARTO ---------- */}
        <Card className="overflow-hidden p-0">
          <div className={`relative bg-gradient-to-b ${tema.classe} p-3 sm:p-5`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_60%)]" />
            <div
              className="relative grid gap-1"
              style={{ gridTemplateColumns: `repeat(${COLS},minmax(0,1fr))` }}
            >
              {Array.from({ length: COLS * ROWS }, (_, idx) => {
                const x = idx % COLS;
                const y = Math.floor(idx / COLS);
                const par = Object.entries(data.quarto).find(([, p]) => p.x === x && p.y === y);
                const item = par ? cfg.itens.find((i) => i.id === par[0]) : null;
                const chao = y >= ROWS - 2;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (item) return removerDoQuarto(item.id);
                      if (sel) {
                        posicionarNoQuarto(sel, x, y);
                        setSel(null);
                      }
                    }}
                    className={`flex aspect-square items-center justify-center rounded-lg text-xl transition-all duration-200 sm:text-2xl ${
                      chao ? "bg-black/25" : "bg-white/[0.04]"
                    } ${sel && !item ? "ring-1 ring-fuchsia-400/60 hover:scale-110 hover:bg-fuchsia-500/25" : "hover:bg-white/10"}`}
                  >
                    {item && <ArteItem emoji={item.emoji} imagem={item.imagem} tamanho="text-2xl" className="h-7 w-7" />}
                  </button>
                );
              })}
            </div>

            {/* Avatar com as peças equipadas */}
            <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center">
              <div className="flex items-end gap-0.5">
                {equipados
                  .filter((e) => ["chapeu", "oculos"].includes(e.slot.id))
                  .map((e) => (
                    <span key={e.slot.id} className="text-lg drop-shadow">
                      {e.item!.emoji}
                    </span>
                  ))}
              </div>
              <div className="text-5xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">{data.avatar}</div>
              <div className="flex gap-0.5">
                {equipados
                  .filter((e) => !["chapeu", "oculos"].includes(e.slot.id))
                  .map((e) => (
                    <span key={e.slot.id} className="text-sm drop-shadow">
                      {e.item!.emoji}
                    </span>
                  ))}
              </div>
              <p className="mt-1 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                {data.nome} · Nv {nivel}
              </p>
            </div>
          </div>

          {/* Inventário decorativo */}
          <div className="border-t border-white/10 p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Decoração {sel ? "· escolha um local no quarto" : `· ${naoPosicionados.length} para posicionar`}
            </p>
            <div className="flex flex-wrap gap-2">
              {decorativos.length === 0 && (
                <p className="text-sm text-slate-500">Compre móveis na Loja para decorar seu espaço.</p>
              )}
              {decorativos.map((i) => {
                const posto = !!data.quarto[i.id];
                return (
                  <button
                    key={i.id}
                    onClick={() => !posto && setSel(sel === i.id ? null : i.id)}
                    title={i.nome}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border transition ${
                      sel === i.id
                        ? "scale-110 border-fuchsia-400 bg-fuchsia-500/25"
                        : posto
                          ? "border-white/5 bg-white/[0.03] opacity-35"
                          : "border-white/10 bg-white/5 hover:border-fuchsia-400/50"
                    }`}
                  >
                    <ArteItem emoji={i.emoji} imagem={i.imagem} tamanho="text-2xl" className="h-7 w-7" />
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* ---------- PAINEL LATERAL ENXUTO ---------- */}
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Nível {nivel}</span>
              <span className="text-slate-500">{prog.atual}/{prog.necessario} XP</span>
            </div>
            <div className="mt-2">
              <Barra pct={prog.pct} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-white/5 p-2.5">
                <p className="text-[10px] uppercase text-slate-500">Saldo</p>
                <p className="text-sm font-black text-emerald-300">{fmtMAS(data.saldo)}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-2.5">
                <p className="text-[10px] uppercase text-slate-500">Hashrate</p>
                <p className="text-sm font-black text-cyan-300">{fmtHS(hashrate)}</p>
              </div>
            </div>
            {detalheHash.bonusPct > 0 && (
              <p className="mt-2 text-center text-[11px] text-emerald-300">
                Bônus de equipamentos: +{Math.round(detalheHash.bonusPct * 100)}%
              </p>
            )}
          </Card>

          <Card className="p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Visual equipado</p>
            {equipados.length === 0 ? (
              <p className="text-xs text-slate-500">Nada equipado. Vá até a Loja → Inventário.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {equipados.map((e) => (
                  <Selo key={e.slot.id} tom="violeta">
                    {e.item!.emoji} {e.item!.nome}
                  </Selo>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ---------- MODAL DE PERSONALIZAÇÃO ---------- */}
      <Modal aberto={editar} onFechar={() => setEditar(false)} titulo="Personalizar perfil">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Avatar</p>
            <div className="grid grid-cols-8 gap-1.5">
              {AVATARES.map((a) => (
                <button
                  key={a}
                  onClick={() => atualizar((d) => ({ ...d, avatar: a }))}
                  className={`flex h-10 items-center justify-center rounded-xl border text-xl transition ${
                    data.avatar === a ? "border-fuchsia-400 bg-fuchsia-500/25" : "border-white/10 bg-white/5"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_QUARTO.map((s) => (
                <button
                  key={s}
                  onClick={() => atualizar((d) => ({ ...d, status: s }))}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                    data.status === s
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                      : "border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Ambiente</p>
            <div className="flex flex-wrap gap-2">
              {TEMAS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => atualizar((d) => ({ ...d, tema: t.id }))}
                  title={t.nome}
                  className={`h-9 w-9 rounded-xl bg-gradient-to-br ${t.classe} ring-2 transition ${
                    data.tema === t.id ? "scale-110 ring-fuchsia-400" : "ring-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Nome de exibição</p>
            <div className="flex gap-2">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              <Botao
                onClick={() => {
                  if (nome.trim().length < 2) return toast("Nome muito curto", "erro");
                  atualizar((d) => ({ ...d, nome: nome.trim() }));
                  toast("Perfil atualizado ✅", "ok");
                  setEditar(false);
                }}
              >
                Salvar
              </Botao>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
