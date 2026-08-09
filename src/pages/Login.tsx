import { useEffect, useState } from "react";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { Card, Input } from "../components/UI";

export default function Login() {
  const { entrar, registrar, toast } = useApp();
  const { cfg } = useConfig();
  const L = cfg.landing;
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [load, setLoad] = useState(false);
  const [digitado, setDigitado] = useState("");
  const bonus = Math.max(0, Math.round(cfg.saldoInicial));

  /* Efeito de digitação do slogan (reinicia quando o Admin muda o texto) */
  useEffect(() => {
    const alvo = L.slogan || "";
    setDigitado("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDigitado(alvo.slice(0, i));
      if (i >= alvo.length) clearInterval(iv);
    }, 65);
    return () => clearInterval(iv);
  }, [L.slogan]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoad(true);
    try {
      if (modo === "login") {
        await entrar(email.trim(), senha);
        toast("Bem-vindo de volta! 🚀", "ok");
      } else {
        if (nome.trim().length < 2) throw new Error("Informe um nome válido");
        await registrar(nome.trim(), email.trim(), senha);
        toast(`Conta criada! Você ganhou ${bonus} MAS de bônus 🎁`, "ok");
      }
    } catch (err) {
      const m = (err as Error).message || "";
      const mapa: Record<string, string> = {
        "auth/invalid-credential": "E-mail ou senha incorretos.",
        "auth/email-already-in-use": "Este e-mail já está cadastrado.",
        "auth/weak-password": "A senha precisa ter no mínimo 6 caracteres.",
        "auth/invalid-email": "E-mail inválido.",
        "auth/network-request-failed": "Falha de rede. Verifique sua conexão.",
      };
      const chave = Object.keys(mapa).find((k) => m.includes(k));
      // remove qualquer prefixo técnico da mensagem original
      const limpo = m.replace(/^\s*(Firebase:|FirebaseError:|Error:)\s*/i, "");
      toast(chave ? mapa[chave] : limpo || "Não foi possível concluir.", "erro");
    } finally {
      setLoad(false);
    }
  };

  const c1 = L.corPrimaria;
  const c2 = L.corSecundaria;
  const glow = L.brilhoNeon;

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: L.corFundo }}
    >
      {/* Pixel-art neon grid (animada) */}
      {L.pixelArt && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14] animate-[pixelPan_18s_linear_infinite]"
          style={{
            backgroundImage: `linear-gradient(${c1}55 1px, transparent 1px), linear-gradient(90deg, ${c2}55 1px, transparent 1px)`,
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          }}
        />
      )}

      {/* Orbes de brilho */}
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] animate-[flutua_13s_ease-in-out_infinite] rounded-full blur-[130px]"
        style={{ background: `${c1}33` }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-32 h-[520px] w-[520px] animate-[flutua_17s_ease-in-out_infinite_reverse] rounded-full blur-[130px]"
        style={{ background: `${c2}22` }}
      />

      {/* Partículas flutuantes */}
      {L.particulas &&
        Array.from({ length: 26 }, (_, i) => (
          <span
            key={i}
            className="pointer-events-none absolute h-1 w-1 rounded-full animate-[particula_6s_linear_infinite]"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              background: i % 2 ? c2 : c1,
              boxShadow: `0 0 8px ${i % 2 ? c2 : c1}`,
              animationDelay: `${(i % 9) * -0.7}s`,
              animationDuration: `${4 + (i % 6)}s`,
            }}
          />
        ))}

      {/* Scanlines CRT */}
      {L.scanlines && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
          }}
        />
      )}

      <div className="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        {/* Lado esquerdo: marca + features */}
        <div className="flex flex-col justify-center gap-5 px-2">
          <div className="flex items-center gap-3">
            <div
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-3xl font-black text-white"
              style={{
                background: `linear-gradient(135deg, ${c1}, ${c2})`,
                boxShadow: glow ? `0 0 40px -6px ${c1}` : "none",
              }}
            >
              {L.logoUrl ? (
                <img src={L.logoUrl} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <span>{L.logoEmoji}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">{L.marca}</h1>
              <p
                className="text-[11px] font-black uppercase tracking-[0.3em]"
                style={{ color: c2 }}
              >
                {digitado}
                <span className="animate-pulse">▌</span>
              </p>
            </div>
          </div>

          <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">{L.titulo}</h2>
          <p className="max-w-md text-slate-400">{L.subtitulo}</p>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {L.features.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl border p-3 text-center transition hover:-translate-y-1"
                style={{
                  borderColor: `${c1}30`,
                  background: "rgba(255,255,255,0.03)",
                  boxShadow: glow ? `inset 0 0 20px -14px ${c2}` : "none",
                }}
              >
                <div className="text-2xl">{f.icone}</div>
                <div className="mt-1 text-[11px] font-black text-white">{f.titulo}</div>
                <div className="text-[9px] text-slate-500">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Lado direito: formulário */}
        <Card
          glow
          className="bg-slate-950/70 p-7"
          {...(glow ? { style: { boxShadow: `0 0 60px -18px ${c1}` } } : {})}
        >
          <div className="mb-6 flex rounded-xl bg-white/5 p-1">
            {(["login", "registro"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className="flex-1 rounded-lg py-2.5 text-sm font-bold transition"
                style={
                  modo === m
                    ? { background: `linear-gradient(110deg, ${c1}, ${c2})`, color: "#fff" }
                    : { color: "#94a3b8" }
                }
              >
                {m === "login" ? L.btnEntrar : L.btnCriar}
              </button>
            ))}
          </div>
          <form onSubmit={enviar} className="space-y-3">
            {modo === "registro" && (
              <Input placeholder="Seu nome de minerador" value={nome} onChange={(e) => setNome(e.target.value)} />
            )}
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Senha (mín. 6 caracteres)"
              value={senha}
              required
              onChange={(e) => setSenha(e.target.value)}
            />
            <button
              type="submit"
              disabled={load}
              className="w-full rounded-xl py-3 text-sm font-black text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{
                background: `linear-gradient(110deg, ${c1}, ${c2})`,
                boxShadow: glow ? `0 6px 24px -8px ${c1}` : "none",
              }}
            >
              {load ? "Processando..." : modo === "login" ? L.btnEntrar : `${L.btnCriar} · +${bonus} MAS`}
            </button>
          </form>
          <p className="mt-5 text-center text-xs text-slate-500">{L.rodape}</p>
        </Card>
      </div>
    </div>
  );
}
