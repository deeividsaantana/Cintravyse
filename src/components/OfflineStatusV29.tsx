import { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';

export default function OfflineStatusV29() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);
  if (online) return null;
  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-rose-500/30 bg-white px-4 py-2 text-xs font-black text-rose-700 shadow-2xl lg:bottom-4" role="status" aria-live="polite">
      <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      Sem conexão: os dados permanecem disponíveis neste dispositivo
    </div>
  );
}
