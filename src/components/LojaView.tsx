import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { CATEGORIAS, infoCategoria, type Categoria, type ItemLoja } from "../lib/catalogo";
import { fmtHS, fmtMAS, nivelPorXp } from "../lib/economia";
import { Abas, ArteItem, Barra, Botao, Card, Modal, Selo, Vazio } from "./UI";

type Filtro = "todos" | Categoria;

export default function LojaView() {
  const { data, comprarItem } = useApp();
  const { cfg } = useConfig();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [detalhe, setDetalhe] = useState<ItemLoja | null>(null);

  const nivel = nivelPorXp(data?.xp ?? 0);
  const catalogo = useMemo(() => cfg.itens.filter((i) => i.ativo), [cfg.itens]);

  if (!data) return null;

  const filtrar = (lista: ItemLoja[]) =>
    filtro === "todos" ? lista : lista.filter((i) => i.categoria === filtro);

  const daLoja = filtrar(catalogo).sort((a, b) => a.nivelMin - b.nivelMin || a.preco - b.preco);
  const abasCat = [
    { id: "todos" as Filtro, nome: "Todos", emoji: "✨" },
    ...CATEGORIAS.map((c) => ({ id: c.id as Filtro, nome: c.nome, emoji: c.emoji })),
  ];

  return (
    <div className="space-y-5">
      <Card glow className="overflow-hidden bg-[radial-gradient(120%_140%_at_10%_0%,rgba(217,70,239,0.22),transparent_60%)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">🛒 MAS Market</h2>
            <p className="text-sm text-slate-400">
              Equipamentos aumentam seu H/s · roupas definem seu estilo no quarto virtual
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

      <Card className="border-cyan-500/20 bg-cyan-500/[0.05] p-3">
        <p className="text-xs font-bold text-slate-300">
          O MAS Market agora é focado exclusivamente em compras. Itens vestíveis ficam no Armário/RPG do Quarto,
          e hardware/móveis são gerenciados diretamente no Quarto.
        </p>
      </Card>

      <Abas abas={abasCat} ativa={filtro} onChange={setFiltro} />

      {(
        daLoja.length === 0 ? (
          <Card><Vazio emoji="📦" titulo="Nenhum item nesta categoria" /></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {daLoja.map((i) => {
              const tem = data.itens.includes(i.id);
              const bloqueado = nivel < i.nivelMin;
              const semSaldo = data.saldo < i.preco;
              return (
                <Card key={i.id} hover className="group flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent)] transition-transform duration-300 group-hover:scale-110">
                      <ArteItem emoji={i.emoji} imagem={i.imagem} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
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
                    <span className="text-sm font-black text-amber-300">{fmtMAS(i.preco)}</span>
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
        )
      )}

      <Modal aberto={!!detalhe} onFechar={() => setDetalhe(null)} titulo={detalhe?.nome || ""} largura="max-w-md">
        {detalhe && (
          <div className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5">
              <ArteItem emoji={detalhe.emoji} imagem={detalhe.imagem} tamanho="text-6xl" className="h-16 w-16" />
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
