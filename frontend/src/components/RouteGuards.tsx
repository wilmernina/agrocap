import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { useAuth } from '../store/auth';

function PantallaInicial() {
  return <div className="flex min-h-screen items-center justify-center bg-stone-50">
    <div className="flex items-center gap-3 text-brand-800">
      <span className="grid size-11 animate-pulse place-items-center rounded-2xl bg-brand-100"><Sprout size={22} /></span>
      <div><p className="font-display text-xl font-bold">AgroCAP</p><p className="text-xs text-stone-500">Preparando tu espacio de trabajo…</p></div>
    </div>
  </div>;
}

export function ProtectedRoute() {
  const { user, initialized } = useAuth();
  const location = useLocation();
  if (!initialized) return <PantallaInicial />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user, initialized } = useAuth();
  if (!initialized) return <PantallaInicial />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
