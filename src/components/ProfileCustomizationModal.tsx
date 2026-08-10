import { useState } from "react";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { STATUS_QUARTO, TEMAS } from "../lib/types";
import { nivelPorXp, patente } from "../lib/economia";
import { ArteItem, AvatarVisual, Botao, Input, Modal, Switch } from "./UI";
import { cn } from "../utils/cn";

/**
 * Personalização global de perfil/avatar.
 * Pode ser aberta de qualquer tela; não depende da página do Quarto.
 */
export default function ProfileCustomizationModal({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  const { data, atualizar, toast } = useApp();
  const { cfg } = useConfig();
  const [nome, setNome] = useState(data?.nome || "");

  if (!data) return null;
  const nivel = nivelPorXp(data.xp);
  const pat = patente(nivel);
  const premium = cfg.itens.filter((i) => i.categoria === "avatar" && data.itens.includes(i.id));

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Personalização de Avatar e Perfil" largura="max-w-2xl">
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/[0.06] p-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-black/35">
            <AvatarVisual avatar={data.avatar} imagem={data.avatarImg} className="h-16 w-16" emojiClassName="text-5xl" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black text-white">{data.nome}</p>
            <p className={cn("text-xs font-bold", pat.cor)}>{pat.emoji} {pat.nome} · Nível {nivel}</p>
            <p className="mt-1 truncate text-[11px] text-slate-400">{data.status}</p>
          </div>
        </div>

        <section>
          <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Avatares gratuitos</p>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
            {cfg.avataresPadrao.map((av) => {
              const ativo = av.imagem ? data.avatarImg === av.imagem : !data.avatarImg && data.avatar === av.emoji;
              return (
                <button
                  key={av.id}
                  title={av.nome}
                  onClick={() => atualizar((d) => ({ ...d, avatar: av.emoji, avatarImg: av.imagem || "" }))}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border transition",
                    ativo
                      ? "border-fuchsia-400 bg-fuchsia-500/25 shadow-[0_0_15px_-4px_#d946ef]"
                      : "border-white/10 bg-white/5 hover:border-fuchsia-400/50",
                  )}
                >
                  {av.imagem
                    ? <img src={av.imagem} alt={av.nome} className="h-full w-full object-cover" />
                    : <span className="text-xl">{av.emoji}</span>}
                </button>
              );
            })}
          </div>
        </section>

        {premium.length > 0 && (
          <section>
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-fuchsia-300">Avatares premium adquiridos</p>
            <div className="flex flex-wrap gap-2">
              {premium.map((i) => {
                const ativo = i.imagem ? data.avatarImg === i.imagem : !data.avatarImg && data.avatar === i.emoji;
                return (
                  <button
                    key={i.id}
                    title={i.nome}
                    onClick={() => atualizar((d) => ({ ...d, avatar: i.emoji, avatarImg: i.imagem || "" }))}
                    className={cn(
                      "flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border transition",
                      ativo ? "border-fuchsia-400 bg-fuchsia-500/25" : "border-white/10 bg-white/5 hover:border-fuchsia-400/50",
                    )}
                  >
                    <ArteItem emoji={i.emoji} imagem={i.imagem} tamanho="text-2xl" className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_QUARTO.map((s) => (
              <button
                key={s}
                onClick={() => atualizar((d) => ({ ...d, status: s }))}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-bold transition",
                  data.status === s
                    ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-white",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Tema do quarto</p>
          <div className="flex flex-wrap gap-2">
            {TEMAS.map((t) => (
              <button
                key={t.id}
                onClick={() => atualizar((d) => ({ ...d, tema: t.id }))}
                title={t.nome}
                className={cn(
                  `h-9 w-9 rounded-xl bg-gradient-to-br ${t.classe} border transition`,
                  data.tema === t.id ? "border-fuchsia-300 scale-110" : "border-white/10",
                )}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome de exibição" />
          <Botao
            onClick={() => {
              if (nome.trim().length < 2) return toast("Nome muito curto", "erro");
              atualizar((d) => ({ ...d, nome: nome.trim() }));
              toast("Perfil atualizado", "ok");
            }}
          >
            Salvar nome
          </Botao>
        </section>

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
          <div>
            <p className="text-xs font-black text-white">Visitas ao quarto</p>
            <p className="text-[10px] text-slate-500">Controle se outros membros podem entrar no seu quarto.</p>
          </div>
          <Switch
            ligado={data.quartoAberto !== false}
            onChange={(v) => atualizar((d) => ({ ...d, quartoAberto: v }))}
            rotulo={data.quartoAberto !== false ? "Aberto" : "Privado"}
          />
        </div>
      </div>
    </Modal>
  );
}