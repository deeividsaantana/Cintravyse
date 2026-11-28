interface ScreenLoadingFallbackProps {
  label?: string;
}

export const ScreenLoadingFallback = ({
  label = 'Carregando módulo...',
}: ScreenLoadingFallbackProps) => (
  <div role="status" aria-live="polite" className="w-full space-y-3 bg-[#f4f6f5] p-1">
    <span className="sr-only">{label}</span>
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#dfe4e1] bg-[#dfe4e1] sm:grid-cols-4">
      {[0, 1, 2, 3].map(item => (
        <div key={item} className="space-y-2 bg-white px-4 py-3">
          <div className="h-3 w-24 animate-pulse rounded bg-[#e8ecea] motion-reduce:animate-none" />
          <div className="h-6 w-20 animate-pulse rounded bg-[#dfe6e2] motion-reduce:animate-none" />
          <div className="h-2.5 w-28 animate-pulse rounded bg-[#eef1ef] motion-reduce:animate-none" />
        </div>
      ))}
    </div>
    <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-2.5 rounded-xl border border-[#dfe4e1] bg-white p-4">
        <div className="h-4 w-36 animate-pulse rounded bg-[#e8ecea] motion-reduce:animate-none" />
        <div className="h-9 w-full animate-pulse rounded-lg bg-[#f2f5f3] motion-reduce:animate-none" />
        <div className="h-9 w-full animate-pulse rounded-lg bg-[#f2f5f3] motion-reduce:animate-none" />
      </div>
      <div className="space-y-2.5 rounded-xl border border-[#dfe4e1] bg-white p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-[#e8ecea] motion-reduce:animate-none" />
        <div className="h-24 w-full animate-pulse rounded-lg bg-[#f2f5f3] motion-reduce:animate-none" />
      </div>
    </div>
  </div>
);
