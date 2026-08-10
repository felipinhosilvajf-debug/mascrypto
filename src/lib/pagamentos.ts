import {
  collection,
  doc,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { sanitize } from "./sanitize";
import { normalizar, type Transacao, type UserData } from "./types";

export type TipoPagamento = "deposito" | "saque";
export type StatusPagamento = "pendente" | "aprovado" | "recusado";
export type DestinoDeposito = "BRL" | "MAS";

export interface PagamentoManual {
  id: string;
  uid: string;
  nome: string;
  email: string;
  tipo: TipoPagamento;
  status: StatusPagamento;
  /** Valor em reais informado/transferido pelo usuário. */
  valorBRL: number;
  destino: DestinoDeposito;
  chavePix: string;
  comprovante: string;
  observacao: string;
  criadoEm: number;
  atualizadoEm: number;
  processadoPor?: string;
  motivoRecusa?: string;
  valorCreditado?: number;
}

export const DEPOSITO_MINIMO = 0.1;
export const SAQUE_MINIMO = 2.5;
export const COLECAO_PAGAMENTOS = "pagamentos";
const usuarioRef = (uid: string) => doc(db, "users", uid);

/** Cria uma solicitação de depósito. Nenhum saldo é creditado antes da aprovação. */
export async function solicitarDepositoManual(args: {
  uid: string;
  nome: string;
  email: string;
  valorBRL: number;
  destino: DestinoDeposito;
  comprovante?: string;
  observacao?: string;
  minimo?: number;
}) {
  const minimo = args.minimo ?? DEPOSITO_MINIMO;
  if (!Number.isFinite(args.valorBRL) || args.valorBRL < minimo)
    throw new Error(`Depósito mínimo: R$ ${minimo.toFixed(2)}`);
  const ref = doc(collection(db, COLECAO_PAGAMENTOS));
  const agora = Date.now();
  const pedido: PagamentoManual = {
    id: ref.id,
    uid: args.uid,
    nome: args.nome,
    email: args.email,
    tipo: "deposito",
    status: "pendente",
    valorBRL: args.valorBRL,
    destino: args.destino,
    chavePix: "",
    comprovante: args.comprovante || "",
    observacao: args.observacao || "",
    criadoEm: agora,
    atualizadoEm: agora,
  };
  await setDoc(ref, pedido);
  return pedido;
}

/**
 * Reserva o saque atomicamente: debita BRL e cria o pedido na mesma transação.
 * Se a transação falhar, nenhum dos dois acontece.
 */
export async function solicitarSaqueManual(args: {
  uid: string;
  nome: string;
  email: string;
  valorBRL: number;
  chavePix: string;
  minimo?: number;
}) {
  const minimo = args.minimo ?? SAQUE_MINIMO;
  if (!Number.isFinite(args.valorBRL) || args.valorBRL < minimo)
    throw new Error(`Saque mínimo: R$ ${minimo.toFixed(2)}`);
  if (!args.chavePix.trim()) throw new Error("Informe uma chave PIX");

  const pedidoRef = doc(collection(db, COLECAO_PAGAMENTOS));
  await runTransaction(db, async (tx) => {
    const uRef = usuarioRef(args.uid);
    const snap = await tx.get(uRef);
    if (!snap.exists()) throw new Error("Conta não encontrada");
    const u = normalizar(snap.data() as Partial<UserData>, args.uid);
    if (u.brl < args.valorBRL) throw new Error("Saldo em reais insuficiente");

    const agora = Date.now();
    const historico: Transacao[] = [
      {
        t: "Saque PIX · Reserva",
        v: -args.valorBRL,
        d: `Pedido ${pedidoRef.id.slice(0, 8)} · aguardando análise`,
        ts: agora,
        moeda: "BRL" as const,
      },
      ...u.historico,
    ].slice(0, 60);
    tx.set(uRef, sanitize({ ...u, brl: u.brl - args.valorBRL, historico, atualizadoEm: agora }));
    tx.set(pedidoRef, {
      id: pedidoRef.id,
      uid: args.uid,
      nome: args.nome,
      email: args.email,
      tipo: "saque",
      status: "pendente",
      valorBRL: args.valorBRL,
      destino: "BRL",
      chavePix: args.chavePix.trim(),
      comprovante: "",
      observacao: "Valor reservado no momento da solicitação.",
      criadoEm: agora,
      atualizadoEm: agora,
    } satisfies PagamentoManual);
  });
  return pedidoRef.id;
}

/** Admin aprova: depósito credita BRL/MAS; saque apenas é finalizado (já reservado). */
export async function aprovarPagamento(
  pedido: PagamentoManual,
  adminEmail: string,
  cotacaoMAS: number,
) {
  await runTransaction(db, async (tx) => {
    const pRef = doc(db, COLECAO_PAGAMENTOS, pedido.id);
    const pSnap = await tx.get(pRef);
    if (!pSnap.exists()) throw new Error("Solicitação não encontrada");
    const atual = pSnap.data() as PagamentoManual;
    if (atual.status !== "pendente") throw new Error("Solicitação já processada");

    const agora = Date.now();
    let valorCreditado = 0;
    if (atual.tipo === "deposito") {
      const uRef = usuarioRef(atual.uid);
      const uSnap = await tx.get(uRef);
      if (!uSnap.exists()) throw new Error("Conta do usuário não encontrada");
      const u = normalizar(uSnap.data() as Partial<UserData>, atual.uid);
      const emMAS = atual.destino === "MAS";
      valorCreditado = emMAS ? atual.valorBRL / Math.max(0.01, cotacaoMAS) : atual.valorBRL;
      const historico: Transacao[] = [
        {
          t: "Depósito manual · Aprovado",
          v: valorCreditado,
          d: `Pedido ${atual.id.slice(0, 8)}`,
          ts: agora,
          moeda: (emMAS ? "MAS" : "BRL") as "MAS" | "BRL",
        },
        ...u.historico,
      ].slice(0, 60);
      tx.set(uRef, sanitize({
        ...u,
        saldo: u.saldo + (emMAS ? valorCreditado : 0),
        brl: u.brl + (emMAS ? 0 : valorCreditado),
        historico,
        adminRev: (u.adminRev || 0) + 1,
        atualizadoEm: agora,
      }));
    }
    tx.update(pRef, {
      status: "aprovado",
      atualizadoEm: agora,
      processadoPor: adminEmail,
      valorCreditado,
    });
  });
  window.dispatchEvent(new Event("balanceUpdate"));
}

/** Admin recusa: depósito é cancelado; saque é integralmente estornado em BRL. */
export async function recusarPagamento(
  pedido: PagamentoManual,
  adminEmail: string,
  motivo: string,
) {
  await runTransaction(db, async (tx) => {
    const pRef = doc(db, COLECAO_PAGAMENTOS, pedido.id);
    const pSnap = await tx.get(pRef);
    if (!pSnap.exists()) throw new Error("Solicitação não encontrada");
    const atual = pSnap.data() as PagamentoManual;
    if (atual.status !== "pendente") throw new Error("Solicitação já processada");

    const agora = Date.now();
    if (atual.tipo === "saque") {
      const uRef = usuarioRef(atual.uid);
      const uSnap = await tx.get(uRef);
      if (!uSnap.exists()) throw new Error("Conta do usuário não encontrada");
      const u = normalizar(uSnap.data() as Partial<UserData>, atual.uid);
      const historico: Transacao[] = [
        {
          t: "Saque PIX · Estorno",
          v: atual.valorBRL,
          d: motivo || "Solicitação recusada pela administração",
          ts: agora,
          moeda: "BRL" as const,
        },
        ...u.historico,
      ].slice(0, 60);
      tx.set(uRef, sanitize({
        ...u,
        brl: u.brl + atual.valorBRL,
        historico,
        adminRev: (u.adminRev || 0) + 1,
        atualizadoEm: agora,
      }));
    }
    tx.update(pRef, {
      status: "recusado",
      atualizadoEm: agora,
      processadoPor: adminEmail,
      motivoRecusa: motivo || "Não informado",
    });
  });
  window.dispatchEvent(new Event("balanceUpdate"));
}