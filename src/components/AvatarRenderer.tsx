import type { ItemLoja } from "../lib/catalogo";

/** Posições anatômicas canônicas no manequim 120×200. */
export const AVATAR_SLOT_BASE: Record<string, { x: number; y: number; z: number; w: number; h: number }> = {
  cabeca: { x: 60, y: 30,  z: 30, w: 54, h: 48 },
  rosto:  { x: 60, y: 38,  z: 40, w: 42, h: 25 },
  costas: { x: 60, y: 88,  z: 5,  w: 92, h: 92 },
  camisa: { x: 60, y: 88,  z: 25, w: 66, h: 76 },
  calca:  { x: 60, y: 140, z: 24, w: 52, h: 55 },
  sapato: { x: 60, y: 181, z: 27, w: 62, h: 30 },
  pet:    { x: 99, y: 155, z: 28, w: 46, h: 46 },
};

const normalizarSlot = (s: string) => (s === "chapeu" ? "cabeca" : s === "oculos" ? "rosto" : s);

export function AvatarRenderer({
  avatar,
  avatarImg,
  equipados,
  itens,
  escalaGeral = 1,
  className = "",
}: {
  avatar: string;
  avatarImg?: string;
  equipados: Record<string, string>;
  itens: ItemLoja[];
  escalaGeral?: number;
  className?: string;
}) {
  const largura = 120 * escalaGeral;
  const altura = 200 * escalaGeral;
  const camadas = Object.entries(equipados || {})
    .map(([slotOriginal, itemId]) => ({
      slot: normalizarSlot(slotOriginal),
      item: itens.find((i) => i.id === itemId),
    }))
    .filter((x) => x.item && AVATAR_SLOT_BASE[x.slot]);

  const renderItemVisual = (item: ItemLoja, espelhar = false) =>
    item.imagem ? (
      <img
        src={item.imagem}
        alt=""
        className="h-full w-full object-contain drop-shadow-lg"
        style={espelhar ? { transform: "scaleX(-1)" } : undefined}
      />
    ) : (
      <span className="text-[34px] drop-shadow-lg" style={espelhar ? { transform: "scaleX(-1)" } : undefined}>
        {item.emoji}
      </span>
    );

  return (
    <div className={`relative ${className}`} style={{ width: largura, height: altura }}>
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: 120, height: 200, transform: `scale(${escalaGeral})` }}
      >
        {/* Manequim anatômico: costas ficam atrás deste grupo (z 10–18). */}
        <div className="absolute left-[47px] top-[13px] z-[16] h-[38px] w-[38px] overflow-hidden rounded-full border-2 border-white/20 bg-slate-700 shadow-lg">
          {avatarImg
            ? <img src={avatarImg} alt="Avatar" className="h-full w-full object-cover" />
            : <span className="flex h-full w-full items-center justify-center text-[28px] leading-none">{avatar}</span>}
        </div>
        {/* Pescoço */}
        <div className="absolute left-[55px] top-[48px] z-[14] h-[12px] w-[20px] rounded bg-amber-200/80" />
        {/* Torso simétrico */}
        <div className="absolute left-[36px] top-[57px] z-[14] h-[64px] w-[58px] rounded-[18px_18px_10px_10px] border border-white/15 bg-gradient-to-b from-slate-500 to-slate-700" />
        {/* Braços */}
        <div className="absolute left-[24px] top-[62px] z-[13] h-[63px] w-[15px] rotate-[5deg] rounded-full bg-slate-600" />
        <div className="absolute right-[14px] top-[62px] z-[13] h-[63px] w-[15px] -rotate-[5deg] rounded-full bg-slate-600" />
        {/* Pernas independentes */}
        <div className="absolute left-[41px] top-[116px] z-[13] h-[54px] w-[20px] rounded-b-lg bg-slate-700" />
        <div className="absolute left-[68px] top-[116px] z-[13] h-[54px] w-[20px] rounded-b-lg bg-slate-700" />
        {/* Pés abaixo da calça */}
        <div className="absolute left-[35px] top-[166px] z-[14] h-[19px] w-[29px] rounded-[8px_4px_8px_8px] bg-slate-900" />
        <div className="absolute left-[66px] top-[166px] z-[14] h-[19px] w-[29px] rounded-[4px_8px_8px_8px] bg-slate-900" />

        {/* Itens vestíveis alinhados pelo Admin */}
        {camadas.map(({ slot, item }) => {
          if (!item) return null;
          const base = AVATAR_SLOT_BASE[slot];

          /* Sapatos: duas instâncias independentes, simétricas nos pés.
             A instância esquerda recebe flip horizontal automático. */
          if (slot === "sapato") {
            const pares = [
              { id: "esquerdo", x: 46, espelhar: true },
              { id: "direito", x: 76, espelhar: false },
            ];
            return pares.map((pe) => (
              <div
                key={`${slot}-${item.id}-${pe.id}`}
                className="pointer-events-none absolute flex h-[30px] w-[31px] items-center justify-center leading-none"
                style={{
                  left: pe.x,
                  top: base.y,
                  transform: `translate(-50%, -50%) translate(${item.offsetX || 0}px, ${item.offsetY || 0}px) scale(${item.escala || 1})`,
                  zIndex: item.zIndex ?? base.z,
                }}
              >
                {renderItemVisual(item, pe.espelhar)}
              </div>
            ));
          }

          return (
            <div
              key={`${slot}-${item.id}`}
              className="pointer-events-none absolute flex items-center justify-center leading-none"
              style={{
                width: base.w,
                height: base.h,
                left: base.x,
                top: base.y,
                transform: `translate(-50%, -50%) translate(${item.offsetX || 0}px, ${item.offsetY || 0}px) scale(${item.escala || 1})`,
                zIndex: item.zIndex ?? base.z,
              }}
            >
              {renderItemVisual(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}