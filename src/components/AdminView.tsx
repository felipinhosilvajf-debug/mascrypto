import { useEffect, useMemo, useState } from "react";
import { onSnapshot, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import {
  CATEGORIAS,
  FONTES_DISPONIVEIS,
  GRUPOS_ADMIN,
  JOGOS_META,
  RARIDADES,
  infoCategoria,
  infoRaridade,
  type Banner,
  type Categoria,
  type ItemLoja,
  type JogoConfig,
} from "../lib/catalogo";
import { SLOTS, SLOTS_HARDWARE, SLOTS_RPG, type UserData } from "../lib/types";
import { STATUS_TICKET, responderTicket, setStatusTicket, type Ticket } from "../lib/tickets";
import {
  COLECAO_PAGAMENTOS,
  aprovarPagamento,
  recusarPagamento,
  type PagamentoManual,
} from "../lib/pagamentos";
import { fmtBRL, fmtHS, fmtMAS, fmtNum, nivelPorXp, patente, xpParaNivel } from "../lib/economia";
import { RecompensaAdmin, BilheteriaAdmin } from "./AdminExtras";
import AvatarAdmin from "./AvatarAdmin";
import { AVATAR_SLOT_BASE, AvatarRenderer } from "./AvatarRenderer";
import {
  Abas,
  ArteItem,
  Botao,
  Campo,
  Card,
  Confirmar,
  Estat,
  GraficoStatus,
  Input,
  Modal,
  Selo,
  Sparkline,
  Switch,
  Textarea,
  Vazio,
} from "./UI";

type AbaAdmin =
  | "operacional"
  | "contas"
  | "loja"
  | "avatares"
  | "jogos"
  | "banners"
  | "tickets"
  | "mineracao"
  | "xp"
  | "recompensa"
  | "bilheteria"
  | "landing"
  | "permissoes"
  | "config";

const ABAS = [
  { id: "operacional" as const, nome: "Operacional", emoji: "🎫" },
  { id: "contas" as const, nome: "Contas", emoji: "👥" },
  { id: "loja" as const, nome: "Itens da Loja", emoji: "🛒" },
  { id: "avatares" as const, nome: "Avatares", emoji: "👤" },
  { id: "jogos" as const, nome: "Gerenciar Jogos", emoji: "🎰" },
  { id: "banners" as const, nome: "Banners & Avisos", emoji: "📣" },
  { id: "tickets" as const, nome: "Tickets / Suporte", emoji: "🎧" },
  { id: "mineracao" as const, nome: "Mineração", emoji: "⛏️" },
  { id: "xp" as const, nome: "XP e Níveis", emoji: "⭐" },
  { id: "recompensa" as const, nome: "Recompensa Diária", emoji: "🎁" },
  { id: "bilheteria" as const, nome: "Bilheteria", emoji: "🎟️" },
  { id: "landing" as const, nome: "Index / Login", emoji: "🖼️" },
  { id: "permissoes" as const, nome: "Permissões Mod", emoji: "🔑" },
  { id: "config" as const, nome: "Configurações", emoji: "⚙️" },
];

export default function AdminView() {
  const { ehAdmin, ehModerador } = useApp();
  const { cfg } = useConfig();
  const { configOnline } = useConfig();

  // Filtra as abas disponíveis baseando-se nas permissões do Moderador (definidas pelo Admin)
  const abasDisponiveis = useMemo(() => {
    if (ehAdmin) return ABAS;
    if (ehModerador) {
      const perms = cfg.permisoesMod || {};
      // O moderador só vê o que estiver marcado como true no banco, e nunca vê a aba de permissões
      return ABAS.filter(
        (a) => a.id !== "permissoes" && perms[a.id as keyof typeof perms] === true
      );
    }
    return [];
  }, [ehAdmin, ehModerador, cfg.permisoesMod]);

  // Seta a primeira aba disponível como padrão ativo
  const [aba, setAba] = useState<AbaAdmin>(() => {
    if (ehAdmin) return "operacional";
    const perms = cfg.permisoesMod || {};
    const primeira = ABAS.find((a) => a.id !== "permissoes" && perms[a.id as keyof typeof perms] === true);
    return (primeira?.id as AbaAdmin) || "tickets";
  });

  // Garante que o estado sincronize se a aba ativa for desativada
  useEffect(() => {
    if (!abasDisponiveis.some((a) => a.id === aba)) {
      if (abasDisponiveis.length > 0) {
        setAba(abasDisponiveis[0].id as AbaAdmin);
      }
    }
  }, [abasDisponiveis, aba]);

  return (
    <div className="space-y-5">
      <Card glow className="overflow-hidden bg-[radial-gradient(120%_150%_at_0%_0%,rgba(56,189,248,0.18),transparent_55%)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-white">
              🛡️ {ehAdmin ? "Painel Administrativo" : "Painel de Moderação"}
            </h2>
            <p className="text-sm text-slate-400">
              {ehAdmin
                ? "Regras e configurações centralizadas — aplicadas em tempo real para todos os usuários."
                : "Acesso administrativo restrito pelas permissões configuradas pelo Administrador."}
            </p>
          </div>
          <Selo tom={configOnline ? "verde" : "ouro"}>
            {configOnline ? "● Sincronizado com o banco" : "● Modo local (offline)"}
          </Selo>
        </div>
      </Card>

      <Abas abas={abasDisponiveis} ativa={aba} onChange={setAba} />

      {aba === "operacional" && <Operacional />}
      {aba === "contas" && <Contas />}
      {aba === "loja" && <LojaAdmin />}
      {aba === "avatares" && <AvatarAdmin />}
      {aba === "jogos" && <JogosAdmin />}
      {aba === "banners" && <BannersAdmin />}
      {aba === "tickets" && <TicketsAdmin />}
      {aba === "mineracao" && <MineracaoAdmin />}
      {aba === "xp" && <XpAdmin />}
      {aba === "recompensa" && <RecompensaAdmin />}
      {aba === "bilheteria" && <BilheteriaAdmin />}
      {aba === "landing" && <LandingAdmin />}
      {aba === "permissoes" && <PermissoesAdmin />}
      {aba === "config" && <ConfigAdmin />}
    </div>
  );
}

/* ========================================================================
   ABA OPERACIONAL — depósitos e saques manuais em tempo real
   ======================================================================== */
function Operacional() {
  const { user, toast } = useApp();
  const { cfg } = useConfig();
  const [pedidos, setPedidos] = useState<PagamentoManual[]>([]);
  const [filtro, setFiltro] = useState<"pendente" | "deposito" | "saque" | "todos">("pendente");
  const [recusar, setRecusar] = useState<PagamentoManual | null>(null);
  const [motivo, setMotivo] = useState("");
  const [processando, setProcessando] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLECAO_PAGAMENTOS), (snap) => {
      setPedidos(
        snap.docs
          .map((d) => d.data() as PagamentoManual)
          .sort((a, b) => b.criadoEm - a.criadoEm),
      );
    });
    return unsub;
  }, []);

  const pendentes = pedidos.filter((p) => p.status === "pendente");
  const visiveis = pedidos.filter((p) => {
    if (filtro === "todos") return true;
    if (filtro === "pendente") return p.status === "pendente";
    return p.tipo === filtro;
  });

  const aprovar = async (p: PagamentoManual) => {
    setProcessando(p.id);
    try {
      await aprovarPagamento(p, user?.email || "admin", cfg.cotacaoMAS);
      toast(`${p.tipo === "deposito" ? "Depósito creditado" : "Saque finalizado"} com sucesso`, "ok");
    } catch (e) {
      toast((e as Error).message || "Falha ao aprovar", "erro");
    } finally {
      setProcessando(null);
    }
  };

  const confirmarRecusa = async () => {
    if (!recusar) return;
    setProcessando(recusar.id);
    try {
      await recusarPagamento(recusar, user?.email || "admin", motivo.trim() || "Dados não confirmados");
      toast(recusar.tipo === "saque" ? "Saque recusado e valor integral estornado" : "Depósito recusado", "ok");
      setRecusar(null);
      setMotivo("");
    } catch (e) {
      toast((e as Error).message || "Falha ao recusar", "erro");
    } finally {
      setProcessando(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Estat emoji="⌛" titulo="Pendências" valor={String(pendentes.length)} cor="text-amber-300" />
        <Estat emoji="+" titulo="Depósitos pendentes" valor={String(pendentes.filter((p) => p.tipo === "deposito").length)} cor="text-emerald-300" />
        <Estat emoji="−" titulo="Saques pendentes" valor={String(pendentes.filter((p) => p.tipo === "saque").length)} cor="text-rose-300" />
        <Estat emoji="R$" titulo="Volume pendente" valor={fmtBRL(pendentes.reduce((a, p) => a + p.valorBRL, 0))} cor="text-sky-300" />
      </div>

      <Abas
        abas={[
          { id: "pendente" as const, nome: "Pendentes", emoji: "⌛", badge: pendentes.length },
          { id: "deposito" as const, nome: "Depósitos", emoji: "+" },
          { id: "saque" as const, nome: "Saques", emoji: "−" },
          { id: "todos" as const, nome: "Histórico", emoji: "≡" },
        ]}
        ativa={filtro}
        onChange={setFiltro}
      />

      <Card>
        {visiveis.length === 0 ? (
          <Vazio emoji="✓" titulo="Nenhuma solicitação nesta fila" />
        ) : (
          <div className="space-y-2">
            {visiveis.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-black ${p.tipo === "deposito" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                    {p.tipo === "deposito" ? "+" : "−"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black capitalize text-white">{p.tipo} · {fmtBRL(p.valorBRL)}</p>
                      <Selo tom={p.status === "aprovado" ? "verde" : p.status === "recusado" ? "vermelho" : "ouro"}>{p.status}</Selo>
                      {p.tipo === "deposito" && <Selo tom="ciano">Crédito em {p.destino}</Selo>}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{p.nome} · {p.email} · {new Date(p.criadoEm).toLocaleString("pt-BR")}</p>
                    {p.chavePix && <p className="mt-1 text-xs text-sky-300">Chave PIX: {p.chavePix}</p>}
                    {p.comprovante && (
                      <p className="mt-1 break-all text-xs text-fuchsia-300">
                        Comprovante: {p.comprovante.startsWith("http") ? <a href={p.comprovante} target="_blank" rel="noreferrer" className="underline">abrir link</a> : p.comprovante}
                      </p>
                    )}
                    {p.observacao && <p className="mt-1 text-xs text-slate-500">{p.observacao}</p>}
                    {p.motivoRecusa && <p className="mt-1 text-xs text-rose-300">Motivo: {p.motivoRecusa}</p>}
                  </div>
                  {p.status === "pendente" && (
                    <div className="flex shrink-0 gap-2">
                      <Botao variante="sucesso" disabled={processando === p.id} onClick={() => aprovar(p)}>
                        {p.tipo === "deposito" ? "Aprovar e creditar" : "Confirmar transferência"}
                      </Botao>
                      <Botao variante="perigo" disabled={processando === p.id} onClick={() => setRecusar(p)}>Recusar</Botao>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal aberto={!!recusar} onFechar={() => setRecusar(null)} titulo={`Recusar ${recusar?.tipo || "solicitação"}`}>
        <p className="text-sm text-slate-300">
          {recusar?.tipo === "saque"
            ? `${fmtBRL(recusar?.valorBRL || 0)} serão estornados integralmente para a carteira BRL do usuário.`
            : "O depósito será cancelado sem crédito."}
        </p>
        <div className="mt-3">
          <Campo label="Motivo da recusa (visível ao usuário)">
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: comprovante inválido" />
          </Campo>
        </div>
        <div className="mt-4 flex gap-2">
          <Botao variante="ghost" className="flex-1" onClick={() => setRecusar(null)}>Cancelar</Botao>
          <Botao variante="perigo" className="flex-1" onClick={confirmarRecusa}>Confirmar recusa</Botao>
        </div>
      </Modal>
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
                {u.moderador && !u.admin && <Selo tom="ouro">Mod</Selo>}
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
              <Input type="number" min={1} value={nivelAlvo} onChange={(e) => setNivelAlvo(Math.max(1, Number(e.target.value)))} />
              <Botao variante="ghost" onClick={() => set("xp", xpParaNivel(nivelAlvo))}>
                Aplicar
              </Botao>
            </div>
          </Campo>
          <Campo label="Capacidade de slots de hardware" dica="Slots de GPU/periférico no quarto (mín 4, máx pelo limite global)">
            <Input
              type="number"
              min={4}
              max={64}
              value={(u as any).capacidadeSlotsHardware ?? 4}
              onChange={(e) => setU((x) => ({ ...x, capacidadeSlotsHardware: Math.max(4, Number(e.target.value)) } as typeof x))}
            />
          </Campo>
        </div>

        <div className="flex flex-wrap gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <Switch ligado={!u.banido} onChange={(v) => set("banido", !v)} rotulo={u.banido ? "Suspensa" : "Conta ativa"} />
          <Switch 
            ligado={u.moderador} 
            onChange={(v) => setU((x) => ({ ...x, moderador: v, admin: false }))} 
            rotulo="Cargo: Moderador" 
          />
        </div>

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
    categoria: "avatar",
    emoji: "👤",
    imagem: "",
    preco: 500,
    raridade: "comum",
    nivelMin: 1,
    hs: 0,
    bonusPct: 0,
    ativo: true,
    estoque: -1,
    requisito: "",
    slot: "avatar",
    offsetX: 0,
    offsetY: 0,
    escala: 1,
    zIndex: 30,
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
    (i) => (!cats || cats.includes(i.categoria)) && (!busca || i.nome.toLowerCase().includes(busca.toLowerCase())),
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
          <Input placeholder="🔍 Buscar item..." value={busca} onChange={(e) => setBusca(e.target.value)} className="flex-1" />
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
                    <span
                      className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                      style={{ borderColor: `${infoRaridade(i.raridade).cor}66`, background: `${infoRaridade(i.raridade).cor}1a`, color: infoRaridade(i.raridade).cor }}
                    >
                      {infoRaridade(i.raridade).nome}
                    </span>
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
  const [i, setI] = useState<ItemLoja>({
    ...item,
    offsetX: item.offsetX ?? 0,
    offsetY: item.offsetY ?? 0,
    escala: item.escala ?? 1,
    zIndex: item.zIndex ?? AVATAR_SLOT_BASE[item.slot || ""]?.z ?? 10,
  });
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
          <Campo label="Raridade">
            <div className="flex flex-wrap gap-1.5">
              {RARIDADES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => set("raridade", r.id)}
                  className={`rounded-lg border px-2.5 py-2 text-xs font-black transition ${
                    (i.raridade || "comum") === r.id
                      ? "text-white ring-2 ring-white/40" + ` ${r.brilho}`
                      : "text-slate-400 hover:text-white"
                  }`}
                  style={{
                    borderColor: r.cor,
                    color: (i.raridade || "comum") === r.id ? "#fff" : r.cor,
                    background: (i.raridade || "comum") === r.id ? `${r.cor}33` : "transparent",
                  }}
                >
                  {r.nome}
                </button>
              ))}
            </div>
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
              <Input type="number" step="1" value={Math.round((i.bonusPct || 0) * 100)} onChange={(e) => set("bonusPct", Number(e.target.value) / 100)} />
            </Campo>
            <Campo label="Oscilação (%)" dica="0 = fixo · 20 = varia ±20% do H/s a cada intervalo">
              <Input
                type="number"
                step="1"
                min={0}
                max={80}
                value={Math.round((i.hsOscilacao || 0) * 100)}
                onChange={(e) => set("hsOscilacao", Math.max(0, Math.min(0.8, Number(e.target.value) / 100)))}
              />
            </Campo>
            <Campo label="Intervalo de oscilação (s)">
              <Input
                type="number"
                min={1}
                step="1"
                value={i.hsIntervaloS || 4}
                onChange={(e) => set("hsIntervaloS", Math.max(1, Math.floor(Number(e.target.value) || 4)))}
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
          <Campo label="Slot visual do item" dica="Definido exclusivamente pelo Admin">
            <select
              value={i.slot || ""}
              onChange={(e) => {
                const slot = e.target.value || null;
                setI((x) => ({
                  ...x,
                  slot,
                  zIndex: slot ? AVATAR_SLOT_BASE[slot]?.z ?? x.zIndex ?? 10 : 10,
                }));
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none"
            >
              <option value="">— nenhum (móvel/decorativo) —</option>
              {(i.categoria === "gpu" || i.categoria === "periferico" ? SLOTS_HARDWARE : SLOTS_RPG).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        {/* ── Alinhamento visual exclusivo do Admin ── */}
        {i.slot && SLOTS_RPG.some((s) => s.id === i.slot) && (
          <div className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/[0.04] p-4">
            <div className="mb-3">
              <h4 className="font-black text-white">🎯 Alinhamento do item no avatar</h4>
              <p className="text-[11px] text-slate-400">
                Estes valores são salvos no catálogo e aplicados a todos os usuários. O jogador não pode alterá-los.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_210px]">
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo label="Offset X (px)" dica="Negativo = esquerda · Positivo = direita">
                  <Input
                    type="number"
                    step={1}
                    value={i.offsetX ?? 0}
                    onChange={(e) => set("offsetX", Number(e.target.value) || 0)}
                  />
                </Campo>
                <Campo label="Offset Y (px)" dica="Negativo = cima · Positivo = baixo">
                  <Input
                    type="number"
                    step={1}
                    value={i.offsetY ?? 0}
                    onChange={(e) => set("offsetY", Number(e.target.value) || 0)}
                  />
                </Campo>
                <Campo label="Escala / Scale" dica="1,00 = tamanho original">
                  <Input
                    type="number"
                    min={0.1}
                    max={5}
                    step={0.05}
                    value={i.escala ?? 1}
                    onChange={(e) => set("escala", Math.max(0.1, Number(e.target.value) || 1))}
                  />
                </Campo>
                <Campo label="Camada / Z-Index" dica="Menor que 20 = atrás · Maior que 20 = frente">
                  <Input
                    type="number"
                    min={-10}
                    max={100}
                    step={1}
                    value={i.zIndex ?? 10}
                    onChange={(e) => set("zIndex", Math.floor(Number(e.target.value) || 0))}
                  />
                </Campo>
                <div className="col-span-full flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setI((x) => ({ ...x, offsetX: 0, offsetY: 0, escala: 1, zIndex: AVATAR_SLOT_BASE[x.slot || ""]?.z ?? 10 }))}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10"
                  >
                    Resetar alinhamento
                  </button>
                  <span className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] text-slate-500">
                    Slot: {SLOTS_RPG.find((s) => s.id === i.slot)?.nome}
                  </span>
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <p className="mb-2 text-center text-[10px] font-black uppercase tracking-wider text-fuchsia-300">
                  Pré-visualização ao vivo
                </p>
                <div className="relative mx-auto h-[205px] w-[180px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(217,70,239,.18),transparent_60%)]">
                  <div className="absolute inset-x-0 bottom-2 mx-auto h-5 w-24 rounded-full bg-black/35 blur-sm" />
                  <div className="absolute left-1/2 top-2 -translate-x-1/2">
                    <AvatarRenderer
                      avatar="🙂"
                      equipados={i.slot ? { [i.slot]: i.id } : {}}
                      itens={[i]}
                      escalaGeral={0.9}
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-2 text-center text-[9px] text-slate-500">
                    X {i.offsetX ?? 0} · Y {i.offsetY ?? 0} · {Number(i.escala ?? 1).toFixed(2)}× · Z {i.zIndex ?? 10}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Switch ligado={i.decorativo} onChange={(v) => set("decorativo", v)} rotulo="Pode ser posicionado no Quarto Virtual" />

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
   ABA GERENCIAR JOGOS — visual + RTP + ativação por jogo
   ======================================================================== */
function JogosAdmin() {
  const { cfg, salvarJogo, salvarConfig, jogo } = useConfig();
  const { toast } = useApp();
  const [edit, setEdit] = useState<JogoConfig | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">🎰 Gerenciar Jogos</h3>
            <p className="text-sm text-slate-400">
              Edite nome, visual, RTP e ativação de cada jogo — refletido no lobby em tempo real.
            </p>
          </div>
          <Switch
            ligado={cfg.cassinoAtivo}
            onChange={(v) => {
              salvarConfig({ cassinoAtivo: v });
              toast(v ? "Jogos abertos" : "Jogos em manutenção", v ? "ok" : "info");
            }}
            rotulo={cfg.cassinoAtivo ? "Jogos abertos" : "Manutenção"}
          />
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {JOGOS_META.map((m) => {
          const j = cfg.jogos[m.id];
          return (
            <Card key={m.id} className={`overflow-hidden p-0 ${j.ativo ? "" : "opacity-60"}`}>
              <div className="relative flex h-24 items-center justify-center bg-[radial-gradient(120%_120%_at_50%_0%,rgba(217,70,239,0.2),transparent_60%)] text-5xl">
                {j.gif || j.capa ? (
                  <img src={j.gif || j.capa} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
                ) : null}
                <span className="relative">{j.emoji}</span>
                <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-300">
                  {j.tag}
                </span>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-bold text-white">{j.nome}</p>
                  <Selo tom="ciano">RTP {Math.round((j.rtp ?? 0.97) * 100)}%</Selo>
                </div>
                <p className="mt-1 line-clamp-2 min-h-[32px] text-[11px] text-slate-400">{j.desc}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Switch
                    ligado={j.ativo}
                    onChange={(v) => {
                      salvarJogo({ ...j, ativo: v });
                      toast(`${j.nome} ${v ? "ativado" : "desativado"}`, v ? "ok" : "info");
                    }}
                    rotulo={j.ativo ? "Ativado" : "Desativado"}
                  />
                  <Botao variante="ghost" className="px-3 py-1.5 text-xs" onClick={() => setEdit(jogo(m.id))}>
                    ✏️ Editar
                  </Botao>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {edit && (
        <EditorJogo
          jogo={edit}
          onFechar={() => setEdit(null)}
          onSalvar={(j) => {
            salvarJogo(j);
            toast(`Jogo "${j.nome}" atualizado ✅`, "ok");
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}

function EditorJogo({
  jogo: j,
  onFechar,
  onSalvar,
}: {
  jogo: JogoConfig;
  onFechar: () => void;
  onSalvar: (j: JogoConfig) => void;
}) {
  const [x, setX] = useState<JogoConfig>({ ...j });
  const set = <K extends keyof JogoConfig>(k: K, v: JogoConfig[K]) => setX((a) => ({ ...a, [k]: v }));

  return (
    <Modal aberto onFechar={onFechar} titulo={`Editar jogo · ${j.nome}`} largura="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/40 text-4xl">{x.emoji}</div>
          <div className="flex-1">
            <p className="font-bold text-white">{x.nome}</p>
            <p className="text-xs text-slate-400">ID: {x.id}</p>
          </div>
          <Switch ligado={x.ativo} onChange={(v) => set("ativo", v)} rotulo={x.ativo ? "Ativado" : "Desativado"} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Título">
            <Input value={x.nome} onChange={(e) => set("nome", e.target.value)} />
          </Campo>
          <Campo label="Ícone / Emoji">
            <Input value={x.emoji} onChange={(e) => set("emoji", e.target.value)} placeholder="🎰" />
          </Campo>
          <Campo label="Tag / Badge" dica="Ex.: Popular, Novo, Jackpot">
            <Input value={x.tag} onChange={(e) => set("tag", e.target.value)} />
          </Campo>
          <Campo label="URL da imagem de capa">
            <Input value={x.capa} onChange={(e) => set("capa", e.target.value)} placeholder="https://.../capa.png" />
          </Campo>
          <Campo label="URL de GIF / animação" dica="Exibido no card do jogo no lobby">
            <Input value={x.gif} onChange={(e) => set("gif", e.target.value)} placeholder="https://.../anim.gif" />
          </Campo>
        </div>

        <Campo label="Descrição curta">
          <Textarea rows={2} value={x.desc} onChange={(e) => set("desc", e.target.value)} />
        </Campo>

        <div className="grid gap-3 sm:grid-cols-4">
          <Campo label="Aposta mínima (MAS)">
            <Input type="number" min={0.01} step="0.01" value={x.apostaMin} onChange={(e) => set("apostaMin", Math.max(0.01, Number(e.target.value)))} />
          </Campo>
          <Campo label="Aposta máxima (MAS)">
            <Input type="number" min={1} step="1" value={x.apostaMax} onChange={(e) => set("apostaMax", Math.max(x.apostaMin, Number(e.target.value)))} />
          </Campo>
          <Campo label="Aposta padrão (MAS)" dica="Valor pré-digitado ao entrar no jogo">
            <Input
              type="number"
              min={x.apostaMin}
              step="1"
              value={x.apostaPadrao ?? 50}
              onChange={(e) => set("apostaPadrao", Math.max(x.apostaMin, Number(e.target.value) || 1))}
            />
          </Campo>
          <Campo label="Margem da casa (%)">
            <Input type="number" min={0} max={50} step="0.1" value={Math.round((x.houseEdge || 0) * 1000) / 10} onChange={(e) => set("houseEdge", Math.max(0, Math.min(0.5, Number(e.target.value) / 100)))} />
          </Campo>
        </div>

        {/* ── Tabela de multiplicadores editável ── */}
        {x.multiplicadores && x.multiplicadores.length > 0 && (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wider text-amber-300/90">
                Tabela de multiplicadores ({x.multiplicadores.length} casas)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => set("multiplicadores", [...(x.multiplicadores || []), 1])}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-white hover:bg-white/10"
                >+ Casa</button>
                <button
                  onClick={() => set("multiplicadores", (x.multiplicadores || []).slice(0, -1))}
                  className="rounded-lg bg-rose-500/15 px-2 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/25"
                >− Casa</button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {x.multiplicadores.map((m, idx) => (
                <div key={idx} className="rounded-lg border border-white/10 bg-slate-950/60 p-1.5">
                  <p className="mb-0.5 text-center text-[8px] font-bold uppercase text-slate-500">#{idx + 1}</p>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={m}
                    onChange={(e) => {
                      const arr = [...(x.multiplicadores || [])];
                      arr[idx] = Math.max(0, Number(e.target.value) || 0);
                      set("multiplicadores", arr);
                    }}
                    className="w-full rounded bg-transparent text-center text-xs font-black text-amber-300 outline-none"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              Estes valores alimentam diretamente o cálculo de prêmio do jogo (ajustado pelo RTP).
            </p>
          </div>
        )}

        {/* ── Ícones e símbolos internos do jogo ── */}
        {x.icones && Object.keys(x.icones).length > 0 && (
          <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.05] p-3">
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300/90">
              Ícones e símbolos do jogo
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(x.icones).map(([chave, valor]) => (
                <div key={chave} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/40 text-xl">
                    {valor.startsWith("http")
                      ? <img src={valor} alt="" className="h-full w-full object-cover" />
                      : valor}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase text-slate-500">{chave}</p>
                    <input
                      value={valor}
                      onChange={(e) => set("icones", { ...(x.icones || {}), [chave]: e.target.value })}
                      placeholder="Emoji ou URL"
                      className="w-full rounded bg-transparent text-xs font-bold text-white outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Aceita emoji ou URL de imagem (PNG/GIF/WebP).</p>
          </div>
        )}

        {/* ── Paleta de cores do jogo ── */}
        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.05] p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-violet-300/90">
            Estilização visual do jogo
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ["primaria", "Cor primária"],
              ["secundaria", "Cor secundária"],
              ["fundo", "Cor de fundo"],
            ] as const).map(([k, label]) => (
              <Campo key={k} label={label}>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={(x.cores?.[k] as string) || "#a855f7"}
                    onChange={(e) => set("cores", { ...(x.cores || {}), [k]: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                  />
                  <input
                    value={(x.cores?.[k] as string) || ""}
                    onChange={(e) => set("cores", { ...(x.cores || {}), [k]: e.target.value })}
                    placeholder="auto"
                    className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </Campo>
            ))}
          </div>
          <div className="mt-2">
            <Switch
              ligado={x.cores?.brilho !== false}
              onChange={(v) => set("cores", { ...(x.cores || {}), brilho: v })}
              rotulo={x.cores?.brilho !== false ? "Efeito glow ativo" : "Glow desativado"}
            />
          </div>
        </div>

        {/* Atalhos configuráveis */}
        <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/[0.05] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-fuchsia-300/80">
              Atalhos do painel de aposta
            </p>
            <button
              onClick={() =>
                set(
                  "atalhos",
                  [...(x.atalhos || []), { label: "50", valor: 50 }] as JogoConfig["atalhos"],
                )
              }
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-white hover:bg-white/10"
            >
              + Adicionar
            </button>
          </div>
          <div className="space-y-1.5">
            {(x.atalhos || []).map((a, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                <input
                  value={a.label}
                  onChange={(e) => {
                    const arr = [...(x.atalhos || [])];
                    arr[i] = { ...arr[i], label: e.target.value };
                    set("atalhos", arr as JogoConfig["atalhos"]);
                  }}
                  className="w-20 rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-white outline-none"
                  placeholder="Rótulo"
                />
                <select
                  value={a.op || "valor"}
                  onChange={(e) => {
                    const arr = [...(x.atalhos || [])];
                    if (e.target.value === "valor") arr[i] = { label: a.label, valor: a.valor ?? 100 };
                    else arr[i] = { label: a.label, op: e.target.value as "half" | "double" | "max" };
                    set("atalhos", arr as JogoConfig["atalhos"]);
                  }}
                  className="rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-white outline-none"
                >
                  <option value="valor">Valor fixo</option>
                  <option value="half">Metade (½)</option>
                  <option value="double">Dobro (2×)</option>
                  <option value="max">Máximo (MAX)</option>
                </select>
                {!a.op && (
                  <input
                    type="number"
                    min={1}
                    value={a.valor ?? 100}
                    onChange={(e) => {
                      const arr = [...(x.atalhos || [])];
                      arr[i] = { label: a.label, valor: Math.max(1, Number(e.target.value) || 1) };
                      set("atalhos", arr as JogoConfig["atalhos"]);
                    }}
                    className="w-24 rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-white outline-none"
                    placeholder="MAS"
                  />
                )}
                <button
                  onClick={() => {
                    const arr = [...(x.atalhos || [])];
                    arr.splice(i, 1);
                    set("atalhos", arr as JogoConfig["atalhos"]);
                  }}
                  className="ml-auto rounded-lg bg-rose-500/15 px-2 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
                >
                  Remover
                </button>
              </div>
            ))}
            {(!x.atalhos || x.atalhos.length === 0) && (
              <p className="text-[11px] text-slate-500">
                Nenhum atalho configurado — o jogo usará os atalhos padrão (½, 2×, 100, 1k, MAX).
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.06] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-white">🎯 RTP — chance de retorno</p>
              <p className="text-xs text-slate-400">Maior RTP = mais generoso com o jogador (house edge menor).</p>
            </div>
            <span className="text-2xl font-black text-cyan-300">{Math.round((x.rtp ?? 0.97) * 100)}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            value={Math.round((x.rtp ?? 0.97) * 100)}
            onChange={(e) => set("rtp", Number(e.target.value) / 100)}
            className="mt-3 w-full accent-cyan-400"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500">
            <span>50% (casa ganha muito)</span>
            <span>100% (justo)</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Botao variante="ghost" className="flex-1" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao variante="sucesso" className="flex-1" onClick={() => onSalvar(x)}>
            Salvar jogo
          </Botao>
        </div>
      </div>
    </Modal>
  );
}

/* ========================================================================
   ABA BANNERS & AVISOS — CRUD completo
   ======================================================================== */
function bannerVazio(): Banner {
  return {
    id: `b_${Date.now().toString(36)}`,
    titulo: "",
    desc: "",
    imagem: "",
    ctaTexto: "Saiba mais",
    ctaLink: "#/inicio",
    ativo: true,
    cor: "from-fuchsia-600/50 via-indigo-800/40 to-slate-950",
  };
}

function BannersAdmin() {
  const { cfg, salvarBanner, excluirBanner } = useConfig();
  const { toast } = useApp();
  const [edit, setEdit] = useState<Banner | null>(null);
  const [excluir, setExcluir] = useState<Banner | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">📣 Banners & Avisos da Home</h3>
            <p className="text-sm text-slate-400">
              Crie, edite, ative/desative e exclua banners exibidos na página inicial de todos os usuários.
            </p>
          </div>
          <Botao onClick={() => setEdit(bannerVazio())}>+ Novo banner</Botao>
        </div>
      </Card>

      {cfg.banners.length === 0 ? (
        <Card>
          <Vazio emoji="📣" titulo="Nenhum banner" texto="Crie o primeiro banner promocional." />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cfg.banners.map((b) => (
            <Card key={b.id} hover className={`overflow-hidden p-0 ${b.ativo ? "" : "opacity-55"}`}>
              <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${b.cor} p-4`}>
                {b.imagem ? (
                  <img src={b.imagem} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="text-4xl">📣</span>
                )}
                <div className="absolute inset-0 bg-black/25" />
                <p className="relative line-clamp-2 font-black text-white drop-shadow">{b.titulo}</p>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 min-h-[32px] text-[11px] text-slate-400">{b.desc}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-fuchsia-300">
                    {b.ctaTexto || "sem CTA"} {b.ctaLink && `→ ${b.ctaLink}`}
                  </span>
                  <div className="flex shrink-0 gap-1.5">
                    <Switch ligado={b.ativo} onChange={(v) => salvarBanner({ ...b, ativo: v })} />
                    <Botao variante="ghost" className="px-2.5 py-1.5 text-xs" onClick={() => setEdit({ ...b })}>
                      ✏️
                    </Botao>
                    <Botao variante="perigo" className="px-2.5 py-1.5 text-xs" onClick={() => setExcluir(b)}>
                      🗑️
                    </Botao>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {edit && (
        <EditorBanner
          banner={edit}
          onFechar={() => setEdit(null)}
          onSalvar={(b) => {
            if (!b.titulo.trim()) return toast("Informe o título do banner", "erro");
            salvarBanner(b);
            toast("Banner salvo — já visível na Home", "ok");
            setEdit(null);
          }}
        />
      )}

      <Confirmar
        aberto={!!excluir}
        perigo
        titulo="Excluir banner"
        mensagem={`Excluir o banner "${excluir?.titulo}"? Ele deixará de aparecer na Home.`}
        onCancelar={() => setExcluir(null)}
        onConfirmar={() => {
          if (excluir) excluirBanner(excluir.id);
          toast("Banner excluído", "ok");
          setExcluir(null);
        }}
      />
    </div>
  );
}

function EditorBanner({
  banner: b,
  onFechar,
  onSalvar,
}: {
  banner: Banner;
  onFechar: () => void;
  onSalvar: (b: Banner) => void;
}) {
  const [x, setX] = useState<Banner>({ ...b });
  const set = <K extends keyof Banner>(k: K, v: Banner[K]) => setX((a) => ({ ...a, [k]: v }));
  const CORES = [
    "from-fuchsia-600/50 via-indigo-800/40 to-slate-950",
    "from-amber-500/50 via-rose-800/40 to-slate-950",
    "from-emerald-600/50 via-teal-800/40 to-slate-950",
    "from-cyan-600/50 via-sky-800/40 to-slate-950",
    "from-violet-600/50 via-purple-800/40 to-slate-950",
  ];

  return (
    <Modal aberto onFechar={onFechar} titulo={b.titulo ? `Editar banner` : "Novo banner"} largura="max-w-2xl">
      <div className="space-y-4">
        <div className={`relative flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${x.cor} p-4`}>
          {x.imagem && <img src={x.imagem} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative text-center">
            <p className="text-lg font-black text-white drop-shadow">{x.titulo || "Pré-visualização"}</p>
            {x.desc && <p className="mt-1 text-xs text-slate-200">{x.desc}</p>}
          </div>
        </div>

        <Campo label="Título">
          <Input value={x.titulo} onChange={(e) => set("titulo", e.target.value)} />
        </Campo>
        <Campo label="Descrição">
          <Textarea rows={2} value={x.desc} onChange={(e) => set("desc", e.target.value)} />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="URL da imagem / GIF animado" dica="Opcional — sem imagem usa o gradiente">
            <Input value={x.imagem} onChange={(e) => set("imagem", e.target.value)} placeholder="https://.../banner.gif" />
          </Campo>
          <Campo label="Cor do gradiente (fallback)">
            <div className="flex gap-1.5 pt-1">
              {CORES.map((c) => (
                <button
                  key={c}
                  onClick={() => set("cor", c)}
                  className={`h-8 w-10 rounded-lg bg-gradient-to-br ${c} ring-2 ${x.cor === c ? "ring-fuchsia-400" : "ring-white/10"}`}
                />
              ))}
            </div>
          </Campo>
          <Campo label="Texto do botão (CTA)">
            <Input value={x.ctaTexto} onChange={(e) => set("ctaTexto", e.target.value)} />
          </Campo>
          <Campo label="Link do CTA" dica="Ex.: #/cassino, #/loja ou URL externa">
            <Input value={x.ctaLink} onChange={(e) => set("ctaLink", e.target.value)} />
          </Campo>
        </div>

        <Switch ligado={x.ativo} onChange={(v) => set("ativo", v)} rotulo={x.ativo ? "Banner ativo" : "Banner desativado"} />

        <div className="flex gap-2">
          <Botao variante="ghost" className="flex-1" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao variante="sucesso" className="flex-1" onClick={() => onSalvar(x)}>
            Salvar banner
          </Botao>
        </div>
      </div>
    </Modal>
  );
}

/* ========================================================================
   ABA TICKETS / SUPORTE — listar, filtrar, responder, status e crédito
   ======================================================================== */
function TicketsAdmin() {
  const { toast, creditarUsuario, ehModerador } = useApp();
  const { cfg } = useConfig();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filtro, setFiltro] = useState<string>("todos");
  const [sel, setSel] = useState<Ticket | null>(null);
  const [resp, setResp] = useState("");
  const [credMAS, setCredMAS] = useState(0);
  const [credBRL, setCredBRL] = useState(0);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tickets"), (snap) => {
      setTickets(snap.docs.map((d) => d.data() as Ticket).sort((a, b) => b.atualizadoEm - a.atualizadoEm));
    });
    return unsub;
  }, []);

  const filtrar = (t: Ticket) =>
    filtro === "todos" ? true : filtro === "meus" ? t.uid === sel?.uid : t.status === filtro;

  const enviarResposta = async () => {
    if (!sel || !resp.trim()) return;
    setEnviando(true);
    try {
      await responderTicket(sel.id, "admin", resp.trim());
      setResp("");
    } catch {
      toast("Falha ao enviar resposta", "erro");
    } finally {
      setEnviando(false);
    }
  };

  const creditar = async () => {
    if (!sel) return;
    if (credMAS <= 0 && credBRL <= 0) return toast("Informe um valor", "erro");
    try {
      await creditarUsuario(sel.uid, credMAS, credBRL, `Suporte · ${sel.assunto}`);
      await responderTicket(
        sel.id,
        "admin",
        `✅ Crédito aplicado: ${credMAS > 0 ? fmtMAS(credMAS) : ""}${credMAS > 0 && credBRL > 0 ? " e " : ""}${
          credBRL > 0 ? fmtBRL(credBRL) : ""
        } (reembolso/suporte).`,
      );
      toast("Crédito aplicado na conta do usuário ✅", "ok");
      setCredMAS(0);
      setCredBRL(0);
    } catch {
      toast("Falha ao creditar", "erro");
    }
  };

  const pendentes = tickets.filter((t) => t.status === "pendente" || t.status === "analise").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Estat emoji="🎫" titulo="Total" valor={String(tickets.length)} />
        <Estat emoji="🟡" titulo="Aguardando" valor={String(pendentes)} cor="text-amber-300" />
        <Estat emoji="🟢" titulo="Resolvidos" valor={String(tickets.filter((t) => t.status === "resolvido").length)} cor="text-emerald-300" />
        <Estat emoji="🔴" titulo="Fechados" valor={String(tickets.filter((t) => t.status === "fechado").length)} cor="text-rose-300" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Abas
          abas={[
            { id: "todos", nome: "Todos", emoji: "📥", badge: tickets.length },
            { id: "pendente", nome: "Pendente", emoji: "🟡", badge: tickets.filter((t) => t.status === "pendente").length },
            { id: "analise", nome: "Em análise", emoji: "🔵", badge: tickets.filter((t) => t.status === "analise").length },
            { id: "resolvido", nome: "Resolvido", emoji: "🟢" },
            { id: "fechado", nome: "Fechado", emoji: "🔴" },
          ]}
          ativa={filtro}
          onChange={setFiltro}
        />
        <Botao
          variante="ghost"
          className="text-xs text-rose-300 hover:bg-rose-500/15"
          onClick={async () => {
            if (!window.confirm("Isso apagará TODOS os tickets resolvidos e fechados. Tem certeza?")) return;
            try {
              const { excluirTicket } = await import("../lib/tickets");
              const praDeletar = tickets.filter((t) => t.status === "resolvido" || t.status === "fechado");
              await Promise.all(praDeletar.map((t) => excluirTicket(t.id)));
              toast(`${praDeletar.length} tickets apagados`, "ok");
              setSel(null);
            } catch {
              toast("Erro ao excluir tickets", "erro");
            }
          }}
        >
          🗑️ Limpar Atendidos
        </Botao>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="space-y-2">
          {tickets.filter(filtrar).length === 0 ? (
            <Card>
              <Vazio emoji="✅" titulo="Nenhum ticket" />
            </Card>
          ) : (
            tickets
              .filter(filtrar)
              .map((t) => {
                const st = STATUS_TICKET[t.status];
                return (
                  <button
                    key={t.id}
                    onClick={() => setSel(t)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      sel?.id === t.id ? "border-fuchsia-400/60 bg-fuchsia-600/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-white">{t.assunto}</p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${st.cls}`}>
                        {st.emoji} {st.nome}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-slate-400">
                      {t.nome} · {t.categoria}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {new Date(t.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                      {t.mensagens.length} msg
                    </p>
                  </button>
                );
              })
          )}
        </div>

        <Card className="h-fit">
          {!sel ? (
            <Vazio emoji="🎧" titulo="Selecione um ticket" texto="A conversa com o usuário aparece aqui." />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-black text-white">{sel.assunto}</h3>
                  <p className="text-xs text-slate-400">
                    {sel.nome} · {sel.email} · {sel.categoria}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(STATUS_TICKET) as (keyof typeof STATUS_TICKET)[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusTicket(sel.id, s).catch(() => {})}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-black transition ${
                        sel.status === s ? STATUS_TICKET[s].cls : "border-white/10 bg-white/5 text-slate-500 hover:text-white"
                      }`}
                    >
                      {STATUS_TICKET[s].emoji} {STATUS_TICKET[s].nome}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3">
                {sel.mensagens.map((m) => (
                  <div key={m.id} className={`flex ${m.autor === "admin" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        m.autor === "admin"
                          ? "rounded-br-sm bg-fuchsia-600/30 text-fuchsia-50"
                          : "rounded-bl-sm bg-white/[0.07] text-slate-200"
                      }`}
                    >
                      <p className="text-[9px] font-bold uppercase text-slate-400">
                        {m.autor === "admin" ? "Você (suporte)" : sel.nome}
                      </p>
                      <p className="whitespace-pre-wrap">{m.texto}</p>
                      <p className="mt-1 text-[9px] text-slate-500">
                        {new Date(m.ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Escreva uma resposta..."
                  value={resp}
                  onChange={(e) => setResp(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarResposta()}
                />
                <Botao disabled={!resp.trim() || enviando} onClick={enviarResposta}>
                  {enviando ? "..." : "Enviar"}
                </Botao>
              </div>

              {(!ehModerador || cfg.permisoesMod?.suporteAddSaldo === true) ? (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
                  <p className="text-xs font-bold text-emerald-300">⚡ Ação rápida: crédito na conta do usuário</p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <Campo label="MAS">
                      <Input type="number" min={0} value={credMAS} onChange={(e) => setCredMAS(Math.max(0, Number(e.target.value)))} className="w-28" />
                    </Campo>
                    <Campo label="R$">
                      <Input type="number" min={0} value={credBRL} onChange={(e) => setCredBRL(Math.max(0, Number(e.target.value)))} className="w-28" />
                    </Campo>
                    <Botao variante="sucesso" onClick={creditar} disabled={credMAS <= 0 && credBRL <= 0}>
                      Creditar na conta
                    </Botao>
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center text-xs text-slate-500">
                  🔒 Sua conta de Moderador não possui permissão para conceder créditos de saldo.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ========================================================================
   ABA MINERAÇÃO
   ======================================================================== */
function MineracaoAdmin() {
  const { cfg, salvarConfig } = useConfig();
  const { toast } = useApp();
  const m = cfg.mineracao;
  const set = (patch: Partial<typeof m>) => salvarConfig({ mineracao: { ...m, ...patch } });

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">🖱️ Mineração por clique</h3>
            <p className="text-sm text-slate-400">
              Configuração atual: {m.cliqueAtivo ? "ativa" : "desativada"} · {fmtMAS(m.valorClique)} por clique · cooldown {m.cooldownMs}ms
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
            <Input type="number" step="0.01" value={m.valorClique} onChange={(e) => set({ valorClique: Math.max(0, Number(e.target.value)) })} />
          </Campo>
          <Campo label="Cooldown (ms)" dica="Anti-spam entre cliques">
            <Input type="number" value={m.cooldownMs} onChange={(e) => set({ cooldownMs: Math.max(0, Number(e.target.value)) })} />
          </Campo>
          <Campo label="Chance de crítico (%)">
            <Input type="number" value={Math.round(m.chanceCritico * 100)} onChange={(e) => set({ chanceCritico: Number(e.target.value) / 100 })} />
          </Campo>
          <Campo label="Multiplicador do crítico">
            <Input type="number" value={m.multCritico} onChange={(e) => set({ multCritico: Number(e.target.value) })} />
          </Campo>
        </div>
      </Card>

      <Card className="border-cyan-500/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">⚡ Ring Automática Global</h3>
            <p className="text-sm text-slate-400">
              Unidade base invisível de mineração da rede MAScrypto. Todos os usuários mineram com esta Ring mesmo
              sem itens, desde que esteja ativa.
            </p>
          </div>
          <Switch
            ligado={m.ringAtiva !== false}
            onChange={(v) => set({ ringAtiva: v })}
            rotulo={m.ringAtiva !== false ? "Ring global ativa" : "Ring indisponível"}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Campo label="Nome da Ring">
            <Input value={m.ringNome || "Ring MAS Padrão"} onChange={(e) => set({ ringNome: e.target.value })} />
          </Campo>
          <Campo label="Hashrate Base (H/s)">
            <Input
              type="number"
              step="0.0001"
              min={0}
              value={m.ringHashrate ?? 0}
              onChange={(e) => set({ ringHashrate: Math.max(0, Number(e.target.value)) })}
            />
          </Campo>
          <Campo label="Descrição">
            <Input value={m.ringDesc || ""} onChange={(e) => set({ ringDesc: e.target.value })} />
          </Campo>
        </div>
      </Card>

      <Card>
        <h3 className="font-black text-white">⚙️ Mineração automática</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Multiplicador global" dica="Aplica a todo o hashrate da rede">
            <Input type="number" step="0.1" value={m.multiplicadorGlobal} onChange={(e) => set({ multiplicadorGlobal: Number(e.target.value) })} />
          </Campo>
          <Campo label="Capacidade (horas)">
            <Input type="number" value={m.capHoras} onChange={(e) => set({ capHoras: Number(e.target.value) })} />
          </Campo>
        </div>
      </Card>

      {/* ── SEÇÃO EXCLUSIVA: Gestão de Cards da Central de Mineração ── */}
      <Card glow className="border-fuchsia-500/20">
        <h3 className="font-black text-white">🗂️ Cards da Central de Mineração</h3>
        <p className="text-sm text-slate-400">
          Ative ou desative individualmente cada card, seção e elemento dinâmico na tela de Mineração pública.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-sm">Por hora / Por dia / Acumulado</p>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Exibe a projeção de rendimento e conversão de valores em BRL.</p>
            </div>
            <Switch
              ligado={m.cardProjecao !== false}
              onChange={(v) => set({ cardProjecao: v })}
            />
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-sm">Gráfico de Cotação</p>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Mostra o sparkline de variação de preço MAS/BRL ao vivo.</p>
            </div>
            <Switch
              ligado={m.cardGraficoCotacao !== false}
              onChange={(v) => set({ cardGraficoCotacao: v })}
            />
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-sm">Computadores Minerando (Pixel Art)</p>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Animação cyberpunk dinâmica simulando o processamento do hardware.</p>
            </div>
            <Switch
              ligado={m.cardAnimacaoPixel !== false}
              onChange={(v) => set({ cardAnimacaoPixel: v })}
            />
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-sm">Número de Mineração Completo</p>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Detalhamento completo do hashrate por algoritmos.</p>
            </div>
            <Switch
              ligado={m.cardNumeroMineracao !== false}
              onChange={(v) => set({ cardNumeroMineracao: v })}
            />
          </div>
        </div>
      </Card>

      <Card className="border-amber-400/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-black text-white">🔥 Boost de Mineração</h3>
          <Switch
            ligado={m.boostAtivo !== false}
            onChange={(v) => set({ boostAtivo: v })}
            rotulo={m.boostAtivo !== false ? "Boost habilitado" : "Boost desabilitado"}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Preço do boost (MAS)">
            <Input type="number" value={m.boostPreco} onChange={(e) => set({ boostPreco: Number(e.target.value) })} />
          </Campo>
          <Campo label="Multiplicador">
            <Input type="number" value={m.boostMult} onChange={(e) => set({ boostMult: Number(e.target.value) })} />
          </Campo>
          <Campo label="Duração (segundos)">
            <Input type="number" value={m.boostSegundos} onChange={(e) => set({ boostSegundos: Number(e.target.value) })} />
          </Campo>
          <Campo label="Cor do botão">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={m.boostCor || "#f59e0b"}
                onChange={(e) => set({ boostCor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
              />
              <Input value={m.boostCor || "#f59e0b"} onChange={(e) => set({ boostCor: e.target.value })} />
            </div>
          </Campo>
        </div>
      </Card>

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
          Fórmula única do sistema: <code className="text-fuchsia-300">nível = ⌊√(XP / 40)⌋ + 1</code> — usada no perfil, quarto, loja e admin.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo label="XP por MAS minerado">
            <Input type="number" step="0.05" value={cfg.xpPorMAS} onChange={(e) => salvarConfig({ xpPorMAS: Number(e.target.value) })} />
          </Campo>
          <Campo label="XP por MAS apostado">
            <Input type="number" step="0.05" value={cfg.xpPorAposta} onChange={(e) => salvarConfig({ xpPorAposta: Number(e.target.value) })} />
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
          <Input placeholder="🔍 Filtrar..." value={busca} onChange={(e) => setBusca(e.target.value)} className="ml-auto max-w-xs" />
        </div>
        <div className="mt-3 space-y-2">
          {filtrados.map((u) => (
            <div key={u.uid} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
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
   ABA CONFIGURAÇÕES — saldo inicial, cotação e chaves gerais
   ======================================================================== */
function ConfigAdmin() {
  const { cfg, salvarConfig, restaurarPadrao } = useConfig();
  const { toast, precoMAS } = useApp();
  const [conf, setConf] = useState(false);

  return (
    <div className="space-y-4">
      <Card glow className="border-emerald-500/20">
        <h3 className="font-black text-white">🎁 Configuração de boas-vindas</h3>
        <p className="text-sm text-slate-400">
          Saldo inicial em MAS creditado <b>uma única vez</b> no primeiro cadastro de cada usuário. Alterar aqui não afeta contas já criadas.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo label="Saldo inicial de MAS (novo cadastro)">
            <Input
              type="number"
              min={0}
              step={1}
              value={cfg.saldoInicial}
              onChange={(e) => {
                const v = Math.max(0, Number(e.target.value));
                salvarConfig({ saldoInicial: v });
                toast(`Novos cadastros receberão ${v} MAS`, "ok");
              }}
            />
          </Campo>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
            Aplicado apenas no primeiro cadastro — nunca sobrescrito ao relogar ou limpar o cache.
          </div>
        </div>
      </Card>

      {/* 📌 Sincronização Dinâmica: Cotação é definida 100% em tempo real pelo gráfico dinâmico do mercado. */}
      <Card className="border-sky-500/20 bg-gradient-to-r from-cyan-950/20 to-slate-950/40">
        <h3 className="font-black text-white">📈 Sincronização Dinâmica da Cotação</h3>
        <p className="text-sm text-slate-400">
          O controle manual da cotação foi <b className="text-cyan-300">removido</b>. O valor da moeda MAS acompanha de forma 100% dinâmica a oscilação do mercado em tempo real.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.06] p-3 text-sm">
            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Cotação Atual (Gráfico)</p>
            <p className="text-2xl font-black text-cyan-300">
              R$ {fmtNum(precoMAS, 4)}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              Todas as transações e conversões usam esta cotação ao vivo.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Âncora de Oscilação</p>
            <p className="text-lg font-bold text-white">R$ {fmtNum(cfg.cotacaoMAS, 2)}</p>
            <p className="mt-1 text-[10px] text-slate-500">
              Definida pela gravidade média do gráfico de mercado.
            </p>
          </div>
        </div>
      </Card>

      <GraficoAdmin />

      {/* 📊 PAINEL DE METRICAS E OVERRIDES (Valor fictício/customizado ou real) */}
      <Card glow className="border-cyan-500/25">
        <h3 className="font-black text-white">📊 Ajustes e Métricas da Home (Overrides)</h3>
        <p className="text-sm text-slate-400">
          Configure se o sistema deve exibir os dados de usuários reais ou usar multiplicadores e valores fictícios na página inicial.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <Switch
            ligado={cfg.overrides.usuariosReal}
            onChange={(v) => salvarConfig({ overrides: { ...cfg.overrides, usuariosReal: v } })}
            rotulo={cfg.overrides.usuariosReal ? "Exibindo dados reais da rede" : "Exibindo valores customizados"}
          />
        </div>
        {!cfg.overrides.usuariosReal && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo label="Usuários na rede" dica="Valor base exibido">
              <Input
                type="number"
                value={cfg.overrides.usuariosFicticio}
                onChange={(e) => salvarConfig({ overrides: { ...cfg.overrides, usuariosFicticio: Math.max(0, Number(e.target.value)) } })}
              />
            </Campo>
            <Campo label="MAS em circulação" dica="Valor base em MAS">
              <Input
                type="number"
                value={cfg.overrides.masFicticio}
                onChange={(e) => salvarConfig({ overrides: { ...cfg.overrides, masFicticio: Math.max(0, Number(e.target.value)) } })}
              />
            </Campo>
            <Campo label="Apostas realizadas" dica="Contador fictício">
              <Input
                type="number"
                value={cfg.overrides.apostasFicticio}
                onChange={(e) => salvarConfig({ overrides: { ...cfg.overrides, apostasFicticio: Math.max(0, Number(e.target.value)) } })}
              />
            </Campo>
            <Campo label="Mineradores ativos" dica="Contador fictício">
              <Input
                type="number"
                value={cfg.overrides.mineradoresFicticio}
                onChange={(e) => salvarConfig({ overrides: { ...cfg.overrides, mineradoresFicticio: Math.max(0, Number(e.target.value)) } })}
              />
            </Campo>
          </div>
        )}
      </Card>

      {/* 🎨 CONFIGURAÇÕES VISUAIS DA HOME */}
      <Card glow className="border-fuchsia-500/25">
        <h3 className="font-black text-white">🎨 Configurações de Estilo da Home (Admin)</h3>
        <p className="text-sm text-slate-400">
          Personalize as frases de impacto e ative/desative os efeitos gráficos pesados (partículas, neon) para melhor desempenho em aparelhos fracos.
        </p>
        <div className="mt-4 space-y-3">
          <Campo label="Frase de Impacto Principal (Slogan)" dica="Substitui o slogan da Home.">
            <Input
              value={cfg.visual.sloganPhrase}
              onChange={(e) => salvarConfig({ visual: { ...cfg.visual, sloganPhrase: e.target.value } })}
              placeholder="MINE. CONVERTA. EVOLUA."
            />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <Switch
              ligado={cfg.visual.particulasAtivas}
              onChange={(v) => salvarConfig({ visual: { ...cfg.visual, particulasAtivas: v } })}
              rotulo={cfg.visual.particulasAtivas ? "Partículas interativas ativas (Canvas)" : "Partículas desativadas"}
            />
            <Switch
              ligado={cfg.visual.neonGlowAtivo}
              onChange={(v) => salvarConfig({ visual: { ...cfg.visual, neonGlowAtivo: v } })}
              rotulo={cfg.visual.neonGlowAtivo ? "Efeito Neon Glow ativo" : "Neon desativado"}
            />
          </div>

          {/* Tipografia global */}
          <Campo label="Tipografia global da plataforma" dica="Aplicada instantaneamente em todo o site">
            <select
              value={cfg.visual.fonte || "system"}
              onChange={(e) => salvarConfig({ visual: { ...cfg.visual, fonte: e.target.value } })}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none"
            >
              {FONTES_DISPONIVEIS.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </Campo>
        </div>
      </Card>

      {/* 📊 MÉTRICAS DA HOME — rótulos e ícones editáveis */}
      <Card className="border-cyan-500/25">
        <h3 className="font-black text-white">📊 Rótulos e Ícones das Métricas</h3>
        <p className="text-sm text-slate-400">
          Personalize o texto e o ícone de cada métrica exibida na página inicial.
        </p>
        <div className="mt-4 space-y-2">
          {([
            ["iconeUsuarios",    "rotuloUsuarios",    "Usuários na rede"],
            ["iconeCirculacao",  "rotuloCirculacao",  "MAS em circulação"],
            ["iconeApostas",     "rotuloApostas",     "Apostas realizadas"],
            ["iconeMineradores", "rotuloMineradores", "Mineradores ativos"],
          ] as const).map(([kIcone, kRotulo, padrao]) => (
            <div key={kRotulo} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <input
                value={(cfg.visual as unknown as Record<string, string>)[kIcone] || ""}
                onChange={(e) => salvarConfig({ visual: { ...cfg.visual, [kIcone]: e.target.value } })}
                className="w-16 rounded-lg border border-white/10 bg-slate-950/70 px-2 py-2 text-center text-lg outline-none"
                placeholder="🎯"
              />
              <input
                value={(cfg.visual as unknown as Record<string, string>)[kRotulo] || ""}
                onChange={(e) => salvarConfig({ visual: { ...cfg.visual, [kRotulo]: e.target.value } })}
                className="min-w-[180px] flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
                placeholder={padrao}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Os <b>valores numéricos</b> dessas métricas são controlados na seção “Ajustes e Métricas da Home (Overrides)”.
        </p>
      </Card>

      {/* Aparência global do site */}
      <Card glow className="border-violet-500/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">🎨 Aparência / Tema do Site</h3>
            <p className="text-sm text-slate-400">
              Variáveis CSS globais aplicadas imediatamente em toda a plataforma.
            </p>
          </div>
          <Switch
            ligado={cfg.aparencia.neonAtivo}
            onChange={(v) => salvarConfig({ aparencia: { ...cfg.aparencia, neonAtivo: v } })}
            rotulo={cfg.aparencia.neonAtivo ? "Neon ativo" : "Neon desligado"}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["primaria", "Cor primária"],
            ["secundaria", "Cor secundária"],
            ["fundo", "Fundo do site"],
            ["card", "Fundo dos cards"],
            ["texto", "Cor dos textos"],
            ["borda", "Cor das bordas"],
            ["botaoInicio", "Gradiente botão — início"],
            ["botaoFim", "Gradiente botão — fim"],
          ] as const).map(([key, label]) => (
            <Campo key={key} label={label}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cfg.aparencia[key].slice(0, 7)}
                  onChange={(e) => salvarConfig({ aparencia: { ...cfg.aparencia, [key]: e.target.value } })}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                />
                <Input
                  value={cfg.aparencia[key]}
                  onChange={(e) => salvarConfig({ aparencia: { ...cfg.aparencia, [key]: e.target.value } })}
                />
              </div>
            </Campo>
          ))}
        </div>

        <div className="mt-4">
          <Campo label={`Intensidade do brilho: ${Math.round(cfg.aparencia.neonIntensidade * 100)}%`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={cfg.aparencia.neonIntensidade}
              disabled={!cfg.aparencia.neonAtivo}
              onChange={(e) => salvarConfig({ aparencia: { ...cfg.aparencia, neonIntensidade: Number(e.target.value) } })}
              className="w-full accent-fuchsia-500 disabled:opacity-40"
            />
          </Campo>
        </div>

        <div className="mt-4 rounded-2xl border p-4" style={{ background: cfg.aparencia.fundo, borderColor: cfg.aparencia.borda, color: cfg.aparencia.texto }}>
          <p className="font-black">Pré-visualização do tema</p>
          <p className="mt-1 text-sm opacity-70">Cards, texto, bordas e botões atualizam em tempo real.</p>
          <button
            className="mt-3 rounded-xl px-4 py-2 text-xs font-black text-white"
            style={{ background: `linear-gradient(110deg, ${cfg.aparencia.botaoInicio}, ${cfg.aparencia.botaoFim})` }}
          >
            Botão de exemplo
          </button>
        </div>
      </Card>

      <Card>
        <h3 className="font-black text-white">⚙️ Chaves gerais da plataforma</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <Switch ligado={cfg.lojaAtiva} onChange={(v) => salvarConfig({ lojaAtiva: v })} rotulo="Loja aberta" />
            <Switch ligado={cfg.cassinoAtivo} onChange={(v) => salvarConfig({ cassinoAtivo: v })} rotulo="Jogos abertos" />
            <Switch ligado={cfg.saquesAtivos} onChange={(v) => salvarConfig({ saquesAtivos: v })} rotulo="Saques liberados" />
          </div>

        {/* ── Módulos / Abas do Menu ── */}
        </div>
        <div className="mt-4 rounded-2xl border border-sky-500/25 bg-sky-500/[0.05] p-4">
          <h4 className="mb-3 font-black text-white">🗂️ Ativação de Abas do Menu</h4>
          <p className="mb-3 text-[11px] text-slate-400">
            Quando uma aba estiver desativada, o botão some do menu para todos os usuários em tempo real.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {([
              ["mineracao", "⛏️ Mineração"],
              ["cassino",   "🎰 Jogos"],
              ["loja",      "🛒 Loja"],
              ["quarto",    "🏠 Quarto"],
              ["mundo",     "🌐 Mundo"],
              ["carteira",  "💱 Carteira"],
              ["suporte",   "🎧 Suporte"],
              ["ranking",   "🏆 Ranking"],
            ] as const).map(([k, label]) => {
              const ativo = cfg.modulos?.[k] !== false;
              return (
                <div key={k} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-[11px] font-bold text-slate-300">{label}</span>
                  <Switch
                    ligado={ativo}
                    onChange={(v) => salvarConfig({ modulos: { ...cfg.modulos, [k]: v } })}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/[0.05] p-4">
          <h4 className="mb-3 font-black text-white">🖥️ Slots de Hardware do Quarto</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Custo de 1 slot extra (MAS)">
              <Input type="number" min={0} step={100} value={cfg.custoSlotHardware}
                onChange={(e) => salvarConfig({ custoSlotHardware: Math.max(0, Number(e.target.value)) })} />
            </Campo>
            <Campo label="Capacidade máxima global de slots" dica="Por conta — o usuário pode comprar até este limite">
              <Input type="number" min={4} max={64} step={1} value={cfg.limiteSlotHardwareGlobal}
                onChange={(e) => salvarConfig({ limiteSlotHardwareGlobal: Math.max(4, Number(e.target.value)) })} />
            </Campo>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
          <h4 className="mb-3 font-black text-white">🔐 Requisitos Globais de Nível</h4>
          <p className="mb-3 text-[11px] text-slate-400">
            Estes requisitos são usados na interface e nas mutações transacionais do sistema (ex.: compra de item),
            reduzindo a chance de burlar regras pelo cliente.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {([
              ["comprarLoja", "Compras na Loja"],
              ["acessarMundo", "Abrir Mundo"],
              ["visitarQuartos", "Visitar quartos"],
              ["chatQuarto", "Chat do quarto"],
              ["comprarSlotHardware", "Comprar slots"],
            ] as const).map(([key, label]) => (
              <Campo key={key} label={label}>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={cfg.requisitosNivel?.[key] || 1}
                  onChange={(e) =>
                    salvarConfig({
                      requisitosNivel: {
                        ...cfg.requisitosNivel,
                        [key]: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                      },
                    })
                  }
                />
              </Campo>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <Campo label="Depósito mínimo (R$)">
              <Input type="number" min={0.01} step="0.01" value={cfg.depositoMinimo} onChange={(e) => salvarConfig({ depositoMinimo: Math.max(0.01, Number(e.target.value)) })} />
            </Campo>
            <Campo label="Saque mínimo (R$)">
              <Input type="number" min={0.01} step="0.01" value={cfg.saqueMinimo} onChange={(e) => salvarConfig({ saqueMinimo: Math.max(0.01, Number(e.target.value)) })} />
            </Campo>
            <Campo label="Taxa de conversão (%)">
              <Input type="number" step="0.5" value={cfg.taxaConversao * 100} onChange={(e) => salvarConfig({ taxaConversao: Number(e.target.value) / 100 })} />
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
        <h3 className="font-black text-rose-300">⚠️ Zona de Risco e Manutenção</h3>
        <p className="mt-1 text-sm text-slate-400">
          Restaura o catálogo de itens, jogos, banners e parâmetros para os valores de fábrica. Não afeta as contas dos usuários.
        </p>
        <Botao variante="perigo" className="mt-3 w-full sm:w-auto" onClick={() => setConf(true)}>
          Restaurar configuração padrão
        </Botao>

        <div className="mt-6 border-t border-rose-500/20 pt-4">
          <h4 className="font-black text-rose-500">HARD RESET / WIPE TOTAL</h4>
          <p className="mt-1 text-xs text-rose-400/80">
            Isto irá apagar <b>absolutamente tudo</b> no banco de dados (Contas, Emails, Tickets, Saques, Depósitos, Salas Online, Chats e Históricos) e resetar a plataforma para o estado "zero". <b>ESTA AÇÃO É IRREVERSÍVEL.</b>
          </p>
          <Botao 
            className="mt-3 w-full sm:w-auto bg-rose-700 text-white hover:bg-rose-600 shadow-[0_0_20px_-5px_rgba(225,29,72,0.8)]" 
            onClick={async () => {
              if (window.confirm("ATENÇÃO: Você tem certeza ABSOLUTA que deseja DELETAR TUDO?\nIsso apagará todas as contas, saldos e registros da plataforma permanentemente!")) {
                if (window.prompt("Digite 'DELETAR TUDO' para confirmar a limpeza completa do banco:") === "DELETAR TUDO") {
                  try {
                    const { collection, getDocs, deleteDoc } = await import("firebase/firestore");
                    const { db, auth } = await import("../lib/firebase");
                    
                    const colecoesParaLimpar = [
                      "users", 
                      "tickets", 
                      "solicitacoes_financeiras", 
                      "online_room", 
                      "chat_quarto", 
                      "chat_global", 
                      "bilheteria_historico", 
                      "bilheteria"
                    ];
                    
                    toast("Iniciando WIPE TOTAL do banco de dados...", "info");
                    
                    for (const colName of colecoesParaLimpar) {
                      const snap = await getDocs(collection(db, colName));
                      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
                    }
                    
                    // Não dar localStorage.clear() global pois quebra as credenciais do IndexedDB do Firebase Auth
                    // Apenas limpamos as chaves próprias
                    localStorage.removeItem("mascrypto:config");
                    
                    restaurarPadrao(); // Reseta config/global
                    toast("WIPE TOTAL concluído. Deslogando...", "ok");
                    
                    // Desloga o admin atual para forçar recadastro e limpa a tela imediatamente
                    await auth.signOut();
                    window.location.reload();
                  } catch (e: any) {
                    toast(`Falha no WIPE: ${e.message}`, "erro");
                  }
                } else {
                  toast("Cancelado: O texto de confirmação não confere.", "info");
                }
              }
            }}
          >
            🔥 WIPE - DELETAR TUDO (Reset Completo)
          </Botao>
        </div>
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

/* ========================================================================
   PAINEL DEDICADO AO GRÁFICO DINÂMICO — controlado 100% pelo Admin
   ======================================================================== */
function GraficoAdmin() {
  const { cfg, salvarConfig } = useConfig();
  const { historicoPreco, proximoTickMs, precoMAS } = useApp();
  const g = cfg.grafico;
  const set = (patch: Partial<typeof g>) => salvarConfig({ grafico: { ...g, ...patch } });

  const modos: { id: typeof g.modo; nome: string; desc: string }[] = [
    { id: "smooth", nome: "Suave", desc: "Oscilação equilibrada" },
    { id: "volatile", nome: "Volátil", desc: "Ruído amplificado e picos" },
    { id: "bull", nome: "Alta", desc: "Tendência de subida contínua" },
    { id: "bear", nome: "Baixa", desc: "Tendência de queda contínua" },
    { id: "flat", nome: "Estável", desc: "Variação mínima em torno do preço" },
  ];

  return (
    <Card glow className="border-fuchsia-500/25">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-white">📈 Gráfico dinâmico do MAS</h3>
          <p className="text-sm text-slate-400">
            Controle a amplitude, os picos, o modo de mercado e o intervalo de atualização exibidos na Home e na
            Carteira. Aplicado em tempo real para todos os usuários.
          </p>
        </div>
        <Switch ligado={g.ativo} onChange={(v) => set({ ativo: v })} rotulo={g.ativo ? "Rodando" : "Pausado"} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cotação oficial</p>
            <p className="text-2xl font-black text-white">R$ {fmtNum(precoMAS, 4)}</p>
          </div>
          <p className="text-[11px] text-slate-500">Amostras exibidas: {g.janela} · Modo atual: {g.modo}</p>
        </div>
        <div className="mt-3 h-24">
          <Sparkline dados={historicoPreco} cor="#e879f9" />
        </div>
        <GraficoStatus ativo={g.ativo} intervaloMs={g.intervaloMs} proximoMs={proximoTickMs} modo={g.modo} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Modo do mercado</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {modos.map((m) => (
            <button
              key={m.id}
              onClick={() => set({ modo: m.id })}
              className={`rounded-xl border p-2 text-left text-xs transition ${
                g.modo === m.id
                  ? "border-fuchsia-400 bg-fuchsia-500/20 text-white"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
              }`}
            >
              <p className="font-black">{m.nome}</p>
              <p className="text-[10px] text-slate-500">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Intervalo de atualização (s)" dica="Entre 0,5 e 60 segundos">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={g.intervaloMs / 1000}
              onChange={(e) => set({ intervaloMs: Number(e.target.value) * 1000 })}
              className="flex-1 accent-fuchsia-500"
            />
            <span className="w-14 text-right text-xs font-black text-white">{fmtNum(g.intervaloMs / 1000, 1)}s</span>
          </div>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => set({ intervaloMs: s * 1000 })}
                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold transition ${
                  g.intervaloMs === s * 1000
                    ? "border-fuchsia-400 bg-fuchsia-500/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </Campo>
        <Campo label="Amplitude base (%)" dica="Variação típica em cada tick">
          <Input
            type="number"
            min={0}
            max={60}
            step={0.1}
            value={g.amplitude * 100}
            onChange={(e) => set({ amplitude: Math.max(0, Math.min(0.6, Number(e.target.value) / 100)) })}
          />
        </Campo>
        <Campo label="Amplitude do pico (%)" dica="Deslocamento máximo em picos ocasionais">
          <Input
            type="number"
            min={0}
            max={80}
            step={0.5}
            value={g.picoAmplitude * 100}
            onChange={(e) => set({ picoAmplitude: Math.max(g.amplitude, Math.min(0.8, Number(e.target.value) / 100)) })}
          />
        </Campo>
        <Campo label="Frequência de picos (%)" dica="Chance de um pico em cada tick">
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            value={Math.round(g.picoChance * 100)}
            onChange={(e) => set({ picoChance: Math.max(0, Math.min(1, Number(e.target.value) / 100)) })}
          />
        </Campo>
        <Campo label="Suavização" dica="0 = ruído puro · 0,98 = quase parado">
          <Input
            type="number"
            min={0}
            max={0.98}
            step={0.05}
            value={g.suavizacao}
            onChange={(e) => set({ suavizacao: Math.max(0, Math.min(0.98, Number(e.target.value))) })}
          />
        </Campo>
        <Campo label="Janela de amostras" dica="Quantidade de pontos no gráfico">
          <Input
            type="number"
            min={20}
            max={240}
            step={5}
            value={g.janela}
            onChange={(e) => set({ janela: Math.max(20, Math.min(240, Number(e.target.value))) })}
          />
        </Campo>
        <Campo label="Preço mínimo (R$)" dica="Piso permitido para as amostras">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={g.precoMin}
            onChange={(e) => set({ precoMin: Math.max(0, Number(e.target.value)) })}
          />
        </Campo>
        <Campo label="Preço máximo (R$)" dica="0 = sem teto">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={g.precoMax}
            onChange={(e) => set({ precoMax: Math.max(0, Number(e.target.value)) })}
          />
        </Campo>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Presets rápidos:</span>
        {[
          { id: "calmo", label: "Mercado calmo", patch: { modo: "smooth" as const, amplitude: 0.008, picoAmplitude: 0.02, picoChance: 0.04, intervaloMs: 3000 } },
          { id: "ativo", label: "Padrão", patch: { modo: "smooth" as const, amplitude: 0.015, picoAmplitude: 0.05, picoChance: 0.08, intervaloMs: 2000 } },
          { id: "louco", label: "Explosivo", patch: { modo: "volatile" as const, amplitude: 0.035, picoAmplitude: 0.12, picoChance: 0.18, intervaloMs: 1500 } },
          { id: "pump", label: "Pump contínuo", patch: { modo: "bull" as const, amplitude: 0.02, picoAmplitude: 0.08, picoChance: 0.15, intervaloMs: 2000 } },
          { id: "dump", label: "Crash contínuo", patch: { modo: "bear" as const, amplitude: 0.02, picoAmplitude: 0.08, picoChance: 0.15, intervaloMs: 2000 } },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => set(p.patch)}
            className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold text-slate-300 transition hover:border-fuchsia-400/40 hover:text-white"
           >
            {p.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ======================= INDEX / LOGIN (LANDING) ======================= */
function LandingAdmin() {
  const { cfg, salvarConfig } = useConfig();
  const { toast } = useApp();
  const L = cfg.landing;
  const set = (patch: Partial<typeof L>) => salvarConfig({ landing: { ...L, ...patch } });

  const setFeature = (i: number, patch: Partial<(typeof L.features)[number]>) => {
    const features = L.features.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    set({ features });
  };
  const addFeature = () => set({ features: [...L.features, { icone: "✨", titulo: "Novo", desc: "Descrição" }] });
  const delFeature = (i: number) => set({ features: L.features.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <Card glow className="overflow-hidden bg-[radial-gradient(120%_150%_at_0%_0%,rgba(217,70,239,0.18),transparent_55%)]">
        <h3 className="text-lg font-black text-white">🖼️ Index, Login e Cadastro</h3>
        <p className="text-sm text-slate-400">
          Tudo que aparece na tela inicial é configurável aqui e atualiza em tempo real para todos.
        </p>
      </Card>

      {/* Textos */}
      <Card>
        <h4 className="mb-3 font-black text-white">📝 Textos</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Nome da marca"><Input value={L.marca} onChange={(e) => set({ marca: e.target.value })} /></Campo>
          <Campo label="Emoji/ícone do logo"><Input value={L.logoEmoji} onChange={(e) => set({ logoEmoji: e.target.value })} /></Campo>
          <Campo label="URL do logo (opcional)" dica="Substitui o emoji"><Input value={L.logoUrl} onChange={(e) => set({ logoUrl: e.target.value })} /></Campo>
          <Campo label="Slogan (efeito de digitação)"><Input value={L.slogan} onChange={(e) => set({ slogan: e.target.value })} /></Campo>
          <Campo label="Título principal"><Input value={L.titulo} onChange={(e) => set({ titulo: e.target.value })} /></Campo>
          <Campo label="Subtítulo"><Input value={L.subtitulo} onChange={(e) => set({ subtitulo: e.target.value })} /></Campo>
          <Campo label="Botão Entrar"><Input value={L.btnEntrar} onChange={(e) => set({ btnEntrar: e.target.value })} /></Campo>
          <Campo label="Botão Criar conta"><Input value={L.btnCriar} onChange={(e) => set({ btnCriar: e.target.value })} /></Campo>
        </div>
        <div className="mt-3">
          <Campo label="Rodapé"><Textarea rows={2} value={L.rodape} onChange={(e) => set({ rodape: e.target.value })} /></Campo>
        </div>
      </Card>

      {/* Cores e efeitos */}
      <Card>
        <h4 className="mb-3 font-black text-white">🎨 Cores e efeitos (tempo real)</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ["corPrimaria", "Cor primária"],
            ["corSecundaria", "Cor secundária"],
            ["corFundo", "Cor de fundo"],
          ] as const).map(([key, label]) => (
            <Campo key={key} label={label}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={L[key]}
                  onChange={(e) => set({ [key]: e.target.value } as Partial<typeof L>)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                />
                <Input value={L[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<typeof L>)} />
              </div>
            </Campo>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["pixelArt", "Pixel-art neon"],
            ["particulas", "Partículas"],
            ["scanlines", "Scanlines CRT"],
            ["brilhoNeon", "Brilho neon"],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="text-[11px] font-bold text-slate-300">{label}</span>
              <Switch ligado={!!L[key]} onChange={(v) => set({ [key]: v } as Partial<typeof L>)} />
            </div>
          ))}
        </div>
      </Card>

      {/* Features */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-black text-white">✨ Destaques (features)</h4>
          <Botao variante="ghost" className="px-3 py-1.5 text-xs" onClick={addFeature}>+ Adicionar</Botao>
        </div>
        <div className="space-y-2">
          {L.features.map((f, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <Input value={f.icone} onChange={(e) => setFeature(i, { icone: e.target.value })} className="w-16 text-center" />
              <Input value={f.titulo} onChange={(e) => setFeature(i, { titulo: e.target.value })} className="w-32" />
              <Input value={f.desc} onChange={(e) => setFeature(i, { desc: e.target.value })} className="min-w-[160px] flex-1" />
              <button onClick={() => delFeature(i)} className="rounded-lg bg-rose-500/15 px-2 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25">🗑️</button>
            </div>
          ))}
        </div>
      </Card>

      {/* Preview */}
      <Card>
        <h4 className="mb-3 font-black text-white">👁️ Pré-visualização</h4>
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 p-6"
          style={{ background: L.corFundo }}
        >
          {L.pixelArt && (
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage: `linear-gradient(${L.corPrimaria}55 1px,transparent 1px),linear-gradient(90deg,${L.corSecundaria}55 1px,transparent 1px)`,
                backgroundSize: "22px 22px",
              }}
            />
          )}
          <div className="relative flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-black text-white"
              style={{ background: `linear-gradient(135deg,${L.corPrimaria},${L.corSecundaria})`, boxShadow: L.brilhoNeon ? `0 0 30px -6px ${L.corPrimaria}` : "none" }}
            >
              {L.logoUrl ? <img src={L.logoUrl} alt="" className="h-full w-full rounded-xl object-cover" /> : L.logoEmoji}
            </div>
            <div>
              <p className="text-lg font-black text-white">{L.marca}</p>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: L.corSecundaria }}>{L.slogan}</p>
            </div>
          </div>
          <p className="relative mt-3 text-xl font-black text-white">{L.titulo}</p>
          <p className="relative text-xs text-slate-300">{L.subtitulo}</p>
          <button
            className="relative mt-3 rounded-lg px-4 py-2 text-xs font-black text-white"
            style={{ background: `linear-gradient(110deg,${L.corPrimaria},${L.corSecundaria})` }}
            onClick={() => toast("É só uma prévia 😉", "info")}
          >
            {L.btnEntrar}
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ========================================================================
   ABA PERMISSÕES DO MODERADOR — Controle total de abas do Moderador (Apenas Admin)
   ======================================================================== */
function PermissoesAdmin() {
  const { cfg, salvarConfig } = useConfig();
  const { toast } = useApp();
  const p = cfg.permisoesMod || {};

  const setPerm = (key: string, v: boolean) => {
    salvarConfig({ permisoesMod: { ...p, [key]: v } });
    toast("Permissões de moderação atualizadas em tempo real ✅", "ok");
  };

  const abasInfo: { id: keyof typeof p; nome: string; desc: string }[] = [
    { id: "operacional", nome: "🎫 Vendas e Operacional", desc: "Acesso a saques, depósitos e relatórios de fluxo diário." },
    { id: "contas", nome: "👥 Gerenciamento de Contas", desc: "Ver dados dos usuários, banir contas e editar saldos." },
    { id: "loja", nome: "🛒 Itens da Loja", desc: "Criar, editar e excluir itens na Loja / Shop." },
    { id: "avatares", nome: "👤 Avatares", desc: "Gerenciar galeria de avatares padrão e skins premium." },
    { id: "jogos", nome: "🎰 Gerenciar Jogos", desc: "Editar multiplicadores, RTP e paleta visual dos jogos." },
    { id: "banners", nome: "📣 Banners & Avisos", desc: "Editar e publicar banners dinâmicos da página inicial." },
    { id: "tickets", nome: "🎧 Tickets / Suporte", desc: "Acessar o SAC, listar, filtrar e responder tickets." },
    { id: "suporteAddSaldo", nome: "⚡ Suporte: Ação Rápida de Crédito", desc: "Permitir que o moderador envie créditos de MAS/R$ via chat de tickets." },
    { id: "mineracao", nome: "⛏️ Central de Mineração", desc: "Configurar ring automática, cliques e preço do boost." },
    { id: "xp", nome: "⭐ XP e Níveis", desc: "Configurar curva de progressão e ajustar XP de usuários." },
    { id: "recompensa", nome: "🎁 Recompensa Diária", desc: "Editar prêmios de login e multiplicador de streak." },
    { id: "bilheteria", nome: "🎟️ Bilheteria", desc: "Controlar o sorteio dinâmico, pausar ou sortear a rodada." },
    { id: "landing", nome: "🖼️ Index / Login", desc: "Configurar textos, efeitos e cores da tela inicial." },
    { id: "config", nome: "⚙️ Configurações Gerais", desc: "Gerenciar chaves do site, taxas e depósito/saque mínimos." },
  ];

  return (
    <div className="space-y-4">
      <Card glow className="border-cyan-500/25">
        <h3 className="font-black text-white">🔑 Permissões do Moderador</h3>
        <p className="text-sm text-slate-400">
          Como administrador supremo, selecione abaixo exatamente quais abas e recursos o cargo <b className="text-cyan-300">Moderador</b> terá acesso ao logar na plataforma.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {abasInfo.map((ab) => (
            <div key={ab.id} className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div>
                <p className="font-black text-white text-sm">{ab.nome}</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{ab.desc}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-500">Acesso Habilitado</span>
                <Switch
                  ligado={p[ab.id] === true}
                  onChange={(v) => setPerm(String(ab.id), v)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
