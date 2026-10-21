export type MetaPaginacion = { pagina: number; limite: number; total: number; paginas: number };
export type Respuesta<T> = { data: T };
export type RespuestaPaginada<T> = { data: T[]; meta: MetaPaginacion };

export type TipoProducto = 'semilla' | 'fertilizante' | 'herbicida' | 'fungicida' | 'insecticida' | 'herramienta' | 'maquinaria' | 'otro';

export type ProductoFase1 = {
  id: string; sku: string; codigoBarras: string | null; nombre: string; descripcion: string | null;
  categoriaId: string; categoria: string; unidadMedidaId: string; unidadMedida: string; abreviatura: string;
  tipo: TipoProducto; precioCosto: string; precioVenta: string; stockActual: string; stockMinimo: string;
  stockMaximo: string | null; requiereReceta: boolean; activo: boolean; createdAt: string; updatedAt: string;
};

export type ProductoInput = {
  sku: string; codigoBarras: string | null; nombre: string; descripcion: string | null;
  categoriaId: string; unidadMedidaId: string; tipo: TipoProducto; precioCosto: number; precioVenta: number;
  stockMinimo: number; stockMaximo: number | null; requiereReceta: boolean; activo: boolean;
};

export type CategoriaProducto = { id: string; nombre: string; descripcion: string | null; activo: boolean; createdAt: string; updatedAt: string };
export type UnidadMedida = { id: string; nombre: string; abreviatura: string; activo: boolean; createdAt: string; updatedAt: string };

export type ClienteFase1 = {
  id: string; nombre: string; nitCi: string | null; telefono: string | null; email: string | null;
  direccion: string | null; tipo: 'externo' | 'socio' | 'interno'; limiteCredito: string; activo: boolean;
};
export type ClienteInput = Omit<ClienteFase1, 'id' | 'limiteCredito'> & { limiteCredito: number };

export type ProveedorFase1 = {
  id: string; nombre: string; nit: string | null; telefono: string | null; email: string | null;
  direccion: string | null; contacto: string | null; activo: boolean;
};
export type ProveedorInput = Omit<ProveedorFase1, 'id'>;

export type Almacen = { id: string; codigo: string; nombre: string; direccion: string | null; activo: boolean };
export type Existencia = { productoId: string; sku: string; producto: string; almacenId: string; almacen: string; cantidad: string; stockMinimo: string; updatedAt: string };
export type MovimientoInventario = {
  id: string; productoId: string; producto: string; sku: string; almacen: string;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia' | 'devolucion'; cantidad: string;
  stockAnterior: string; stockNuevo: string; costoUnitario: string; valorMovimiento: string; motivo: string; referenciaTipo: string;
  referenciaId: string | null; parcelaId: string | null; usuario: string; createdAt: string;
};
export type Kardex = {
  producto: { id: string; sku: string; nombre: string; stockActual: string };
  movimientos: Array<{
    id: string; fecha: string; almacen: string; tipo: MovimientoInventario['tipo']; cantidad: string;
    stockAnterior: string; stockNuevo: string; costoUnitario: string; valorMovimiento: string; motivo: string; referenciaTipo: string; referenciaId: string | null; parcelaId: string | null;
  }>;
};
