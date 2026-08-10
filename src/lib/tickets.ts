import { arrayUnion, collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

/* ============================================================
   SISTEMA DE TICKETS / SUPORTE (SAC)
   Coleção Firestore: tickets/{id}
   - Usuário abre ticket por categoria e troca mensagens.
   - Admin lista, filtra, responde, altera status e pode creditar
     saldo (MAS/R$) direto na conta do solicitante.
   ============================================================ */

export type TicketStatus = "pendente" | "analise" | "resolvido" | "fechado";

export interface MensagemTicket {
  id: string;
  autor: "usuario" | "admin";
  texto: string;
  ts: number;
}

export interface Ticket {
  id: string;
  uid: string;
  nome: string;
  email: string;
  categoria: string;
  assunto: string;
  status: TicketStatus;
  criadoEm: number;
  atualizadoEm: number;
  mensagens: MensagemTicket[];
}

export const CATEGORIAS_TICKET = [
  "Problema técnico",
  "Saque",
  "Depósito",
  "Mineração",
  "Jogos",
  "Reembolso",
  "Outros",
];

export const STATUS_TICKET: Record<TicketStatus, { nome: string; emoji: string; cls: string }> = {
  pendente: { nome: "Pendente", emoji: "🟡", cls: "text-amber-300 bg-amber-500/15 border-amber-500/30" },
  analise: { nome: "Em análise", emoji: "🔵", cls: "text-sky-300 bg-sky-500/15 border-sky-500/30" },
  resolvido: { nome: "Resolvido", emoji: "🟢", cls: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30" },
  fechado: { nome: "Fechado", emoji: "🔴", cls: "text-rose-300 bg-rose-500/15 border-rose-500/30" },
};

export function novoMensagem(autor: MensagemTicket["autor"], texto: string): MensagemTicket {
  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    autor,
    texto,
    ts: Date.now(),
  };
}

export async function criarTicket(
  uid: string,
  nome: string,
  email: string,
  categoria: string,
  assunto: string,
  texto: string,
): Promise<Ticket> {
  const ref = doc(collection(db, "tickets"));
  const t: Ticket = {
    id: ref.id,
    uid,
    nome,
    email,
    categoria,
    assunto,
    status: "pendente",
    criadoEm: Date.now(),
    atualizadoEm: Date.now(),
    mensagens: [novoMensagem("usuario", texto)],
  };
  await setDoc(ref, t);
  return t;
}

export async function responderTicket(id: string, autor: MensagemTicket["autor"], texto: string) {
  await updateDoc(doc(db, "tickets", id), {
    mensagens: arrayUnion(novoMensagem(autor, texto)),
    atualizadoEm: Date.now(),
  });
}

export async function setStatusTicket(id: string, status: TicketStatus) {
  await updateDoc(doc(db, "tickets", id), { status, atualizadoEm: Date.now() });
}
