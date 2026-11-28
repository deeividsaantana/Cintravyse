import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Save } from 'lucide-react';
import type { Funcionario, GrupoEquipe } from '../../types';
import { criarEscalaSabado, type EscalaSabadoRecord } from '../../utils/presencaManual';
import { CAMPO } from '../cadastros/estilos';
import { Badge, Button, Label } from '../ui';

interface Props {
  funcionarios: readonly Funcionario[];
  gruposEquipe: readonly GrupoEquipe[];
  escalaExistente?: EscalaSabadoRecord;
  onSalvar: (escala: EscalaSabadoRecord) => void;
  onCancelar: () => void;
}

const escalaSabadoSchema = z.object({
  grupoEquipeId: z.string().trim().min(1, 'Selecione uma equipe antes de salvar a escala.'),
  observacaoGeral: z.string().max(600, 'Observação limitada a 600 caracteres.').optional(),
});

type EscalaSabadoFormValues = z.infer<typeof escalaSabadoSchema>;

// Data local, não toISOString: à noite em Brasília o UTC já é o dia seguinte.
const proximoSabado = (hoje = new Date()) => {
  const dia = new Date(hoje);
  dia.setDate(dia.getDate() + ((6 - hoje.getDay() + 7) % 7 || 7));
  return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
};

const dataBr = (iso: string) => iso.split('-').reverse().join('/');

export function EscalaSabado({ funcionarios, gruposEquipe, escalaExistente, onSalvar, onCancelar }: Props) {
  const [escala, setEscala] = useState<EscalaSabadoRecord>(
    () => escalaExistente ?? criarEscalaSabado(proximoSabado(), funcionarios, ''),
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EscalaSabadoFormValues>({
    resolver: zodResolver(escalaSabadoSchema),
    defaultValues: {
      grupoEquipeId: escala.grupoEquipeId,
      observacaoGeral: escala.observacaoGeral ?? '',
    },
  });

  const escalados = escala.funcionarios.filter(pessoa => pessoa.escalado).length;

  const alternar = (funcionarioId: string) => {
    setEscala(atual => ({
      ...atual,
      funcionarios: atual.funcionarios.map(pessoa =>
        pessoa.id === funcionarioId ? { ...pessoa, escalado: !pessoa.escalado } : pessoa),
    }));
  };

  const salvar = handleSubmit(valores => {
    onSalvar({
      ...escala,
      grupoEquipeId: valores.grupoEquipeId,
      observacaoGeral: valores.observacaoGeral?.trim() || undefined,
      atualizadoEm: new Date().toISOString(),
    });
  });

  return (
    <form onSubmit={salvar} className="space-y-4" noValidate>
      <div className="flex items-center gap-2">
        <Calendar className="size-5 text-emerald-700" aria-hidden="true" />
        <h2 className="text-lg font-bold text-slate-950">Escala para sábado</h2>
        <Badge variant="outline" className="ml-auto">{dataBr(escala.data)}</Badge>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="escala-sabado-equipe">Equipe</Label>
          <select
            id="escala-sabado-equipe"
            {...register('grupoEquipeId')}
            aria-invalid={Boolean(errors.grupoEquipeId)}
            className={CAMPO}
          >
            <option value="">Selecione uma equipe</option>
            {gruposEquipe.map(grupo => (
              <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>
            ))}
          </select>
          {errors.grupoEquipeId && (
            <p role="alert" className="text-xs font-semibold text-rose-700">
              {errors.grupoEquipeId.message}
            </p>
          )}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">
            Quem vem no sábado ({escalados} de {escala.funcionarios.length})
          </legend>
          <div className="grid max-h-72 gap-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
            {escala.funcionarios.length === 0 && (
              <p className="p-2 text-sm text-slate-600">Nenhum funcionário cadastrado.</p>
            )}
            {escala.funcionarios.map(pessoa => (
              <label key={pessoa.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={pessoa.escalado}
                  onChange={() => alternar(pessoa.id)}
                  className="size-5 rounded border-slate-300 accent-emerald-700"
                />
                <span className="text-base text-slate-900 sm:text-sm">{pessoa.nome}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="escala-sabado-observacao">Observações</Label>
          <textarea
            id="escala-sabado-observacao"
            {...register('observacaoGeral')}
            aria-invalid={Boolean(errors.observacaoGeral)}
            placeholder="Anotações sobre a escala"
            className={`${CAMPO} min-h-24 py-2`}
          />
          {errors.observacaoGeral && (
            <p role="alert" className="text-xs font-semibold text-rose-700">
              {errors.observacaoGeral.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancelar} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          <Save className="size-4" aria-hidden="true" />
          Salvar escala
        </Button>
      </div>
    </form>
  );
}
