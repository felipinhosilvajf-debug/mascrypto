import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { RARIDADES, infoCategoria, infoRaridade, type Categoria, type ItemLoja, type Raridade } from "../lib/catalogo";
import { fmtHS, fmtMAS, nivelPorXp } from "../lib/economia";
import { ArteItem, Barra, Botao, Card, Input, Modal, Selo, Vazio } from "./UI";
import { cn } from "../utils/cn";

type FiltroCat = "todos" | Categoria;
type Ordem = "preco-asc" | "preco-desc" | "az" | "za";

/** Tag de raridade estilizada, reutilizável. */
export function TagRaridade({ raridade, className }: { raridade?: Raridade; className?: string }) {
  const info = infoRaridade(raridade);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
        info.brilho,
        className,
      )}
      style={{ borderColor: `${info.cor}66`, background: `${info.cor}1a`, color: info.cor }}
    >
      {info.nome}
    </span>
  );
}

export default function LojaView() {
  const { data, comprarItem } = useApp();
  const { cfg } = useConfig();
  const [filtro, setFiltro] = useState<FiltroCat>("todos");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("preco-asc");
  const [filtroRar, setFiltroRar] = useState<Raridade | "todas">("todas");
  const [detalhe, setDetalhe] = useState<ItemLoja | null>(null);

  const nivel = nivelPorXp(data?.xp ?? 0);
  const catalogo = useMemo(() => cfg.itens.filter((i) => i.ativo), [cfg.itens]);

  // Filtragem + ordenação (calculada sempre, mesmo sem data)
  const itens = useMemo(() => {
    let lista = catalogo;
    if (filtro !== "todos") lista = lista.filter((i) => i.categoria === filtro);
    if (filtroRar !== "todas") lista = lista.filter((i) => (i.raridade || "comum") === filtroRar);
    const q = busca.trim().toLowerCase();
    if (q) lista = lista.filter((i) => i.nome.toLowerCase().includes(q));
    const copia = [...lista];
    switch (ordem) {
      case "preco-asc":  copia.sort((a, b) => a.preco - b.preco || a.nivelMin - b.nivelMin); break;
      case "preco-desc": copia.sort((a, b) => b.preco - a.preco || b.nivelMin - a.nivelMin); break;
      case "az":         copia.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")); break;
      case "za":         copia.sort((a, b) => b.nome.localeCompare(a.nome, "pt-BR")); break;
    }
    return copia;
  }, [catalogo, filtro, filtroRar, busca, ordem]);

  const homeRpg: { id: Categoria; nome: string; emoji: string; desc: string }[] = [
    { id: "avatar", nome: "Avatares Premium", emoji: "👤", desc: "Skins completas de personagem" },
    { id: "gpu", nome: "Placas de Vídeo", emoji: "🖥️", desc: "GPUs de mineração + H/s" },
    { id: "periferico", nome: "Hardware", emoji: "🖱️", desc: "Periféricos e rigs" },
    { id: "movel", nome: "Móveis", emoji: "🛋️", desc: "Decore seu quarto" },
  ];

  if (!data) return null;

  return (
    <div className="space-y-5">
      <Card glow className="overflow-hidden bg-[radial-gradient(120%_140%_at_10%_0%,rgba(217,70,239,0.22),transparent_60%)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">🛒 MAS Market</h2>
            <p className="text-sm text-slate-400">
              Avatares inteiros, GPUs, hardware e móveis — tudo sincronizado com seu perfil e mineração.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-right">
              <p className="text-[10px] font-bold uppercase text-emerald-400/80">Seu saldo</p>
              <p className="text-lg font-black text-emerald-300">{fmtMAS(data.saldo)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right">
              <p className="text-[10px] font-bold uppercase text-slate-400">Nível</p>
              <p className="text-lg font-black text-white">{nivel}</p>
            </div>
          </div>
        </div>
        {!cfg.lojaAtiva && (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-200">
            ⚠️ A loja está temporariamente fechada pela administração.
          </p>
        )}
      </Card>

      {/* Barra de busca e ordenação */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          {/* Busca */}
          <div className="relative min-w-[200px] flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <Input
              placeholder="Buscar item pelo nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Ordenação de preço */}
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as Ordem)}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm font-bold text-white outline-none"
          >
            <option value="preco-asc">💰 Mais barato</option>
            <option value="preco-desc">💸 Mais caro</option>
            <option value="az">🔤 A → Z</option>
            <option value="za">🔠 Z → A</option>
          </select>
        </div>

        {/* Filtro por raridade */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Raridade:</span>
          <button
            onClick={() => setFiltroRar("todas")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-bold uppercase transition",
              filtroRar === "todas" ? "border-white bg-white/15 text-white" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
            )}
          >
            Todas
          </button>
          {RARIDADES.map((r) => (
            <button
              key={r.id}
              onClick={() => setFiltroRar(r.id)}
              className="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider transition"
              style={{
                borderColor: filtroRar === r.id ? r.cor : "rgba(255,255,255,0.1)",
                background: filtroRar === r.id ? `${r.cor}22` : "transparent",
                color: filtroRar === r.id ? r.cor : "rgba(148,163,184,1)",
              }}
            >
              {r.nome}
            </button>
          ))}
        </div>
      </Card>

      {/* Navegação RPG Futurista / Cyberpunk */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {homeRpg.map((c) => {
          const ativo = filtro === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setFiltro(ativo ? "todos" : c.id)}
              className={`group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-300 hover:-translate-y-1 active:scale-[0.97] ${
                ativo
                  ? "border-fuchsia-400 bg-fuchsia-500/20 shadow-[0_0_30px_-6px_rgba(217,70,239,.7)]"
                  : "border-white/10 bg-white/[0.03] hover:border-fuchsia-400/50 hover:shadow-[0_0_20px_-8px_rgba(217,70,239,.5)]"
              }`}
            >
              <span className="pointer-events-none absolute -right-4 -top-4 text-6xl opacity-10 transition-transform duration-500 group-hover:scale-125 group-hover:opacity-20">
                {c.emoji}
              </span>
              <div className={`text-3xl transition-transform duration-300 group-hover:scale-110 ${ativo ? "drop-shadow-[0_0_12px_rgba(217,70,239,.9)]" : ""}`}>
                {c.emoji}
              </div>
              <p className={`mt-2 text-sm font-black ${ativo ? "text-white" : "text-slate-200"}`}>{c.nome}</p>
              <p className="text-[11px] text-slate-400">{c.desc}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-fuchsia-300/80">
                {ativo ? "● Aberto" : "▸ Explorar"}
              </p>
            </button>
          );
        })}
      </div>

      {itens.length === 0 ? (
        <Card><Vazio emoji="📦" titulo="Nenhum item encontrado" texto="Ajuste a busca ou os filtros." /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {itens.map((i) => {
            const tem = data.itens.includes(i.id);
            const bloqueado = nivel < i.nivelMin;
            const semSaldo = data.saldo < i.preco;
            const rar = infoRaridade(i.raridade);
            return (
              <Card key={i.id} hover className={cn("group flex flex-col p-4", rar.id !== "comum" && rar.brilho)}>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent)] transition-transform duration-300 group-hover:scale-110"
                    style={{ boxShadow: rar.id !== "comum" ? `0 0 18px -6px ${rar.cor}` : "none" }}
                  >
                    <ArteItem emoji={i.emoji} imagem={i.imagem} />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <TagRaridade raridade={i.raridade} />
                    <Selo tom="cinza">{infoCategoria(i.categoria).nome}</Selo>
                    {i.hs > 0 && <Selo tom="ciano">⚡ {fmtHS(i.hs)}</Selo>}
                    {i.bonusPct > 0 && <Selo tom="verde">+{Math.round(i.bonusPct * 100)}%</Selo>}
                  </div>
                </div>
                <h4 className="mt-3 font-bold text-white">{i.nome}</h4>
                <p className="line-clamp-2 min-h-[32px] text-xs text-slate-400">{i.desc}</p>
                {i.requisito && <p className="mt-1 text-[11px] text-amber-300/80">📌 {i.requisito}</p>}
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className={bloqueado ? "font-bold text-rose-400" : "text-slate-500"}>
                    🔒 Nível {i.nivelMin}
                  </span>
                  {i.estoque >= 0 && <span className="text-slate-500">· {i.estoque} un.</span>}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button onClick={() => setDetalhe(i)} className="text-sm font-black text-amber-300 hover:text-amber-200">
                    {fmtMAS(i.preco)}
                  </button>
                  {tem ? (
                    <Botao variante="ghost" className="px-3 py-1.5 text-xs" disabled>
                      ✓ Adquirido
                    </Botao>
                  ) : (
                    <Botao
                      variante={bloqueado ? "ghost" : "primario"}
                      className="px-3 py-1.5 text-xs"
                      disabled={bloqueado || semSaldo || !cfg.lojaAtiva}
                      onClick={() => comprarItem(i)}
                    >
                      {bloqueado ? `Nv ${i.nivelMin}` : semSaldo ? "Sem saldo" : "Comprar"}
                    </Botao>
                  )}
                </div>
                {bloqueado && (
                  <div className="mt-2">
                    <Barra pct={(nivel / i.nivelMin) * 100} cor="from-rose-500 to-amber-400" altura="h-1" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal aberto={!!detalhe} onFechar={() => setDetalhe(null)} titulo={detalhe?.nome || ""} largura="max-w-md">
        {detalhe && (
          <div className="text-center">
            <div
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5"
              style={{ boxShadow: infoRaridade(detalhe.raridade).id !== "comum" ? `0 0 30px -8px ${infoRaridade(detalhe.raridade).cor}` : "none" }}
            >
              <ArteItem emoji={detalhe.emoji} imagem={detalhe.imagem} tamanho="text-6xl" className="h-16 w-16" />
            </div>
            <div className="mt-2 flex justify-center">
              <TagRaridade raridade={detalhe.raridade} />
            </div>
            <p className="mt-3 text-sm text-slate-300">{detalhe.desc || "Sem descrição."}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-left text-xs">
              {[
                ["Categoria", infoCategoria(detalhe.categoria).nome],
                ["Preço", fmtMAS(detalhe.preco)],
                ["Nível mínimo", String(detalhe.nivelMin)],
                ["Potência", detalhe.hs > 0 ? fmtHS(detalhe.hs) : "—"],
                ["Bônus", detalhe.bonusPct ? `+${Math.round(detalhe.bonusPct * 100)}%` : "—"],
                ["Estoque", detalhe.estoque < 0 ? "Ilimitado" : `${detalhe.estoque} un.`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white/5 p-2.5">
                  <p className="text-slate-500">{k}</p>
                  <p className="font-bold text-white">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
