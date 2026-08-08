import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import {
  CATEGORIAS,
  GRUPOS_ADMIN,
  JOGOS_META,
  infoCategoria,
  type Categoria,
  type ItemLoja,
  type Rig,
} from "../lib/catalogo";
import { SLOTS, type UserData } from "../lib/types";
import { fmtBRL, fmtHS, fmtMAS, fmtNum, nivelPorXp, patente, xpParaNivel } from "../lib/economia";
import {
  Abas,
  ArteItem,
  Botao,
  Campo,
  Card,
  Confirmar,
  Estat,
  Input,
  Modal,
  Selo,
  Switch,
  Textarea,
  Vazio,
} from "./UI";

type AbaAdmin =
  | "operacional"
  | "contas"
  | "loja"
  | "cassino"
  | "mineracao"
  | "xp"
  | "config";

const ABAS = [
  { id: "operacional" as const, nome: "Operacional", emoji: "🎫" },
  { id: "contas" as const, nome: "Contas", emoji: "👥" },
  { id: "loja" as const, nome: "Itens da Loja", emoji: "🛒" },
  { id: "cassino" as const, nome: "Cassino", emoji: "🎰" },
  { id: "mineracao" as const, nome: "Mineração", emoji: "⛏️" },
  { id: "xp" as const, nome: "XP e Níveis", emoji: "⭐" },
  { id: "config" as const, nome: "Configurações", emoji: "⚙️" },
];

export default function AdminView() {
  const [aba, setAba] = useState<AbaAdmin>("operacional");
  const { configOnline } = useConfig();

  return (
    <div className="space-y-5">
      <Card glow className="overflow-hidden bg-[radial-gradient(120%_150%_at_0%_0%,rgba(56,189,248,0.18),transparent_55%)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-white">🛡️ Painel Administrativo</h2>
            <p className="text-sm text-slate-400">
              Controle total da rede MAS — alterações refletem em todos os usuários em tempo real.
            </p>
          </div>
          <Selo tom={configOnline ? "verde" : "ouro"}>
            {configOnline ? "● Sincronizado com o banco" : "● Modo local (offline)"}
          </Selo>
        </div>
      </Card>

      <Abas abas={ABAS} ativa={aba} onChange={setAba} />

      {aba === "operacional" && <Operacional />}
      {aba === "contas" && <Contas />}
      {aba === "loja" && <LojaAdmin />}
      {aba === "cassino" && <CassinoAdmin />}
      {aba === "mineracao" && <MineracaoAdmin />}
      {aba === "xp" && <XpAdmin />}
      {aba === "config" && <ConfigAdmin />}
    </div>
  );
}

/* ========================================================================
   ABA OPERACIONAL — Tickets + Saques + Pendências juntos
   ======================================================================== */
interface Ticket {
  id: string;
  usuario: string;
  assunto: string;
  msg: string;
  status: "aberto" | "resolvido";
  ts: number;
}
interface Saque {
  id: string;
  usuario: string;
  valor: number;
  chave: string;
  status: "pendente" | "pago" | "recusado";
  ts: number;
}
const LS_TICKETS = "mascrypto:admin:tickets";
const LS_SAQUES = "mascrypto:admin:saques";

function ler<T>(k: string, padrao: T): T {
  try {
    return JSON.parse(localStorage.getItem(k) || "null") ?? padrao;
  } catch {
    return padrao;
  }
}

function Operacional() {
  const { toast } = useApp();
  const [tickets, setTickets] = useState<Ticket[]>(() =>
    ler<Ticket[]>(LS_TICKETS, [
      { id: "t1", usuario: "cryptolud@mail.com", assunto: "Saque não caiu", msg: "Solicitei há 2 dias.", status: "aberto", ts: Date.now() - 8e7 },
      { id: "t2", usuario: "minerkin@mail.com", assunto: "Item sumiu", msg: "Comprei a RTX 4090 e não apareceu.", status: "aberto", ts: Date.now() - 3e7 },
    ]),
  );
  const [saques, setSaques] = useState<Saque[]>(() =>
    ler<Saque[]>(LS_SAQUES, [
      { id: "s1", usuario: "cryptolud@mail.com", valor: 250, chave: "cpf 123.***.**-09", status: "pendente", ts: Date.now() - 9e7 },
      { id: "s2", usuario: "luacheia@mail.com", valor: 80.5, chave: "email lua@mail.com", status: "pendente", ts: Date.now() - 2e7 },
    ]),
  );
  const [sub, setSub] = useState<"tickets" | "saques" | "pendencias">("tickets");

  useEffect(() => localStorage.setItem(LS_TICKETS, JSON.stringify(tickets)), [tickets]);
  useEffect(() => localStorage.setItem(LS_SAQUES, JSON.stringify(saques)), [saques]);

  const abertos = tickets.filter((t) => t.status === "aberto").length;
  const pendentes = saques.filter((s) => s.status === "pendente");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Estat emoji="🎫" titulo="Tickets abertos" valor={String(abertos)} cor="text-amber-300" />
        <Estat emoji="💰" titulo="Saques pendentes" valor={String(pendentes.length)} cor="text-rose-300" />
        <Estat
          emoji="⏳"
          titulo="Total a liberar"
          valor={fmtBRL(pendentes.reduce((a, b) => a + b.valor, 0))}
          cor="text-sky-300"
        />
      </div>

      <Abas
        abas={[
          { id: "tickets" as const, nome: "Tickets", emoji: "🎫", badge: abertos },
          { id: "saques" as const, nome: "Saques", emoji: "💰", badge: pendentes.length },
          { id: "pendencias" as const, nome: "Pendências", emoji: "⏳" },
        ]}
        ativa={sub}
        onChange={setSub}
      />

      {sub === "tickets" && (
        <Card>
          {tickets.length === 0 ? (
            <Vazio emoji="✅" titulo="Nenhum ticket" />
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">{t.assunto}</p>
                      <p className="truncate text-xs text-slate-400">
                        {t.usuario} · {new Date(t.ts).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Selo tom={t.status === "aberto" ? "ouro" : "verde"}>{t.status}</Selo>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{t.msg}</p>
                  <div className="mt-2 flex gap-2">
                    <Botao
                      variante="sucesso"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => {
                        setTickets((ts) => ts.map((x) => (x.id === t.id ? { ...x, status: "resolvido" } : x)));
                        toast("Ticket resolvido", "ok");
                      }}
                    >
                      Resolver
                    </Botao>
                    <Botao
                      variante="ghost"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => setTickets((ts) => ts.filter((x) => x.id !== t.id))}
                    >
                      Excluir
                    </Botao>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {sub === "saques" && (
        <Card>
          {saques.length === 0 ? (
            <Vazio emoji="✅" titulo="Nenhum saque" />
          ) : (
            <div className="space-y-2">
              {saques.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white">{fmtBRL(s.valor)}</p>
                    <p className="truncate text-xs text-slate-400">
                      {s.usuario} · {s.chave}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Selo tom={s.status === "pago" ? "verde" : s.status === "recusado" ? "vermelho" : "ouro"}>
                      {s.status}
                    </Selo>
                    {s.status === "pendente" && (
                      <>
                        <Botao
                          variante="sucesso"
                          className="px-3 py-1.5 text-xs"
                          onClick={() => {
                            setSaques((v) => v.map((x) => (x.id === s.id ? { ...x, status: "pago" } : x)));
                            toast("Saque marcado como pago", "ok");
                          }}
                        >
                          Pagar
                        </Botao>
                        <Botao
                          variante="perigo"
                          className="px-3 py-1.5 text-xs"
                          onClick={() =>
                            setSaques((v) => v.map((x) => (x.id === s.id ? { ...x, status: "recusado" } : x)))
                          }
                        >
                          Recusar
                        </Botao>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {sub === "pendencias" && (
        <Card>
          <h3 className="mb-3 font-black text-white">⏳ Fila geral</h3>
          <div className="space-y-2 text-sm">
            {[...tickets.filter((t) => t.status === "aberto").map((t) => `🎫 Ticket: ${t.assunto} (${t.usuario})`),
              ...pendentes.map((s) => `💰 Saque de ${fmtBRL(s.valor)} para ${s.usuario}`)].map((l, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-300">
                {l}
              </div>
            ))}
            {abertos + pendentes.length === 0 && <Vazio emoji="🎉" titulo="Tudo em dia!" />}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ========================================================================
   ABA CONTAS
   ======================================================================== */
function Contas() {
  const { listarUsuarios, adminSalvarUsuario, adminExcluirUsuario, toast, data } = useApp();
  const { cfg } = useConfig();
  const [lista, setLista] = useState<UserData[]>([]);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<UserData | null>(null);
  const [confirmar, setConfirmar] = useState<UserData | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = async () => {
    setCarregando(true);
    setLista(await listarUsuarios());
    setCarregando(false);
  };
  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = lista.filter(
    (u) =>
      !busca ||
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase()) ||
      u.uid.includes(busca),
  );

  const salvar = async (u: UserData) => {
    try {
      await adminSalvarUsuario(u);
      toast(`Conta de ${u.nome} atualizada ✅`, "ok");
      setSel(null);
      recarregar();
    } catch {
      toast("Falha ao salvar no banco de dados", "erro");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="🔍 Pesquisar por nome, e-mail ou UID..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1"
          />
          <Botao variante="ghost" onClick={recarregar}>
            ↻ Atualizar
          </Botao>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {carregando ? "Carregando contas..." : `${filtrados.length} conta(s) encontrada(s)`}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtrados.map((u) => {
          const nivel = nivelPorXp(u.xp);
          return (
            <Card key={u.uid} hover className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-2xl">
                  {u.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">
                    {u.nome} {u.uid === data?.uid && <span className="text-[10px] text-fuchsia-300">(você)</span>}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">{u.email}</p>
                </div>
                {u.banido && <Selo tom="vermelho">Banido</Selo>}
                {u.admin && <Selo tom="ciano">Admin</Selo>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5 text-center text-[11px]">
                <div className="rounded-lg bg-white/5 p-1.5">
                  <p className="text-slate-500">MAS</p>
                  <p className="font-bold text-emerald-300">{fmtNum(u.saldo)}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-1.5">
                  <p className="text-slate-500">Reais</p>
                  <p className="font-bold text-sky-300">{fmtBRL(u.brl)}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-1.5">
                  <p className="text-slate-500">Nível</p>
                  <p className="font-bold text-white">{nivel}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-1.5">
                  <p className="text-slate-500">XP</p>
                  <p className="font-bold text-amber-300">{fmtNum(u.xp, 0)}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Botao className="flex-1 py-1.5 text-xs" onClick={() => setSel(u)}>
                  Gerenciar
                </Botao>
                <Botao variante="perigo" className="px-3 py-1.5 text-xs" onClick={() => setConfirmar(u)}>
                  🗑️
                </Botao>
              </div>
            </Card>
          );
        })}
        {!carregando && filtrados.length === 0 && (
          <Card className="sm:col-span-2 xl:col-span-3">
            <Vazio emoji="🔍" titulo="Nenhuma conta encontrada" />
          </Card>
        )}
      </div>

      {sel && <EditorConta usuario={sel} itens={cfg.itens} onFechar={() => setSel(null)} onSalvar={salvar} />}

      <Confirmar
        aberto={!!confirmar}
        perigo
        titulo="Excluir conta"
        mensagem={`Tem certeza que deseja excluir permanentemente a conta de ${confirmar?.nome}? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir definitivamente"
        onCancelar={() => setConfirmar(null)}
        onConfirmar={async () => {
          if (!confirmar) return;
          try {
            await adminExcluirUsuario(confirmar.uid);
            toast("Conta excluída", "ok");
          } catch {
            toast("Falha ao excluir", "erro");
          }
          setConfirmar(null);
          recarregar();
        }}
      />
    </div>
  );
}

function EditorConta({
  usuario,
  itens,
  onFechar,
  onSalvar,
}: {
  usuario: UserData;
  itens: ItemLoja[];
  onFechar: () => void;
  onSalvar: (u: UserData) => void;
}) {
  const [u, setU] = useState<UserData>({ ...usuario });
  const [nivelAlvo, setNivelAlvo] = useState(nivelPorXp(usuario.xp));
  const [addItem, setAddItem] = useState("");
  const set = <K extends keyof UserData>(k: K, v: UserData[K]) => setU((x) => ({ ...x, [k]: v }));
  const nivel = nivelPorXp(u.xp);
  const pat = patente(nivel);

  return (
    <Modal aberto onFechar={onFechar} titulo={`Gerenciar · ${usuario.nome}`} largura="max-w-3xl">
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <span className="text-3xl">{u.avatar}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-white">{u.email}</p>
            <p className="truncate font-mono text-[10px] text-slate-500">{u.uid}</p>
          </div>
          <Selo tom="violeta">
            {pat.emoji} {pat.nome}
          </Selo>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Nome de exibição">
            <Input value={u.nome} onChange={(e) => set("nome", e.target.value)} />
          </Campo>
          <Campo label="Status do quarto">
            <Input value={u.status} onChange={(e) => set("status", e.target.value)} />
          </Campo>
          <Campo label="Saldo MAS">
            <Input type="number" value={u.saldo} onChange={(e) => set("saldo", Number(e.target.value))} />
          </Campo>
          <Campo label="Saldo em Reais (R$)">
            <Input type="number" value={u.brl} onChange={(e) => set("brl", Number(e.target.value))} />
          </Campo>
          <Campo label="XP total" dica={`Nível resultante: ${nivel}`}>
            <Input type="number" value={u.xp} onChange={(e) => set("xp", Number(e.target.value))} />
          </Campo>
          <Campo label="Definir nível diretamente" dica="Ajusta o XP para o mínimo do nível escolhido">
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={nivelAlvo}
                onChange={(e) => setNivelAlvo(Math.max(1, Number(e.target.value)))}
              />
              <Botao variante="ghost" onClick={() => set("xp", xpParaNivel(nivelAlvo))}>
                Aplicar
              </Botao>
            </div>
          </Campo>
        </div>

        <div className="flex flex-wrap gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <Switch ligado={!u.banido} onChange={(v) => set("banido", !v)} rotulo={u.banido ? "Suspensa" : "Conta ativa"} />
          <Switch ligado={u.admin} onChange={(v) => set("admin", v)} rotulo="Administrador" />
        </div>

        {/* Inventário */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Inventário ({u.itens.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {u.itens.map((id) => {
              const it = itens.find((x) => x.id === id);
              return (
                <button
                  key={id}
                  onClick={() =>
                    setU((x) => {
                      const eq = { ...x.equipados };
                      for (const s of Object.keys(eq)) if (eq[s] === id) delete eq[s];
                      return { ...x, itens: x.itens.filter((i) => i !== id), equipados: eq };
                    })
                  }
                  title="Clique para remover"
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:border-rose-400/50 hover:bg-rose-500/15"
                >
                  {it?.emoji || "❔"} {it?.nome || id} <span className="text-rose-400">✕</span>
                </button>
              );
            })}
            {u.itens.length === 0 && <p className="text-xs text-slate-500">Vazio</p>}
          </div>
          <div className="mt-2 flex gap-2">
            <select
              value={addItem}
              onChange={(e) => setAddItem(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">Adicionar item ao inventário...</option>
              {itens
                .filter((i) => !u.itens.includes(i.id))
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.emoji} {i.nome} · {infoCategoria(i.categoria).nome}
                  </option>
                ))}
            </select>
            <Botao
              variante="ghost"
              disabled={!addItem}
              onClick={() => {
                setU((x) => ({ ...x, itens: [...x.itens, addItem] }));
                setAddItem("");
              }}
            >
              + Adicionar
            </Botao>
          </div>
        </div>

        {/* Equipados */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Itens equipados</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {SLOTS.map((s) => {
              const it = itens.find((x) => x.id === u.equipados[s.id]);
              return (
                <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center">
                  <p className="text-[9px] uppercase text-slate-500">{s.nome}</p>
                  <p className="truncate text-xs font-bold text-white">{it ? `${it.emoji} ${it.nome}` : "—"}</p>
                  {it && (
                    <button
                      onClick={() =>
                        setU((x) => {
                          const eq = { ...x.equipados };
                          delete eq[s.id];
                          return { ...x, equipados: eq };
                        })
                      }
                      className="mt-1 text-[10px] font-bold text-rose-400"
                    >
                      remover
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <Botao variante="ghost" className="flex-1" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao variante="sucesso" className="flex-1" onClick={() => onSalvar(u)}>
            Salvar alterações
          </Botao>
        </div>
      </div>
    </Modal>
  );
}

/* ========================================================================
   ABA LOJA — CRUD completo do catálogo
   ======================================================================== */
function itemVazio(): ItemLoja {
  return {
    id: `item_${Date.now().toString(36)}`,
    nome: "",
    desc: "",
    categoria: "camisa",
    emoji: "👕",
    imagem: "",
    preco: 500,
    nivelMin: 1,
    hs: 0,
    bonusPct: 0,
    ativo: true,
    estoque: -1,
    requisito: "",
    slot: "camisa",
    decorativo: false,
  };
}

function LojaAdmin() {
  const { cfg, salvarItem, excluirItem } = useConfig();
  const { toast } = useApp();
  const [grupo, setGrupo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [edit, setEdit] = useState<ItemLoja | null>(null);
  const [excluir, setExcluir] = useState<ItemLoja | null>(null);

  const abas = [{ id: "todos", nome: "📦 Todos" }, ...GRUPOS_ADMIN.map((g) => ({ id: g.id, nome: g.nome }))];
  const cats = GRUPOS_ADMIN.find((g) => g.id === grupo)?.cats;
  const lista = cfg.itens.filter(
    (i) =>
      (!cats || cats.includes(i.categoria)) &&
      (!busca || i.nome.toLowerCase().includes(busca.toLowerCase())),
  );

  const totalHS = cfg.itens.reduce((a, b) => a + (b.hs || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Estat emoji="📦" titulo="Itens no catálogo" valor={String(cfg.itens.length)} />
        <Estat emoji="✅" titulo="Ativos" valor={String(cfg.itens.filter((i) => i.ativo).length)} cor="text-emerald-300" />
        <Estat emoji="⚡" titulo="H/s somado" valor={fmtHS(totalHS)} cor="text-cyan-300" />
        <Estat
          emoji="💰"
          titulo="Preço médio"
          valor={fmtMAS(cfg.itens.reduce((a, b) => a + b.preco, 0) / (cfg.itens.length || 1))}
          cor="text-amber-300"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="🔍 Buscar item..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1"
          />
          <Botao onClick={() => setEdit(itemVazio())}>+ Novo item</Botao>
        </div>
        <div className="mt-3">
          <Abas abas={abas} ativa={grupo} onChange={setGrupo} />
        </div>
      </Card>

      {lista.length === 0 ? (
        <Card>
          <Vazio emoji="📦" titulo="Nenhum item nesta categoria" texto="Crie o primeiro item com o botão acima." />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((i) => (
            <Card key={i.id} hover className={`p-4 ${!i.ativo ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/30">
                  <ArteItem emoji={i.emoji} imagem={i.imagem} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{i.nome || "(sem nome)"}</p>
                  <p className="text-[11px] text-slate-400">{infoCategoria(i.categoria).nome}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Selo tom="ouro">{fmtMAS(i.preco)}</Selo>
                    <Selo tom="cinza">Nv {i.nivelMin}</Selo>
                    {i.hs > 0 && <Selo tom="ciano">{fmtHS(i.hs)}</Selo>}
                    {!i.ativo && <Selo tom="vermelho">Inativo</Selo>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Botao className="flex-1 py-1.5 text-xs" onClick={() => setEdit({ ...i })}>
                  ✏️ Editar
                </Botao>
                <Botao variante="perigo" className="px-3 py-1.5 text-xs" onClick={() => setExcluir(i)}>
                  🗑️
                </Botao>
              </div>
            </Card>
          ))}
        </div>
      )}

      {edit && (
        <EditorItem
          item={edit}
          onFechar={() => setEdit(null)}
          onSalvar={(it) => {
            if (!it.nome.trim()) return toast("Informe o nome do item", "erro");
            salvarItem(it);
            toast(`Item "${it.nome}" salvo — já disponível na loja`, "ok");
            setEdit(null);
          }}
        />
      )}

      <Confirmar
        aberto={!!excluir}
        perigo
        titulo="Excluir item"
        mensagem={`Excluir "${excluir?.nome}" do catálogo? Usuários que já possuem o item deixarão de vê-lo.`}
        textoConfirmar="Excluir item"
        onCancelar={() => setExcluir(null)}
        onConfirmar={() => {
          if (excluir) excluirItem(excluir.id);
          toast("Item excluído", "ok");
          setExcluir(null);
        }}
      />
    </div>
  );
}

function EditorItem({
  item,
  onFechar,
  onSalvar,
}: {
  item: ItemLoja;
  onFechar: () => void;
  onSalvar: (i: ItemLoja) => void;
}) {
  const [i, setI] = useState<ItemLoja>({ ...item });
  const set = <K extends keyof ItemLoja>(k: K, v: ItemLoja[K]) => setI((x) => ({ ...x, [k]: v }));
  const info = infoCategoria(i.categoria);

  return (
    <Modal aberto onFechar={onFechar} titulo={item.nome ? `Editar · ${item.nome}` : "Novo item"} largura="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/40">
            <ArteItem emoji={i.emoji} imagem={i.imagem} tamanho="text-4xl" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">{i.nome || "Pré-visualização"}</p>
            <p className="text-xs text-slate-400">{info.nome}</p>
          </div>
          <Switch ligado={i.ativo} onChange={(v) => set("ativo", v)} rotulo={i.ativo ? "Ativo" : "Inativo"} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Nome">
            <Input value={i.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: Camiseta HODL" />
          </Campo>
          <Campo label="Categoria">
            <select
              value={i.categoria}
              onChange={(e) => {
                const c = e.target.value as Categoria;
                const inf = infoCategoria(c);
                setI((x) => ({ ...x, categoria: c, slot: inf.slot, decorativo: c === "movel", emoji: x.emoji || inf.emoji }));
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Emoji (fallback)">
            <Input value={i.emoji} onChange={(e) => set("emoji", e.target.value)} placeholder="👕" />
          </Campo>
          <Campo label="Imagem PNG (URL)" dica="Se preenchida, substitui o emoji na loja e no quarto">
            <Input value={i.imagem} onChange={(e) => set("imagem", e.target.value)} placeholder="https://.../item.png" />
          </Campo>
        </div>

        <Campo label="Descrição">
          <Textarea rows={2} value={i.desc} onChange={(e) => set("desc", e.target.value)} />
        </Campo>

        <div className="grid gap-3 sm:grid-cols-3">
          <Campo label="Preço (MAS)">
            <Input type="number" value={i.preco} onChange={(e) => set("preco", Number(e.target.value))} />
          </Campo>
          <Campo label="Nível mínimo">
            <Input type="number" min={1} value={i.nivelMin} onChange={(e) => set("nivelMin", Math.max(1, Number(e.target.value)))} />
          </Campo>
          <Campo label="Estoque" dica="-1 = ilimitado">
            <Input type="number" value={i.estoque} onChange={(e) => set("estoque", Number(e.target.value))} />
          </Campo>
        </div>

        {info.geraHS ? (
          <div className="grid gap-3 rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.06] p-3 sm:grid-cols-2">
            <Campo label="Potência H/s" dica="Aplicada ao hashrate quando o item estiver equipado">
              <Input type="number" step="0.01" value={i.hs} onChange={(e) => set("hs", Number(e.target.value))} />
            </Campo>
            <Campo label="Bônus percentual (%)" dica="Ex.: 5 = +5% de mineração">
              <Input
                type="number"
                step="1"
                value={Math.round((i.bonusPct || 0) * 100)}
                onChange={(e) => set("bonusPct", Number(e.target.value) / 100)}
              />
            </Campo>
          </div>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
            👕 Itens de vestuário não geram H/s — apenas aparência, preço e requisito de nível.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Requisito adicional (texto)">
            <Input value={i.requisito} onChange={(e) => set("requisito", e.target.value)} placeholder="Ex.: Exclusivo VIP" />
          </Campo>
          <Campo label="Slot de equipamento" dica="Vazio = item apenas decorativo">
            <select
              value={i.slot || ""}
              onChange={(e) => set("slot", e.target.value || null)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none"
            >
              <option value="">— nenhum (decorativo) —</option>
              {SLOTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Switch
          ligado={i.decorativo}
          onChange={(v) => set("decorativo", v)}
          rotulo="Pode ser posicionado no Quarto Virtual"
        />

        <div className="flex gap-2 pt-1">
          <Botao variante="ghost" className="flex-1" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao variante="sucesso" className="flex-1" onClick={() => onSalvar(i)}>
            Salvar item
          </Botao>
        </div>
      </div>
    </Modal>
  );
}

/* ========================================================================
   ABA CASSINO
   ======================================================================== */
function CassinoAdmin() {
  const { cfg, toggleJogo, salvarConfig } = useConfig();
  const { toast } = useApp();

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">🎰 Controle de Jogos do Cassino</h3>
            <p className="text-sm text-slate-400">
              Jogos desativados somem do cassino e ficam inacessíveis — salvo em localStorage + banco.
            </p>
          </div>
          <Switch
            ligado={cfg.cassinoAtivo}
            onChange={(v) => {
              salvarConfig({ cassinoAtivo: v });
              toast(v ? "Cassino aberto" : "Cassino em manutenção", v ? "ok" : "info");
            }}
            rotulo={cfg.cassinoAtivo ? "Cassino aberto" : "Manutenção"}
          />
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {JOGOS_META.map((j) => {
          const ativo = cfg.jogos[j.id] !== false;
          return (
            <Card key={j.id} className={`p-4 ${ativo ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-3">
                <div className="text-3xl">{j.emoji}</div>
                <div className="flex-1">
                  <p className="font-bold text-white">{j.nome}</p>
                  <p className="text-[11px] text-slate-400">{j.desc}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 p-2">
                <Selo tom={ativo ? "verde" : "vermelho"}>{ativo ? "Ativado" : "Desativado"}</Selo>
                <Switch
                  ligado={ativo}
                  onChange={(v) => {
                    toggleJogo(j.id, v);
                    toast(`${j.nome} ${v ? "ativado" : "desativado"}`, v ? "ok" : "info");
                  }}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================================
   ABA MINERAÇÃO
   ======================================================================== */
function MineracaoAdmin() {
  const { cfg, salvarConfig, salvarRig, excluirRig } = useConfig();
  const { toast } = useApp();
  const m = cfg.mineracao;
  const set = (patch: Partial<typeof m>) => salvarConfig({ mineracao: { ...m, ...patch } });
  const [rig, setRig] = useState<Rig | null>(null);
  const [excluir, setExcluir] = useState<Rig | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">🖱️ Mineração por clique</h3>
            <p className="text-sm text-slate-400">
              Configuração atual: {m.cliqueAtivo ? "ativa" : "desativada"} · {fmtMAS(m.valorClique)} por clique ·
              cooldown {m.cooldownMs}ms
            </p>
          </div>
          <Switch
            ligado={m.cliqueAtivo}
            onChange={(v) => {
              set({ cliqueAtivo: v });
              toast(v ? "Mineração por clique ativada" : "Mineração por clique desativada", v ? "ok" : "info");
            }}
            rotulo={m.cliqueAtivo ? "Ativada" : "Desativada"}
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="MAS por clique">
            <Input
              type="number"
              step="0.01"
              value={m.valorClique}
              onChange={(e) => set({ valorClique: Math.max(0, Number(e.target.value)) })}
            />
          </Campo>
          <Campo label="Cooldown (ms)" dica="Anti-spam entre cliques">
            <Input
              type="number"
              value={m.cooldownMs}
              onChange={(e) => set({ cooldownMs: Math.max(0, Number(e.target.value)) })}
            />
          </Campo>
          <Campo label="Chance de crítico (%)">
            <Input
              type="number"
              value={Math.round(m.chanceCritico * 100)}
              onChange={(e) => set({ chanceCritico: Number(e.target.value) / 100 })}
            />
          </Campo>
          <Campo label="Multiplicador do crítico">
            <Input type="number" value={m.multCritico} onChange={(e) => set({ multCritico: Number(e.target.value) })} />
          </Campo>
        </div>
      </Card>

      <Card>
        <h3 className="font-black text-white">⚙️ Mineração automática</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Multiplicador global" dica="Aplica a todo o hashrate da rede">
            <Input
              type="number"
              step="0.1"
              value={m.multiplicadorGlobal}
              onChange={(e) => set({ multiplicadorGlobal: Number(e.target.value) })}
            />
          </Campo>
          <Campo label="Capacidade (horas)">
            <Input type="number" value={m.capHoras} onChange={(e) => set({ capHoras: Number(e.target.value) })} />
          </Campo>
          <Campo label="Preço do boost (MAS)">
            <Input type="number" value={m.boostPreco} onChange={(e) => set({ boostPreco: Number(e.target.value) })} />
          </Campo>
          <Campo label="Multiplicador do boost">
            <Input type="number" value={m.boostMult} onChange={(e) => set({ boostMult: Number(e.target.value) })} />
          </Campo>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-white">🏭 Rigs da fazenda</h3>
          <Botao
            onClick={() =>
              setRig({
                id: `rig_${Date.now().toString(36)}`,
                nome: "",
                emoji: "⚙️",
                preco: 1000,
                taxa: 0.1,
                energia: 1,
                desc: "",
                ativo: true,
              })
            }
          >
            + Nova rig
          </Botao>
        </div>
        <div className="mt-3 space-y-2">
          {cfg.rigs.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
            >
              <span className="text-2xl">{r.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{r.nome}</p>
                <p className="text-[11px] text-slate-400">
                  {fmtMAS(r.preco)} · {fmtHS(r.taxa)} · {r.energia} kW
                </p>
              </div>
              <Switch ligado={r.ativo !== false} onChange={(v) => salvarRig({ ...r, ativo: v })} />
              <Botao variante="ghost" className="px-3 py-1.5 text-xs" onClick={() => setRig({ ...r })}>
                ✏️
              </Botao>
              <Botao variante="perigo" className="px-3 py-1.5 text-xs" onClick={() => setExcluir(r)}>
                🗑️
              </Botao>
            </div>
          ))}
        </div>
      </Card>

      {rig && (
        <Modal aberto onFechar={() => setRig(null)} titulo="Rig de mineração">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Nome">
                <Input value={rig.nome} onChange={(e) => setRig({ ...rig, nome: e.target.value })} />
              </Campo>
              <Campo label="Emoji">
                <Input value={rig.emoji} onChange={(e) => setRig({ ...rig, emoji: e.target.value })} />
              </Campo>
              <Campo label="Preço base (MAS)">
                <Input type="number" value={rig.preco} onChange={(e) => setRig({ ...rig, preco: Number(e.target.value) })} />
              </Campo>
              <Campo label="Potência (H/s)">
                <Input
                  type="number"
                  step="0.01"
                  value={rig.taxa}
                  onChange={(e) => setRig({ ...rig, taxa: Number(e.target.value) })}
                />
              </Campo>
              <Campo label="Energia (kW)">
                <Input type="number" value={rig.energia} onChange={(e) => setRig({ ...rig, energia: Number(e.target.value) })} />
              </Campo>
            </div>
            <Campo label="Descrição">
              <Input value={rig.desc} onChange={(e) => setRig({ ...rig, desc: e.target.value })} />
            </Campo>
            <div className="flex gap-2">
              <Botao variante="ghost" className="flex-1" onClick={() => setRig(null)}>
                Cancelar
              </Botao>
              <Botao
                variante="sucesso"
                className="flex-1"
                onClick={() => {
                  if (!rig.nome.trim()) return toast("Informe o nome", "erro");
                  salvarRig(rig);
                  toast("Rig salva", "ok");
                  setRig(null);
                }}
              >
                Salvar
              </Botao>
            </div>
          </div>
        </Modal>
      )}

      <Confirmar
        aberto={!!excluir}
        perigo
        titulo="Excluir rig"
        mensagem={`Remover "${excluir?.nome}" da fazenda de mineração?`}
        onCancelar={() => setExcluir(null)}
        onConfirmar={() => {
          if (excluir) excluirRig(excluir.id);
          setExcluir(null);
          toast("Rig removida", "ok");
        }}
      />
    </div>
  );
}

/* ========================================================================
   ABA XP / NÍVEIS
   ======================================================================== */
function XpAdmin() {
  const { cfg, salvarConfig } = useConfig();
  const { listarUsuarios, adminSalvarUsuario, toast } = useApp();
  const [usuarios, setUsuarios] = useState<UserData[]>([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    listarUsuarios().then(setUsuarios);
  }, [listarUsuarios]);

  const tabela = useMemo(() => Array.from({ length: 12 }, (_, n) => n + 1), []);
  const filtrados = usuarios.filter((u) => !busca || u.nome.toLowerCase().includes(busca.toLowerCase()));

  const ajustar = async (u: UserData, delta: number) => {
    const novo = { ...u, xp: Math.max(0, u.xp + delta) };
    await adminSalvarUsuario(novo);
    setUsuarios((l) => l.map((x) => (x.uid === u.uid ? novo : x)));
    toast(`${delta > 0 ? "+" : ""}${delta} XP para ${u.nome}`, "ok");
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-black text-white">⭐ Curva de progressão</h3>
        <p className="text-sm text-slate-400">
          Fórmula única do sistema: <code className="text-fuchsia-300">nível = ⌊√(XP / 40)⌋ + 1</code> — usada no
          perfil, quarto, loja e admin.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo label="XP por MAS minerado">
            <Input
              type="number"
              step="0.05"
              value={cfg.xpPorMAS}
              onChange={(e) => salvarConfig({ xpPorMAS: Number(e.target.value) })}
            />
          </Campo>
          <Campo label="XP por MAS apostado">
            <Input
              type="number"
              step="0.05"
              value={cfg.xpPorAposta}
              onChange={(e) => salvarConfig({ xpPorAposta: Number(e.target.value) })}
            />
          </Campo>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tabela.map((n) => (
            <span key={n} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">
              Nv {n} · {fmtNum((n - 1) * (n - 1) * 40, 0)} XP
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-black text-white">Ajuste rápido por usuário</h3>
          <Input
            placeholder="🔍 Filtrar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="ml-auto max-w-xs"
          />
        </div>
        <div className="mt-3 space-y-2">
          {filtrados.map((u) => (
            <div
              key={u.uid}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
            >
              <span className="text-2xl">{u.avatar}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{u.nome}</p>
                <p className="text-[11px] text-slate-400">
                  Nível {nivelPorXp(u.xp)} · {fmtNum(u.xp, 0)} XP
                </p>
              </div>
              {[-500, -100, 100, 500, 2000].map((d) => (
                <button
                  key={d}
                  onClick={() => ajustar(u, d)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                    d > 0
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                  }`}
                >
                  {d > 0 ? "+" : ""}
                  {d}
                </button>
              ))}
            </div>
          ))}
          {filtrados.length === 0 && <Vazio emoji="👥" titulo="Nenhum usuário carregado" />}
        </div>
      </Card>
    </div>
  );
}

/* ========================================================================
   ABA CONFIGURAÇÕES
   ======================================================================== */
function ConfigAdmin() {
  const { cfg, salvarConfig, restaurarPadrao } = useConfig();
  const { toast } = useApp();
  const [conf, setConf] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-black text-white">⚙️ Chaves gerais da plataforma</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <Switch ligado={cfg.lojaAtiva} onChange={(v) => salvarConfig({ lojaAtiva: v })} rotulo="Loja aberta" />
            <Switch ligado={cfg.cassinoAtivo} onChange={(v) => salvarConfig({ cassinoAtivo: v })} rotulo="Cassino aberto" />
            <Switch ligado={cfg.saquesAtivos} onChange={(v) => salvarConfig({ saquesAtivos: v })} rotulo="Saques liberados" />
          </div>
          <div className="space-y-3">
            <Campo label="Saque mínimo (R$)">
              <Input type="number" value={cfg.saqueMinimo} onChange={(e) => salvarConfig({ saqueMinimo: Number(e.target.value) })} />
            </Campo>
            <Campo label="Taxa de conversão (%)">
              <Input
                type="number"
                step="0.5"
                value={cfg.taxaConversao * 100}
                onChange={(e) => salvarConfig({ taxaConversao: Number(e.target.value) / 100 })}
              />
            </Campo>
          </div>
        </div>
        <div className="mt-3">
          <Campo label="Anúncio exibido na Home">
            <Textarea rows={2} value={cfg.anuncio} onChange={(e) => salvarConfig({ anuncio: e.target.value })} />
          </Campo>
        </div>
      </Card>

      <Card className="border-rose-500/20">
        <h3 className="font-black text-rose-300">⚠️ Zona de risco</h3>
        <p className="mt-1 text-sm text-slate-400">
          Restaura o catálogo de itens, rigs, jogos e parâmetros para os valores de fábrica. Não afeta as contas dos
          usuários.
        </p>
        <Botao variante="perigo" className="mt-3" onClick={() => setConf(true)}>
          Restaurar configuração padrão
        </Botao>
      </Card>

      <Confirmar
        aberto={conf}
        perigo
        titulo="Restaurar padrões"
        mensagem="Todo o catálogo e as configurações voltarão ao estado original. Continuar?"
        onCancelar={() => setConf(false)}
        onConfirmar={() => {
          restaurarPadrao();
          setConf(false);
          toast("Configuração restaurada", "ok");
        }}
      />
    </div>
  );
}
