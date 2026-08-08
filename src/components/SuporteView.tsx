import { useEffect, useState } from "react";
import { onSnapshot, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useApp } from "../store/AppContext";
import {
  CATEGORIAS_TICKET,
  STATUS_TICKET,
  criarTicket,
  responderTicket,
  type Ticket,
} from "../lib/tickets";
import { Abas, Botao, Card, Campo, Input, Modal, Selo, Textarea, Vazio } from "./UI";

export default function SuporteView() {
  const { user, data, toast } = useApp();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [sel, setSel] = useState<Ticket | null>(null);
  const [novo, setNovo] = useState(false);
  const [categoria, setCategoria] = useState(CATEGORIAS_TICKET[0]);
  const [assunto, setAssunto] = useState("");
  const [texto, setTexto] = useState("");
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Escuta os tickets (filtra por uid no cliente — evita índice composto no Firestore)
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "tickets"), (snap) => {
      const todos = snap.docs.map((d) => d.data() as Ticket);
      setTickets(todos.filter((t) => t.uid === user.uid).sort((a, b) => b.atualizadoEm - a.atualizadoEm));
    });
    return unsub;
  }, [user]);

  if (!data) return null;

  const abrir = async () => {
    if (assunto.trim().length < 4) return toast("Descreva brevemente o assunto", "erro");
    if (texto.trim().length < 10) return toast("Explique o problema com mais detalhes", "erro");
    setEnviando(true);
    try {
      await criarTicket(user!.uid, data.nome, data.email, categoria, assunto.trim(), texto.trim());
      toast("Ticket criado! Nossa equipe vai analisar 🎧", "ok");
      setNovo(false);
      setAssunto("");
      setTexto("");
    } catch {
      toast("Falha ao abrir o ticket. Tente novamente.", "erro");
    } finally {
      setEnviando(false);
    }
  };

  const responder = async () => {
    if (!sel || resposta.trim().length < 2) return;
    setEnviando(true);
    try {
      await responderTicket(sel.id, "usuario", resposta.trim());
      setResposta("");
    } catch {
      toast("Falha ao enviar mensagem", "erro");
    } finally {
      setEnviando(false);
    }
  };

  const filtrados = tickets.filter((t) => (filtro === "todos" ? true : t.status === filtro));

  return (
    <div className="space-y-5">
      <Card glow className="overflow-hidden bg-[radial-gradient(120%_150%_at_0%_0%,rgba(56,189,248,0.16),transparent_55%)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">🎧 Central de Ajuda</h2>
            <p className="text-sm text-slate-400">
              Abra um ticket por categoria e acompanhe o status em tempo real: {STATUS_TICKET.pendente.emoji} Pendente,{" "}
              {STATUS_TICKET.analise.emoji} Em análise, {STATUS_TICKET.resolvido.emoji} Resolvido, {STATUS_TICKET.fechado.emoji} Fechado.
            </p>
          </div>
          <Botao onClick={() => setNovo(true)}>+ Novo ticket</Botao>
        </div>
      </Card>

      <Abas
        abas={[
          { id: "todos", nome: "Todos", emoji: "📥", badge: tickets.length },
          { id: "pendente", nome: "Pendente", emoji: "🟡" },
          { id: "analise", nome: "Em análise", emoji: "🔵" },
          { id: "resolvido", nome: "Resolvido", emoji: "🟢" },
          { id: "fechado", nome: "Fechado", emoji: "🔴" },
        ]}
        ativa={filtro}
        onChange={setFiltro}
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-2">
          {filtrados.length === 0 ? (
            <Card>
              <Vazio emoji="📭" titulo="Nenhum ticket" texto="Precisa de ajuda? Abra um ticket." />
            </Card>
          ) : (
            filtrados.map((t) => {
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
                  <p className="mt-1 text-[11px] text-slate-400">
                    {t.categoria} · {t.mensagens.length} mensagens
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {new Date(t.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <Card className="h-fit">
          {!sel ? (
            <Vazio emoji="💬" titulo="Selecione um ticket" texto="A conversa com o suporte aparece aqui." />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-black text-white">{sel.assunto}</h3>
                  <p className="text-xs text-slate-400">
                    {sel.categoria} · aberto em {new Date(sel.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Selo
                  tom={sel.status === "pendente" ? "ouro" : sel.status === "analise" ? "ciano" : sel.status === "resolvido" ? "verde" : "vermelho"}
                >
                  {STATUS_TICKET[sel.status].emoji} {STATUS_TICKET[sel.status].nome}
                </Selo>
              </div>

              <div className="max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3">
                {sel.mensagens.map((m) => (
                  <div key={m.id} className={`flex ${m.autor === "usuario" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        m.autor === "usuario"
                          ? "rounded-br-sm bg-fuchsia-600/30 text-fuchsia-50"
                          : "rounded-bl-sm bg-white/[0.07] text-slate-200"
                      }`}
                    >
                      <p className="text-[9px] font-bold uppercase text-slate-400">
                        {m.autor === "usuario" ? "Você" : "Suporte MAS"}
                      </p>
                      <p className="whitespace-pre-wrap">{m.texto}</p>
                      <p className="mt-1 text-[9px] text-slate-500">
                        {new Date(m.ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {sel.status === "fechado" || sel.status === "resolvido" ? (
                <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs text-slate-400">
                  {sel.status === "resolvido" ? "✅ Este ticket foi resolvido pelo suporte." : "🔒 Este ticket foi fechado."}
                </p>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Responder ao suporte..."
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && responder()}
                  />
                  <Botao disabled={resposta.trim().length < 2 || enviando} onClick={responder}>
                    {enviando ? "..." : "Enviar"}
                  </Botao>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Modal aberto={novo} onFechar={() => setNovo(false)} titulo="Abrir ticket de suporte">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Categoria</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS_TICKET.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoria(c)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                    categoria === c
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                      : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <Campo label="Assunto">
            <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: Meu saque não foi processado" />
          </Campo>
          <Campo label="Descreva o problema" dica="Quanto mais detalhes, mais rápido resolvemos.">
            <Textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Explique o que aconteceu..." />
          </Campo>
          <Botao className="w-full py-3" disabled={enviando} onClick={abrir}>
            {enviando ? "Enviando..." : "Enviar ticket"}
          </Botao>
          <p className="text-center text-[11px] text-slate-500">
            Status: 🟡 Pendente → 🔵 Em análise → 🟢 Resolvido / 🔴 Fechado
          </p>
        </div>
      </Modal>
    </div>
  );
}
