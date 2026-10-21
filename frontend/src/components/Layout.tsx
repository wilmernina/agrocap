import { BarChart3, Boxes, ChevronRight, ClipboardList, FileChartColumn, Leaf, LogOut, Menu, PackagePlus, Settings, ShoppingCart, Sprout, Truck, Users, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '../services/auth.service';
import { useAuth } from '../store/auth';
import { queryClient } from '../lib/query-client';
import { cn } from '../lib/utils';

const grupos = [
  { label: 'Visi\u00f3n general', items: [{ to: '/', label: 'Dashboard', icon: BarChart3 }] },
  { label: 'Operaci\u00f3n', items: [
    { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
    { to: '/compras', label: 'Compras', icon: PackagePlus },
    { to: '/inventario', label: 'Inventario', icon: ClipboardList },
  ] },
  { label: 'Cat\u00e1logos', items: [
    { to: '/almacenes', label: 'Almacenes', icon: ClipboardList },
    { to: '/productos', label: 'Productos', icon: Boxes },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/proveedores', label: 'Proveedores', icon: Truck },
  ] },
  { label: 'An\u00e1lisis', items: [{ to: '/reportes', label: 'Reportes', icon: FileChartColumn }] },
];

const titulos = [...grupos.flatMap((grupo) => grupo.items), { to: '/configuracion', label: 'Configuración', icon: Settings }];
const etiquetasRol: Record<string, string> = { admin: 'Administrador', vendedor: 'Vendedor', tecnico: 'Técnico', almacenero: 'Almacenero' };

export function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const user = useAuth((state) => state.user)!;
  const clearSession = useAuth((state) => state.clearSession);
  const location = useLocation();
  const actual = [...titulos].sort((a, b) => b.to.length - a.to.length).find((item) => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to));

  const cerrarSesion = async () => {
    setCerrando(true);
    try { await authService.logout(); }
    catch { toast.warning('La sesión local se cerró, pero el servidor no respondió.'); }
    finally {
      queryClient.clear();
      clearSession();
      setCerrando(false);
    }
  };

  const enlace = ({ to, label, icon: Icon }: (typeof titulos)[number]) => <NavLink
    key={to} to={to} end={to === '/'} onClick={() => setMenuAbierto(false)}
    className={({ isActive }) => cn(
      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-emerald-50/75 transition',
      'hover:bg-white/[.07] hover:text-white',
      isActive && 'bg-white text-brand-950 shadow-sm hover:bg-white hover:text-brand-950',
    )}
  >
    <Icon size={18} strokeWidth={2} />
    <span>{label}</span>
    <ChevronRight size={14} className="ml-auto opacity-0 transition group-hover:opacity-50" />
  </NavLink>;

  return <div className="min-h-screen bg-canvas">
    <aside className={cn(
      'fixed inset-y-0 left-0 z-40 flex w-[17.5rem] -translate-x-full flex-col overflow-hidden bg-brand-950 text-white shadow-2xl transition-transform duration-300 lg:translate-x-0',
      menuAbierto && 'translate-x-0',
    )}>
      <div className="flex h-[5.25rem] shrink-0 items-center gap-3 border-b border-white/10 px-6">
        <span className="grid size-11 place-items-center rounded-2xl bg-lime-300 text-brand-950 shadow-lg shadow-black/10"><Sprout size={24} /></span>
        <div><p className="font-display text-xl font-extrabold tracking-tight">AgroCAP</p><p className="text-[11px] font-medium tracking-wide text-emerald-200/70">GESTIÓN AGROPECUARIA</p></div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5 scrollbar-thin">
        {grupos.map((grupo) => <div key={grupo.label}>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200/45">{grupo.label}</p>
          <div className="space-y-1">{grupo.items.filter((item) => item.to !== '/almacenes' || user.role === 'admin').map(enlace)}</div>
        </div>)}
      </nav>

      <div className="shrink-0 border-t border-white/10 bg-black/10 p-4">
        <NavLink to="/configuracion" onClick={() => setMenuAbierto(false)} className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-emerald-50/70 hover:bg-white/[.07] hover:text-white"><Settings size={18} /> Configuración</NavLink>
        <div className="flex items-center gap-3 rounded-2xl bg-white/[.06] p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-200 font-bold text-brand-900">{user.name.charAt(0).toUpperCase()}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-emerald-200/60">{etiquetasRol[user.role] ?? user.role}</p></div>
          <button disabled={cerrando} onClick={cerrarSesion} className="rounded-lg p-2 text-emerald-100/60 hover:bg-white/10 hover:text-white disabled:opacity-40" title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={17} /></button>
        </div>
      </div>
    </aside>

    {menuAbierto && <button className="fixed inset-0 z-30 bg-stone-950/50 backdrop-blur-sm lg:hidden" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú" />}

    <div className="min-h-screen lg:pl-[17.5rem]">
      <header className="sticky top-0 z-20 flex h-[5.25rem] items-center justify-between border-b border-stone-200/80 bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button className="rounded-xl border border-stone-200 bg-white p-2.5 text-stone-700 shadow-sm lg:hidden" onClick={() => setMenuAbierto((value) => !value)} aria-label="Abrir menú">{menuAbierto ? <X size={20} /> : <Menu size={20} />}</button>
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-brand-600">Módulo comercial</p><h1 className="font-display text-xl font-bold text-stone-900 sm:text-2xl">{actual?.label ?? 'AgroCAP'}</h1></div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 sm:flex"><Leaf size={14} /> AgroCAP · Bolivia</div>
      </header>
      <main className="mx-auto w-full max-w-[100rem] p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  </div>;
}
