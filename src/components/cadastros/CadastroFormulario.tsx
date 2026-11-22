import { useId, useState, type FormEvent } from 'react';
import { normalizarBusca } from '../../utils/cadastrosLista';
import { AlertTriangle, Camera, ChevronDown, Search, X } from 'lucide-react';
import type { CadastroCategoriaId } from '../../utils/cadastrosCategorias';
import type { DadosCadastros } from '../../utils/cadastrosLista';
import { CAMPOS, CLASSES_DA_TELA, camposFaltando, type CampoCadastro, type ValoresCadastro } from './camposCadastro';
import CadastroPainel from './CadastroPainel';
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, FOCO, ROTULO } from './estilos';

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
    const ajuda = invalido
      ? <p id={`${id}-erro`} className="text-sm font-semibold text-rose-700">Preencha este campo.</p>
      : item.ajuda ? <p className="text-xs text-slate-500">{item.ajuda}</p> : null;
    const classeCampo = `${CAMPO} ${invalido ? 'border-rose-400 bg-rose-50/40' : ''}`;
    const aria = { 'aria-invalid': invalido || undefined, 'aria-describedby': invalido ? `${id}-erro` : undefined };

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
      const opcoes = (item.opcoes?.(dados, editandoId) ?? [])
        .filter(opcao => !termo || normalizarBusca(opcao.label).includes(termo))
        // Quem já está na equipe aparece primeiro, para conferir de cara.
        .sort((a, b) => Number(marcadas.includes(b.valor)) - Number(marcadas.includes(a.valor)));
      return (
        <fieldset key={item.id} className="space-y-2 sm:col-span-2" data-testid="cadastro-campo-pessoas">
          <legend className={ROTULO}>
            {item.label}
            {item.obrigatorio && <span className="ml-1 text-xs font-bold text-[#c2410c]">obrigatório</span>}
            <span className="ml-2 text-xs font-semibold text-slate-500">{marcadas.length} {marcadas.length === 1 ? 'escolhida' : 'escolhidas'}</span>
          </legend>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input type="search" aria-label="Buscar pessoa" placeholder="Buscar pessoa" value={buscaPessoas} onChange={event => setBuscaPessoas(event.target.value)} className={`${CAMPO} pl-11`} />
          </div>
          <div className={`max-h-72 overflow-y-auto rounded-xl border ${invalido ? 'border-rose-400' : 'border-slate-200'}`}>
            {opcoes.length === 0 && <p className="p-3 text-sm text-slate-500">Ninguém com esse nome.</p>}
            {opcoes.map(opcao => {
              const marcado = marcadas.includes(opcao.valor);
              return (
                <label key={opcao.valor} className={`flex min-h-11 cursor-pointer items-center gap-3 border-b border-slate-100 px-3 text-sm last:border-0 ${marcado ? 'bg-emerald-50 font-semibold text-[#0f5a3d]' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    className="size-5 accent-[#176b4d]"
                    checked={marcado}
                    onChange={event => mudar(item.id, event.target.checked ? [...marcadas, opcao.valor] : marcadas.filter(valor => valor !== opcao.valor))}
                  />
                  {opcao.label}
                </label>
              );
            })}
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
  return (
    <CadastroPainel
      titulo={titulo}
      topo={<span className="text-xs font-bold text-[#5b6870]">{editandoId ? 'Editar cadastro' : 'Novo cadastro'}</span>}
      onFechar={onFechar}
      testId="cadastro-formulario"
      rodape={(
        <div className="flex gap-2">
          <button type="button" onClick={onFechar} className={`${BOTAO_SECUNDARIO} flex-1`}>Cancelar</button>
          <button type="submit" form={formId} disabled={salvando} className={`${BOTAO_PRIMARIO} flex-[2]`} data-testid="cadastro-salvar">
            {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Cadastrar'}
          </button>
        </div>
      )}
    >
      <form id={formId} onSubmit={enviar} noValidate className="space-y-5">
        {(erro || faltando.length > 0) && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <span>{erro || 'Faltam campos obrigatórios, marcados em vermelho.'}</span>
          </div>
        )}
        {secoes.map(secao => (secao.titulo ? (
          <section key={secao.titulo} aria-label={secao.titulo} className="space-y-3 border-t border-slate-100 pt-4 first:border-0 first:pt-0">
            <h3 className="text-sm font-bold text-slate-800">{secao.titulo}</h3>
            <div className="grid gap-4 sm:grid-cols-2">{secao.campos.map(campo)}</div>
          </section>
        ) : (
          <div key="geral" className="grid gap-4 sm:grid-cols-2">{secao.campos.map(campo)}</div>
        )))}
        {extras.length > 0 && (
          <div className="rounded-2xl border border-slate-200">
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
