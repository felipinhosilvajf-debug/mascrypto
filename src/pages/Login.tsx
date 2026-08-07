import { useState } from "react";
import { useApp } from "../store/AppContext";
import { Botao, Card, Input } from "../components/UI";

export default function Login() {
  const { entrar, registrar, toast } = useApp();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [load, setLoad] = useState(false);

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
        toast("Conta criada! Você ganhou 500 MAS 🎁", "ok");
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
      toast(chave ? mapa[chave] : m.replace("Firebase: ", ""), "erro");
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07060f] p-4">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-fuchsia-700/25 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[500px] w-[500px] rounded-full bg-indigo-600/25 blur-[130px]" />
      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        <div className="flex flex-col justify-center gap-5 px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-2xl font-black text-white shadow-lg shadow-fuchsia-900/50">
              M
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                MAS<span className="text-fuchsia-400">crypto</span>
              </h1>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">rede oficial MAS</p>
            </div>
          </div>
          <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
            Mine, jogue e <span className="bg-gradient-to-r from-fuchsia-400 to-amber-300 bg-clip-text text-transparent">multiplique</span> seus MAS.
          </h2>
          <p className="max-w-md text-slate-400">
            Mineração 24h, cassino com 6 jogos, carteira com conversão para BRL, USD, BTC e ETH,
            quarto personalizável, recompensas diárias e ranking global.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["⛏️", "Mineração"],
              ["🎰", "Cassino"],
              ["💱", "Carteira"],
              ["🏠", "Quarto"],
            ].map(([e, t]) => (
              <div key={t} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="text-2xl">{e}</div>
                <div className="mt-1 text-xs font-semibold text-slate-300">{t}</div>
              </div>
            ))}
          </div>
        </div>

        <Card glow className="bg-slate-950/70 p-7">
          <div className="mb-6 flex rounded-xl bg-white/5 p-1">
            {(["login", "registro"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
                  modo === m ? "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white" : "text-slate-400"
                }`}
              >
                {m === "login" ? "Entrar" : "Criar conta"}
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
            <Botao className="w-full py-3" disabled={load}>
              {load ? "Processando..." : modo === "login" ? "Entrar na rede" : "Criar minha carteira"}
            </Botao>
          </form>
          <p className="mt-5 text-center text-xs text-slate-500">
            🔒 Autenticação segura via Firebase. Ao entrar você aceita os termos da rede MAS.
          </p>
        </Card>
      </div>
    </div>
  );
}
