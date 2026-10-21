import { env } from '../config/env';

export function urlFoto(ruta: string) {
  if (/^https?:\/\//i.test(ruta)) return ruta;
  const origen = env.VITE_API_URL.startsWith('/') ? window.location.origin : new URL(env.VITE_API_URL).origin;
  return `${origen}${ruta.startsWith('/') ? ruta : `/${ruta}`}`;
}
