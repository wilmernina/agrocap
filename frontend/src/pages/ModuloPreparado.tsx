import type { LucideIcon } from 'lucide-react';
import { Clock3 } from 'lucide-react';

export function ModuloPreparado({ titulo, descripcion, icon: Icon, etapa }: { titulo: string; descripcion: string; icon: LucideIcon; etapa: 'Parte 7' | 'Parte 8' }) {
  return <section className="card overflow-hidden">
    <div className="border-b border-stone-100 bg-gradient-to-r from-brand-50 to-white px-6 py-5 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-600">Módulo comercial</p>
      <h2 className="mt-1 font-display text-2xl font-bold text-stone-900">{titulo}</h2>
    </div>
    <div className="grid min-h-[360px] place-items-center px-6 py-16 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-brand-100 text-brand-700"><Icon size={30} /></span>
        <h3 className="mt-5 font-display text-xl font-bold text-stone-900">Ruta preparada</h3>
        <p className="mt-2 text-sm leading-6 text-stone-500">{descripcion}</p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600"><Clock3 size={14} /> Implementación funcional en {etapa}</span>
      </div>
    </div>
  </section>;
}
