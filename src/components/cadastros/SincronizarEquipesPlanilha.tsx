import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, RotateCcw, X } from 'lucide-react';
import { applyTeamSyncPlan, buildTeamSyncPlan, parseEfetivoRows, type TeamSyncPlan } from '../../utils/teamSpreadsheetSync';
import { generateSecurePublicToken } from '../../utils/publicLinkSecurity';
import { createCorporateWorkbook } from '../../utils/excelCorporate';
import type { Empresa, Funcionario, GrupoEquipe, ObraLocal } from '../../types';
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './estilos';


/**
 * Atualizar as equipes pela aba "Efetivo" da planilha. Mora em Cadastros >
 * Equipes (a tela única de equipes): o plano é montado e conferido antes de
 * qualquer gravação.
 */
interface Props {
  funcionarios: Funcionario[];
  gruposEquipe: GrupoEquipe[];
  obras: ObraLocal[];
  empresas: Empresa[];
  onSync: (
    funcionarios: Funcionario[],
    gruposEquipe: GrupoEquipe[],
    resumo: TeamSyncPlan['resumo'],
  ) => Promise<{ success: boolean; message: string }>;
}

export interface SincronizarEquipesRef {
  /** Abre o seletor de arquivo (o botão fica no menu Mais ações). */
  escolherArquivo: () => void;
}

const SincronizarEquipesPlanilha = forwardRef<SincronizarEquipesRef, Props>(function SincronizarEquipesPlanilha({ funcionarios, gruposEquipe, obras, empresas, onSync }, ref) {
  const arquivoRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({ escolherArquivo: () => arquivoRef.current?.click() }), []);
  const safeFuncionarios = funcionarios;
  const safeGroups = gruposEquipe;
  const safeObras = obras;
  const safeEmpresas = empresas;
  const [syncPlan, setSyncPlan] = useState<TeamSyncPlan | null>(null);
  const [syncFileName, setSyncFileName] = useState('');
  const [syncError, setSyncError] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  const [resultado, setResultado] = useState('');
  const fechar = () => { setSyncPlan(null); setSyncFileName(''); setResultado(''); setSyncError(''); };

  // Lê a aba "Efetivo" e monta o plano. Nada é gravado aqui.
  const lerPlanilhaEfetivo = async (file: File) => {
    setSyncBusy(true);
    setSyncError('');
    setSyncPlan(null);
    setResultado('');
    try {
      const workbook = await createCorporateWorkbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.getWorksheet('Efetivo')
        || workbook.worksheets.find(item => /efetivo/i.test(item.name));
      if (!sheet) throw new Error('A planilha não tem a aba "Efetivo".');

      // O cabeçalho não fica na primeira linha: a aba abre com um título.
      let headerRow = 0;
      let headers: string[] = [];
      for (let row = 1; row <= Math.min(sheet.rowCount, 10); row += 1) {
        const values = (sheet.getRow(row).values as unknown[]).slice(1).map(value => String(value ?? '').trim());
        if (values.some(value => /mat/i.test(value)) && values.some(value => /encarregado/i.test(value))) {
          headerRow = row;
          headers = values;
          break;
        }
      }
      if (!headerRow) throw new Error('Não encontrei o cabeçalho com "MAT. COLAB." e "NOME ENCARREGADO".');

      const rows: Array<Record<string, unknown>> = [];
      for (let row = headerRow + 1; row <= sheet.rowCount; row += 1) {
        const values = (sheet.getRow(row).values as unknown[]).slice(1);
        const registro: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          if (header) registro[header] = values[index];
        });
        if (Object.values(registro).some(value => value !== undefined && value !== null && String(value).trim())) {
          rows.push(registro);
        }
      }

      const { linhas, ignoradas, matriculasNaPlanilha } = parseEfetivoRows(rows);
      if (linhas.length === 0) throw new Error('Nenhuma linha aproveitável: confira as colunas de matrícula e encarregado.');
      const plano = buildTeamSyncPlan({
        linhas,
        ignoradas,
        matriculasNaPlanilha,
        funcionarios: safeFuncionarios,
        gruposEquipe: safeGroups,
        obraId: safeObras[0]?.id || '',
        empresaId: safeEmpresas[0]?.id || '',
        criarToken: () => generateSecurePublicToken('presenca'),
      });
      setSyncFileName(file.name);
      setSyncPlan(plano);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Não foi possível ler a planilha.');
    } finally {
      setSyncBusy(false);
    }
  };

  const confirmarSincronizacao = async () => {
    if (!syncPlan) return;
    setSyncBusy(true);
    setSyncError('');
    const { funcionarios: proximosFuncionarios, gruposEquipe: proximasEquipes } =
      applyTeamSyncPlan(syncPlan, safeFuncionarios, safeGroups);
    try {
      const result = await onSync(proximosFuncionarios, proximasEquipes, syncPlan.resumo);
      if (!result.success) {
      setSyncError(`As equipes foram salvas neste computador, mas o Supabase não foi atualizado: ${result.message}`);
        return;
      }
      const desmobilizados = syncPlan.resumo.desmobilizar > 0 ? ` ${syncPlan.resumo.desmobilizar} colaborador(es) desmobilizado(s) por sair da planilha.` : '';
      setResultado(`Equipes sincronizadas no Supabase: ${syncPlan.resumo.criar} criadas, ${syncPlan.resumo.atualizar} atualizadas, ${syncPlan.resumo.desativar} desativadas.${desmobilizados}`);
    } finally {
      setSyncBusy(false);
    }
  };

  return (
    <>
      <input
        ref={arquivoRef}
        type="file"
        accept=".xlsx,.xlsm"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={syncBusy}
        data-testid="equipes-sincronizar-arquivo"
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void lerPlanilhaEfetivo(file);
        }}
      />
    {syncPlan && createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="Conferir sincronização das equipes">
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">Conferir antes de gravar</h2>
                <p className="mt-1 text-sm text-slate-500">{syncFileName} · {syncPlan.resumo.pessoasNaPlanilha} pessoas na planilha</p>
              </div>
              <button type="button" onClick={fechar} aria-label="Fechar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </header>

            <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-5 sm:grid-cols-5">
              {[
                { rotulo: 'Equipes novas', valor: syncPlan.resumo.criar },
                { rotulo: 'Atualizadas', valor: syncPlan.resumo.atualizar },
                { rotulo: 'Desativadas', valor: syncPlan.resumo.desativar },
                { rotulo: 'Colaboradores criados', valor: syncPlan.resumo.colaboradoresNovos },
                { rotulo: 'Saem do efetivo', valor: syncPlan.resumo.desmobilizar, destaque: syncPlan.resumo.desmobilizar > 0 },
              ].map(item => (
                <div key={item.rotulo} className={`rounded-xl p-3 ${item.destaque ? 'bg-rose-50' : 'bg-slate-50'}`}>
                  <strong className={`text-2xl font-black ${item.destaque ? 'text-rose-800' : 'text-slate-900'}`}>{item.valor}</strong>
                  <span className="mt-1 block text-xs text-slate-500">{item.rotulo}</span>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {syncPlan.resumo.inalteradas > 0 && (
                <p className="mb-3 text-xs text-slate-500">{syncPlan.resumo.inalteradas} equipe(s) sem alteração, não listadas.</p>
              )}
              <ul className="space-y-2">
                {syncPlan.entradas.filter(entry => entry.acao !== 'inalterada').map(entry => (
                  <li key={entry.grupo.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${
                        entry.acao === 'criar' ? 'bg-emerald-100 text-emerald-800'
                          : entry.acao === 'desativar' ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-900'}`}
                      >{entry.acao}</span>
                      <strong className="text-sm font-bold text-slate-900">{entry.nome}</strong>
                      <span className="text-xs text-slate-500">{entry.total} pessoa(s)</span>
                    </div>
                    {entry.entram.length > 0 && (
                      <p className="mt-2 text-xs text-emerald-800"><b>Entram:</b> {entry.entram.map(item => item.nome).join(', ')}</p>
                    )}
                    {entry.saem.length > 0 && (
                      <p className="mt-1 text-xs text-rose-800"><b>Saem:</b> {entry.saem.map(item => item.nome).join(', ')}</p>
                    )}
                  </li>
                ))}
              </ul>
              {syncPlan.colaboradoresParaDesmobilizar.length > 0 && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-xs font-bold text-rose-900">{syncPlan.colaboradoresParaDesmobilizar.length} colaborador(es) fora da planilha — serão marcados como DESMOBILIZADO</p>
                  <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-xs text-rose-900">
                    {syncPlan.colaboradoresParaDesmobilizar.map(item => (
                      <li key={item.id}>{item.nome}{item.matricula ? ` · ${item.matricula}` : ''}{item.cargo ? ` · ${item.cargo}` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
              {syncPlan.colaboradoresReativados.length > 0 && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-bold text-emerald-900">{syncPlan.colaboradoresReativados.length} colaborador(es) de volta na planilha: voltam ao efetivo como ATIVO</p>
                  <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-xs text-emerald-900">
                    {syncPlan.colaboradoresReativados.map(item => (
                      <li key={item.id}>{item.nome}{item.matricula ? ` · ${item.matricula}` : ''}{item.cargo ? ` · ${item.cargo}` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
              {syncPlan.ignoradas.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-bold text-amber-900">{syncPlan.ignoradas.length} linha(s) ignorada(s)</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-amber-900">
                    {syncPlan.ignoradas.slice(0, 8).map(item => <li key={item.linha}>Linha {item.linha}: {item.motivo}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              {resultado ? (
                <>
                  <p role="status" className="flex-1 text-sm font-bold text-emerald-800" data-testid="equipes-sincronizar-resultado">{resultado}</p>
                  <button type="button" onClick={fechar} className={BOTAO_PRIMARIO}><Check className="h-4 w-4" aria-hidden="true" /> Fechar</button>
                </>
              ) : (
                <>
                  <p className="flex-1 text-xs text-slate-500">
                    {syncError || 'Equipes fora da planilha ficam inativas, nunca são excluídas. Colaboradores fora da planilha são marcados como desmobilizados (saem do efetivo), o cadastro nunca é apagado. Os links já distribuídos continuam valendo.'}
                  </p>
                  <button type="button" onClick={fechar} className={BOTAO_SECUNDARIO}>Cancelar</button>
                  <button type="button" onClick={() => void confirmarSincronizacao()} disabled={syncBusy} className={BOTAO_PRIMARIO}>{syncBusy ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {syncBusy ? 'Gravando no Supabase' : 'Gravar sincronização'}</button>
                </>
              )}
            </footer>
          </div>
        </div>,
        document.body,
      )}

    {syncError && !syncPlan && createPortal(
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="alertdialog" aria-modal="true" aria-label="Não deu para ler a planilha">
        <div className="w-full max-w-md rounded-lg bg-white p-5">
          <h2 className="text-lg font-black text-slate-900">Não deu para ler a planilha</h2>
          <p className="mt-2 text-sm text-slate-700" data-testid="equipes-sincronizar-erro">{syncError}</p>
          <button type="button" onClick={fechar} className={`${BOTAO_PRIMARIO} mt-4 w-full`}>Entendi</button>
        </div>
      </div>,
      document.body,
    )}
    </>
  );
});

export default SincronizarEquipesPlanilha;
