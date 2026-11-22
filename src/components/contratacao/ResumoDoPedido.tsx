import { ArrowRight } from 'lucide-react';
import {
  ALTERACOES,
  CONVENIOS,
  DEVOLUCAO,
  ITENS,
  MOTIVOS,
  MOTIVOS_DESLIGAMENTO,
  TIPOS,
  cpfFormatado,
  reajuste,
  tipoDoPedido,
} from '../../../api/_shared/contratacao-regras.js';
import { CARTAO } from '../cadastros/estilos';
import type { FormularioContratacao } from '../../services/contratacaoApi';
import { dataBr } from './formatos';

/**
 * O pedido em poucas linhas, só com as respostas (22/11/2026). Quem abre o
 * link lê "Cargo: Operador de escavadeira" em vez de procurar a bolinha
 * marcada entre quatro opções. O documento completo (igual ao PDF) continua
 * logo abaixo para quem quiser conferir.
 */

type Dado = { rotulo: string; valor: string; largo?: boolean; meia?: boolean; destaque?: boolean; mudanca?: [string, string] };

const nomes = (lista: string[] | undefined, opcoes: Record<string, string>) => (lista ?? []).map(item => opcoes[item]).filter(Boolean).join(', ');
const vazio = (valor?: string | number | null) => (valor === undefined || valor === null || String(valor).trim() === '');

export const dadosDoPedido = (form: FormularioContratacao): Dado[] => {
  const f = form as FormularioContratacao & Record<string, string | string[] | undefined>;
  const texto = (chave: string) => String(f[chave] ?? '');
  const tipo = tipoDoPedido(form);
  if (tipo === 'promocao') {
    return [
      { rotulo: 'Colaborador', valor: texto('candidato'), destaque: true },
      { rotulo: 'Registro', meia: true, valor: texto('registro') },
      { rotulo: 'Tipo de alteração', valor: (ALTERACOES as Record<string, string>)[texto('alteracao')] ?? '' },
      { rotulo: 'Setor / Obra', valor: texto('area') },
      { rotulo: 'Cargo', valor: '', mudanca: [texto('cargoAtual'), texto('cargoProposto')], largo: true },
      { rotulo: 'Salário', valor: `Reajuste de ${reajuste(texto('salarioAtual'), texto('salarioProposto'))}`, mudanca: [texto('salarioAtual'), texto('salarioProposto')], largo: true },
      { rotulo: 'Nível', meia: true, valor: '', mudanca: [texto('nivelAtual'), texto('nivelProposto')] },
      { rotulo: 'Admissão', meia: true, valor: dataBr(texto('admissao')) },
      { rotulo: 'Por que', valor: texto('justificativa'), largo: true },
    ];
  }
  if (tipo === 'desligamento') {
    const devolucao = nomes(f.devolucao as string[], DEVOLUCAO);
    return [
      { rotulo: 'Colaborador', valor: texto('candidato'), destaque: true },
      { rotulo: 'Matrícula', meia: true, valor: texto('registro') },
      { rotulo: 'Cargo / Setor', valor: texto('posicao'), largo: true },
      { rotulo: 'Motivo', valor: (MOTIVOS_DESLIGAMENTO as Record<string, string>)[texto('motivoDeslig')] ?? '', largo: true },
      { rotulo: 'Data do desligamento', meia: true, valor: dataBr(texto('desligamento')) },
      { rotulo: 'Pagamento da rescisão', meia: true, valor: dataBr(texto('pagamentoRescisao')) },
      { rotulo: 'Pedido por', meia: true, valor: texto('solicitadoPor') },
      { rotulo: 'Admissão', meia: true, valor: dataBr(texto('admissao')) },
      { rotulo: 'Convênios', valor: nomes(f.convenios as string[], CONVENIOS), largo: true },
      { rotulo: 'Devolver', valor: [devolucao, texto('devolucaoOutros')].filter(Boolean).join(' · '), largo: true },
      { rotulo: 'Observações', valor: texto('obs'), largo: true },
    ];
  }
  const motivo = form.motivo === 'outro' ? `Outro: ${form.motivoOutro}` : (MOTIVOS as Record<string, string>)[form.motivo] ?? '';
  return [
    { rotulo: 'Candidato', valor: form.candidato, destaque: true },
    { rotulo: 'CPF', meia: true, valor: cpfFormatado(form.cpf ?? '') },
    { rotulo: 'Cargo / Função', valor: `${form.posicao}${Number(form.quantidade) > 1 ? ` (${form.quantidade} vagas)` : ''}` },
    { rotulo: 'Início previsto', meia: true, valor: dataBr(form.inicio ?? '') },
    { rotulo: 'Salário / Benefícios', valor: form.salario },
    { rotulo: 'Frente de obra / Setor', valor: form.area },
    { rotulo: 'Motivo', valor: motivo },
    { rotulo: 'Tipo de contratação', valor: (TIPOS as Record<string, string>)[form.tipo] ?? '' },
    { rotulo: 'Prioridade', meia: true, valor: form.prioridade },
    { rotulo: 'Quem pediu', meia: true, valor: form.requisitante },
    { rotulo: 'Precisa de', valor: form.itens.includes('nenhum') ? 'Nada da lista' : nomes(form.itens, ITENS), largo: true },
    { rotulo: 'Observações', valor: form.obs, largo: true },
    { rotulo: 'Aprovados', valor: form.aprovados, largo: true },
    { rotulo: 'Comentários', valor: form.comentarios, largo: true },
  ];
};

export function ResumoDoPedido({ form }: { form: FormularioContratacao }) {
  const dados = dadosDoPedido(form).filter(dado => !vazio(dado.valor) || (dado.mudanca && dado.mudanca.some(lado => !vazio(lado))));
  return (
    <section className={`${CARTAO} p-4 sm:p-5`} aria-labelledby="ct-dados" data-testid="dados-do-pedido">
      <h2 id="ct-dados" className="mb-3 text-base font-black text-slate-900">Dados do pedido</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-6">
        {dados.map(dado => (
          <div key={dado.rotulo} className={`min-w-0 border-b border-slate-100 pb-2 ${dado.largo ? 'col-span-2' : dado.meia ? 'col-span-1' : 'col-span-2 sm:col-span-1'}`}>
            <dt className="text-xs font-semibold text-[#5b6870]">{dado.rotulo}</dt>
            {dado.mudanca ? (
              <dd className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-base text-slate-900">
                <span className="text-slate-600">{dado.mudanca[0] || '—'}</span>
                <ArrowRight className="size-4 shrink-0 text-[#176b4d]" aria-label="passa para" />
                <strong className="font-bold text-slate-950">{dado.mudanca[1] || '—'}</strong>
                {dado.valor && <span className="text-sm font-semibold text-[#176b4d]">({dado.valor})</span>}
              </dd>
            ) : (
              <dd className={`whitespace-pre-line text-slate-950 [overflow-wrap:anywhere] ${dado.destaque ? 'text-lg font-bold' : 'text-base'}`}>{dado.valor}</dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
