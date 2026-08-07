import { useState } from "react";
import { useApp } from "../store/AppContext";
import { Botao, Card, Input, Sparkline, fmt } from "../components/UI";

const MOEDAS = [
  { s: "BRL", nome: "Real", simb: "R$", taxaBRL: 1, e: "🇧🇷" },
  { s: "USD", nome: "Dólar", simb: "US$", taxaBRL: 5.42, e: "🇺🇸" },
  { s: "EUR", nome: "Euro", simb: "€", taxaBRL: 5.88, e: "🇪🇺" },
  { s: "BTC", nome: "Bitcoin", simb: "₿", taxaBRL: 384520.33, e: "🟠" },
  { s: "ETH", nome: "Ethereum", simb: "Ξ", taxaBRL: 19870.11, e: "🔷" },
  { s: "USDT", nome: "Tether", simb: "₮", taxaBRL: 5.42, e: "🟢" },
];

export default function Carteira() {
  const { data, atualizar, precoMAS, historicoPreco, toast } = useApp();
  const [qtd, setQtd] = useState(100);
  const [moeda, setMoeda] = useState("BRL");
  const [chavePix, setChavePix] = useState("");
  const [destino, setDestino] = useState("");
  const [envio, setEnvio] = useState(50);

  if (!data) return null;
  const m = MOEDAS.find((x) => x.s === moeda)!;
  const taxa = 0.02;
  const bruto = (qtd * precoMAS) / m.taxaBRL;
  const liquido = bruto * (1 - taxa);

  const converter = () => {
    if (qtd <= 0 || qtd > data.saldo) return toast("Quantidade inválida", "erro");
    atualizar((d) => ({
      ...d,
      saldo: d.saldo - qtd,
      brl: d.brl + (moeda === "BRL" ? liquido : liquido * m.taxaBRL),
      historico: [
        { t: `Conversão MAS→${moeda}`, v: -qtd, d: `${m.simb} ${fmt(liquido, moeda === "BTC" ? 8 : 2)}`, ts: Date.now() },
        ...d.historico,
      ].slice(0, 40),
    }));
    toast(`Convertido! ${m.simb} ${fmt(liquido, moeda === "BTC" ? 8 : 2)} creditado 💸`, "ok");
  };

  const comprarMAS = (valorBRL: number) => {
    if (data.brl < valorBRL) return toast("Saldo em reais insuficiente", "erro");
    const recebe = (valorBRL / precoMAS) * 0.98;
    atualizar((d) => ({
      ...d,
      brl: d.brl - valorBRL,
      saldo: d.saldo + recebe,
      historico: [{ t: "Compra de MAS", v: recebe, d: `R$ ${fmt(valorBRL)}`, ts: Date.now() }, ...d.historico].slice(0, 40),
    }));
    toast(`+${fmt(recebe)} MAS comprados 🟣`, "ok");
  };

  const sacar = () => {
    if (!chavePix.trim()) return toast("Informe sua chave PIX", "erro");
    if (data.brl < 50) return toast("Saque mínimo: R$ 50,00", "erro");
    const v = data.brl;
    atualizar((d) => ({
      ...d,
      brl: 0,
      historico: [{ t: "Saque PIX", v: 0, d: `R$ ${fmt(v)} · ${chavePix}`, ts: Date.now() }, ...d.historico].slice(0, 40),
    }));
    toast(`Saque de R$ ${fmt(v)} solicitado (processamento em até 24h) ✅`, "ok");
    setChavePix("");
  };

  const enviar = () => {
    if (!destino.trim()) return toast("Informe o e-mail do destinatário", "erro");
    if (envio <= 0 || envio > data.saldo) return toast("Valor inválido", "erro");
    atualizar((d) => ({
      ...d,
      saldo: d.saldo - envio,
      historico: [{ t: "Transferência", v: -envio, d: `Para ${destino}`, ts: Date.now() }, ...d.historico].slice(0, 40),
    }));
    toast(`${fmt(envio)} MAS enviados para ${destino} 📤`, "ok");
    setDestino("");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card glow className="lg:col-span-2 bg-gradient-to-br from-emerald-900/30 to-slate-950/60">
          <p className="text-xs uppercase tracking-widest text-emerald-300/80">Carteira MAS</p>
          <p className="text-4xl font-black text-white">{fmt(data.saldo)} MAS</p>
          <p className="text-sm text-slate-400">≈ R$ {fmt(data.saldo * precoMAS)} · 1 MAS = R$ {fmt(precoMAS, 4)}</p>
          <div className="mt-4 h-20">
            <Sparkline dados={historicoPreco} cor="#34d399" />
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
            <p className="text-slate-400">Endereço da sua carteira</p>
            <p className="break-all font-mono text-xs text-fuchsia-300">
              mas1{data.uid.slice(0, 30).toLowerCase()}
            </p>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-widest text-slate-400">Saldo em Reais</p>
          <p className="text-3xl font-black text-white">R$ {fmt(data.brl)}</p>
          <div className="mt-4 space-y-2">
            <Input placeholder="Chave PIX (CPF, e-mail, telefone)" value={chavePix} onChange={(e) => setChavePix(e.target.value)} />
            <Botao variante="sucesso" className="w-full" onClick={sacar}>
              Sacar via PIX
            </Botao>
            <p className="text-[11px] text-slate-500">Saque mínimo R$ 50,00 · sem taxas · até 24h úteis.</p>
          </div>
          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="mb-2 text-xs text-slate-400">Comprar MAS com reais</p>
            <div className="flex gap-2">
              {[50, 100, 500].map((v) => (
                <Botao key={v} variante="ghost" className="flex-1 px-0 text-xs" onClick={() => comprarMAS(v)}>
                  R$ {v}
                </Botao>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-bold text-white">💱 Conversor MAS</h3>
          <p className="text-xs text-slate-400">Taxa da rede: 2%</p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-slate-400">Quantidade de MAS</label>
              <Input type="number" value={qtd} onChange={(e) => setQtd(Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MOEDAS.map((x) => (
                <button
                  key={x.s}
                  onClick={() => setMoeda(x.s)}
                  className={`rounded-xl border py-2 text-sm font-bold transition ${
                    moeda === x.s ? "border-fuchsia-400 bg-fuchsia-500/20 text-white" : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {x.e} {x.s}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Bruto</span>
                <span>{m.simb} {fmt(bruto, moeda === "BTC" || moeda === "ETH" ? 8 : 2)}</span>
              </div>
              <div className="flex justify-between text-sm text-rose-400">
                <span>Taxa (2%)</span>
                <span>-{m.simb} {fmt(bruto * taxa, moeda === "BTC" || moeda === "ETH" ? 8 : 2)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-lg font-black text-emerald-400">
                <span>Você recebe</span>
                <span>{m.simb} {fmt(liquido, moeda === "BTC" || moeda === "ETH" ? 8 : 2)}</span>
              </div>
            </div>
            <Botao className="w-full py-3" onClick={converter}>
              Converter agora
            </Botao>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="font-bold text-white">📤 Enviar MAS</h3>
            <div className="mt-3 space-y-2">
              <Input placeholder="E-mail ou carteira do destinatário" value={destino} onChange={(e) => setDestino(e.target.value)} />
              <Input type="number" value={envio} onChange={(e) => setEnvio(Number(e.target.value))} />
              <Botao variante="ghost" className="w-full" onClick={enviar}>
                Transferir
              </Botao>
            </div>
          </Card>
          <Card>
            <h3 className="mb-2 font-bold text-white">📊 Cotações</h3>
            {MOEDAS.map((x) => (
              <div key={x.s} className="flex justify-between border-b border-white/5 py-1.5 text-sm last:border-0">
                <span className="text-slate-300">{x.e} 1 MAS →</span>
                <span className="font-bold text-white">
                  {x.simb} {fmt(precoMAS / x.taxaBRL, x.taxaBRL > 100 ? 8 : 4)}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
