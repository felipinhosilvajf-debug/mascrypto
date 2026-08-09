/**
 * 5 novos jogos do cassino MAScrypto.
 * Todos: saldo global (registrarAposta), RTP/limites do Painel Admin e modo automático.
 */
import { useState } from "react";
import { Botao } from "../components/UI";
import { fmtMAS, fmtNum as fmt } from "../lib/economia";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import {
  ControleAposta,
  ControleMultiplicador,
  PainelAuto,
  Painel,
  Resultado,
  resultadoComRtp,
  useAposta,
  useAutoplay,
  useIcones,
  useMultiplicadores,
} from "./Comum";

/** Validação comum de limites do Admin. */
function useLimites(id: string) {
  const { cfg } = useConfig();
  const conf = cfg.jogos[id];
  return {
    conf,
    valida: (aposta: number) => aposta >= conf.apostaMin && aposta <= conf.apostaMax,
    textoLimites: `Limites: ${fmtMAS(conf.apostaMin)} – ${fmtMAS(conf.apostaMax)}`,
  };
}

/* ==================== 1. RODA DA FORTUNA ==================== */
const FATIAS = [0, 1.5, 2, 0, 3, 1.5, 5, 0, 2, 1.5, 10, 0, 2, 1.5, 3, 20];

export function Wheel() {
  const { registrarAposta, toast, ehAdmin } = useApp();
  const { conf, valida: dentroLimite, textoLimites } = useLimites("wheel");
  const FATIAS_CFG = useMultiplicadores("wheel", FATIAS);
  const { aposta, setAposta, saldo, valida } = useAposta();
  const [girando, setGirando] = useState(false);
  const [angulo, setAngulo] = useState(0);
  const [res, setRes] = useState<number | null>(null);
  const [hist, setHist] = useState<number[]>([]);

  const jogar = () => {
    if (!valida || girando) return toast("Aposta inválida", "erro");
    if (!dentroLimite(aposta)) return toast(textoLimites, "erro");
    setGirando(true);
    setRes(null);

    const fator = (conf.rtp || 0.96) / 0.96;
    const idx = Math.floor(Math.random() * FATIAS_CFG.length);
    const mult = FATIAS_CFG[idx] * fator;
    const voltas = 5 * 360 + idx * (360 / FATIAS_CFG.length);
    setAngulo((a) => a + voltas);

    setTimeout(() => {
      setGirando(false);
      setRes(mult);
      setHist((h) => [mult, ...h].slice(0, 10));
      registrarAposta("Roda da Fortuna", aposta, aposta * mult);
      toast(
        mult > 0 ? `${fmt(mult, 2)}x · +${fmt(aposta * mult - aposta)} MAS` : "Zerou! Tente de novo.",
        mult >= 1 ? "ok" : "erro",
      );
    }, 2600);
  };

  const auto = useAutoplay(jogar, !girando && valida, 3200);

  return (
    <Painel
      titulo={conf.nome}
      emoji="☸"
      jogoId="wheel"
      brilho="rgba(251,191,36,0.28)"
      lateral={
        <>
          <ControleAposta aposta={aposta} setAposta={setAposta} saldo={saldo} travado={girando || auto.ativo} />
          <p className="text-[11px] text-slate-500">
            {ehAdmin && `RTP ${Math.round(conf.rtp * 100)}% · `}
            {textoLimites}
          </p>
          <Botao variante="ouro" className="w-full py-3" disabled={girando || auto.ativo} onClick={jogar}>
            {girando ? "Girando..." : "Girar roda"}
          </Botao>
          <PainelAuto auto={auto} travado={girando} />
          <div className="flex flex-wrap gap-1">
            {hist.map((m, i) => (
              <span
                key={i}
                className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                  m >= 2 ? "bg-emerald-500/15 text-emerald-300" : m > 0 ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300"
                }`}
              >
                {fmt(m, 1)}x
              </span>
            ))}
          </div>
        </>
      }
    >
      <div className="text-center">
        <div className="relative mx-auto h-60 w-60">
          <div
            className="absolute inset-0 rounded-full border-4 border-amber-400/50 shadow-[0_0_60px_-12px_rgba(251,191,36,.9)] transition-transform duration-[2500ms] ease-out"
            style={{
              transform: `rotate(${angulo}deg)`,
              background: `conic-gradient(${FATIAS_CFG.map(
                (m, i) =>
                  `${m === 0 ? "#4c1d24" : m >= 10 ? "#f59e0b" : m >= 2 ? "#10b981" : "#6366f1"} ${
                    (i / FATIAS_CFG.length) * 100
                  }% ${((i + 1) / FATIAS_CFG.length) * 100}%`,
              ).join(",")})`,
            }}
          />
          <div className="absolute inset-[30%] flex flex-col items-center justify-center rounded-full border border-white/20 bg-slate-950">
            <span className="text-2xl font-black text-white">{res !== null ? `${fmt(res, 1)}x` : "?"}</span>
          </div>
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl">🔻</span>
        </div>
        <Resultado
          texto={girando ? "Girando a roda..." : res !== null ? (res > 0 ? `Ganhou ${fmt(res, 2)}x!` : "Sem prêmio") : "Faça sua aposta"}
          tom={res === null || girando ? "neutro" : res >= 1 ? "ok" : "erro"}
        />
      </div>
    </Painel>
  );
}

/* ==================== 2. HI-LO ==================== */
const NAIPES = ["♠", "♥", "♦", "♣"];
const VALORES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function HiLo() {
  const { registrarAposta, toast, ehAdmin } = useApp();
  const { conf, valida: dentroLimite, textoLimites } = useLimites("hilo");
  const { aposta, setAposta, saldo, valida } = useAposta();
  const [carta, setCarta] = useState(() => Math.floor(Math.random() * 13));
  const [naipe, setNaipe] = useState(() => Math.floor(Math.random() * 4));
  const [rodando, setRodando] = useState(false);
  const [escolha, setEscolha] = useState<"maior" | "menor">("maior");
  const [msg, setMsg] = useState("");

  const chanceMaior = (12 - carta) / 12;
  const multMaior = chanceMaior > 0 ? (conf.rtp || 0.97) / Math.max(0.08, chanceMaior) : 0;
  const multMenor = carta > 0 ? (conf.rtp || 0.97) / Math.max(0.08, carta / 12) : 0;
  const mult = escolha === "maior" ? multMaior : multMenor;

  const jogar = () => {
    if (!valida || rodando) return toast("Aposta inválida", "erro");
    if (!dentroLimite(aposta)) return toast(textoLimites, "erro");
    setRodando(true);
    setMsg("");
    setTimeout(() => {
      const ganhou = resultadoComRtp(conf.rtp, Math.max(1.01, mult));
      let nova: number;
      if (ganhou) {
        nova = escolha === "maior"
          ? Math.min(12, carta + 1 + Math.floor(Math.random() * Math.max(1, 12 - carta)))
          : Math.max(0, carta - 1 - Math.floor(Math.random() * Math.max(1, carta)));
      } else {
        nova = escolha === "maior"
          ? Math.max(0, Math.floor(Math.random() * Math.max(1, carta + 1)))
          : Math.min(12, carta + Math.floor(Math.random() * Math.max(1, 13 - carta)));
      }
      setCarta(nova);
      setNaipe(Math.floor(Math.random() * 4));
      setRodando(false);
      registrarAposta("Hi-Lo", aposta, ganhou ? aposta * mult : 0);
      setMsg(ganhou ? `Acertou! ${fmt(mult, 2)}x` : "Errou a previsão");
      toast(ganhou ? `+${fmt(aposta * mult - aposta)} MAS 🂡` : "Não foi dessa vez", ganhou ? "ok" : "erro");
    }, 900);
  };

  const auto = useAutoplay(jogar, !rodando && valida, 1600);
  const vermelho = naipe === 1 || naipe === 2;

  return (
    <Painel
      titulo={conf.nome}
      emoji="🂡"
      jogoId="hilo"
      brilho="rgba(99,102,241,0.25)"
      lateral={
        <>
          <ControleAposta aposta={aposta} setAposta={setAposta} saldo={saldo} travado={rodando || auto.ativo} />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setEscolha("maior")}
              className={`rounded-xl border p-2.5 text-xs font-black transition ${
                escolha === "maior" ? "border-emerald-400 bg-emerald-500/20 text-white" : "border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              ▲ Maior<br />
              <span className="text-[10px]">{fmt(multMaior, 2)}x</span>
            </button>
            <button
              onClick={() => setEscolha("menor")}
              className={`rounded-xl border p-2.5 text-xs font-black transition ${
                escolha === "menor" ? "border-rose-400 bg-rose-500/20 text-white" : "border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              ▼ Menor<br />
              <span className="text-[10px]">{fmt(multMenor, 2)}x</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            {ehAdmin && `RTP ${Math.round(conf.rtp * 100)}% · `}
            {textoLimites}
          </p>
          <Botao className="w-full py-3" disabled={rodando || auto.ativo} onClick={jogar}>
            {rodando ? "Virando..." : "Apostar"}
          </Botao>
          <PainelAuto auto={auto} travado={rodando} />
        </>
      }
    >
      <div className="text-center">
        <div
          className={`mx-auto flex h-56 w-40 flex-col items-center justify-center rounded-2xl border-4 bg-white shadow-[0_0_50px_-12px_rgba(255,255,255,.5)] transition-transform ${
            rodando ? "animate-[pulsar_.4s_ease-out]" : ""
          } ${vermelho ? "border-rose-400" : "border-slate-800"}`}
        >
          <span className={`text-6xl font-black ${vermelho ? "text-rose-600" : "text-slate-900"}`}>
            {VALORES[carta]}
          </span>
          <span className={`text-5xl ${vermelho ? "text-rose-600" : "text-slate-900"}`}>{NAIPES[naipe]}</span>
        </div>
        <Resultado texto={msg || "A próxima carta será maior ou menor?"} tom={msg.includes("Acertou") ? "ok" : msg ? "erro" : "neutro"} />
      </div>
    </Painel>
  );
}

/* ==================== 3. LIMBO ==================== */
export function Limbo() {
  const { registrarAposta, toast, ehAdmin } = useApp();
  const { conf, valida: dentroLimite, textoLimites } = useLimites("limbo");
  const { aposta, setAposta, saldo, valida } = useAposta();
  const [alvo, setAlvo] = useState(2);
  const [rodando, setRodando] = useState(false);
  const [res, setRes] = useState<number | null>(null);
  const [hist, setHist] = useState<number[]>([]);

  const chance = (conf.rtp || 0.98) / alvo;

  const jogar = () => {
    if (!valida || rodando) return toast("Aposta inválida", "erro");
    if (!dentroLimite(aposta)) return toast(textoLimites, "erro");
    if (alvo < 1.01) return toast("Alvo mínimo: 1.01x", "erro");
    setRodando(true);
    let c = 0;
    const iv = setInterval(() => {
      setRes(1 + Math.random() * alvo * 2);
      if (++c > 12) {
        clearInterval(iv);
        const ganhou = Math.random() < chance;
        const final = ganhou
          ? alvo + Math.random() * alvo * 2
          : Math.max(1, 1 + Math.random() * (alvo - 1));
        setRes(final);
        setHist((h) => [final, ...h].slice(0, 10));
        setRodando(false);
        registrarAposta("Limbo", aposta, ganhou ? aposta * alvo : 0);
        toast(
          ganhou ? `${fmt(final, 2)}x ≥ ${fmt(alvo, 2)}x · +${fmt(aposta * alvo - aposta)} MAS` : `${fmt(final, 2)}x — abaixo do alvo`,
          ganhou ? "ok" : "erro",
        );
      }
    }, 70);
  };

  const auto = useAutoplay(jogar, !rodando && valida, 1700);
  const ganhou = res !== null && res >= alvo;

  return (
    <Painel
      titulo={conf.nome}
      emoji="⇡"
      jogoId="limbo"
      brilho="rgba(16,185,129,0.25)"
      lateral={
        <>
          <ControleAposta aposta={aposta} setAposta={setAposta} saldo={saldo} travado={rodando || auto.ativo} />
          <ControleMultiplicador valor={alvo} setValor={setAlvo} travado={rodando || auto.ativo} />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-white/5 p-2">
              <p className="text-slate-500">Chance</p>
              <p className="font-black text-emerald-300">{fmt(chance * 100, 2)}%</p>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <p className="text-slate-500">Prêmio</p>
              <p className="font-black text-amber-300">{fmtMAS(aposta * alvo)}</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            {ehAdmin && `RTP ${Math.round(conf.rtp * 100)}% · `}
            {textoLimites}
          </p>
          <Botao variante="sucesso" className="w-full py-3" disabled={rodando || auto.ativo} onClick={jogar}>
            {rodando ? "Calculando..." : "Apostar"}
          </Botao>
          <PainelAuto auto={auto} travado={rodando} />
          <div className="flex flex-wrap gap-1">
            {hist.map((m, i) => (
              <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-black ${m >= alvo ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                {fmt(m, 2)}x
              </span>
            ))}
          </div>
        </>
      }
    >
      <div className="text-center">
        <p
          className={`text-7xl font-black tabular-nums transition-colors sm:text-8xl ${
            res === null ? "text-slate-600" : ganhou ? "text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,.6)]" : "text-rose-500"
          }`}
        >
          {res === null ? "—" : `${fmt(res, 2)}x`}
        </p>
        <p className="mt-3 text-sm text-slate-400">
          Alvo: <b className="text-white">{fmt(alvo, 2)}x</b>
        </p>
        <Resultado
          texto={rodando ? "Sorteando..." : res === null ? "Defina o alvo e aposte" : ganhou ? "Acima do alvo! 🎉" : "Abaixo do alvo"}
          tom={res === null || rodando ? "neutro" : ganhou ? "ok" : "erro"}
        />
      </div>
    </Painel>
  );
}

/* ==================== 4. KENO ==================== */
export function Keno() {
  const { registrarAposta, toast, ehAdmin } = useApp();
  const { conf, valida: dentroLimite, textoLimites } = useLimites("keno");
  const { aposta, setAposta, saldo, valida } = useAposta();
  const [escolhidos, setEscolhidos] = useState<number[]>([]);
  const [sorteados, setSorteados] = useState<number[]>([]);
  const [rodando, setRodando] = useState(false);
  const [msg, setMsg] = useState("");

  const TABELA: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 1.5, 4: 3, 5: 8, 6: 25, 7: 80, 8: 300, 9: 1000, 10: 5000 };

  const toggle = (n: number) => {
    if (rodando) return;
    setEscolhidos((e) => (e.includes(n) ? e.filter((x) => x !== n) : e.length >= 10 ? e : [...e, n]));
  };

  const jogar = () => {
    if (escolhidos.length < 3) return toast("Escolha ao menos 3 números", "erro");
    if (!valida || rodando) return toast("Aposta inválida", "erro");
    if (!dentroLimite(aposta)) return toast(textoLimites, "erro");
    setRodando(true);
    setSorteados([]);
    setMsg("");

    const pool = Array.from({ length: 40 }, (_, i) => i + 1);
    const sorteio: number[] = [];
    while (sorteio.length < 10) {
      const i = Math.floor(Math.random() * pool.length);
      sorteio.push(pool.splice(i, 1)[0]);
    }

    sorteio.forEach((n, i) => setTimeout(() => setSorteados((s) => [...s, n]), i * 130));

    setTimeout(() => {
      const acertos = escolhidos.filter((n) => sorteio.includes(n)).length;
      const fator = (conf.rtp || 0.94) / 0.94;
      const mult = (TABELA[acertos] || 0) * fator * (escolhidos.length / 10);
      setRodando(false);
      registrarAposta("Keno", aposta, aposta * mult);
      setMsg(`${acertos} acerto(s) · ${fmt(mult, 2)}x`);
      toast(mult > 0 ? `+${fmt(aposta * mult - aposta)} MAS 🎯` : `${acertos} acertos — sem prêmio`, mult > 0 ? "ok" : "erro");
    }, 10 * 130 + 400);
  };

  const auto = useAutoplay(jogar, !rodando && valida && escolhidos.length >= 3, 3000);

  return (
    <Painel
      titulo={conf.nome}
      emoji="⬢"
      jogoId="keno"
      brilho="rgba(168,85,247,0.25)"
      lateral={
        <>
          <ControleAposta aposta={aposta} setAposta={setAposta} saldo={saldo} travado={rodando || auto.ativo} />
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
            <p className="font-bold text-white">Selecionados: {escolhidos.length}/10</p>
            <p className="mt-1 text-slate-500">Mínimo 3 números · 10 são sorteados de 40</p>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
              {[3, 4, 5, 6, 7, 8].map((k) => (
                <span key={k} className="rounded bg-white/5 px-1 py-0.5 text-center text-slate-400">
                  {k}✓ <b className="text-amber-300">{TABELA[k]}x</b>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Botao variante="ghost" className="flex-1 py-2 text-xs" disabled={rodando} onClick={() => setEscolhidos([])}>
              Limpar
            </Botao>
            <Botao
              variante="ghost"
              className="flex-1 py-2 text-xs"
              disabled={rodando}
              onClick={() => {
                const p = Array.from({ length: 40 }, (_, i) => i + 1);
                const r: number[] = [];
                while (r.length < 10) r.push(p.splice(Math.floor(Math.random() * p.length), 1)[0]);
                setEscolhidos(r);
              }}
            >
              Aleatório
            </Botao>
          </div>
          <p className="text-[11px] text-slate-500">
            {ehAdmin && `RTP ${Math.round(conf.rtp * 100)}% · `}
            {textoLimites}
          </p>
          <Botao className="w-full py-3" disabled={rodando || auto.ativo || escolhidos.length < 3} onClick={jogar}>
            {rodando ? "Sorteando..." : "Apostar"}
          </Botao>
          <PainelAuto auto={auto} travado={rodando} />
        </>
      }
    >
      <div>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: 40 }, (_, i) => {
            const n = i + 1;
            const sel = escolhidos.includes(n);
            const sort = sorteados.includes(n);
            const acerto = sel && sort;
            return (
              <button
                key={n}
                onClick={() => toggle(n)}
                disabled={rodando}
                className={`flex h-10 items-center justify-center rounded-lg text-xs font-black transition-all active:scale-90 ${
                  acerto
                    ? "animate-[pulsar_.3s_ease-out] bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,.8)]"
                    : sort
                      ? "bg-amber-500/40 text-amber-100"
                      : sel
                        ? "bg-fuchsia-600/50 text-white ring-1 ring-fuchsia-400"
                        : "bg-white/[0.05] text-slate-400 hover:bg-white/10"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <Resultado texto={msg || `Escolha de 3 a 10 números`} tom={msg.includes("0 acerto") ? "erro" : msg ? "ok" : "neutro"} />
      </div>
    </Painel>
  );
}

/* ==================== 5. HOT ZONE ==================== */
export function HotZone() {
  const { registrarAposta, toast, ehAdmin } = useApp();
  const { conf, valida: dentroLimite, textoLimites } = useLimites("hotzone");
  const icHZ = useIcones("hotzone", { perigo: "🔥", seguro: "❄️" });
  const { aposta, setAposta, saldo, valida } = useAposta();
  const [zonas, setZonas] = useState(3);
  const [perigo, setPerigo] = useState<number[]>([]);
  const [abertas, setAbertas] = useState<number[]>([]);
  const [jogando, setJogando] = useState(false);
  const [perdeu, setPerdeu] = useState(false);

  const TOTAL = 12;
  const mult = (() => {
    let m = 1;
    for (let i = 0; i < abertas.length; i++) m *= (TOTAL - i) / (TOTAL - zonas - i);
    return m * (conf.rtp || 0.96);
  })();

  const iniciar = () => {
    if (!valida) return toast("Aposta inválida", "erro");
    if (!dentroLimite(aposta)) return toast(textoLimites, "erro");
    const p: number[] = [];
    while (p.length < zonas) {
      const n = Math.floor(Math.random() * TOTAL);
      if (!p.includes(n)) p.push(n);
    }
    setPerigo(p);
    setAbertas([]);
    setPerdeu(false);
    setJogando(true);
  };

  const abrir = (i: number) => {
    if (!jogando || abertas.includes(i)) return;
    if (perigo.includes(i)) {
      setPerdeu(true);
      setJogando(false);
      registrarAposta("Hot Zone", aposta, 0);
      toast("🔥 Zona quente! Você perdeu.", "erro");
      return;
    }
    const novas = [...abertas, i];
    setAbertas(novas);
    if (novas.length === TOTAL - zonas) sacar(novas.length);
  };

  const sacar = (n = abertas.length) => {
    if (!jogando || n === 0) return;
    registrarAposta("Hot Zone", aposta, aposta * mult);
    toast(`Sacou ${fmt(mult, 2)}x · +${fmt(aposta * mult - aposta)} MAS ❄️`, "ok");
    setJogando(false);
  };

  // Autoplay: abre 2 zonas e saca automaticamente
  const rodadaAuto = () => {
    if (jogando) return;
    iniciar();
    setTimeout(() => {
      setAbertas((atuais) => {
        if (atuais.length > 0) return atuais;
        const livres = Array.from({ length: TOTAL }, (_, i) => i).filter((i) => !perigo.includes(i));
        return livres.slice(0, 2);
      });
      setTimeout(() => sacar(2), 400);
    }, 500);
  };
  const auto = useAutoplay(rodadaAuto, !jogando && valida, 2600);

  return (
    <Painel
      titulo={conf.nome}
      emoji="⬤"
      jogoId="hotzone"
      brilho="rgba(244,63,94,0.25)"
      lateral={
        <>
          <ControleAposta aposta={aposta} setAposta={setAposta} saldo={saldo} travado={jogando || auto.ativo} />
          <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
            <p className="text-xs text-slate-400">
              Zonas quentes: <b className="text-white">{zonas}</b> de {TOTAL}
            </p>
            <input
              type="range"
              min={1}
              max={8}
              value={zonas}
              disabled={jogando || auto.ativo}
              onChange={(e) => setZonas(Number(e.target.value))}
              className="mt-2 w-full accent-rose-500"
            />
            <p className="mt-2 text-sm">
              Multiplicador: <b className="text-emerald-400">{fmt(mult, 2)}x</b>
            </p>
          </div>
          <p className="text-[11px] text-slate-500">
            {ehAdmin && `RTP ${Math.round(conf.rtp * 100)}% · `}
            {textoLimites}
          </p>
          {jogando ? (
            <Botao variante="sucesso" className="w-full py-3" disabled={!abertas.length} onClick={() => sacar()}>
              Sacar {fmtMAS(aposta * mult)}
            </Botao>
          ) : (
            <Botao className="w-full py-3" disabled={auto.ativo} onClick={iniciar}>
              Iniciar rodada
            </Botao>
          )}
          <PainelAuto auto={auto} travado={jogando} />
        </>
      }
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2.5">
        {Array.from({ length: TOTAL }, (_, i) => {
          const aberta = abertas.includes(i);
          const revela = perdeu && perigo.includes(i);
          return (
            <button
              key={i}
              onClick={() => abrir(i)}
              className={`flex h-20 items-center justify-center rounded-2xl text-3xl transition-all duration-200 active:scale-90 ${
                revela
                  ? "animate-[pulsar_.35s_ease-out] bg-rose-600/70 shadow-[0_0_25px_-5px_rgba(244,63,94,.9)]"
                  : aberta
                    ? "animate-[pulsar_.3s_ease-out] bg-cyan-500/25 ring-1 ring-cyan-400/60"
                    : "bg-[linear-gradient(180deg,#1c1a33,#12101f)] ring-1 ring-white/5 hover:-translate-y-0.5 hover:ring-cyan-400/40"
              }`}
            >
              {revela ? icHZ.perigo : aberta ? icHZ.seguro : ""}
            </button>
          );
        })}
      </div>
    </Painel>
  );
}
