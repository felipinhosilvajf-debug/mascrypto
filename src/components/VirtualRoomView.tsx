/**
 * Quarto Virtual 3D Isométrico
 * ─────────────────────────────
 * • Perspectiva isométrica real (piso em grid plano com perspectiva 3-D)
 * • Móveis decorativos encaixam em tiles do piso
 * • Slots de Hardware (GPU/periféricos) separados do menu RPG
 * • Menu RPG = apenas roupas, chapéus, acessórios vestíveis e pets
 * • Chat privado e temporário (sala = uid do dono; expira 5 min)
 * • Presença multiplayer sincronizada via Firestore online_room
 */
import { useCallback, useEffect, useState, useRef } from "react";
import { Backpack, Box, Cat, Glasses, HardHat, MonitorCog, Shirt, Sparkles, Send, Cpu, PlusCircle } from "lucide-react";
import { doc, onSnapshot, setDoc, deleteDoc, collection, addDoc, query, limit, orderBy, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { SLOTS_RPG, STATUS_QUARTO, TEMAS, normalizar, type UserData } from "../lib/types";
import { fmtHS, fmtMAS, nivelPorXp, patente, progressoNivel } from "../lib/economia";
import { ArteItem, AvatarVisual, Barra, Botao, Card, Input, Modal, Selo } from "./UI";
import { cn } from "../utils/cn";
import { sanitize } from "../lib/sanitize";

/* ─── Constantes do grid isométrico ─── */
const COLS = 8;
const ROWS = 6;

/** Converte coluna+linha para posição CSS em perspectiva isométrica. */
function iso(x: number, y: number): { left: string; top: string } {
  const TW = 72; // tile width
  const TH = 38; // tile height (≈TW*0.53)
  const OX = 50; // % de offset horizontal
  const OY = 80; // px de offset vertical topo
  return {
    left: `calc(${OX}% + ${(x - y) * (TW / 2)}px)`,
    top:  `${OY + (x + y) * (TH / 2)}px`,
  };
}

interface JogadorOnline {
  uid: string;
  nome: string;
  avatar: string;
  avatarImg?: string;
  avatarPos: { x: number; y: number };
  equipados: Record<string, string>;
  lastMsg: string;
  lastMsgTs: number;
  status: string;
  nivel: number;
}

interface MsgQuarto {
  uid: string;
  nome: string;
  avatar: string;
  texto: string;
  ts: number;
}

const SLOT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chapeu: HardHat, oculos: Glasses, camisa: Shirt, calca: Sparkles, sapato: Box, pet: Cat,
  gpu: MonitorCog, periferico: Cpu,
};

/** TTL das mensagens do chat local (5 minutos). */
const CHAT_TTL_MS = 5 * 60 * 1000;

export default function VirtualRoomView({
  hostId,
  onSair,
}: {
  /** UID do dono do quarto. Se ausente ou igual ao usuário → Modo Anfitrião. */
  hostId?: string;
  /** Callback para voltar (exibido apenas no Modo Visitante). */
  onSair?: () => void;
} = {}) {
  const {
    user, data, atualizar, posicionarNoQuarto, removerDoQuarto,
    equipar, desequipar, hashrate, detalheHash, mover, toast,
  } = useApp();
  const { cfg } = useConfig();

  const [sel, setSel] = useState<string | null>(null);
  const [editar, setEditar] = useState(false);
  const [nomeEdit, setNomeEdit] = useState(data?.nome || "");
  const [abaLateral, setAbaLateral] = useState<"rpg" | "hardware" | "decoracao">("rpg");
  const [jogadores, setJogadores] = useState<JogadorOnline[]>([]);
  const [msgs, setMsgs] = useState<MsgQuarto[]>([]);
  const [textoChat, setTextoChat] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [anfitriao, setAnfitriao] = useState<UserData | null>(null);
  const [posVisitante, setPosVisitante] = useState({ x: 1, y: 1 });
  const fimChat = useRef<HTMLDivElement>(null);

  /* ─── MODO: Anfitrião (próprio quarto) vs. Visitante (quarto de outro) ─── */
  const ehVisitante = !!hostId && hostId !== user?.uid;
  /** UID do dono da sala (host). No modo anfitrião é o próprio usuário. */
  const donoId = ehVisitante ? hostId! : user?.uid || "";
  /** Sala do chat local = uid do dono do quarto. */
  const salaId = donoId;
  /** Posição do avatar controlado: local no modo visitante, persistida no anfitrião. */
  const minhaPos = ehVisitante ? posVisitante : data?.avatarPos ?? { x: 4, y: 3 };

  // ── Carrega o estado do quarto do anfitrião (modo visitante) ──
  useEffect(() => {
    if (!ehVisitante || !hostId) { setAnfitriao(null); return; }
    const unsub = onSnapshot(
      doc(db, "users", hostId),
      (snap) => { if (snap.exists()) setAnfitriao(normalizar(snap.data() as Partial<UserData>, hostId)); },
      () => {},
    );
    return unsub;
  }, [ehVisitante, hostId]);

  // ── Presença multiplayer: publica em qual sala o jogador está ──
  useEffect(() => {
    if (!user || !data || !donoId) return;
    const pRef = doc(db, "online_room", user.uid);
    const registrar = async () => {
      try {
        await setDoc(pRef, sanitize({
          uid: user.uid, nome: data.nome, avatar: data.avatar, avatarImg: data.avatarImg || "",
          avatarPos: minhaPos, equipados: data.equipados || {},
          lastMsg: "", lastMsgTs: 0, status: data.status,
          nivel: nivelPorXp(data.xp),
          sala: donoId,
        } as JogadorOnline));
      } catch { /* offline */ }
    };
    registrar();
    return () => { deleteDoc(pRef).catch(() => {}); };
  }, [user, donoId, data?.nome, data?.avatar, data?.equipados, data?.status, data?.xp, minhaPos.x, minhaPos.y]); // eslint-disable-line

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "online_room"),
      (snap) => setJogadores(snap.docs.map((d) => d.data() as JogadorOnline)),
      () => {}
    );
    return unsub;
  }, []);

  // ── Chat local temporário (TTL 5 min) ──
  useEffect(() => {
    if (!salaId) return;
    const q = query(
      collection(db, "chat_quarto"),
      where("sala", "==", salaId),
      orderBy("ts", "desc"),
      limit(40),
    );
    const filtrar = (docs: MsgQuarto[]) => {
      const agora = Date.now();
      return docs.filter((m) => agora - m.ts < CHAT_TTL_MS).reverse();
    };
    const unsub = onSnapshot(q,
      (snap) => {
        const brutos = snap.docs.map((d) => d.data() as MsgQuarto);
        setMsgs(filtrar(brutos));
        setTimeout(() => fimChat.current?.scrollIntoView({ behavior: "smooth" }), 60);
        // Expurga do banco as mensagens vencidas desta sala
        const agora = Date.now();
        snap.docs
          .filter((d) => agora - (d.data() as MsgQuarto).ts >= CHAT_TTL_MS)
          .forEach((d) => deleteDoc(d.ref).catch(() => {}));
      },
      () => {}
    );
    return unsub;
  }, [salaId]);

  /* Varredura periódica: remove da tela mensagens que passaram do TTL. */
  useEffect(() => {
    const i = setInterval(() => {
      const agora = Date.now();
      setMsgs((atual) => atual.filter((m) => agora - m.ts < CHAT_TTL_MS));
    }, 15000);
    return () => clearInterval(i);
  }, []);

  // ── Movimento (anfitrião persiste no banco; visitante move localmente) ──
  const moverAvatar = useCallback(
    (x: number, y: number) => {
      const fonte = ehVisitante ? anfitriao : data;
      if (!fonte) return;
      const nx = Math.max(0, Math.min(COLS - 1, x));
      const ny = Math.max(0, Math.min(ROWS - 1, y));
      // colisão com os móveis do quarto que está sendo exibido
      const ocupado = Object.values(fonte.quarto || {}).some((p) => p.x === nx && p.y === ny);
      if (ocupado) return;
      if (ehVisitante) setPosVisitante({ x: nx, y: ny });
      else atualizar((d) => ({ ...d, avatarPos: { x: nx, y: ny } }));
    },
    [atualizar, data, ehVisitante, anfitriao],
  );

  useEffect(() => {
    if (!data) return;
    const h = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      const { x, y } = ehVisitante ? posVisitante : data.avatarPos;
      if (["ArrowUp",    "w","W"].includes(e.key)) moverAvatar(x,     y - 1);
      else if (["ArrowDown", "s","S"].includes(e.key)) moverAvatar(x,     y + 1);
      else if (["ArrowLeft", "a","A"].includes(e.key)) moverAvatar(x - 1, y    );
      else if (["ArrowRight","d","D"].includes(e.key)) moverAvatar(x + 1, y    );
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [data, moverAvatar, ehVisitante, posVisitante]);

  if (!data || !user) return null;
  /* No modo visitante aguardamos carregar o quarto do anfitrião. */
  if (ehVisitante && !anfitriao)
    return (
      <Card className="py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-fuchsia-500/30 border-t-fuchsia-500" />
        <p className="mt-3 text-sm text-slate-400">Entrando no quarto…</p>
      </Card>
    );

  /** Fonte de verdade visual do quarto (anfitrião quando visitando). */
  const sala = (ehVisitante ? anfitriao! : data);

  const nivel = nivelPorXp(data.xp);
  const pat = patente(nivel);
  const prog = progressoNivel(data.xp);
  const tema = TEMAS.find((t) => t.id === sala.tema) || TEMAS[0];

  // itens decorativos do inventário (apenas anfitrião edita)
  const decorativos = cfg.itens.filter((i) => data.itens.includes(i.id) && (i.decorativo || i.categoria === "movel"));
  const naoPosicionados = decorativos.filter((i) => !data.quarto[i.id]);

  // hardware posicionável em slots (geram H/s)
  const hardwareDisponivel = cfg.itens.filter(
    (i) => data.itens.includes(i.id) && (i.categoria === "gpu" || i.categoria === "periferico")
  );

  const slotsOcupados = Object.keys(data.slotsHardware || {}).length;
  const limiteSlots = Math.min(
    data.capacidadeSlotsHardware || 4,
    cfg.limiteSlotHardwareGlobal || 16,
  );
  const custoSlot = cfg.custoSlotHardware || 5000;

  const enviarChat = async () => {
    const t = textoChat.trim();
    if (!t || enviando) return;
    const reqChat = cfg.requisitosNivel?.chatQuarto || 1;
    if (nivelPorXp(data.xp) < reqChat) return toast(`Chat do quarto exige nível ${reqChat}`, "erro");
    setEnviando(true);
    try {
      await addDoc(collection(db, "chat_quarto"), {
        uid: user.uid, nome: data.nome, avatar: data.avatar,
        texto: t.slice(0, 200), sala: salaId, ts: Date.now(),
      });
      // Atualiza o balão sobre a cabeça do avatar por 5 segundos
      await setDoc(doc(db, "online_room", user.uid), sanitize({
        uid: user.uid,
        nome: data.nome,
        avatar: data.avatar,
        avatarImg: data.avatarImg || "",
        avatarPos: minhaPos,
        equipados: data.equipados || {},
        lastMsg: t.slice(0, 120),
        lastMsgTs: Date.now(),
        status: data.status,
        nivel: nivelPorXp(data.xp),
        sala: donoId,
      } as JogadorOnline));
      atualizar((d) => ({ ...d, lastMsg: t.slice(0, 120), lastMsgTs: Date.now() }));
      setTextoChat("");
    } catch { toast("Falha ao enviar mensagem", "erro"); }
    finally { setEnviando(false); }
  };

  const clicarTile = (x: number, y: number) => {
    // Visitantes só andam — móveis são estáticos (sem permissão de edição)
    if (ehVisitante) { moverAvatar(x, y); return; }
    const itemAqui = Object.entries(data.quarto).find(([, p]) => p.x === x && p.y === y);
    if (sel && !itemAqui) { posicionarNoQuarto(sel, x, y); setSel(null); return; }
    moverAvatar(x, y);
  };

  const adicionarSlotHardware = () => {
    const reqSlot = cfg.requisitosNivel?.comprarSlotHardware || 1;
    if (nivelPorXp(data.xp) < reqSlot) return toast(`Comprar slots exige nível ${reqSlot}`, "erro");
    if (slotsOcupados >= limiteSlots && limiteSlots > 0) {
      if (limiteSlots >= (cfg.limiteSlotHardwareGlobal || 16))
        return toast(`Limite global de ${cfg.limiteSlotHardwareGlobal} slots atingido`, "erro");
    }
    if (data.capacidadeSlotsHardware >= limiteSlots) {
      if (!mover({ mas: -custoSlot, titulo: "Compra de slot", detalhe: `+1 slot de hardware` }))
        return;
      atualizar((d) => ({ ...d, capacidadeSlotsHardware: (d.capacidadeSlotsHardware || 4) + 1 }));
      toast(`Slot de hardware desbloqueado por ${fmtMAS(custoSlot)} ✅`, "ok");
    }
  };

  const equiparHardware = (itemId: string) => {
    if (slotsOcupados >= (data.capacidadeSlotsHardware || 4))
      return toast(`Sem slots livres — compre mais (${fmtMAS(custoSlot)} por slot)`, "erro");
    atualizar((d) => ({
      ...d,
      slotsHardware: { ...d.slotsHardware, [itemId]: slotsOcupados },
    }));
    toast("Hardware instalado no quarto", "ok");
  };

  const removerHardware = (itemId: string) => {
    atualizar((d) => {
      const sh = { ...d.slotsHardware };
      delete sh[itemId];
      return { ...d, slotsHardware: sh };
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Cabeçalho: Nome // Status ── */}
      <Card glow className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[conic-gradient(from_180deg,rgba(217,70,239,.5),rgba(56,189,248,.4),rgba(217,70,239,.5))] text-4xl shadow-[0_0_25px_-8px_rgba(217,70,239,.9)]">
            <AvatarVisual avatar={sala.avatar} imagem={sala.avatarImg} className="h-12 w-12" emojiClassName="text-4xl" />
            <span className="absolute -bottom-1.5 -right-1.5 rounded-lg bg-slate-950 px-1.5 py-0.5 text-[10px] font-black text-fuchsia-300 ring-1 ring-fuchsia-500/40">
              Nv {nivelPorXp(sala.xp)}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-white sm:text-2xl">
              {ehVisitante ? `Quarto de ${sala.nome}` : sala.nome} <span className="text-slate-600">//</span>{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">{sala.status}</span>
            </h2>
            <p className={`text-xs font-bold ${pat.cor}`}>
              {ehVisitante
                ? "👋 Modo visitante · móveis são somente leitura"
                : `${pat.emoji} ${pat.nome} · WASD/setas para andar · você é o anfitrião`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Selo tom={ehVisitante ? "ciano" : "verde"}>
            {ehVisitante ? "👀 Visitante" : "🏠 Anfitrião"}
          </Selo>
          <Selo tom="verde">
            ● {jogadores.filter((j) => (j as any).sala === donoId).length} na sala
          </Selo>
          {ehVisitante ? (
            <Botao variante="ghost" onClick={onSair}>← Sair do quarto</Botao>
          ) : (
            <Botao variante="ghost" onClick={() => setEditar(true)}>Personalizar</Botao>
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* ── QUARTO ISOMÉTRICO ── */}
        <Card className="overflow-hidden p-0">
          <div className={`relative overflow-hidden bg-gradient-to-b ${tema.classe}`}
               style={{ height: `${80 + (COLS + ROWS) * 20}px`, minHeight: "440px" }}>
            {/* Luz ambiente */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_10%,rgba(255,255,255,.13),transparent_60%)]" />
            {/* "Parede" do fundo */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 border-b border-white/10 bg-black/25 [clip-path:polygon(0_0,100%_0,88%_100%,12%_100%)]" />

            {/* Prateleiras de items equipados no topo (do dono da sala) */}
            <div className="absolute left-1/2 top-4 flex -translate-x-1/2 gap-2">
              {SLOTS_RPG.slice(0, 5).map((s) => {
                const it = cfg.itens.find((i) => i.id === sala.equipados[s.id]);
                return (
                  <div key={s.id}
                    className="flex h-12 w-12 flex-col items-center justify-center border-b-4 border-fuchsia-950/70 bg-black/30 shadow-[0_8px_16px_-6px_rgba(0,0,0,.8)]">
                    {it
                      ? <ArteItem emoji={it.emoji} imagem={it.imagem} tamanho="text-2xl" className="h-7 w-7" />
                      : <span className="text-[8px] text-white/20">{s.nome}</span>}
                  </div>
                );
              })}
            </div>

            {/* GRID ISOMÉTRICO ─ piso plano */}
            <div className="absolute inset-0 overflow-hidden" style={{ top: "60px" }}>
              {Array.from({ length: COLS * ROWS }, (_, idx) => {
                const x = idx % COLS;
                const y = Math.floor(idx / COLS);
                const item = Object.entries(sala.quarto).find(([, p]) => p.x === x && p.y === y);
                return (
                  <button
                    key={idx}
                    onClick={() => clicarTile(x, y)}
                    aria-label={`Tile ${x},${y}`}
                    className={cn(
                      /* tile isométrico: lozenge rotacionado */
                      "absolute w-[72px] h-[38px] -translate-x-1/2 -translate-y-1/2",
                      "border transition-all duration-150",
                      "[clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]",
                      sel && !item && !ehVisitante
                        ? "border-fuchsia-300/70 bg-fuchsia-500/25 hover:bg-fuchsia-400/40"
                        : "border-white/[0.15] bg-slate-800/50 hover:bg-cyan-500/20",
                    )}
                    style={{ ...iso(x, y) }}
                  />
                );
              })}

              {/* Móveis do quarto (estáticos para visitantes) */}
              {Object.entries(sala.quarto).map(([id, p]) => {
                const it = cfg.itens.find((i) => i.id === id);
                if (!it) return null;
                const pos = iso(p.x, p.y);
                return (
                  <button
                    key={id}
                    onClick={() => { if (!ehVisitante) removerDoQuarto(id); }}
                    disabled={ehVisitante}
                    title={ehVisitante ? it.nome : `${it.nome} · clique para guardar`}
                    className={cn(
                      "absolute z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-full items-end justify-center text-4xl drop-shadow-[0_14px_8px_rgba(0,0,0,.85)] transition",
                      !ehVisitante && "hover:-translate-y-[110%] hover:scale-110",
                      ehVisitante && "cursor-default",
                    )}
                    style={pos}
                  >
                    <ArteItem emoji={it.emoji} imagem={it.imagem} tamanho="text-4xl" className="h-12 w-12" />
                  </button>
                );
              })}

              {/* Outros jogadores presentes NESTA sala */}
              {jogadores.filter((j) => j.uid !== user.uid && (j as any).sala === donoId).map((j) => {
                const pos = iso(j.avatarPos.x, j.avatarPos.y);
                const mostra = j.lastMsg && Date.now() - j.lastMsgTs < 6000;
                const chapItem = cfg.itens.find((i) => i.id === j.equipados?.chapeu);
                return (
                  <div key={j.uid}
                    className="pointer-events-none absolute z-25 flex -translate-x-1/2 -translate-y-full flex-col items-center transition-all duration-300 ease-out"
                    style={pos}>
                    {mostra && (
                      <div className="absolute -top-12 mb-1 max-w-[120px] rounded-xl bg-white px-2 py-1 text-[11px] font-bold text-slate-900 shadow-lg after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-white">
                        <p className="line-clamp-2">{j.lastMsg}</p>
                      </div>
                    )}
                    <div className="relative text-4xl drop-shadow-[0_10px_6px_rgba(0,0,0,.8)]">
                      <AvatarVisual avatar={j.avatar} imagem={j.avatarImg} className="h-10 w-10" emojiClassName="text-4xl" />
                      {chapItem && <span className="absolute -right-2 -top-2 text-base">{chapItem.emoji}</span>}
                    </div>
                    <p className="rounded-full bg-black/65 px-2 py-0.5 text-[8px] font-black text-white">{j.nome}</p>
                    <span className="mt-0.5 h-1.5 w-8 rounded-full bg-black/30 blur-[1px]" />
                  </div>
                );
              })}

              {/* Avatar do usuário */}
              <div
                className="pointer-events-none absolute z-30 flex -translate-x-1/2 -translate-y-full flex-col items-center transition-all duration-200 ease-out"
                style={iso(minhaPos.x, minhaPos.y)}>
                {data.lastMsg && Date.now() - (data.lastMsgTs || 0) < 6000 && (
                  <div className="absolute -top-12 mb-1 max-w-[120px] rounded-xl bg-fuchsia-600 px-2 py-1 text-[11px] font-bold text-white shadow-lg after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-fuchsia-600">
                    <p className="line-clamp-2">{data.lastMsg}</p>
                  </div>
                )}
                <div className="relative text-4xl drop-shadow-[0_10px_8px_rgba(0,0,0,.9)]">
                  <AvatarVisual avatar={data.avatar} imagem={data.avatarImg} className="h-10 w-10" emojiClassName="text-4xl" />
                  {data.equipados.chapeu && <span className="absolute -right-2 -top-2 text-base">{cfg.itens.find((i) => i.id === data.equipados.chapeu)?.emoji}</span>}
                  {data.equipados.pet && <span className="absolute -right-6 bottom-0 text-xl">{cfg.itens.find((i) => i.id === data.equipados.pet)?.emoji}</span>}
                </div>
                <p className="rounded-full bg-fuchsia-600 px-2.5 py-0.5 text-[9px] font-black text-white shadow-[0_0_14px_rgba(217,70,239,.5)]">{data.nome}</p>
                <span className="mt-0.5 h-2 w-10 rounded-full bg-black/40 blur-[2px]" />
              </div>
            </div>

            <div className="absolute bottom-3 left-3 rounded-xl border border-white/10 bg-black/55 px-3 py-1.5 text-[10px] text-slate-300 backdrop-blur">
              {ehVisitante
                ? "👀 Visitante · você pode andar e conversar, mas não editar o quarto"
                : sel
                  ? "Clique num tile livre para posicionar"
                  : "WASD/setas para mover · clique no tile para andar"}
            </div>
          </div>

          {/* Inventário decorativo — somente o anfitrião edita */}
          {!ehVisitante && (
            <div className="border-t border-white/10 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Móveis ({naoPosicionados.length} na mochila)
                </p>
                {sel && <button onClick={() => setSel(null)} className="text-[10px] font-bold text-rose-300">✕ cancelar</button>}
              </div>
              <div className="flex flex-wrap gap-2">
                {naoPosicionados.length === 0 && <p className="text-xs text-slate-500">Todos os móveis estão posicionados.</p>}
                {naoPosicionados.map((i) => (
                  <button key={i.id} onClick={() => setSel(sel === i.id ? null : i.id)} title={i.nome}
                    className={cn("flex h-12 w-12 items-center justify-center rounded-xl border transition",
                      sel === i.id ? "scale-110 border-fuchsia-400 bg-fuchsia-500/25" : "border-white/10 bg-white/5 hover:border-fuchsia-400/50")}>
                    <ArteItem emoji={i.emoji} imagem={i.imagem} tamanho="text-2xl" className="h-7 w-7" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat privado temporário */}
          <div className="border-t border-white/10 px-4 pb-4 pt-3">
            <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-fuchsia-300/70">
              <span>💬</span> Chat do quarto · mensagens expiram em 5 min
            </p>
            <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
              {msgs.map((m, i) => (
                <div key={i} className={cn("flex gap-1.5", m.uid === user.uid && "flex-row-reverse")}>
                  <span className="shrink-0 text-xl">{m.avatar}</span>
                  <div className={cn("max-w-[75%] rounded-xl px-2.5 py-1 text-[11px]",
                    m.uid === user.uid ? "bg-fuchsia-600/30 text-fuchsia-50" : "bg-white/[0.07] text-slate-200")}>
                    <b className="block text-[9px] font-black uppercase text-slate-400">{m.uid === user.uid ? "Você" : m.nome}</b>
                    <span className="line-clamp-3 break-words">{m.texto}</span>
                  </div>
                </div>
              ))}
              <div ref={fimChat} />
            </div>
            <div className="mt-2 flex gap-1.5">
              <Input placeholder="Falar no quarto..." value={textoChat} maxLength={200}
                onChange={(e) => setTextoChat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviarChat()}
                className="py-1.5 text-xs" />
              <button onClick={enviarChat} disabled={!textoChat.trim() || enviando}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-600 text-white transition hover:bg-fuchsia-500 active:scale-95 disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        {/* ── PAINEL LATERAL ── */}
        <div className="space-y-3">
          {ehVisitante && (
            <Card className="border-cyan-500/25 bg-cyan-500/[0.06] p-4">
              <p className="text-sm font-black text-white">👀 Você está visitando</p>
              <p className="mt-1 text-xs text-slate-400">
                Este é o quarto de <b className="text-cyan-300">{sala.nome}</b>. Os móveis e decorações
                pertencem ao anfitrião e não podem ser editados. Use o chat local para conversar com quem
                está na sala.
              </p>
              <Botao variante="ghost" className="mt-3 w-full" onClick={onSair}>
                ← Voltar ao meu quarto
              </Botao>
            </Card>
          )}

          {/* Abas separadas: RPG | Hardware | Decoração — apenas anfitrião */}
          {!ehVisitante && (
          <div className="flex gap-1 rounded-xl bg-white/5 p-1">
            {([
              ["rpg",       "Avatar RPG"],
              ["hardware",  "Hardware"],
              ["decoracao", "Mochila"],
            ] as const).map(([id, nome]) => (
              <button key={id} onClick={() => setAbaLateral(id)}
                className={cn("flex-1 rounded-lg py-2 text-[11px] font-black transition",
                  abaLateral === id ? "bg-fuchsia-600/35 text-white" : "text-slate-500 hover:text-white")}>
                {nome}
              </button>
            ))}
          </div>
          )}

          {/* ── ABA RPG (só roupas/acessórios/pets) ── */}
          {!ehVisitante && abaLateral === "rpg" && (
            <Card className="p-4">
              <div className="mb-4 text-center">
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-fuchsia-400/40 bg-[radial-gradient(circle,rgba(217,70,239,.2),transparent_70%)] text-5xl shadow-[0_0_30px_-10px_rgba(217,70,239,.8)]">
                  <AvatarVisual avatar={data.avatar} imagem={data.avatarImg} className="h-16 w-16" emojiClassName="text-5xl" />
                </div>
                <p className="mt-1 font-black text-white">{data.nome}</p>
                <p className={cn("text-[11px] font-bold", pat.cor)}>{pat.emoji} {pat.nome} · Nv {nivel}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SLOTS_RPG.map((s) => {
                  const it = cfg.itens.find((i) => i.id === data.equipados[s.id]);
                  const Icone = SLOT_ICONS[s.id] || Backpack;
                  return (
                    <div key={s.id}
                      className={cn("relative rounded-2xl border p-2.5",
                        it ? "border-fuchsia-400/35 bg-fuchsia-500/[0.08]" : "border-white/10 bg-black/20")}>
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/35">
                          {it
                            ? <ArteItem emoji={it.emoji} imagem={it.imagem} tamanho="text-xl" className="h-6 w-6" />
                            : <Icone className="h-4 w-4 text-slate-600" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-bold uppercase text-slate-500">{s.nome}</p>
                          <p className="truncate text-[11px] font-black text-white">{it?.nome || "Vazio"}</p>
                        </div>
                      </div>
                      {it && <button onClick={() => desequipar(s.id)} className="absolute right-1 top-1 text-[9px] text-rose-300">×</button>}
                    </div>
                  );
                })}
              </div>
              {/* Itens equipáveis (RPG) do inventário */}
              <div className="mt-3 max-h-[200px] space-y-1 overflow-y-auto">
                {cfg.itens.filter((i) => data.itens.includes(i.id) && SLOTS_RPG.some((s) => s.id === i.slot)).map((i) => {
                  const eq = Object.values(data.equipados).includes(i.id);
                  return (
                    <div key={i.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                      <ArteItem emoji={i.emoji} imagem={i.imagem} tamanho="text-xl" className="h-7 w-7" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold text-white">{i.nome}</p>
                        <p className="text-[9px] text-slate-500">{i.slot}</p>
                      </div>
                      <Botao variante={eq ? "ghost" : "sucesso"} disabled={eq} className="px-2 py-1 text-[10px]"
                        onClick={() => equipar(i.id)}>{eq ? "Equipado" : "Equipar"}</Botao>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── ABA HARDWARE (GPUs/periféricos nos slots do quarto) ── */}
          {!ehVisitante && abaLateral === "hardware" && (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-white">Slots de Hardware</h3>
                  <p className="text-[11px] text-slate-400">
                    {slotsOcupados}/{data.capacidadeSlotsHardware || 4} slots usados · Hashrate extra: {fmtHS(detalheHash.hardwareSlots)}
                  </p>
                </div>
                {(data.capacidadeSlotsHardware || 4) < (cfg.limiteSlotHardwareGlobal || 16) && (
                  <button onClick={adicionarSlotHardware}
                    className="flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-[10px] font-black text-emerald-300 transition hover:bg-emerald-500/25">
                    <PlusCircle className="h-3.5 w-3.5" /> +1 slot<br />
                    <span className="text-[8px] text-slate-400">{fmtMAS(custoSlot)}</span>
                  </button>
                )}
              </div>

              {/* Slots visuais */}
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: data.capacidadeSlotsHardware || 4 }, (_, idx) => {
                  const itemId = Object.entries(data.slotsHardware || {}).find(([, v]) => v === idx)?.[0];
                  const it = cfg.itens.find((i) => i.id === itemId);
                  return (
                    <div key={idx}
                      className={cn("relative flex flex-col items-center rounded-2xl border p-3 text-center",
                        it ? "border-cyan-400/40 bg-cyan-500/[0.08]" : "border-white/10 bg-black/20")}>
                      <p className="mb-1 text-[8px] font-black uppercase text-slate-500">Slot {idx + 1}</p>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/40 text-3xl">
                        {it
                          ? <ArteItem emoji={it.emoji} imagem={it.imagem} tamanho="text-3xl" className="h-9 w-9" />
                          : <MonitorCog className="h-6 w-6 text-slate-700" />}
                      </div>
                      <p className="mt-1 truncate text-[10px] font-bold text-white">{it?.nome || "Vazio"}</p>
                      {it && <p className="text-[9px] text-cyan-300">{fmtHS(it.hs || 0)}</p>}
                      {it && (
                        <button onClick={() => removerHardware(it.id)}
                          className="absolute right-1 top-1 text-[9px] font-black text-rose-300 hover:text-rose-100">×</button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Hardware do inventário para instalar */}
              <div className="mt-3 max-h-[220px] space-y-1 overflow-y-auto">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">Seus equipamentos</p>
                {hardwareDisponivel.length === 0 && <p className="text-xs text-slate-500">Compre GPUs e periféricos na Loja.</p>}
                {hardwareDisponivel.map((i) => {
                  const instalado = !!(data.slotsHardware || {})[i.id] !== undefined && Object.keys(data.slotsHardware || {}).includes(i.id);
                  return (
                    <div key={i.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                      <ArteItem emoji={i.emoji} imagem={i.imagem} tamanho="text-xl" className="h-7 w-7" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold text-white">{i.nome}</p>
                        <p className="text-[9px] text-cyan-300">{fmtHS(i.hs || 0)}</p>
                      </div>
                      <Botao variante={instalado ? "ghost" : "neon"} disabled={instalado || slotsOcupados >= (data.capacidadeSlotsHardware || 4)}
                        className="px-2 py-1 text-[10px]" onClick={() => equiparHardware(i.id)}>
                        {instalado ? "✓ Instalado" : "Instalar"}
                      </Botao>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── ABA DECORAÇÃO ── */}
          {!ehVisitante && abaLateral === "decoracao" && (
            <Card className="p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Mochila de decoração</p>
              <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                {decorativos.length === 0 && <p className="text-xs text-slate-500">Compre móveis na Loja para decorar seu quarto.</p>}
                {decorativos.map((i) => {
                  const posicionado = !!data.quarto[i.id];
                  return (
                    <div key={i.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                      <ArteItem emoji={i.emoji} imagem={i.imagem} tamanho="text-xl" className="h-7 w-7" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold text-white">{i.nome}</p>
                        <p className="text-[9px] text-slate-500">{posicionado ? "No quarto" : "Na mochila"}</p>
                      </div>
                      {posicionado
                        ? <Botao variante="ghost" className="px-2 py-1 text-[10px]" onClick={() => removerDoQuarto(i.id)}>Guardar</Botao>
                        : <Botao variante="ghost" className="px-2 py-1 text-[10px]" onClick={() => { setSel(i.id); setAbaLateral("rpg"); }}>Posicionar</Botao>}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Nível e saldo */}
          <Card className="p-4">
            <div className="flex justify-between text-xs"><span className="font-bold text-white">Nível {nivel}</span><span className="text-slate-500">{prog.atual}/{prog.necessario} XP</span></div>
            <div className="mt-1.5"><Barra pct={prog.pct} /></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px]">
              <div className="rounded-xl bg-white/5 p-2"><p className="text-slate-500">Saldo</p><p className="font-black text-emerald-300">{fmtMAS(data.saldo)}</p></div>
              <div className="rounded-xl bg-white/5 p-2"><p className="text-slate-500">H/s Total</p><p className="font-black text-cyan-300">{fmtHS(hashrate)}</p></div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de personalização */}
      <Modal aberto={editar} onFechar={() => setEditar(false)} titulo="Personalizar perfil">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Avatar Gratuito <span className="text-slate-500 font-normal">— galeria da rede</span>
            </p>
            <div className="grid grid-cols-8 gap-1.5">
              {cfg.avataresPadrao.map((av) => {
                const selecionado = !data.avatarImg && data.avatar === av.emoji && !av.imagem
                  || (av.imagem && data.avatarImg === av.imagem);
                return (
                  <button
                    key={av.id}
                    title={av.nome}
                    onClick={() => atualizar((d) => ({ ...d, avatar: av.emoji, avatarImg: av.imagem || "" }))}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border text-xl transition",
                      selecionado ? "border-fuchsia-400 bg-fuchsia-500/25 ring-2 ring-fuchsia-400" : "border-white/10 bg-white/5 hover:border-fuchsia-400/40"
                    )}
                  >
                    {av.imagem
                      ? <img src={av.imagem} alt={av.nome} className="h-full w-full object-cover" />
                      : av.emoji}
                  </button>
                );
              })}
            </div>
            {cfg.itens.filter((i) => i.categoria === "avatar" && data.itens.includes(i.id)).length > 0 && (
              <div className="mt-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/[0.05] p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-fuchsia-300">Avatares Premium</p>
                <div className="flex flex-wrap gap-2">
                  {cfg.itens.filter((i) => i.categoria === "avatar" && data.itens.includes(i.id)).map((i) => (
                    <button
                      key={i.id}
                      onClick={() => atualizar((d) => ({ ...d, avatar: i.emoji, avatarImg: i.imagem }))}
                      title={i.nome}
                      className={cn("flex h-12 w-12 items-center justify-center rounded-xl border transition overflow-hidden",
                        data.avatarImg === i.imagem || (!i.imagem && data.avatar === i.emoji)
                          ? "border-fuchsia-400 bg-fuchsia-500/25 ring-2 ring-fuchsia-500" : "border-white/10 bg-white/5 hover:border-fuchsia-400/50")}
                    >
                      <ArteItem emoji={i.emoji} imagem={i.imagem} tamanho="text-2xl" className="h-full w-full object-cover" />
                    </button>
                  ))}
                  {data.avatarImg && (
                    <Botao variante="ghost" className="px-2 py-1 text-[10px] h-12" onClick={() => atualizar((d) => ({ ...d, avatarImg: "" }))}>
                      Remover Premium
                    </Botao>
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_QUARTO.map((s) => (
                <button key={s} onClick={() => atualizar((d) => ({ ...d, status: s }))}
                  className={cn("rounded-lg border px-2.5 py-1 text-[11px] font-bold",
                    data.status === s ? "border-cyan-400 bg-cyan-500/20 text-cyan-200" : "border-white/10 bg-white/5 text-slate-400")}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Ambiente</p>
            <div className="flex flex-wrap gap-2">
              {TEMAS.map((t) => (
                <button key={t.id} onClick={() => atualizar((d) => ({ ...d, tema: t.id }))} title={t.nome}
                  className={cn(`h-9 w-9 rounded-xl bg-gradient-to-br ${t.classe} ring-2 transition`,
                    data.tema === t.id ? "scale-110 ring-fuchsia-400" : "ring-white/10")} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Nome de exibição</p>
            <div className="flex gap-2">
              <Input value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} />
              <Botao onClick={() => {
                if (nomeEdit.trim().length < 2) return toast("Nome muito curto", "erro");
                atualizar((d) => ({ ...d, nome: nomeEdit.trim() }));
                setEditar(false);
              }}>Salvar</Botao>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <span className="text-lg">{data.quartoAberto !== false ? "🚪" : "🔒"}</span>
            <div className="flex-1">
              <p className="text-xs font-black text-white">{data.quartoAberto !== false ? "Quarto aberto a visitantes" : "Quarto privado"}</p>
              <p className="text-[10px] text-slate-500">Outros jogadores podem {data.quartoAberto !== false ? "" : "não"} visitar seu quarto.</p>
            </div>
            <button onClick={() => atualizar((d) => ({ ...d, quartoAberto: d.quartoAberto === false }))}
              className={cn("rounded-lg px-3 py-1.5 text-[11px] font-black transition",
                data.quartoAberto !== false ? "bg-rose-600/20 text-rose-300" : "bg-emerald-600/20 text-emerald-300")}>
              {data.quartoAberto !== false ? "Fechar" : "Abrir"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
