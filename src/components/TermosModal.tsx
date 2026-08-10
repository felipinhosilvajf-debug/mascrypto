import { useState } from "react";
import { Botao, Card } from "./UI";

/** Versão atual dos termos. Ao alterar o texto, incremente para exigir novo aceite. */
export const TERMOS_VERSAO = "1.0.0";

const CLAUSULAS = [
  {
    titulo: "1. Natureza da moeda MAS",
    texto:
      "A MAScoin (MAS) é um crédito virtual/fictício de uso exclusivamente interno desta plataforma privada. " +
      "Não constitui moeda de curso legal, valor mobiliário, criptoativo negociável em mercados externos nem " +
      "promessa de rendimento. Seu valor, cotação, conversão e regras de uso são definidos e limitados " +
      "estritamente ao ambiente do site, podendo ser ajustados pela administração a qualquer momento.",
  },
  {
    titulo: "2. Plataforma em fase Beta",
    texto:
      "O MAScrypto encontra-se em estágio de testes (fase Beta). O sistema pode passar por atualizações, " +
      "otimizações, correções de bugs, manutenções programadas ou emergenciais, reajustes de economia, " +
      "alterações de mensagens, reinicializações de dados de teste e mudanças de funcionalidades " +
      "sem aviso prévio.",
  },
  {
    titulo: "3. Isenção de responsabilidade",
    texto:
      "Ao aceitar estes termos, o usuário declara ciência e concordância integral com as regras vigentes, " +
      "com eventuais reajustes do sistema, com os termos de serviço e com a política de privacidade, " +
      "isentando os administradores e operadores de responsabilidades decorrentes de modificações, " +
      "instabilidades, perdas de progresso ou indisponibilidades próprias do ambiente Beta.",
  },
  {
    titulo: "4. Uso responsável e conduta",
    texto:
      "Os módulos de entretenimento (jogos, sorteios e bilheteria) utilizam exclusivamente créditos " +
      "virtuais e têm caráter recreativo. É proibido o uso de scripts, automações não autorizadas, " +
      "exploração de falhas ou qualquer tentativa de manipular saldos. O descumprimento pode acarretar " +
      "suspensão ou exclusão da conta. Recomendado para maiores de 18 anos.",
  },
  {
    titulo: "5. Dados e privacidade",
    texto:
      "Armazenamos e-mail, dados de perfil, saldos, inventário e histórico de transações para operar a " +
      "plataforma. O e-mail funciona como identificador público da sua carteira para transferências entre " +
      "jogadores. O aceite destes termos é registrado com data, hora e versão.",
  },
];

/** Modal bloqueante de aceite dos Termos de Uso. */
export default function TermosModal({
  onAceitar,
  onRecusar,
  somenteLeitura = false,
  onFechar,
}: {
  onAceitar?: () => void;
  onRecusar?: () => void;
  somenteLeitura?: boolean;
  onFechar?: () => void;
}) {
  const [leu, setLeu] = useState(false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md">
      <Card glow className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden bg-slate-950/95 p-0">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-xl">
              📜
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Termos de Uso e Política da Plataforma</h2>
              <p className="text-[11px] text-slate-400">
                Versão {TERMOS_VERSAO} · Leia atentamente antes de continuar
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] font-bold text-amber-200">
            ⚠️ Plataforma em fase BETA · A moeda MAS é um crédito virtual interno, sem valor monetário real fora do site.
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {CLAUSULAS.map((c) => (
            <div key={c.titulo}>
              <h3 className="font-black text-fuchsia-300">{c.titulo}</h3>
              <p className="mt-1 leading-relaxed text-slate-300">{c.texto}</p>
            </div>
          ))}
          <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-slate-400">
            Ao clicar em “Li e concordo”, registramos seu aceite com data, hora e versão dos termos no banco de dados
            da plataforma.
          </p>
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          {somenteLeitura ? (
            <Botao variante="ghost" className="w-full" onClick={onFechar}>
              Fechar
            </Botao>
          ) : (
            <>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3">
                <input
                  type="checkbox"
                  checked={leu}
                  onChange={(e) => setLeu(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-fuchsia-500"
                />
                <span className="text-xs font-bold text-white">
                  Li e concordo com os Termos de Uso, com a natureza virtual da moeda MAS e com as condições da
                  fase Beta.
                </span>
              </label>
              <div className="mt-3 flex gap-2">
                <Botao variante="ghost" className="flex-1" onClick={onRecusar}>
                  Recusar e sair
                </Botao>
                <Botao variante="primario" className="flex-[2]" disabled={!leu} onClick={onAceitar}>
                  Li e concordo com os Termos de Uso
                </Botao>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
