import { ArrowRight, Boxes, ChartNoAxesCombined, CircleCheck, ShoppingCart, Warehouse } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/auth';

const accesos = [
  { to: '/productos', label: 'Productos', detail: 'Catálogo y precios', icon: Boxes, tone: 'bg-emerald-50 text-emerald-700' },
  { to: '/compras', label: 'Compras', detail: 'Ingresos y proveedores', icon: Warehouse, tone: 'bg-amber-50 text-amber-700' },
  { to: '/ventas', label: 'Ventas', detail: 'Operación comercial', icon: ShoppingCart, tone: 'bg-sky-50 text-sky-700' },
];

export function Inicio() {
  const user = useAuth((state) => state.user)!;
  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-[2rem] bg-brand-950 px-6 py-8 text-white shadow-panel sm:px-9 sm:py-10">
      <div className="absolute -right-16 -top-20 size-72 rounded-full border-[42px] border-white/[.04]" />
      <div className="absolute -bottom-24 right-28 size-52 rounded-full bg-lime-300/[.06]" />
      <div className="relative max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100"><CircleCheck size={14} /> Sesión protegida y conectada</span>
        <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">Hola, {user.name.split(' ')[0]}.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100/80 sm:text-base">La base del módulo comercial está lista. Desde aquí centralizarás ventas, compras e inventario con trazabilidad completa.</p>
      </div>
    </section>

    <div className="grid gap-4 md:grid-cols-3">
      {accesos.map(({ to, label, detail, icon: Icon, tone }) => <Link key={to} to={to} className="group card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-panel">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tone}`}><Icon size={22} /></span>
        <span className="min-w-0 flex-1"><span className="block font-semibold text-stone-900">{label}</span><span className="block text-sm text-stone-500">{detail}</span></span>
        <ArrowRight size={18} className="text-stone-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
      </Link>)}
    </div>

    <section className="card p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700"><ChartNoAxesCombined size={22} /></span>
        <div><h3 className="font-display text-lg font-bold text-stone-900">Catálogos e inventario disponibles</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-stone-500">Ya puedes administrar productos, categorías, unidades, clientes y proveedores; además de consultar existencias, revisar el kardex y registrar ajustes auditables.</p></div>
      </div>
    </section>
  </div>;
}
