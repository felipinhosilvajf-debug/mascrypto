/**
 * Painel de Administração de Avatares
 * ─────────────────────────────────────
 * • Avatares Gratuitos — galeria padrão gerenciada pelo Admin.
 *   Ficam disponíveis a todos os usuários sem custo.
 * • Skins Premium — avatares pagos (categoria "avatar" na loja).
 *   Usuário compra na Loja e acessa no menu RPG.
 */
import { useState } from "react";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { RARIDADES, infoCategoria, type ItemLoja } from "../lib/catalogo";
import { fmtHS, fmtMAS } from "../lib/economia";
import { ArteItem, Botao, Campo, Card, Confirmar, Input, Modal, Switch, Textarea, Vazio } from "./UI";

type AvatarPad = { id: string; emoji: string; imagem: string; nome: string };

function EditorAvPadrao({
  av,
  onSalvar,
  onFechar,
}: {
  av: AvatarPad;
  onSalvar: (a: AvatarPad) => void;
  onFechar: () => void;
}) {
  const [form, setForm] = useState<AvatarPad>({ ...av });
  const { toast } = useApp();
  return (
    <Modal aberto onFechar={onFechar} titulo={form.nome || "Novo Avatar"}>
      <div className="space-y-3">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-5xl">
            {form.imagem
              ? <img src={form.imagem} alt="" className="h-full w-full object-cover" />
              : form.emoji}
          </div>
          <p className="text-[11px] text-slate-400">Pré-visualização</p>
        </div>
        <Campo label="Nome">
          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </Campo>
        <Campo label="Emoji (exibido quando não há URL de imagem)">
          <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🦊" />
        </Campo>
        <Campo label="URL de imagem (PNG, GIF, WebP)" dica="Hospedada pelo Admin. Se preenchida, substitui o emoji.">
          <Input value={form.imagem} onChange={(e) => setForm({ ...form, imagem: e.target.value })} placeholder="https://exemplo.com/avatar.png" />
        </Campo>
        <div className="flex gap-2">
          <Botao variante="ghost" className="flex-1" onClick={onFechar}>Cancelar</Botao>
          <Botao variante="sucesso" className="flex-1" onClick={() => {
            if (!form.nome.trim()) return toast("Informe um nome", "erro");
            onSalvar(form);
          }}>Salvar</Botao>
        </div>
      </div>
    </Modal>
  );
}

/** Editor simplificado de skin premium de avatar. */
function EditorSkinAvatar({
  item,
  onSalvar,
  onFechar,
}: {
  item: ItemLoja;
  onSalvar: (i: ItemLoja) => void;
  onFechar: () => void;
}) {
  const [it, setIt] = useState<ItemLoja>({ ...item });
  const { toast } = useApp();
  const s = <K extends keyof ItemLoja>(k: K, v: ItemLoja[K]) => setIt((x) => ({ ...x, [k]: v }));

  return (
    <Modal aberto onFechar={onFechar} titulo={it.nome || "Nova Skin"} largura="max-w-2xl">
      <div className="space-y-4">
        {/* Prévia */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-4xl">
            {it.imagem
              ? <img src={it.imagem} alt="" className="h-full w-full object-cover" />
              : it.emoji}
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">{it.nome || "—"}</p>
            <p className="text-xs text-slate-400">{infoCategoria("avatar").nome}</p>
          </div>
          <Switch ligado={it.ativo} onChange={(v) => s("ativo", v)} rotulo={it.ativo ? "Ativo" : "Inativo"} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Nome">
            <Input value={it.nome} onChange={(e) => s("nome", e.target.value)} />
          </Campo>
          <Campo label="Emoji (fallback)">
            <Input value={it.emoji} onChange={(e) => s("emoji", e.target.value)} placeholder="🌟" />
          </Campo>
          <Campo label="URL da imagem de perfil" dica="PNG/GIF/WebP hospedado pelo Admin">
            <Input value={it.imagem} onChange={(e) => s("imagem", e.target.value)} placeholder="https://..." />
          </Campo>
          <Campo label="Preço (MAS)">
            <Input type="number" min={0} step={1} value={it.preco} onChange={(e) => s("preco", Math.max(0, Number(e.target.value)))} />
          </Campo>
          <Campo label="Raridade">
            <div className="flex flex-wrap gap-1.5">
              {RARIDADES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => s("raridade", r.id)}
                  className="rounded-lg border px-2 py-1.5 text-[11px] font-black uppercase transition"
                  style={{
                    borderColor: (it.raridade || "comum") === r.id ? r.cor : "rgba(255,255,255,0.1)",
                    background: (it.raridade || "comum") === r.id ? `${r.cor}22` : "transparent",
                    color: (it.raridade || "comum") === r.id ? r.cor : "rgba(148,163,184,1)",
                  }}
                >
                  {r.nome}
                </button>
              ))}
            </div>
          </Campo>
          <Campo label="Nível mínimo">
            <Input type="number" min={1} step={1} value={it.nivelMin} onChange={(e) => s("nivelMin", Math.max(1, Number(e.target.value)))} />
          </Campo>
          <Campo label="Estoque" dica="-1 = ilimitado">
            <Input type="number" value={it.estoque} onChange={(e) => s("estoque", Number(e.target.value))} />
          </Campo>
        </div>

        <Campo label="Descrição">
          <Textarea rows={2} value={it.desc} onChange={(e) => s("desc", e.target.value)} />
        </Campo>

        <div className="grid gap-3 rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.06] p-3 sm:grid-cols-2">
          <Campo label="Bônus de H/s (0 = sem bônus)" dica="Soma ao hashrate do usuário quando selecionado">
            <Input type="number" step="0.0001" min={0} value={it.hs} onChange={(e) => s("hs", Math.max(0, Number(e.target.value)))} />
          </Campo>
          <Campo label="Bônus percentual (%)" dica="Ex.: 2 = +2% de hashrate">
            <Input type="number" step={1} min={0} max={100} value={Math.round((it.bonusPct || 0) * 100)} onChange={(e) => s("bonusPct", Number(e.target.value) / 100)} />
          </Campo>
        </div>

        <div className="flex gap-2">
          <Botao variante="ghost" className="flex-1" onClick={onFechar}>Cancelar</Botao>
          <Botao variante="sucesso" className="flex-1" onClick={() => {
            if (!it.nome.trim()) return toast("Informe o nome", "erro");
            onSalvar(it);
          }}>Salvar skin</Botao>
        </div>
      </div>
    </Modal>
  );
}

export default function AvatarAdmin() {
  const { cfg, salvarConfig, salvarItem, excluirItem } = useConfig();
  const { toast } = useApp();

  /* ── Gratuitos ── */
  const [editAv, setEditAv] = useState<AvatarPad | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState<AvatarPad | null>(null);

  const salvarAvPadrao = (av: AvatarPad) => {
    const lista = cfg.avataresPadrao.some((a) => a.id === av.id)
      ? cfg.avataresPadrao.map((a) => (a.id === av.id ? av : a))
      : [...cfg.avataresPadrao, av];
    salvarConfig({ avataresPadrao: lista });
    toast("Avatar padrão salvo ✅", "ok");
    setEditAv(null);
  };

  const excluirAvPadrao = (id: string) => {
    salvarConfig({ avataresPadrao: cfg.avataresPadrao.filter((a) => a.id !== id) });
    toast("Avatar removido", "ok");
    setConfirmarExcluir(null);
  };

  /* ── Premium ── */
  const skinsPremium = cfg.itens.filter((i) => i.categoria === "avatar");
  const [editSkin, setEditSkin] = useState<ItemLoja | null>(null);

  const skinVazia = (): ItemLoja => ({
    id: `skin_${Date.now().toString(36)}`,
    nome: "",
    desc: "Skin exclusiva de avatar.",
    categoria: "avatar",
    emoji: "🌟",
    imagem: "",
    preco: 500,
    raridade: "lendario",
    nivelMin: 1,
    hs: 0,
    hsOscilacao: 0,
    hsIntervaloS: 4,
    bonusPct: 0,
    ativo: true,
    estoque: -1,
    requisito: "",
    slot: null,
    offsetX: 0,
    offsetY: 0,
    escala: 1,
    zIndex: 10,
    decorativo: false,
  });

  return (
    <div className="space-y-5">
      {/* ── Galeria Gratuita ── */}
      <Card glow className="border-emerald-500/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">✅ Avatares Gratuitos / Padrão</h3>
            <p className="text-sm text-slate-400">
              Disponíveis para todos os usuários sem custo. O Admin hospeda as imagens via URL.
            </p>
          </div>
          <Botao onClick={() => setEditAv({ id: `av_${Date.now().toString(36)}`, emoji: "😊", imagem: "", nome: "Novo Avatar" })}>
            + Adicionar
          </Botao>
        </div>

        {cfg.avataresPadrao.length === 0 ? (
          <Vazio emoji="👤" titulo="Nenhum avatar padrão" texto="Adicione o primeiro avatar gratuito." />
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            {cfg.avataresPadrao.map((av) => (
              <div key={av.id} className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30 text-3xl">
                  {av.imagem
                    ? <img src={av.imagem} alt={av.nome} className="h-full w-full object-cover" />
                    : av.emoji}
                </div>
                <p className="max-w-[64px] truncate text-[10px] font-bold text-white">{av.nome}</p>
                <div className="flex gap-1">
                  <button onClick={() => setEditAv({ ...av })} className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/10">✏️</button>
                  <button onClick={() => setConfirmarExcluir(av)} className="rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-bold text-rose-300 hover:bg-rose-500/25">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editAv && <EditorAvPadrao av={editAv} onSalvar={salvarAvPadrao} onFechar={() => setEditAv(null)} />}
      <Confirmar
        aberto={!!confirmarExcluir}
        perigo
        titulo="Remover avatar padrão"
        mensagem={`Remover "${confirmarExcluir?.nome}" da galeria gratuita?`}
        onCancelar={() => setConfirmarExcluir(null)}
        onConfirmar={() => confirmarExcluir && excluirAvPadrao(confirmarExcluir.id)}
      />

      {/* ── Skins Premium ── */}
      <Card className="border-fuchsia-500/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">💎 Skins Premium (Loja)</h3>
            <p className="text-sm text-slate-400">
              Avatares pagos com preço em MAS, nível mínimo e bônus de H/s. Usuários compram na Loja.
            </p>
          </div>
          <Botao onClick={() => setEditSkin(skinVazia())}>+ Nova skin</Botao>
        </div>

        {skinsPremium.length === 0 ? (
          <Vazio emoji="💎" titulo="Nenhuma skin premium" texto="Crie a primeira skin exclusiva da rede." />
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            {skinsPremium.map((sk) => (
              <div key={sk.id} className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center ${sk.ativo ? "border-fuchsia-400/30 bg-fuchsia-500/[0.06]" : "border-white/10 bg-white/[0.03] opacity-50"}`}>
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30 text-3xl">
                  {sk.imagem
                    ? <img src={sk.imagem} alt={sk.nome} className="h-full w-full object-cover" />
                    : <ArteItem emoji={sk.emoji} imagem={sk.imagem} tamanho="text-3xl" />}
                </div>
                <p className="max-w-[80px] truncate text-[10px] font-bold text-white">{sk.nome}</p>
                <p
                  className="text-[9px] font-black uppercase tracking-wider"
                  style={{ color: RARIDADES.find((r) => r.id === (sk.raridade || "comum"))?.cor }}
                >
                  {RARIDADES.find((r) => r.id === (sk.raridade || "comum"))?.nome}
                </p>
                <p className="text-[9px] text-amber-300">{fmtMAS(sk.preco)}</p>
                {sk.hs > 0 && <p className="text-[9px] text-cyan-300">{fmtHS(sk.hs)}</p>}
                {sk.bonusPct > 0 && <p className="text-[9px] text-emerald-300">+{Math.round(sk.bonusPct * 100)}%</p>}
                <p className="text-[9px] text-slate-500">Nv {sk.nivelMin}</p>
                <div className="flex gap-1">
                  <button onClick={() => setEditSkin({ ...sk })} className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/10">✏️</button>
                  <button onClick={() => { excluirItem(sk.id); toast("Skin removida", "ok"); }} className="rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-bold text-rose-300 hover:bg-rose-500/25">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editSkin && (
        <EditorSkinAvatar
          item={editSkin}
          onFechar={() => setEditSkin(null)}
          onSalvar={(it) => {
            if (!it.nome.trim()) return toast("Informe o nome", "erro");
            salvarItem(it);
            toast(`Skin "${it.nome}" salva`, "ok");
            setEditSkin(null);
          }}
        />
      )}
    </div>
  );
}
