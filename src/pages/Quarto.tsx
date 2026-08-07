import { useState } from "react";
import { useApp } from "../store/AppContext";
import { Botao, Card, Input, fmt } from "../components/UI";
import { AVATARES, ITENS, TEMAS } from "../lib/types";

const COLS = 9;
const ROWS = 5;

export default function Quarto() {
  const { data, atualizar, toast } = useApp();
  const [sel, setSel] = useState<string | null>(null);
  const [aba, setAba] = useState<"loja" | "perfil">("loja");
  const [cat, setCat] = useState<string>("todos");
  const [nome, setNome] = useState(data?.nome || "");

  if (!data) return null;
  const tema = TEMAS.find((t) => t.id === data.tema) || TEMAS[0];

  const comprar = (id: string, preco: number, n: string) => {
    if (data.itens.includes(id)) return toast("Você já possui este item", "info");
    if (data.saldo < preco) return toast("Saldo insuficiente", "erro");
    atualizar((d) => ({
      ...d,
      saldo: d.saldo - preco,
      itens: [...d.itens, id],
      historico: [{ t: "Compra na loja", v: -preco, d: n, ts: Date.now() }, ...d.historico].slice(0, 40),
    }));
    toast(`${n} comprado! Coloque no seu quarto 🏠`, "ok");
  };

  const posicionar = (x: number, y: number) => {
    if (!sel) return;
    atualizar((d) => ({ ...d, quarto: { ...d.quarto, [sel]: { x, y } } }));
    setSel(null);
  };

  const remover = (id: string) => {
    atualizar((d) => {
      const q = { ...d.quarto };
      delete q[id];
      return { ...d, quarto: q };
    });
  };

  const itensFiltrados = ITENS.filter((i) => cat === "todos" || i.categoria === cat);
  const naoColocados = data.itens.filter((i) => !data.quarto[i]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <h2 className="text-lg font-black text-white">🏠 Quarto de {data.nome}</h2>
              <p className="text-xs text-slate-400">
                {sel ? "Clique numa posição para colocar o item" : "Selecione um item do inventário abaixo"}
              </p>
            </div>
            <div className="flex gap-1">
              {TEMAS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => atualizar((d) => ({ ...d, tema: t.id }))}
                  title={t.nome}
                  className={`h-7 w-7 rounded-full bg-gradient-to-br ${t.classe} ring-2 ${
                    data.tema === t.id ? "ring-fuchsia-400" : "ring-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className={`relative bg-gradient-to-b ${tema.classe} p-4`}>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS},minmax(0,1fr))` }}>
              {Array.from({ length: COLS * ROWS }, (_, i) => {
                const x = i % COLS;
                const y = Math.floor(i / COLS);
                const item = Object.entries(data.quarto).find(([, p]) => p.x === x && p.y === y);
                const info = item ? ITENS.find((it) => it.id === item[0]) : null;
                const chao = y >= ROWS - 2;
                return (
                  <button
                    key={i}
                    onClick={() => (item ? remover(item[0]) : posicionar(x, y))}
                    className={`flex aspect-square items-center justify-center rounded-lg text-2xl transition sm:text-3xl ${
                      chao ? "bg-amber-950/40" : "bg-white/5"
                    } ${sel && !item ? "ring-1 ring-fuchsia-400/50 hover:bg-fuchsia-500/20" : "hover:bg-white/10"}`}
                  >
                    {info?.emoji}
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
              <div className="text-5xl drop-shadow-lg">{data.avatar}</div>
              <p className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                {data.nome} · Nv {data.nivel}
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 p-4">
            <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">
              Inventário ({naoColocados.length} disponíveis)
            </p>
            <div className="flex flex-wrap gap-2">
              {data.itens.length === 0 && <p className="text-sm text-slate-500">Compre itens na loja ao lado 👉</p>}
              {data.itens.map((id) => {
                const it = ITENS.find((x) => x.id === id);
                const colocado = !!data.quarto[id];
                return (
                  <button
                    key={id}
                    onClick={() => !colocado && setSel(sel === id ? null : id)}
                    className={`flex h-14 w-14 items-center justify-center rounded-xl border text-2xl transition ${
                      sel === id
                        ? "border-fuchsia-400 bg-fuchsia-500/25"
                        : colocado
                          ? "border-white/5 bg-white/5 opacity-40"
                          : "border-white/10 bg-white/5 hover:border-fuchsia-400/50"
                    }`}
                    title={it?.nome}
                  >
                    {it?.emoji}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex rounded-xl bg-white/5 p-1">
            {(["loja", "perfil"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAba(a)}
                className={`flex-1 rounded-lg py-2 text-sm font-bold capitalize transition ${
                  aba === a ? "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white" : "text-slate-400"
                }`}
              >
                {a === "loja" ? "🛒 Loja" : "👤 Perfil"}
              </button>
            ))}
          </div>

          {aba === "loja" ? (
            <Card className="max-h-[620px] overflow-y-auto">
              <div className="mb-3 flex flex-wrap gap-1">
                {["todos", "movel", "parede", "pet", "avatar"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                      cat === c ? "bg-fuchsia-600 text-white" : "bg-white/5 text-slate-400"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {itensFiltrados.map((i) => {
                  const tem = data.itens.includes(i.id);
                  return (
                    <div key={i.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
                      <span className="text-3xl">{i.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{i.nome}</p>
                        <p className="text-[11px] text-slate-400">{i.desc}</p>
                      </div>
                      <Botao
                        variante={tem ? "ghost" : "primario"}
                        className="px-3 py-1.5 text-xs"
                        disabled={tem}
                        onClick={() => comprar(i.id, i.preco, i.nome)}
                      >
                        {tem ? "✓" : fmt(i.preco, 0)}
                      </Botao>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card className="space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Avatar</p>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARES.map((a) => (
                    <button
                      key={a}
                      onClick={() => atualizar((d) => ({ ...d, avatar: a }))}
                      className={`flex h-11 items-center justify-center rounded-xl border text-2xl transition ${
                        data.avatar === a ? "border-fuchsia-400 bg-fuchsia-500/25" : "border-white/10 bg-white/5"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Nome de exibição</p>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
                <Botao
                  className="mt-2 w-full"
                  onClick={() => {
                    if (nome.trim().length < 2) return toast("Nome muito curto", "erro");
                    atualizar((d) => ({ ...d, nome: nome.trim() }));
                    toast("Perfil atualizado ✅", "ok");
                  }}
                >
                  Salvar perfil
                </Botao>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
                <p className="text-slate-400">E-mail</p>
                <p className="text-white">{data.email}</p>
                <p className="mt-2 text-slate-400">Membro desde</p>
                <p className="text-white">{new Date(data.criadoEm).toLocaleDateString("pt-BR")}</p>
                <p className="mt-2 text-slate-400">Itens possuídos</p>
                <p className="text-white">{data.itens.length} / {ITENS.length}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
