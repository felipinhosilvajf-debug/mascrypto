import { useState } from "react";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { fmtBRL, fmtMAS, fmtNum } from "../lib/economia";
import { Abas, Botao, Campo, Card, Input, Selo, Sparkline, Vazio } from "./UI";

const MOEDAS = [
  { s: "BRL", nome: "Real", simb: "R$", taxaBRL: 1, e: "🇧🇷", casas: 2 },
  { s: "USD", nome: "Dólar", simb: "US$", taxaBRL: 5.42, e: "🇺🇸", casas: 2 },
  { s: "EUR", nome: "Euro", simb: "€", taxaBRL: 5.88, e: "🇪🇺", casas: 2 },
  { s: "BTC", nome: "Bitcoin", simb: "₿", taxaBRL: 384520.33, e: "🟠", casas: 8 },
  { s: "ETH", nome: "Ethereum", simb: "Ξ", taxaBRL: 19870.11, e: "🔷", casas: 6 },
  { s: "USDT", nome: "Tether", simb: "₮", taxaBRL: 5.42, e: "🟢", casas: 2 },
];

export default function WalletView() {
  const { data, mover, precoMAS, historicoPreco, toast } = useApp();
  const { cfg } = useConfig();
  const [aba, setAba] = useState<"converter" | "pix" | "enviar" | "extrato">("converter");
  const [qtd, setQtd] = useState(100);
  const [moeda, setMoeda] = useState("BRL");
  const [chavePix, setChavePix] = useState("");
  const [deposito, setDeposito] = useState(100);
  const [destino, setDestino] = useState("");
  const [envio, setEnvio] = useState(50);

  if (!data) return null;

  const m = MOEDAS.find((x) => x.s === moeda)!;
  const taxa = cfg.taxaConversao;
  const bruto = (qtd * precoMAS) / m.taxaBRL;
  const liquido = bruto * (1 - taxa);
  const variacao = historicoPreco.length > 1 ? ((precoMAS - historicoPreco[0]) / historicoPreco[0]) * 100 : 0;

  /* MAS → moeda (crédito em BRL na carteira, convertido pela cotação) */
  const converter = () => {
    if (qtd <= 0) return toast("Quantidade inválida", "erro");
    const creditoBRL = liquido * m.taxaBRL;
    if (
      mover({
        mas: -qtd,
        brl: creditoBRL,
        titulo: `Conversão MAS → ${moeda}`,
        detalhe: `${m.simb} ${fmtNum(liquido, m.casas)}`,
        xp: 5,
      })
    )
      toast(`Convertido! ${m.simb} ${fmtNum(liquido, m.casas)} creditados`, "ok");
  };

  /* R$ → MAS */
  const comprarMAS = (valorBRL: number) => {
    if (valorBRL <= 0) return;
    const recebe = (valorBRL / precoMAS) * (1 - taxa);
    if (mover({ mas: recebe, brl: -valorBRL, titulo: "Compra de MAS", detalhe: fmtBRL(valorBRL), xp: 5 }))
      toast(`+${fmtMAS(recebe)} adquiridos`, "ok");
  };

  /* Depósito PIX (simulado) */
  const depositar = () => {
    if (deposito < 10) return toast("Depósito mínimo: R$ 10,00", "erro");
    mover({ brl: deposito, titulo: "Depósito PIX", detalhe: "Confirmado", xp: 10 });
    toast(`${fmtBRL(deposito)} creditados via PIX ✅`, "ok");
  };

  const sacar = () => {
    if (!cfg.saquesAtivos) return toast("Saques temporariamente suspensos", "erro");
    if (!chavePix.trim()) return toast("Informe sua chave PIX", "erro");
    if (data.brl < cfg.saqueMinimo) return toast(`Saque mínimo: ${fmtBRL(cfg.saqueMinimo)}`, "erro");
    const v = data.brl;
    if (mover({ brl: -v, titulo: "Saque PIX", detalhe: chavePix }))
      toast(`Saque de ${fmtBRL(v)} solicitado — até 24h úteis`, "ok");
    setChavePix("");
  };

  const enviar = () => {
    if (!destino.trim()) return toast("Informe o destinatário", "erro");
    if (envio <= 0) return toast("Valor inválido", "erro");
    if (mover({ mas: -envio, titulo: "Transferência enviada", detalhe: `Para ${destino}` }))
      toast(`${fmtMAS(envio)} enviados para ${destino}`, "ok");
    setDestino("");
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card glow className="overflow-hidden lg:col-span-2">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300/80">Carteira MAS</p>
              <p className="mt-1 text-4xl font-black text-white sm:text-5xl">{fmtMAS(data.saldo)}</p>
              <p className="mt-1 text-sm text-slate-400">
                ≈ {fmtBRL(data.saldo * precoMAS)} · 1 MAS = {fmtBRL(precoMAS)}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-right">
              <p className="text-[10px] font-bold uppercase text-sky-400/80">Saldo em Reais</p>
              <p className="text-2xl font-black text-sky-300">{fmtBRL(data.brl)}</p>
            </div>
          </div>
          <div className="mt-4 h-20">
            <Sparkline dados={historicoPreco} cor={variacao >= 0 ? "#34d399" : "#fb7185"} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Selo tom={variacao >= 0 ? "verde" : "vermelho"}>
              {variacao >= 0 ? "▲" : "▼"} {fmtNum(Math.abs(variacao), 2)}% 24h
            </Selo>
            <span className="break-all font-mono text-[10px] text-fuchsia-300/70">
              mas1{data.uid.slice(0, 24).toLowerCase()}
            </span>
          </div>
        </Card>

        <Card>
          <h3 className="mb-2 text-sm font-black text-white">📊 Cotações MAS</h3>
          <div className="space-y-0.5">
            {MOEDAS.map((x) => (
              <div key={x.s} className="flex items-center justify-between border-b border-white/5 py-1.5 text-sm last:border-0">
                <span className="text-slate-300">
                  {x.e} {x.s}
                </span>
                <span className="font-bold text-white">
                  {x.simb} {fmtNum(precoMAS / x.taxaBRL, x.casas)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Abas
        abas={[
          { id: "converter" as const, nome: "Converter", emoji: "💱" },
          { id: "pix" as const, nome: "PIX", emoji: "🏦" },
          { id: "enviar" as const, nome: "Enviar", emoji: "📤" },
          { id: "extrato" as const, nome: "Extrato", emoji: "🧾" },
        ]}
        ativa={aba}
        onChange={setAba}
      />

      {aba === "converter" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="font-black text-white">MAS → Moeda</h3>
            <p className="text-xs text-slate-400">Taxa da rede: {fmtNum(taxa * 100, 1)}%</p>
            <div className="mt-3 space-y-3">
              <Campo label="Quantidade de MAS">
                <Input type="number" value={qtd} onChange={(e) => setQtd(Number(e.target.value))} />
              </Campo>
              <div className="flex gap-1.5">
                {[25, 50, 100].map((p) => (
                  <Botao
                    key={p}
                    variante="ghost"
                    className="flex-1 py-1.5 text-xs"
                    onClick={() => setQtd(Math.floor((data.saldo * p) / 100))}
                  >
                    {p}%
                  </Botao>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MOEDAS.map((x) => (
                  <button
                    key={x.s}
                    onClick={() => setMoeda(x.s)}
                    className={`rounded-xl border py-2 text-xs font-bold transition ${
                      moeda === x.s
                        ? "border-fuchsia-400 bg-fuchsia-500/20 text-white"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {x.e} {x.s}
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Bruto</span>
                  <span>{m.simb} {fmtNum(bruto, m.casas)}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Taxa</span>
                  <span>−{m.simb} {fmtNum(bruto * taxa, m.casas)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-lg font-black text-emerald-400">
                  <span>Recebe</span>
                  <span>{m.simb} {fmtNum(liquido, m.casas)}</span>
                </div>
              </div>
              <Botao className="w-full py-3" disabled={qtd <= 0 || qtd > data.saldo} onClick={converter}>
                Converter agora
              </Botao>
            </div>
          </Card>

          <Card>
            <h3 className="font-black text-white">Reais → MAS</h3>
            <p className="text-xs text-slate-400">Use seu saldo em R$ para comprar MAScoin</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[50, 100, 500, 1000].map((v) => (
                <button
                  key={v}
                  onClick={() => comprarMAS(v)}
                  disabled={data.brl < v}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/10 disabled:opacity-30"
                >
                  <p className="text-lg font-black text-white">{fmtBRL(v)}</p>
                  <p className="text-xs text-emerald-300">≈ {fmtMAS((v / precoMAS) * (1 - taxa))}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {aba === "pix" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="font-black text-white">🏦 Depositar via PIX</h3>
            <div className="mt-3 space-y-3">
              <Campo label="Valor do depósito (R$)">
                <Input type="number" value={deposito} onChange={(e) => setDeposito(Number(e.target.value))} />
              </Campo>
              <div className="flex gap-1.5">
                {[50, 100, 250, 500].map((v) => (
                  <Botao key={v} variante="ghost" className="flex-1 py-1.5 text-xs" onClick={() => setDeposito(v)}>
                    {v}
                  </Botao>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
                <div className="mx-auto grid h-24 w-24 grid-cols-6 gap-0.5 rounded-lg bg-white p-1.5">
                  {Array.from({ length: 36 }, (_, i) => (
                    <span key={i} className={(i * 7) % 3 === 0 ? "bg-slate-900" : "bg-white"} />
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">QR Code PIX · MAScrypto Pagamentos</p>
              </div>
              <Botao variante="sucesso" className="w-full py-3" onClick={depositar}>
                Confirmar depósito de {fmtBRL(deposito)}
              </Botao>
            </div>
          </Card>

          <Card>
            <h3 className="font-black text-white">💸 Sacar para conta</h3>
            <p className="text-xs text-slate-400">
              Disponível: <b className="text-sky-300">{fmtBRL(data.brl)}</b> · mínimo {fmtBRL(cfg.saqueMinimo)}
            </p>
            <div className="mt-3 space-y-3">
              <Campo label="Chave PIX">
                <Input placeholder="CPF, e-mail ou telefone" value={chavePix} onChange={(e) => setChavePix(e.target.value)} />
              </Campo>
              <Botao
                variante="ouro"
                className="w-full py-3"
                disabled={!cfg.saquesAtivos || data.brl < cfg.saqueMinimo}
                onClick={sacar}
              >
                {cfg.saquesAtivos ? `Sacar ${fmtBRL(data.brl)}` : "Saques suspensos"}
              </Botao>
              <p className="text-[11px] text-slate-500">
                Processamento em até 24h úteis · sem taxa para saques acima de {fmtBRL(cfg.saqueMinimo)}.
              </p>
            </div>
          </Card>
        </div>
      )}

      {aba === "enviar" && (
        <Card className="mx-auto max-w-lg">
          <h3 className="font-black text-white">📤 Transferir MAS</h3>
          <div className="mt-3 space-y-3">
            <Campo label="Destinatário">
              <Input placeholder="E-mail ou endereço mas1..." value={destino} onChange={(e) => setDestino(e.target.value)} />
            </Campo>
            <Campo label="Quantidade">
              <Input type="number" value={envio} onChange={(e) => setEnvio(Number(e.target.value))} />
            </Campo>
            <Botao className="w-full py-3" disabled={envio > data.saldo} onClick={enviar}>
              Enviar {fmtMAS(envio)}
            </Botao>
          </div>
        </Card>
      )}

      {aba === "extrato" && (
        <Card>
          <h3 className="mb-3 font-black text-white">🧾 Extrato completo</h3>
          {data.historico.length === 0 ? (
            <Vazio emoji="📭" titulo="Nenhuma movimentação" texto="Suas transações aparecerão aqui." />
          ) : (
            <div className="max-h-[500px] space-y-1 overflow-y-auto pr-1">
              {data.historico.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{h.t}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {h.d} · {new Date(h.ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-black ${h.v >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {h.v >= 0 ? "+" : "−"}
                    {h.moeda === "BRL" ? fmtBRL(Math.abs(h.v)) : fmtMAS(Math.abs(h.v))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
