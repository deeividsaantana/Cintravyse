import type { ReactNode } from 'react';
import { ITENS, MOTIVOS, PRIORIDADES, TIPOS, cpfFormatado } from '../../../api/_shared/contratacao-regras.js';
import { FOCO } from '../cadastros/estilos';
import type { CorpoProps } from './papel';
import { valorData } from './papel';

/**
 * Corpo da Solicitação de Contratação (modelo …0008) como formulário de papel:
 * caixas com borda, o nome do campo pequeno em cima e o valor embaixo, como
 * na folha impressa. Quem abre o link lê de cima para baixo e entende na hora.
 */

/** Faixa cinza com o nome da seção, como nos formulários impressos. */
function Faixa({ children }: { children: ReactNode }) {
  return <h3 className="col-span-full border-b border-[#26302b] bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-900">{children}</h3>;
}

/** Uma caixa do formulário. `largura` diz quantas colunas ela ocupa (de 6). */
function Caixa({ rotulo, children, largura = 'sm:col-span-2', id, meia = false }: { rotulo: string; children: ReactNode; largura?: string; id?: string; meia?: boolean }) {
  return (
    <div className={`${meia ? 'col-span-1' : 'col-span-full'} min-w-0 border-b border-r border-[#26302b] px-2.5 pb-1.5 pt-1 ${largura}`}>
      <span id={id} className="block text-xs font-semibold text-[#5b6870]">{rotulo}</span>
      {children}
    </div>
  );
}

const VALOR = 'block min-h-7 pt-0.5 text-[15px] font-medium text-slate-950 [overflow-wrap:anywhere]';
const ENTRADA = `ct-campo-celula min-h-9 w-full rounded-md bg-slate-50 px-2 text-base text-slate-950 outline-none aria-[invalid=true]:bg-rose-50 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-rose-500 sm:text-sm ${FOCO}`;
const OPCAO = 'flex min-h-9 min-w-0 items-center gap-2.5 text-[15px] text-slate-900 sm:min-h-8';
const MARCA = `size-[18px] shrink-0 accent-[#176b4d] ${FOCO}`;

interface Props extends CorpoProps {
  alternarItem: (item: string) => void;
}

export function CorpoContratacao({ form, novo, mudar, erroDe, mensagem, alternarItem }: Props) {
  /** Campo de texto: digitável na folha em branco; travado, vira texto. */
  const texto = (nome: keyof typeof form, rotulo: string, largura?: string, extra: { tipo?: 'date'; numerico?: boolean; placeholder?: string; valor?: string; meia?: boolean } = {}) => (
    <Caixa rotulo={rotulo} largura={largura} meia={extra.meia}>
      {novo ? (
        <input
          name={nome}
          aria-label={rotulo}
          type={extra.tipo ?? 'text'}
          inputMode={extra.numerico ? 'numeric' : undefined}
          autoComplete="off"
          placeholder={extra.placeholder}
          value={String(form[nome] ?? '')}
          onChange={evento => mudar(nome, evento.target.value)}
          className={ENTRADA}
          {...erroDe(nome)}
        />
      ) : <span className={VALOR}>{extra.valor ?? (extra.tipo === 'date' ? valorData(false, String(form[nome] ?? '')) : String(form[nome] ?? '') || '—')}</span>}
      {mensagem(nome)}
    </Caixa>
  );

  return (
    <div className="px-4 pt-3 sm:px-6">
      <div className="grid grid-cols-2 border-l border-t border-[#26302b] sm:grid-cols-6">
        <Faixa>1. Identificação</Faixa>
        {texto('data', 'Data da solicitação', undefined, { tipo: 'date', meia: true })}
        <Caixa rotulo="Prioridade" meia>
          {novo ? (
            <select name="prioridade" aria-label="Prioridade" value={form.prioridade} onChange={e => mudar('prioridade', e.target.value)} className={`${ENTRADA} cursor-pointer`} {...erroDe('prioridade')}>
              <option value="">Escolha</option>
              {PRIORIDADES.map((p: string) => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : <span className={VALOR}>{form.prioridade || '—'}</span>}
          {mensagem('prioridade')}
        </Caixa>
        {texto('requisitante', 'Requisitante (quem pede)')}
        {texto('area', 'Frente de obra / Setor', 'sm:col-span-6')}

        <Faixa>2. Candidato</Faixa>
        {texto('candidato', 'Nome completo', 'sm:col-span-6')}
        {texto('cpf', 'CPF', 'sm:col-span-3', { meia: true, numerico: true, placeholder: '000.000.000-00', valor: novo ? undefined : cpfFormatado(form.cpf ?? '') || '—' })}
        {texto('inicio', 'Início previsto', 'sm:col-span-3', { tipo: 'date', meia: true })}

        <Faixa>3. Vaga</Faixa>
        {texto('posicao', 'Cargo / Função', 'sm:col-span-4', { meia: true })}
        {texto('quantidade', 'Quantidade', 'sm:col-span-2', { numerico: true, meia: true })}
        {texto('salario', 'Salário / Benefícios', 'sm:col-span-6')}
        <Caixa rotulo="Motivo" largura="sm:col-span-3" id="ct-motivo-t">
          <div role="radiogroup" aria-labelledby="ct-motivo-t" className="grid gap-0.5 pt-1" {...erroDe('motivo')}>
            {Object.entries(MOTIVOS).map(([valor, nome]) => (
              <label key={valor} className={OPCAO}>
                <input type="radio" name="motivo" value={valor} aria-readonly={!novo} checked={form.motivo === valor} onChange={() => { if (novo) mudar('motivo', valor); }} className={MARCA} />
                {valor === 'outro' ? 'Outro:' : String(nome)}
                {valor === 'outro' && (novo || form.motivo === 'outro') && (novo
                  ? <input name="motivoOutro" aria-label="Qual é o outro motivo" value={form.motivoOutro} onChange={e => mudar('motivoOutro', e.target.value)} onFocus={() => mudar('motivo', 'outro')} className={`${ENTRADA} min-w-0 flex-1`} {...erroDe('motivoOutro')} />
                  : <span className="min-w-0 flex-1 font-medium [overflow-wrap:anywhere]">{form.motivoOutro}</span>)}
              </label>
            ))}
          </div>
          {mensagem('motivo')}{mensagem('motivoOutro')}
        </Caixa>
        <Caixa rotulo="Tipo de contratação" largura="sm:col-span-3" id="ct-tipo-t">
          <div role="radiogroup" aria-labelledby="ct-tipo-t" className="grid gap-0.5 pt-1" {...erroDe('tipo')}>
            {Object.entries(TIPOS).map(([valor, nome]) => (
              <label key={valor} className={OPCAO}>
                <input type="radio" name="tipo" value={valor} aria-readonly={!novo} checked={form.tipo === valor} onChange={() => { if (novo) mudar('tipo', valor); }} className={MARCA} /> {String(nome)}
              </label>
            ))}
          </div>
          {mensagem('tipo')}
        </Caixa>

        <Faixa>4. Itens necessários para a função (preenchimento obrigatório)</Faixa>
        <div className="col-span-full border-b border-r border-[#26302b] px-2.5 py-1.5">
          <div role="group" aria-label="Itens necessários para a função" className="grid grid-cols-2 gap-x-3 sm:grid-cols-3 max-sm:[&_label]:text-sm" {...erroDe('itens')}>
            {Object.entries(ITENS).map(([valor, nome]) => (
              <label key={valor} className={`${OPCAO} ${valor === 'nenhum' ? 'col-span-full' : ''}`}>
                <input type="checkbox" name="itens" aria-readonly={!novo} checked={form.itens.includes(valor)} onChange={() => { if (novo) alternarItem(valor); }} className={MARCA} />
                {valor === 'nenhum' ? 'A função não requer nenhum destes itens.' : String(nome)}
              </label>
            ))}
          </div>
          {mensagem('itens')}
        </div>

        <Faixa>5. Observações</Faixa>
        {(['obs', 'aprovados'] as const).map(nome => (
          <Caixa key={nome} rotulo={nome === 'obs' ? 'Observações' : 'Aprovados'} largura="sm:col-span-3">
            {novo
              ? <textarea name={nome} aria-label={nome === 'obs' ? 'Observações' : 'Aprovados'} rows={2} value={form[nome]} onChange={e => mudar(nome, e.target.value)} className={`${ENTRADA} py-1.5`} />
              : <span className={`${VALOR} whitespace-pre-line`}>{form[nome] || '—'}</span>}
          </Caixa>
        ))}
        <Caixa rotulo="Comentários" largura="sm:col-span-6">
          {novo
            ? <textarea name="comentarios" aria-label="Comentários" rows={2} value={form.comentarios} onChange={e => mudar('comentarios', e.target.value)} className={`${ENTRADA} py-1.5`} />
            : <span className={`${VALOR} whitespace-pre-line`}>{form.comentarios || '—'}</span>}
        </Caixa>
      </div>
    </div>
  );
}
