import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
/** Aviso rápido no canto: erro ou algo que não foi salvo. Some sozinho. */
export interface Aviso {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

interface ToastViewportProps {
  toasts: Aviso[];
}

const getToastColorClass = (type: Aviso['type']) => {
  if (type === 'success') return 'border-emerald-500/30 bg-white';
  if (type === 'warning') return 'border-amber-500/30 bg-white';
  if (type === 'error') return 'border-rose-500/30 bg-white';
  return 'border-blue-500/30 bg-white';
};

const ToastIcon = ({ type }: { type: Aviso['type'] }) => {
  if (type === 'success') return <CheckCircle2 className="w-5 h-5 text-emerald-700" aria-hidden="true" />;
  if (type === 'warning') return <AlertTriangle className="w-5 h-5 text-amber-700" aria-hidden="true" />;
  if (type === 'error') return <XCircle className="w-5 h-5 text-rose-700" aria-hidden="true" />;
  return <Info className="w-5 h-5 text-blue-700" aria-hidden="true" />;
};

/**
 * Avisos rápidos no canto. Letra legível (auditoria de 21/10/2026): título
 * sem caixa alta espremida, hora em cinza de 4,5:1 (antes ficava a 1,5:1 com
 * opacidade) e sem o jargão "Tempo Real". O leitor de tela anuncia cada aviso.
 */
export function ToastViewport({ toasts }: ToastViewportProps) {
  return (
    <div role="status" aria-live="polite" className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-[calc(100%-2rem)] max-w-sm pointer-events-none select-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`renea-enter-toast pointer-events-auto border p-4 rounded-2xl shadow-2xl flex gap-3 items-start ${getToastColorClass(toast.type)}`}
          >
            <div className="mt-0.5 shrink-0">
              <ToastIcon type={toast.type} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold block text-slate-900">{toast.title}</span>
              <p className="text-sm text-slate-700 leading-relaxed mt-1">{toast.message}</p>
            </div>
          </div>
        ))}
    </div>
  );
}
