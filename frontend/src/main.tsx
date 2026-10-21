import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { App } from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { inicializarSesion } from './lib/api';
import { queryClient } from './lib/query-client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

void inicializarSesion();
if ('serviceWorker' in navigator && import.meta.env.PROD) registerSW({ immediate: true, onRegisterError: (error) => console.error('No se pudo registrar el service worker', error) });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppErrorBoundary>
          <App />
          <Toaster richColors closeButton position="top-right" toastOptions={{ duration: 4_000 }} />
        </AppErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
