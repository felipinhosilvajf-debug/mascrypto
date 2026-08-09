import { useCallback, useEffect, useState } from "react";
import { Backpack, Box, Cat, Glasses, HardHat, MonitorCog, Shirt, Sparkles, Send, MessageSquare } from "lucide-react";
import { doc, onSnapshot, setDoc, deleteDoc, collection, addDoc, query, limit, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { AVATARES, SLOTS, STATUS_QUARTO, TEMAS } from "../lib/types";
import { fmtHS, fmtMAS, nivelPorXp, patente, progressoNivel } from "../lib/economia";
import { ArteItem, Barra, Botao, Card, Input, Modal, Selo } from "./UI";
import { cn } from "../utils/cn";

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

interface JogadorOnline {
  uid: string;
  nome: string;
  avatar: string;
  avatarPos: { x: number; y: number };
  equipados: Record<string, string>;
  lastMsg: string;
  lastMsgTs: number;
  status: string;
  nivel: number;
  corPatente: string;
}

interface MensagemChat {
  id: string;
  uid: string;
  nome: string;
  avatar: string;
  texto: string;
  nivel: number;
  badge: string;
  corPatente: string;
  ts: number;
}

function iso(x: number, y: number) {
  return {
    left: `calc(${CENTRO_X}% + ${(x - y) * (TILE_W / 2)}px)`,
    top: `${CENTRO_Y + (x + y) * (TILE_H / 2)}px`,
  };
}

export default function VirtualRoomView() {
  const {
    user,
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
  const [abaLateral, setAbaLateral] = useState<"rpg" | "decoracao" | "chat">("rpg");

  // Multiplayer states
  const [jogadores, setJogadores] = useState<JogadorOnline[]>([]);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [textoChat, setTextoChat] = useState("");
  const [enviandoChat, setEnviandoChat] = useState(false);

  const nivel = data ? nivelPorXp(data.xp) : 1;
  const pat = patente(nivel);
  const prog = data ? progressoNivel(data.xp) : { atual: 0, necessario: 100, pct: 0 };
  const tema = data ? TEMAS.find((t) => t.id === data.tema) || TEMAS[0] : TEMAS[0];

  const decorativos = cfg.itens.filter((i) => data?.itens.includes(i.id) && (i.decorativo || i.categoria === "movel"));
  const naoPosicionados = data ? decorativos.filter((i) => !data.quarto[i.id]) : [];

  /* ── Presença e Sincronização Multiplayer Isométrica ── */
  useEffect(() => {
    if (!user || !data) return;
    const pRef = doc(db, "online_room", user.uid);

    const registrarPresenca = async (pos = data.avatarPos, msg = "", msgTs = 0) => {
      try {
        await setDoc(pRef, {
          uid: user.uid,
          nome: data.nome,
          avatar: data.avatar,
          avatarPos: pos,
          equipados: data.equipados || {},
          lastMsg: msg,
          lastMsgTs: msgTs,
          status: data.status,
          nivel: nivelPorXp(data.xp),
          corPatente: patente(nivelPorXp(data.xp)).cor,
        } as JogadorOnline);
      } catch {
        /* silencia offline */
      }
    };

    registrarPresenca();

    // Mantém atualizado se o usuário mudar de avatar ou de roupas
    registrarPresenca(data.avatarPos, data.lastMsg || "", data.lastMsgTs || 0);

    return () => {
      deleteDoc(pRef).catch(() => {});
    };
  }, [user, data?.nome, data?.avatar, data?.equipados, data?.status, data?.xp, data?.avatarPos]); // eslint-disable-line

  /* ── Escuta outros jogadores no quarto/praça ── */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "online_room"), (snap) => {
      const lista: JogadorOnline[] = snap.docs.map((d) => d.data() as JogadorOnline);
      setJogadores(lista);
    });
    return unsub;
  }, []);

  /* ── Escuta o Chat Global ── */
  useEffect(() => {
    const q = query(collection(db, "chat_global"), orderBy("ts", "desc"), limit(40));
    const unsub = onSnapshot(q, (snap) => {
      const lista: MensagemChat[] = snap.docs.map((d) => d.data() as MensagemChat);
      setMensagens(lista.reverse());
    });
    return unsub;
  }, []);

  const moverAvatar = useCallback(
    async (x: number, y: number) => {
      if (!data || !user) return;
      const nx = Math.max(0, Math.min(COLS - 1, x));
      const ny = Math.max(0, Math.min(ROWS - 1, y));

      // Colisão: impede de andar por cima de móveis já posicionados
      const ocupado = Object.entries(data.quarto).some(([, p]) => p.x === nx && p.y === ny);
      if (ocupado) return;

      atualizar((d) => ({ ...d, avatarPos: { x: nx, y: ny } }));
    },
    [atualizar, data, user],
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

  if (!data || !user) return null;

  const enviarChat = async () => {
    if (!textoChat.trim() || enviandoChat) return;
    setEnviandoChat(true);
    const texto = textoChat.trim();
    try {
      // 1. Envia para o chat global de rolagem
      await addDoc(collection(db, "chat_global"), {
        uid: user.uid,
        nome: data.nome,
        avatar: data.avatar,
        texto,
        nivel,
        badge: pat.emoji + " " + pat.nome,
        corPatente: pat.cor,
        ts: Date.now(),
      } as MensagemChat);

      // 2. Atualiza a mensagem na cabeça do personagem (multiplayer bubble)
      const pRef = doc(db, "online_room", user.uid);
      await setDoc(pRef, {
        uid: user.uid,
        nome: data.nome,
        avatar: data.avatar,
        avatarPos: data.avatarPos,
        equipados: data.equipados || {},
        lastMsg: texto,
        lastMsgTs: Date.now(),
        status: data.status,
        nivel,
        corPatente: pat.cor,
      } as JogadorOnline);

      setTextoChat("");
    } catch {
      toast("Falha ao enviar mensagem", "erro");
    } finally {
      setEnviandoChat(false);
    }
  };

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
        <div className="flex gap-2">
          <Selo tom="verde">● {jogadores.length} Online</Selo>
          <Botao variante="ghost" onClick={() => setEditar(true)}>Personalizar</Botao>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* ---------------- AMBIENTE ISOMÉTRICO MULTIPLAYER ---------------- */}
        <Card className="overflow-hidden p-0">
          <div className={`relative h-[530px] overflow-hidden bg-gradient-to-b ${tema.classe}`}>
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

              {/* OUTROS JOGADORES ONLINE (Isométrico em Tempo Real) */}
              {jogadores
                .filter((p) => p.uid !== user.uid)
                .map((p) => {
                  const itemChapeu = cfg.itens.find((i) => i.id === p.equipados?.chapeu);
                  const itemPet = cfg.itens.find((i) => i.id === p.equipados?.pet);
                  const mostraBubble = p.lastMsg && Date.now() - p.lastMsgTs < 6000;

                  return (
                    <div
                      key={p.uid}
                      className="pointer-events-none absolute z-25 flex -translate-x-1/2 -translate-y-10 flex-col items-center transition-all duration-300 ease-out"
                      style={iso(p.avatarPos.x, p.avatarPos.y)}
                    >
                      {/* Balão de fala */}
                      {mostraBubble && (
                        <div className="absolute -top-16 mb-2 max-w-[140px] animate-[winBurst_0.3s_ease-out] rounded-xl bg-white px-2.5 py-1 text-[11px] font-bold text-slate-900 shadow-xl after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-white">
                          <p className="line-clamp-3 leading-tight">{p.lastMsg}</p>
                        </div>
                      )}
                      <div className="relative text-5xl drop-shadow-[0_12px_8px_rgba(0,0,0,.8)]">
                        {p.avatar}
                        {itemChapeu && <span className="absolute -right-3 -top-3 text-xl">{itemChapeu.emoji}</span>}
                        {itemPet && <span className="absolute -right-7 bottom-0 text-2xl">{itemPet.emoji}</span>}
                      </div>
                      <p className="rounded-full bg-black/65 px-2 py-0.5 text-[8px] font-black text-white">
                        {p.nome} · Nv {p.nivel}
                      </p>
                      <span className="mt-1 h-1.5 w-8 rounded-full bg-black/30 blur-[1px]" />
                    </div>
                  );
                })}

              {/* O PROPRIO AVATAR */}
              <div
                className="pointer-events-none absolute z-30 flex -translate-x-1/2 -translate-y-10 flex-col items-center transition-all duration-200 ease-out"
                style={iso(data.avatarPos.x, data.avatarPos.y)}
              >
                {/* Balão do próprio chat */}
                {data.lastMsg && Date.now() - (data.lastMsgTs || 0) < 6000 && (
                  <div className="absolute -top-16 mb-2 max-w-[140px] animate-[winBurst_0.3s_ease-out] rounded-xl bg-fuchsia-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-fuchsia-600">
                    <p className="line-clamp-3 leading-tight">{data.lastMsg}</p>
                  </div>
                )}
                <div className="relative text-5xl drop-shadow-[0_12px_8px_rgba(0,0,0,.9)]">
                  {data.avatar}
                  {data.equipados.chapeu && <span className="absolute -right-3 -top-3 text-xl">{cfg.itens.find((i) => i.id === data.equipados.chapeu)?.emoji}</span>}
                  {data.equipados.pet && <span className="absolute -right-7 bottom-0 text-2xl">{cfg.itens.find((i) => i.id === data.equipados.pet)?.emoji}</span>}
                </div>
                <p className="rounded-full bg-fuchsia-600 px-2.5 py-0.5 text-[9px] font-black text-white shadow-[0_0_15px_rgba(217,70,239,0.5)]">
                  {data.nome} (Você)
                </p>
                <span className="mt-1 h-2 w-10 rounded-full bg-black/40 blur-[2px]" />
              </div>
            </div>

            <div className="absolute bottom-3 left-3 rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-[10px] text-slate-300 backdrop-blur">
              {sel ? "Selecione um tile livre para posicionar o móvel" : "Clique no piso para andar · use o chat para falar em tempo real"}
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

        {/* ---------------- PAINEL SOCIAL E EQUIPAMENTOS RPG ---------------- */}
        <div className="space-y-3">
          <div className="flex rounded-xl bg-white/5 p-1">
            {(["rpg", "decoracao", "chat"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAbaLateral(a)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-black transition",
                  abaLateral === a ? "bg-fuchsia-600/30 text-white" : "text-slate-500"
                )}
              >
                {a === "rpg" ? "RPG" : a === "decoracao" ? "Mochila" : "Chat Geral"}
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
          ) : abaLateral === "decoracao" ? (
            <Card className="p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Equipamentos e Acessórios</p>
              <div className="max-h-[350px] space-y-2 overflow-y-auto pr-1">
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
          ) : (
            /* ── CHAT EM TEMPO REAL ── */
            <Card className="p-4 flex flex-col h-[420px]">
              <div className="flex items-center gap-1.5 mb-3 border-b border-white/5 pb-2">
                <MessageSquare className="h-4 w-4 text-fuchsia-400" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Chat Geral MAS</h4>
              </div>
              
              {/* Lista de mensagens */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-xs mb-3 scrollbar-thin">
                {mensagens.length === 0 ? (
                  <p className="text-slate-500 text-center py-10">Envie a primeira mensagem! 🌌</p>
                ) : (
                  mensagens.map((m) => (
                    <div key={m.id} className="flex items-start gap-2">
                      <span className="text-xl shrink-0">{m.avatar}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-1.5">
                          <span className="font-bold text-white text-[11px] truncate">{m.nome}</span>
                          <span className={cn("text-[9px] font-black uppercase rounded bg-white/5 px-1", m.corPatente)}>
                            {m.badge} · Nv {m.nivel}
                          </span>
                        </div>
                        <p className="text-slate-300 mt-0.5 break-words bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.04]">
                          {m.texto}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input de envio */}
              <div className="flex gap-1.5 mt-auto">
                <Input
                  placeholder="Escreva no chat..."
                  value={textoChat}
                  onChange={(e) => setTextoChat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarChat()}
                  maxLength={120}
                  className="py-1.5 text-xs flex-1"
                />
                <button
                  onClick={enviarChat}
                  disabled={!textoChat.trim() || enviandoChat}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-500 transition-all active:scale-95 disabled:opacity-40 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
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
