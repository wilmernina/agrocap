import { Search, X } from 'lucide-react';
import { Input } from './ui';

export function SearchBox({ value, onChange, placeholder = 'Buscar…' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17} /><Input className="pl-10 pr-9" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{value&&<button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:bg-stone-100" aria-label="Limpiar búsqueda"><X size={15}/></button>}</div>;
}
