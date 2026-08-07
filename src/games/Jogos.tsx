import { useEffect, useRef, useState } from "react";
import { Botao, fmt } from "../components/UI";
import { useApp } from "../store/AppContext";
import { ControleAposta, Painel, useAposta } from "./Comum";

/* ---------------- CARA OU COROA ---------------- */
export function CaraCoroa() {
  const { registrarAposta, toast } = useApp();
  const { aposta, setAposta, saldo, valida } = useAposta();
  const [lado, setLado] = useState<"cara" | "coroa">("cara");
  const [girando, setGirando] = useState(false);
  const [res, setRes] = useState<"cara" | "coroa" | null>(null);

  const jogar = () => {
    if (!valida || girando) return toast("Aposta inválida", "erro");
    setGirando(true);
    setRes(null);
    setTimeout(() => {
      const r: "cara" | "coroa" = Math.random() < 0.5 ? "cara" : "coroa";
      setRes(r);
      setGirando(false);
      const ganhou = r === lado;
      registrarAposta("Cara ou Coroa", aposta, ganhou ? aposta * 1.96 : 0);
      toast(ganhou ? `Deu ${r}! +${fmt(aposta * 0.96)} MAS 🎉` : `Deu ${r}. Você perdeu 😢`, ganhou ? "ok" : "erro");
    }, 1500);
  };

  return (
    <Painel
      titulo="Cara ou Coroa"
      emoji="🪙"
      lateral={
        <>
          <ControleAposta aposta={aposta} setAposta={setAposta} saldo={saldo} travado={girando} />
          <div className="grid grid-cols-2 gap-2">
            {(["cara", "coroa"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLado(l)}
                className={`rounded-xl border py-3 font-bold capitalize transition ${
                  lado === l ? "border-amber-400 bg-amber-400/20 text-amber-200" : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                {l === "cara" ? "👑 Cara" : "🪙 Coroa"}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">Pagamento 1.96x</p>
          <Botao className="w-full py-3" disabled={girando} onClick={jogar}>
            {girando ? "Girando..." : "Apostar"}
          </Botao>
        </>
      }
    >
      <div className="text-center">
        <div
          className={`mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 text-7xl shadow-2xl ${
            girando ? "animate-spin" : ""
          }`}
        >
          {girando ? "🪙" : res === "cara" ? "👑" : res === "coroa" ? "🪙" : "❓"}
        </div>
        <p className="mt-4 text-xl font-bold capitalize text-white">{girando ? "..." : res || "Faça sua aposta"}</p>
      </div>
    </Painel>
  );
}

/* ---------------- DADOS ---------------- */
export function Dados() {
  const { registrarAposta, toast } = useApp();
  const { aposta, setAposta, saldo, valida } = useAposta();
  const [alvo, setAlvo] = useState(50);
  const [acima, setAcima] = useState(true);
  const [rolando, setRolando] = useState(false);
  const [num, setNum] = useState(50);

  const chance = acima ? 100 - alvo : alvo;
  const mult = chance > 0 ? (98 / chance) : 0;

  const jogar = () => {
    if (!valida || rolando) return toast("Aposta inválida", "erro");
    setRolando(true);
    let c = 0;
    const iv = setInterval(() => {
      setNum(Math.random() * 100);
      if (++c > 15) {
        clearInterval(iv);
        const r = Math.random() * 100;
        setNum(r);
        setRolando(false);
        const ganhou = acima ? r > alvo : r < alvo;
        registrarAposta("Dados", aposta, ganhou ? aposta * mult : 0);
        toast(
          ganhou ? `${r.toFixed(2)} — Ganhou ${fmt(aposta * mult - aposta)} MAS!` : `${r.toFixed(2)} — Perdeu.`,
          ganhou ? "ok" : "erro",
        );
      }
    }, 60);
  };

  return (
    <Painel
      titulo="Dados"
      emoji="🎲"
      lateral={
        <>
          <ControleAposta aposta={aposta} setAposta={setAposta} saldo={saldo} travado={rolando} />
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Rolar {acima ? "acima de" : "abaixo de"}</span>
              <span className="font-bold text-white">{alvo}</span>
            </div>
            <input
              type="range"
              min={2}
              max={98}
              value={alvo}
              disabled={rolando}
              onChange={(e) => setAlvo(Number(e.target.value))}
              className="mt-2 w-full accent-fuchsia-500"
            />
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white/5 p-2">
                <p className="text-slate-500">Chance</p>
                <p className="font-bold text-emerald-400">{chance.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg bg-white/5 p-2">
                <p className="text-slate-500">Multiplicador</p>
                <p className="font-bold text-amber-400">{mult.toFixed(3)}x</p>
              </div>
            </div>
          </div>
          <Botao variante="ghost" className="w-full" onClick={() => setAcima(!acima)} disabled={rolando}>
            Alternar para {acima ? "ABAIXO" : "ACIMA"}
          </Botao>
          <Botao className="w-full py-3" disabled={rolando} onClick={jogar}>
            {rolando ? "Rolando..." : "Rolar dados"}
          </Botao>
        </>
      }
    >
      <div className="w-full max-w-lg text-center">
        <p className="text-7xl font-black text-white">{num.toFixed(2)}</p>
        <div className="relative mt-8 h-3 rounded-full bg-rose-500/40">
          <div
            className="absolute inset-y-0 rounded-full bg-emerald-500"
            style={acima ? { left: `${alvo}%`, right: 0 } : { left: 0, width: `${alvo}%` }}
          />
          <div
            className="absolute -top-2 h-7 w-1.5 rounded bg-white shadow"
            style={{ left: `calc(${num}% - 3px)` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    </Painel>
  );
}

/* ---------------- SLOTS ---------------- */
const SIM = ["🍒", "🍋", "🍊", "🔔", "💎", "7️⃣", "🪙"];
const PAGA: Record<string, number> = { "🍒": 4, "🍋": 5, "🍊": 6, "🔔": 10, "💎": 25, "7️⃣": 50, "🪙": 15 };

export function Slots() {
  const { registrarAposta, toast } = useApp();
  const { aposta, setAposta, saldo, valida } = useAposta();
  const [rolos, setRolos] = useState(["🍒", "💎", "7️⃣"]);
  const [girando, setGirando] = useState(false);
  const [msg, setMsg] = useState("");

  const jogar = () => {
    if (!valida || girando) return toast("Aposta inválida", "erro");
    setGirando(true);
    setMsg("");
    let c = 0;
    const iv = setInterval(() => {
      setRolos([rnd(), rnd(), rnd()]);
      if (++c > 18) {
        clearInterval(iv);
        const f = [rnd(), rnd(), rnd()];
        setRolos(f);
        setGirando(false);
        let ganho = 0;
        if (f[0] === f[1] && f[1] === f[2]) ganho = aposta * PAGA[f[0]];
        else if (f[0] === f[1] || f[1] === f[2] || f[0] === f[2]) ganho = aposta * 1.5;
        registrarAposta("Caça-níqueis", aposta, ganho);
        setMsg(ganho > 0 ? `GANHOU ${fmt(ganho)} MAS!` : "Tente novamente!");
        if (ganho > 0) toast(`🎰 +${fmt(ganho - aposta)} MAS`, "ok");
      }
    }, 80);
  };
  const rnd = () => SIM[Math.floor(Math.random() * SIM.length)];

  return (
    <Painel
      titulo="Caça-níqueis MAS"
      emoji="🎰"
      lateral={
        <>
          <ControleAposta aposta={aposta} setAposta={setAposta} saldo={saldo} travado={girando} />
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
            <p className="mb-2 font-bold text-white">Tabela de prêmios (3 iguais)</p>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(PAGA).map(([s, m]) => (
                <div key={s} className="flex justify-between rounded bg-white/5 px-2 py-1">
                  <span>{s}{s}{s}</span>
                  <span className="font-bold text-amber-400">{m}x</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-slate-500">2 iguais pagam 1.5x</p>
          </div>
          <Botao variante="ouro" className="w-full py-3" disabled={girando} onClick={jogar}>
            {girando ? "Girando..." : "GIRAR"}
          </Botao>
        </>
      }
    >
      <div className="text-center">
        <div className="flex gap-3 rounded-2xl border-4 border-amber-500/60 bg-black/60 p-6">
          {rolos.map((s, i) => (
            <div
              key={i}
              className={`flex h-28 w-24 items-center justify-center rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 text-6xl ${
                girando ? "blur-[1px]" : ""
              }`}
            >
              {s}
            </div>
          ))}
        </div>
        <p className="mt-4 h-6 text-lg font-black text-amber-300">{msg}</p>
      </div>
    </Painel>
  );
}

/* ---------------- CRASH ---------------- */
export function Crash() {
  const { registrarAposta, toast } = useApp();
  const { aposta, setAposta, saldo, valida } = useAposta();
  const [mult, setMult] = useState(1);
  const [estado, setEstado] = useState<"parado" | "voando" | "crash">("parado");
  const [auto, setAuto] = useState(2);
  const [hist, setHist] = useState<number[]>([1.42, 3.2, 1.05, 8.4, 2.11]);
  const ref = useRef<{ crash: number; sacou: boolean }>({ crash: 0, sacou: false });

  useEffect(() => {
    if (estado !== "voando") return;
    const iv = setInterval(() => {
      setMult((m) => {
        const novo = +(m * 1.012).toFixed(3);
        if (!ref.current.sacou && auto > 1 && novo >= auto) {
          sacar(novo);
          return novo;
        }
        if (novo >= ref.current.crash) {
          setEstado("crash");
          setHist((h) => [+ref.current.crash.toFixed(2), ...h].slice(0, 10));
          if (!ref.current.sacou) {
            registrarAposta("Crash", aposta, 0);
            toast(`💥 Crash em ${ref.current.crash.toFixed(2)}x`, "erro");
          }
          setTimeout(() => setEstado("parado"), 2200);
          return ref.current.crash;
        }
        return novo;
      });
    }, 80);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, auto]);

  const sacar = (m: number) => {
    if (ref.current.sacou) return;
    ref.current.sacou = true;
    registrarAposta("Crash", aposta, aposta * m);
    toast(`Sacou em ${m.toFixed(2)}x · +${fmt(aposta * m - aposta)} MAS 🚀`, "ok");
  };

  const iniciar = () => {
    if (!valida) return toast("Aposta inválida", "erro");
    ref.current = { crash: Math.max(1.01, +(0.99 / (1 - Math.random())).toFixed(2)), sacou: false };
    setMult(1);
    setEstado("voando");
  };

  return (
    <Painel
      titulo="Crash"
      emoji="🚀"
      lateral={
        <>
          <ControleAposta aposta={aposta} setAposta={setAposta} saldo={saldo} travado={estado === "voando"} />
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-xs text-slate-400">Auto saque em (x)</p>
            <input
              type="number"
              step="0.1"
              min={1.01}
              value={auto}
              onChange={(e) => setAuto(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 font-bold text-white outline-none"
            />
          </div>
          {estado === "voando" && !ref.current.sacou ? (
            <Botao variante="sucesso" className="w-full py-3" onClick={() => sacar(mult)}>
              SACAR {fmt(aposta * mult)} MAS
            </Botao>
          ) : (
            <Botao className="w-full py-3" disabled={estado === "voando"} onClick={iniciar}>
              {estado === "voando" ? "Em voo..." : "Apostar"}
            </Botao>
          )}
          <div className="flex flex-wrap gap-1">
            {hist.map((h, i) => (
              <span
                key={i}
                className={`rounded px-2 py-1 text-xs font-bold ${
                  h >= 2 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                }`}
              >
                {h.toFixed(2)}x
              </span>
            ))}
          </div>
        </>
      }
    >
      <div className="relative h-full w-full">
        <div className="flex h-full flex-col items-center justify-center">
          <p
            className={`text-8xl font-black ${
              estado === "crash" ? "text-rose-500" : "text-emerald-400"
            }`}
          >
            {mult.toFixed(2)}x
          </p>
          <div
            className="mt-6 text-6xl transition-transform duration-100"
            style={{
              transform:
                estado === "crash"
                  ? "translateY(40px) rotate(120deg)"
                  : `translate(${Math.min(160, mult * 22)}px, ${-Math.min(120, mult * 14)}px)`,
            }}
          >
            {estado === "crash" ? "💥" : "🚀"}
          </div>
          <p className="mt-8 text-sm text-slate-400">
            {estado === "parado" ? "Aposte e saque antes do crash!" : estado === "crash" ? "Explodiu!" : "Voando..."}
          </p>
        </div>
      </div>
    </Painel>
  );
}

/* ---------------- MINES ---------------- */
export function Mines() {
  const { registrarAposta, toast } = useApp();
  const { aposta, setAposta, saldo, valida } = useAposta();
  const [bombas, setBombas] = useState(3);
  const [grid, setGrid] = useState<number[]>([]);
  const [abertos, setAbertos] = useState<number[]>([]);
  const [jogando, setJogando] = useState(false);
  const [perdeu, setPerdeu] = useState(false);

  const mult = (() => {
    let m = 1;
    for (let i = 0; i < abertos.length; i++) m *= (25 - i) / (25 - bombas - i);
    return m * 0.97;
  })();

  const iniciar = () => {
    if (!valida) return toast("Aposta inválida", "erro");
    const b: number[] = [];
    while (b.length < bombas) {
      const n = Math.floor(Math.random() * 25);
      if (!b.includes(n)) b.push(n);
    }
    setGrid(b);
    setAbertos([]);
    setPerdeu(false);
    setJogando(true);
  };

  const abrir = (i: number) => {
    if (!jogando || abertos.includes(i)) return;
    if (grid.includes(i)) {
      setPerdeu(true);
      setJogando(false);
      registrarAposta("Mines", aposta, 0);
      toast("💣 Boom! Você perdeu.", "erro");
      return;
    }
    const novos = [...abertos, i];
    setAbertos(novos);
    if (novos.length === 25 - bombas) sacar(novos.length);
  };

  const sacar = (n = abertos.length) => {
    if (!jogando || n === 0) return;
    registrarAposta("Mines", aposta, aposta * mult);
    toast(`Sacou ${mult.toFixed(2)}x · +${fmt(aposta * mult - aposta)} MAS 💎`, "ok");
    setJogando(false);
  };

  return (
    <Painel
      titulo="Mines"
      emoji="💣"
      lateral={
        <>
          <ControleAposta aposta={aposta} setAposta={setAposta} saldo={saldo} travado={jogando} />
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-xs text-slate-400">Quantidade de bombas: <b className="text-white">{bombas}</b></p>
            <input
              type="range"
              min={1}
              max={20}
              value={bombas}
              disabled={jogando}
              onChange={(e) => setBombas(Number(e.target.value))}
              className="mt-2 w-full accent-rose-500"
            />
            <p className="mt-2 text-sm">
              Multiplicador atual: <b className="text-emerald-400">{mult.toFixed(2)}x</b>
            </p>
          </div>
          {jogando ? (
            <Botao variante="sucesso" className="w-full py-3" disabled={!abertos.length} onClick={() => sacar()}>
              Sacar {fmt(aposta * mult)} MAS
            </Botao>
          ) : (
            <Botao className="w-full py-3" onClick={iniciar}>
              Iniciar rodada
            </Botao>
          )}
        </>
      }
    >
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 25 }, (_, i) => {
          const aberto = abertos.includes(i);
          const revela = perdeu && grid.includes(i);
          return (
            <button
              key={i}
              onClick={() => abrir(i)}
              className={`flex h-16 w-16 items-center justify-center rounded-xl text-3xl transition active:scale-90 ${
                revela
                  ? "bg-rose-600/70"
                  : aberto
                    ? "bg-emerald-500/25 ring-1 ring-emerald-400/50"
                    : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              {revela ? "💣" : aberto ? "💎" : ""}
            </button>
          );
        })}
      </div>
    </Painel>
  );
}

/* ---------------- ROLETA ---------------- */
const NUM_ROLETA = Array.from({ length: 37 }, (_, i) => i);
const VERM = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export function Roleta() {
  const { registrarAposta, toast } = useApp();
  const { aposta, setAposta, saldo, valida } = useAposta();
  const [tipo, setTipo] = useState<"vermelho" | "preto" | "par" | "impar" | "numero">("vermelho");
  const [numero, setNumero] = useState(7);
  const [girando, setGirando] = useState(false);
  const [res, setRes] = useState<number | null>(null);
  const [hist, setHist] = useState<number[]>([]);

  const jogar = () => {
    if (!valida || girando) return toast("Aposta inválida", "erro");
    setGirando(true);
    let c = 0;
    const iv = setInterval(() => {
      setRes(Math.floor(Math.random() * 37));
      if (++c > 25) {
        clearInterval(iv);
        const r = NUM_ROLETA[Math.floor(Math.random() * 37)];
        setRes(r);
        setGirando(false);
        setHist((h) => [r, ...h].slice(0, 12));
        let ganho = 0;
        if (tipo === "numero" && r === numero) ganho = aposta * 36;
        if (tipo === "vermelho" && VERM.includes(r)) ganho = aposta * 2;
        if (tipo === "preto" && r !== 0 && !VERM.includes(r)) ganho = aposta * 2;
        if (tipo === "par" && r !== 0 && r % 2 === 0) ganho = aposta * 2;
        if (tipo === "impar" && r % 2 === 1) ganho = aposta * 2;
        registrarAposta("Roleta", aposta, ganho);
        toast(ganho ? `Saiu ${r}! +${fmt(ganho - aposta)} MAS 🎉` : `Saiu ${r}. Perdeu.`, ganho ? "ok" : "erro");
      }
    }, 70);
  };

  const cor = (n: number) => (n === 0 ? "bg-emerald-600" : VERM.includes(n) ? "bg-rose-600" : "bg-slate-800");

  return (
    <Painel
      titulo="Roleta"
      emoji="🎡"
      lateral={
        <>
          <ControleAposta aposta={aposta} setAposta={setAposta} saldo={saldo} travado={girando} />
          <div className="grid grid-cols-2 gap-2">
            {(["vermelho", "preto", "par", "impar", "numero"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={`rounded-xl border py-2 text-sm font-bold capitalize transition ${
                  tipo === t ? "border-fuchsia-400 bg-fuchsia-500/20 text-white" : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                {t === "numero" ? "Nº (36x)" : t}
              </button>
            ))}
          </div>
          {tipo === "numero" && (
            <input
              type="number"
              min={0}
              max={36}
              value={numero}
              onChange={(e) => setNumero(Math.max(0, Math.min(36, Number(e.target.value))))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 font-bold text-white outline-none"
            />
          )}
          <Botao className="w-full py-3" disabled={girando} onClick={jogar}>
            {girando ? "Girando..." : "Girar roleta"}
          </Botao>
          <div className="flex flex-wrap gap-1">
            {hist.map((h, i) => (
              <span key={i} className={`rounded px-2 py-0.5 text-xs font-bold text-white ${cor(h)}`}>
                {h}
              </span>
            ))}
          </div>
        </>
      }
    >
      <div className="text-center">
        <div
          className={`mx-auto flex h-44 w-44 items-center justify-center rounded-full border-8 border-amber-500/60 text-6xl font-black text-white ${cor(
            res ?? 0,
          )} ${girando ? "animate-spin" : ""}`}
        >
          {res ?? "?"}
        </div>
        <p className="mt-4 text-sm text-slate-400">Aposte em cor, paridade ou número exato</p>
      </div>
    </Painel>
  );
}

/* ---------------- TORRE ---------------- */
export function Torre() {
  const { registrarAposta, toast } = useApp();
  const { aposta, setAposta, saldo, valida } = useAposta();
  const [nivel, setNivel] = useState(0);
  const [jogando, setJogando] = useState(false);
  const [caminho, setCaminho] = useState<number[]>([]);
  const [erro, setErro] = useState<number | null>(null);
  const mult = +(Math.pow(1.45, nivel) * 0.98).toFixed(2);

  const iniciar = () => {
    if (!valida) return toast("Aposta inválida", "erro");
    setCaminho(Array.from({ length: 8 }, () => Math.floor(Math.random() * 3)));
    setNivel(0);
    setErro(null);
    setJogando(true);
  };

  const escolher = (i: number) => {
    if (!jogando) return;
    if (caminho[nivel] === i) {
      setErro(i);
      setJogando(false);
      registrarAposta("Torre", aposta, 0);
      toast("💀 Armadilha! Você caiu.", "erro");
      return;
    }
    const n = nivel + 1;
    setNivel(n);
    if (n === 8) {
      registrarAposta("Torre", aposta, aposta * Math.pow(1.45, 8) * 0.98);
      toast("🏆 Topo da torre! Prêmio máximo!", "ok");
      setJogando(false);
    }
  };

  const sacar = () => {
    if (!jogando || nivel === 0) return;
    registrarAposta("Torre", aposta, aposta * mult);
    toast(`Sacou ${mult}x · +${fmt(aposta * mult - aposta)} MAS 🗼`, "ok");
    setJogando(false);
  };

  return (
    <Painel
      titulo="Torre da Sorte"
      emoji="🗼"
      lateral={
        <>
          <ControleAposta aposta={aposta} setAposta={setAposta} saldo={saldo} travado={jogando} />
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
            <p>
              Andar: <b className="text-white">{nivel}/8</b>
            </p>
            <p>
              Multiplicador: <b className="text-emerald-400">{mult}x</b>
            </p>
            <p className="mt-1 text-xs text-slate-500">Escolha 1 de 3 portas por andar. 1 é armadilha.</p>
          </div>
          {jogando ? (
            <Botao variante="sucesso" className="w-full py-3" disabled={!nivel} onClick={sacar}>
              Sacar {fmt(aposta * mult)} MAS
            </Botao>
          ) : (
            <Botao className="w-full py-3" onClick={iniciar}>
              Escalar torre
            </Botao>
          )}
        </>
      }
    >
      <div className="flex flex-col-reverse gap-2">
        {Array.from({ length: 8 }, (_, andar) => (
          <div key={andar} className="flex items-center gap-2">
            <span className="w-16 text-right text-xs text-slate-500">
              {(Math.pow(1.45, andar + 1) * 0.98).toFixed(2)}x
            </span>
            {[0, 1, 2].map((i) => {
              const passado = andar < nivel;
              const atual = andar === nivel && jogando;
              return (
                <button
                  key={i}
                  disabled={!atual}
                  onClick={() => escolher(i)}
                  className={`h-9 w-20 rounded-lg text-sm font-bold transition ${
                    andar === nivel && erro === i
                      ? "bg-rose-600 text-white"
                      : passado
                        ? "bg-emerald-600/40 text-white"
                        : atual
                          ? "bg-fuchsia-600/70 text-white hover:brightness-125"
                          : "bg-slate-800/60 text-slate-600"
                  }`}
                >
                  {andar === nivel && erro === i ? "💀" : passado ? "✓" : atual ? "?" : ""}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </Painel>
  );
}
