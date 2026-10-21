import { Settings } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GuestRoute, ProtectedRoute } from './components/RouteGuards';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Login } from './pages/Login';
import { ModuloPreparado } from './pages/ModuloPreparado';
import { Products } from './pages/Products';
import { Customers } from './pages/Customers';
import { Suppliers } from './pages/Suppliers';
import { Purchases } from './pages/Purchases';
import { Reports } from './pages/Reports';
import { Sales } from './pages/Sales';
import { Almacenes } from './pages/Almacenes';

const Mapa = lazy(() => import('./pages/Mapa').then((m) => ({ default: m.Mapa })));
const Fincas = lazy(() => import('./pages/CampoCatalogos').then((m) => ({ default: m.Fincas })));
const Cultivos = lazy(() => import('./pages/CampoCatalogos').then((m) => ({ default: m.Cultivos })));
const CiclosCultivo = lazy(() => import('./pages/SeguimientoCampo').then((m) => ({ default: m.CiclosCultivo })));
const ActividadesCampo = lazy(() => import('./pages/SeguimientoCampo').then((m) => ({ default: m.ActividadesCampo })));
const MonitoreoPlagas = lazy(() => import('./pages/SeguimientoCampo').then((m) => ({ default: m.MonitoreoPlagas })));
const FotosCampo = lazy(() => import('./pages/FotosCampo').then((m) => ({ default: m.FotosCampo })));
const ReportesCampo = lazy(() => import('./pages/ReportesCampo').then((m) => ({ default: m.ReportesCampo })));
const DetalleParcela = lazy(() => import('./pages/DetalleParcela').then((m) => ({ default: m.DetalleParcela })));
const PersonalDashboard = lazy(() => import('./pages/PersonalDashboard').then((m) => ({ default: m.PersonalDashboard })));
const Empleados = lazy(() => import('./pages/Empleados').then((m) => ({ default: m.Empleados })));
const Cargos = lazy(() => import('./pages/Cargos').then((m) => ({ default: m.Cargos })));
const ConfiguracionLaboralPage = lazy(() => import('./pages/ConfiguracionLaboral').then((m) => ({ default: m.ConfiguracionLaboralPage })));
const Asistencias = lazy(() => import('./pages/Asistencias').then((m) => ({ default: m.Asistencias })));
const Tareos = lazy(() => import('./pages/Tareos').then((m) => ({ default: m.Tareos })));
const Planillas = lazy(() => import('./pages/Planillas').then((m) => ({ default: m.Planillas })));
const Feriados = lazy(() => import('./pages/Feriados').then((m) => ({ default: m.Feriados })));
const ReportesPersonal = lazy(() => import('./pages/ReportesPersonal').then((m) => ({ default: m.ReportesPersonal })));
const Finanzas = lazy(() => import('./pages/Finanzas').then((m) => ({ default: m.Finanzas })));
const Acopio = lazy(() => import('./pages/Acopio').then((m) => ({ default: m.Acopio })));
const CampoMovil = lazy(() => import('./pages/CampoMovil').then((m) => ({ default: m.CampoMovil })));

export function App() {
  return <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-stone-500">Cargando módulo…</div>}><Routes>
    <Route element={<GuestRoute />}>
      <Route path="/login" element={<Login />} />
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route path="campo-movil" element={<CampoMovil />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="productos" element={<Products />} />
        <Route path="almacenes" element={<Almacenes />} />
        <Route path="clientes" element={<Customers />} />
        <Route path="proveedores" element={<Suppliers />} />
        <Route path="inventario" element={<Inventory />} />
        <Route path="compras" element={<Purchases />} />
        <Route path="ventas" element={<Sales />} />
        <Route path="reportes" element={<Reports />} />
        <Route path="finanzas" element={<Finanzas />} />
        <Route path="acopio" element={<Acopio />} />
        <Route path="mapa" element={<Mapa />} />
        <Route path="fincas" element={<Fincas />} />
        <Route path="cultivos" element={<Cultivos />} />
        <Route path="ciclos" element={<CiclosCultivo />} />
        <Route path="actividades" element={<ActividadesCampo />} />
        <Route path="monitoreo" element={<MonitoreoPlagas />} />
        <Route path="fotos" element={<FotosCampo />} />
        <Route path="parcelas/:id" element={<DetalleParcela />} />
        <Route path="reportes/campo" element={<ReportesCampo />} />
        <Route path="personal" element={<PersonalDashboard />} />
        <Route path="personal/empleados" element={<Empleados />} />
        <Route path="personal/cargos" element={<Cargos />} />
        <Route path="personal/configuracion" element={<ConfiguracionLaboralPage />} />
        <Route path="personal/asistencias" element={<Asistencias />} />
        <Route path="personal/tareos" element={<Tareos />} />
        <Route path="personal/planillas" element={<Planillas />} />
        <Route path="personal/feriados" element={<Feriados />} />
        <Route path="personal/reportes" element={<ReportesPersonal />} />
        <Route path="configuracion" element={<ModuloPreparado titulo="Configuración" descripcion="Datos de empresa, usuarios y preferencias generales." icon={Settings} etapa="Parte 8" />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>;
}
