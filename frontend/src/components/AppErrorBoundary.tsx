import { AlertTriangle, House, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado en AgroCAP', error, info.componentStack);
  }

  private volverAlInicio = () => {
    window.location.assign('/');
  };

  private recargar = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return <main className="flex min-h-screen items-center justify-center bg-stone-50 p-5">
      <section className="w-full max-w-xl rounded-3xl border border-red-100 bg-white p-7 shadow-panel sm:p-9">
        <span className="grid size-12 place-items-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle size={24} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-stone-900">No pudimos mostrar esta pantalla</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          AgroCAP encontró un error inesperado. Puedes volver al inicio o recargar la aplicación.
        </p>
        <pre className="mt-5 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-stone-950 p-4 text-xs leading-5 text-red-200">
          {this.state.error.message || 'Error desconocido'}
        </pre>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button className="btn-primary" onClick={this.recargar}><RefreshCw size={17} /> Recargar</button>
          <button className="btn-secondary" onClick={this.volverAlInicio}><House size={17} /> Volver al inicio</button>
        </div>
      </section>
    </main>;
  }
}
