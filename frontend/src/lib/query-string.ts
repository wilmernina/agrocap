export function queryString(valores: Record<string, string | number | boolean | null | undefined>) {
  const parametros = new URLSearchParams();
  Object.entries(valores).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') parametros.set(clave, String(valor));
  });
  const resultado = parametros.toString();
  return resultado ? `?${resultado}` : '';
}
