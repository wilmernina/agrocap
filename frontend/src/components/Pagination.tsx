import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MetaPaginacion } from '../types/fase1';

export function Pagination({ meta, onPageChange }: { meta?: MetaPaginacion; onPageChange: (pagina: number) => void }) {
  if (!meta || meta.total === 0) return null;
  return <div className="flex flex-col gap-3 border-t border-stone-100 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
    <p className="text-stone-500">Mostrando página <strong className="text-stone-800">{meta.pagina}</strong> de {Math.max(meta.paginas, 1)} · {meta.total} registros</p>
    <div className="flex gap-2">
      <button className="btn-secondary h-9 px-3" disabled={meta.pagina <= 1} onClick={() => onPageChange(meta.pagina - 1)}><ChevronLeft size={16} /> Anterior</button>
      <button className="btn-secondary h-9 px-3" disabled={meta.pagina >= meta.paginas} onClick={() => onPageChange(meta.pagina + 1)}>Siguiente <ChevronRight size={16} /></button>
    </div>
  </div>;
}
