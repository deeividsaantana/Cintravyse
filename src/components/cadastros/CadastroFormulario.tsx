import { useId, useMemo, useState, type FormEvent } from 'react';
import { normalizarBusca } from '../../utils/cadastrosLista';
import { AlertTriangle, Camera, ChevronDown, Search, X } from 'lucide-react';
import type { CadastroCategoriaId } from '../../utils/cadastrosCategorias';
import type { DadosCadastros } from '../../utils/cadastrosLista';
import { CAMPOS, CLASSES_DA_TELA, camposFaltando, type CampoCadastro, type ValoresCadastro } from './camposCadastro';
import CadastroPainel from './CadastroPainel';
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, FOCO, ROTULO } from './estilos';
import { chaveDoCargo, mapaDeCargos } from '../../utils/hierarquia';
import { Avatar } from './pessoasVisual';
import { normalizeRegistryKey } from '../../masterData/centralRegistry';

interface Props {
  categoria: CadastroCategoriaId;
  titulo: string;
  editandoId: string | null;
  valoresIniciais: ValoresCadastro;
  dados: DadosCadastros;
  erro: string;
  salvando: boolean;
  onSalvar: (valores: ValoresCadastro) => void;
  onFechar: () => void;
}

/**
 * Formulário de qualquer tipo de cadastro. Obrigatórios primeiro e marcados
 * por escrito; o resto em "Mais informações". O erro aparece no topo e junto
 * do campo, em frase que diz o que fazer.
 */
export default function CadastroFormulario({ categoria, titulo, editandoId, valoresIniciais, dados, erro, salvando, onSalvar, onFechar }: Props) {
  const base = useId();
  const [valores, setValores] = useState<ValoresCadastro>(valoresIniciais);
  const [tentou, setTentou] = useState(false);
  const porId = useMemo(() => new Map(dados.funcionarios.map(item => [item.id, item])), [dados.funcionarios]);
  const cadastroDeCargos = useMemo(() => mapaDeCargos(dados.cargos), [dados.cargos]);
  const nivelDe = (cargo?: string) => cadastroDeCargos.get(chaveDoCargo(cargo))?.nivel ?? null;
  // Colaborador repetido (mesma matrícula ou mesmo nome) avisa enquanto digita.
  const repetidoEm = (campoId: string) => {
    if (categoria !== 'funcionarios' || !['matricula', 'nome'].includes(campoId)) return undefined;
    const chave = (valor: unknown) => normalizeRegistryKey(valor).replace(campoId === 'matricula' ? /^0+(?=.)/ : /$^/, '');
    const digitado = chave(valores[campoId]);
    if (!digitado) return undefined;
    const anterior = editandoId ? porId.get(editandoId) : undefined;
    if (anterior && chave(anterior[campoId as 'nome' | 'matricula']) === digitado) return undefined;
    return dados.funcionarios.find(item => item.id !== editandoId && chave(item[campoId as 'nome' | 'matricula']) === digitado);
  };
  const campos = CAMPOS[categoria].filter(campo => !campo.quando || campo.quando(valores));
  const principais = campos.filter(campo => !campo.extra);
  const extras = campos.filter(campo => campo.extra);
  const extrasPreenchidos = extras.some(campo => {
    const valor = valores[campo.id];
    return Array.isArray(valor) ? valor.length > 0 : Boolean(valor);
  });
  const [mostrarExtras, setMostrarExtras] = useState(extrasPreenchidos);
  const [buscaPessoas, setBuscaPessoas] = useState('');
  // Campos com seção (ficha do colaborador) vêm em blocos com título, na
  // ordem em que aparecem; os sem seção ficam num bloco só, sem título.
  const secoes = principais.reduce<Array<{ titulo: string; campos: CampoCadastro[] }>>((lista, item) => {
    const titulo = item.secao || '';
    const ultima = lista[lista.length - 1];
    if (ultima && ultima.titulo === titulo) ultima.campos.push(item);
    else lista.push({ titulo, campos: [item] });
    return lista;
  }, []);
  const faltando = tentou ? camposFaltando(categoria, valores) : [];

  const mudar = (id: string, valor: ValoresCadastro[string]) => setValores(atual => ({ ...atual, [id]: valor }));

  const enviar = (event: FormEvent) => {
    event.preventDefault();
    setTentou(true);
    if (camposFaltando(categoria, valores).length > 0) return;
    onSalvar(valores);
  };

  const campo = (item: CampoCadastro) => {
    const id = `${base}-${item.id}`;
    const invalido = faltando.includes(item.id);
    const rotulo = (
      <label htmlFor={id} className={ROTULO}>
        {item.label}
        {item.obrigatorio && <span className="ml-1 text-xs font-bold text-[#c2410c]">obrigatório</span>}
      </label>
    );
    const repetido = repetidoEm(item.id);
    const ajuda = invalido
      ? <p id={`${id}-erro`} className="text-sm font-semibold text-rose-700">Preencha este campo.</p>
      : repetido ? <p id={`${id}-erro`} role="alert" className="text-sm font-semibold text-rose-700" data-testid="cadastro-repetido">Já cadastrado: {repetido.nome}{repetido.matricula ? ` (matrícula ${repetido.matricula})` : ''}. Repetido não entra.</p>
      : item.ajuda ? <p className="text-xs text-slate-500">{item.ajuda}</p> : null;
    const classeCampo = `${CAMPO} ${invalido || repetido ? 'border-rose-400 bg-rose-50/40' : ''}`;
    const aria = { 'aria-invalid': invalido || Boolean(repetido) || undefined, 'aria-describedby': invalido || repetido ? `${id}-erro` : undefined };

    if (item.tipo === 'classes') {
      const marcadas = Array.isArray(valores[item.id]) ? valores[item.id] as string[] : [];
      return (
        <fieldset key={item.id} className="space-y-2 sm:col-span-2">
          <legend className={ROTULO}>
            {item.label}
            {item.obrigatorio && <span className="ml-1 text-xs font-bold text-[#c2410c]">obrigatório</span>}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {CLASSES_DA_TELA.map(classe => {
              const marcado = marcadas.includes(classe.tipo);
              return (
                <label key={classe.tipo} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm font-medium transition duration-200 ${marcado ? 'border-[#176b4d] bg-emerald-50 text-[#176b4d]' : 'border-slate-200 text-slate-700 hover:border-emerald-300'}`}>
                  <input
                    type="checkbox"
                    className="size-5 accent-[#176b4d]"
                    checked={marcado}
                    onChange={event => mudar(item.id, event.target.checked ? [...marcadas, classe.tipo] : marcadas.filter(tipo => tipo !== classe.tipo))}
                  />
                  {classe.label}
                </label>
              );
            })}
          </div>
          {invalido && <p className="text-sm font-semibold text-rose-700">Marque pelo menos uma classe.</p>}
          {!invalido && item.ajuda && <p className="text-xs text-slate-500">{item.ajuda}</p>}
        </fieldset>
      );
    }

    if (item.tipo === 'pessoas') {
      const marcadas = Array.isArray(valores[item.id]) ? valores[item.id] as string[] : [];
      const termo = normalizarBusca(buscaPessoas);
      const todas = item.opcoes?.(dados, editandoId) ?? [];
      const opcoes = todas.filter(opcao => !termo || normalizarBusca(opcao.label).includes(termo));
      const nomeDe = (valor: string) => porId.get(valor)?.nome || todas.find(opcao => opcao.valor === valor)?.label || valor;
      const tirar = (valor: string) => mudar(item.id, marcadas.filter(atual => atual !== valor));
      return (
        <fieldset key={item.id} className="space-y-3 sm:col-span-2" data-testid="cadastro-campo-pessoas">
          <legend className={ROTULO}>
            {item.label}
            {item.obrigatorio && <span className="ml-1 text-xs font-bold text-[#c2410c]">obrigatório</span>}
          </legend>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <input type="search" aria-label="Buscar pessoa" placeholder="Buscar pessoa para pôr na equipe" value={buscaPessoas} onChange={event => setBuscaPessoas(event.target.value)} className={`${CAMPO} pl-11`} />
              </div>
              <div className={`max-h-80 overflow-y-auto rounded-xl border ${invalido ? 'border-rose-400' : 'border-slate-200'}`}>
                {opcoes.length === 0 && <p className="p-3 text-sm text-slate-500">Ninguém com esse nome.</p>}
                {opcoes.map(opcao => {
                  const marcado = marcadas.includes(opcao.valor);
                  const pessoa = porId.get(opcao.valor);
                  return (
                    <label key={opcao.valor} className={`flex min-h-12 cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-1.5 text-sm last:border-0 ${marcado ? 'bg-emerald-50' : 'hover:bg-white'}`}>
                      <input
                        type="checkbox"
                        className="size-5 shrink-0 accent-[#176b4d]"
                        checked={marcado}
                        onChange={event => mudar(item.id, event.target.checked ? [...marcadas, opcao.valor] : marcadas.filter(valor => valor !== opcao.valor))}
                      />
                      <Avatar nome={pessoa?.nome || opcao.label} nivel={nivelDe(pessoa?.cargo)} tamanho="p" />
                      <span className="min-w-0">
                        <span className={`block truncate ${marcado ? 'font-bold text-[#0f5a3d]' : 'font-semibold text-slate-800'}`}>{pessoa?.nome || opcao.label}</span>
                        <span className="block truncate text-xs text-slate-500">{[pessoa?.cargo, pessoa?.matricula && `Matrícula ${pessoa.matricula}`].filter(Boolean).join(' · ')}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3" data-testid="cadastro-pessoas-escolhidas">
              <p className="mb-2 text-sm font-bold text-slate-800">Na equipe: {marcadas.length} {marcadas.length === 1 ? 'pessoa' : 'pessoas'}</p>
              {marcadas.length === 0 ? (
                <p className="text-sm text-slate-600">Marque as pessoas na lista ao lado.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {marcadas.map(valor => (
                    <li key={valor} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1 text-sm font-semibold text-slate-800">
                      <Avatar nome={nomeDe(valor)} nivel={nivelDe(porId.get(valor)?.cargo)} tamanho="p" />
                      <span className="max-w-40 truncate">{nomeDe(valor)}</span>
                      <button type="button" aria-label={`Tirar ${nomeDe(valor)} da equipe`} onClick={() => tirar(valor)} className={`inline-flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-700 ${FOCO}`}>
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {invalido && <p className="text-sm font-semibold text-rose-700">Escolha pelo menos uma pessoa.</p>}
        </fieldset>
      );
    }

    if (item.tipo === 'marcar') {
      return (
        <label key={item.id} htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 sm:col-span-2">
          <input id={id} type="checkbox" className="size-5 accent-[#176b4d]" checked={Boolean(valores[item.id])} onChange={event => mudar(item.id, event.target.checked)} />
          {item.label}
        </label>
      );
    }

    if (item.tipo === 'foto') {
      const foto = typeof valores[item.id] === 'string' ? valores[item.id] as string : '';
      return (
        <div key={item.id} className="space-y-1.5 sm:col-span-2">
          <span className={ROTULO}>{item.label}</span>
          <div className="flex items-center gap-3">
            {foto && <img src={foto} alt="Foto do cadastro" className="size-16 rounded-xl border border-slate-200 object-cover" />}
            <label htmlFor={id} className={`${BOTAO_SECUNDARIO} flex-1 cursor-pointer`}>
              <Camera className="size-5" aria-hidden="true" />
              {foto ? 'Trocar foto' : 'Tirar ou escolher foto'}
            </label>
            <input
              id={id}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={event => {
                const arquivo = event.target.files?.[0];
                if (!arquivo) return;
                const leitor = new FileReader();
                leitor.onload = () => mudar(item.id, String(leitor.result || ''));
                leitor.readAsDataURL(arquivo);
              }}
            />
            {foto && (
              <button type="button" aria-label="Remover foto" onClick={() => mudar(item.id, '')} className={`inline-flex size-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-rose-700 ${FOCO}`}>
                <X className="size-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      );
    }

    if (item.tipo === 'selecao') {
      const opcoes = item.opcoes?.(dados, editandoId) ?? [];
      const atual = typeof valores[item.id] === 'string' ? valores[item.id] as string : '';
      // Registro antigo pode apontar para algo que saiu da lista (empresa
      // inativa): a opção continua visível para a edição não apagar o vínculo.
      const semOpcao = atual && !opcoes.some(opcao => opcao.valor === atual);
      return (
        <div key={item.id} className="space-y-1.5">
          {rotulo}
          <select id={id} value={atual} onChange={event => mudar(item.id, event.target.value)} className={`${classeCampo} cursor-pointer`} {...aria}>
            <option value="">{item.obrigatorio ? 'Escolha…' : 'Nenhum'}</option>
            {semOpcao && <option value={atual}>{atual} (fora da lista)</option>}
            {opcoes.map(opcao => <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>)}
          </select>
          {ajuda}
        </div>
      );
    }

    return (
      <div key={item.id} className="space-y-1.5">
        {rotulo}
        <input
          id={id}
          type={item.tipo === 'numero' ? 'text' : item.tipo === 'data' ? 'date' : 'text'}
          inputMode={item.tipo === 'numero' ? 'decimal' : undefined}
          value={typeof valores[item.id] === 'string' ? valores[item.id] as string : ''}
          placeholder={item.placeholder}
          autoCapitalize={item.maiusculas ? 'characters' : undefined}
          onChange={event => mudar(item.id, item.maiusculas ? event.target.value.toUpperCase() : event.target.value)}
          className={classeCampo}
          {...aria}
        />
        {ajuda}
      </div>
    );
  };

  const formId = `${base}-form`;
  // Pessoas (colaborador, cargo, equipe) abrem em tela cheia, como a ficha.
  const telaCheia = ['funcionarios', 'cargos', 'equipes'].includes(categoria);
  const cartao = telaCheia ? 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5' : '';
  return (
    <CadastroPainel
      telaCheia={telaCheia}
      titulo={titulo}
      topo={<span className="text-xs font-bold text-[#5b6870]">{editandoId ? 'Editar cadastro' : 'Novo cadastro'}</span>}
      onFechar={onFechar}
      testId="cadastro-formulario"
      rodape={(
        <div className={`flex gap-2 ${telaCheia ? 'sm:justify-end' : ''}`}>
          <button type="button" onClick={onFechar} className={`${BOTAO_SECUNDARIO} flex-1 ${telaCheia ? 'sm:flex-none sm:px-6' : ''}`}>Cancelar</button>
          <button type="submit" form={formId} disabled={salvando} className={`${BOTAO_PRIMARIO} flex-[2] ${telaCheia ? 'sm:flex-none sm:px-8' : ''}`} data-testid="cadastro-salvar">
            {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Cadastrar'}
          </button>
        </div>
      )}
    >
      <form id={formId} onSubmit={enviar} noValidate className={telaCheia ? 'mx-auto max-w-4xl space-y-4' : 'space-y-5'}>
        {(erro || faltando.length > 0) && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <span>{erro || 'Faltam campos obrigatórios, marcados em vermelho.'}</span>
          </div>
        )}
        {secoes.map(secao => (secao.titulo ? (
          <section key={secao.titulo} aria-label={secao.titulo} className={telaCheia ? `space-y-3 ${cartao}` : 'space-y-3 border-t border-slate-100 pt-4 first:border-0 first:pt-0'}>
            <h3 className={telaCheia ? 'text-base font-bold text-slate-900' : 'text-sm font-bold text-slate-800'}>{secao.titulo}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{secao.campos.map(campo)}</div>
          </section>
        ) : (
          <div key="geral" className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${cartao}`}>{secao.campos.map(campo)}</div>
        )))}
        {extras.length > 0 && (
          <div className={`rounded-2xl border border-slate-200 ${telaCheia ? 'bg-white' : ''}`}>
            <button
              type="button"
              aria-expanded={mostrarExtras}
              onClick={() => setMostrarExtras(atual => !atual)}
              className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 text-left text-sm font-bold text-slate-700 ${FOCO}`}
            >
              Mais informações
              <ChevronDown className={`size-5 text-slate-500 transition-transform duration-200 ${mostrarExtras ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {mostrarExtras && <div className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2">{extras.map(campo)}</div>}
          </div>
        )}
      </form>
    </CadastroPainel>
  );
}
