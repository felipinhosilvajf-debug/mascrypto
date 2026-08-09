/**
 * Aba "Mundo" — navegação e mapa da rede MAS.
 * • SEM chat (nem público, nem privado). O chat existe apenas DENTRO do quarto.
 * • Diretório/mapa de quartos com busca por nome ou e-mail.
 * • Respeita a privacidade (Aberto / Fechado) definida por cada dono.
 * • Ao entrar num quarto, o app abre a instância do quarto do anfitrião.
 */
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { DoorClosed, DoorOpen, Globe2, Search, Users, MapPin } from "lucide-react";
import { db } from "../lib/firebase";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { normalizar, SLOTS_RPG, type UserData } from "../lib/types";
import { nivelPorXp, patente } from "../lib/economia";
import { ArteItem, Botao, Card, Input, Selo, Switch, Vazio } from "./UI";
import { cn } from "../utils/cn";

export default function MundoView({
  onEntrarQuarto,
}: {
  /** Abre a instância do quarto do anfitrião informado. */
  onEntrarQuarto?: (hostId: string) => void;
}) {
  const { user, data, atualizar, toast } = useApp();
  const { cfg } = useConfig();

  const [usuarios, setUsuarios] = useState<UserData[]>([]);
  const [presenca, setPresenca] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "abertos">("todos");

  /* Diretório de membros */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) =>
        setUsuarios(
          snap.docs
            .map((s) => normalizar(s.data() as Partial<UserData>, s.id))
            .filter((u) => !u.banido && u.nome?.trim()),
        ),
      () => {},
    );
    return unsub;
  }, []);

  /* Contagem de jogadores presentes em cada sala */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "online_room"),
      (snap) => {
        const mapa: Record<string, number> = {};
        snap.docs.forEach((d) => {
          const sala = (d.data() as { sala?: string }).sala;
          if (sala) mapa[sala] = (mapa[sala] || 0) + 1;
        });
        setPresenca(mapa);
      },
      () => {},
    );
    return unsub;
  }, []);

  if (!data || !user) return null;

  const entrar = (dono: UserData) => {
    if (dono.uid === user.uid) return onEntrarQuarto?.(user.uid);
    if (dono.quartoAberto === false) return toast("Este quarto está fechado para visitas 🔒", "erro");
    onEntrarQuarto?.(dono.uid);
    toast(`Entrando no quarto de ${dono.nome}…`, "ok");
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return usuarios
      .filter((u) => u.uid !== user.uid)
      .filter((u) => !q || u.nome.toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q))
      .filter((u) => (filtro === "abertos" ? u.quartoAberto !== false : true))
      .sort((a, b) => (presenca[b.uid] || 0) - (presenca[a.uid] || 0));
  }, [usuarios, busca, user.uid, filtro, presenca]);

  const abertos = usuarios.filter((u) => u.uid !== user.uid && u.quartoAberto !== false).length;

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <Card glow className="overflow-hidden bg-[radial-gradient(120%_150%_at_10%_0%,rgba(56,189,248,.18),transparent_55%)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-white">
              <Globe2 className="h-6 w-6 text-cyan-300" /> Mundo MAS
            </h2>
            <p className="text-sm text-slate-400">
              Mapa da rede — navegue pelos quartos públicos dos membros. O chat acontece dentro de cada quarto.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Selo tom="verde">
              <Users className="mr-1 inline h-3 w-3" />
              {usuarios.length} membros · {abertos} abertos
            </Selo>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <Switch
                ligado={data.quartoAberto !== false}
                onChange={(v) => {
                  atualizar((d) => ({ ...d, quartoAberto: v }));
                  toast(v ? "Seu quarto está aberto a visitas" : "Seu quarto foi fechado", "info");
                }}
                rotulo={data.quartoAberto !== false ? "Meu quarto: Aberto" : "Meu quarto: Fechado"}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Busca e filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Buscar quarto por nome de usuário ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-white/5 p-1">
          {([
            ["todos", "Todos"],
            ["abertos", "Só abertos"],
          ] as const).map(([id, nome]) => (
            <button
              key={id}
              onClick={() => setFiltro(id)}
              className={cn(
                "rounded-lg px-3 py-2 text-[11px] font-black transition",
                filtro === id ? "bg-fuchsia-600/35 text-white" : "text-slate-500 hover:text-white",
              )}
            >
              {nome}
            </button>
          ))}
        </div>
        <Botao variante="neon" onClick={() => onEntrarQuarto?.(user.uid)}>
          🏠 Meu quarto
        </Botao>
      </div>

      {/* Mapa / diretório de quartos */}
      {filtrados.length === 0 ? (
        <Card>
          <Vazio emoji="🔍" titulo="Nenhum quarto encontrado" texto="Tente outro nome ou e-mail." />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((u) => {
            const nv = nivelPorXp(u.xp);
            const p = patente(nv);
            const aberto = u.quartoAberto !== false;
            const itensQuarto = Object.keys(u.quarto || {}).length;
            const online = presenca[u.uid] || 0;
            return (
              <Card
                key={u.uid}
                hover
                className={cn("flex flex-col p-4", !aberto && "opacity-60")}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-2xl">
                    {u.avatar}
                    {online > 0 && (
                      <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1.5 text-[9px] font-black text-white">
                        {online}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-black text-white">{u.nome}</p>
                      {aberto ? (
                        <DoorOpen className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <DoorClosed className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                      )}
                    </div>
                    <p className={cn("truncate text-[11px] font-bold", p.cor)}>
                      {p.emoji} {p.nome} · Nv {nv}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">{u.status}</p>
                  </div>
                </div>

                {/* Prévia do visual e da decoração */}
                <div className="mt-3 flex flex-wrap items-center gap-1">
                  {SLOTS_RPG.map((s) => {
                    const it = cfg.itens.find((i) => i.id === u.equipados?.[s.id]);
                    if (!it) return null;
                    return (
                      <span
                        key={s.id}
                        title={it.nome}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/30"
                      >
                        <ArteItem emoji={it.emoji} imagem={it.imagem} tamanho="text-sm" className="h-4 w-4" />
                      </span>
                    );
                  })}
                  {itensQuarto > 0 && (
                    <span className="rounded-lg bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
                      🪑 {itensQuarto} móveis
                    </span>
                  )}
                </div>

                <Botao
                  variante={aberto ? "primario" : "ghost"}
                  className="mt-3 w-full py-2 text-xs"
                  disabled={!aberto}
                  onClick={() => entrar(u)}
                >
                  {aberto ? (
                    <>
                      <MapPin className="mr-1 inline h-3.5 w-3.5" /> Entrar no quarto
                    </>
                  ) : (
                    "🔒 Quarto privado"
                  )}
                </Botao>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] text-slate-500">
        💬 As conversas acontecem dentro de cada quarto e expiram automaticamente após 5 minutos.
      </p>
    </div>
  );
}
