import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import sharp from 'sharp';
import { env } from '../../config/env.ts';

export type ArchivosFoto = { archivoUrl: string; miniaturaUrl: string };

/** Abstracción de almacenamiento local; puede sustituirse por un proveedor S3 sin cambiar el módulo HTTP. */
export interface AlmacenamientoFotos {
  guardar(buffer: Buffer, fecha: Date): Promise<ArchivosFoto>;
  eliminar(urls: string[]): Promise<void>;
}

export class AlmacenamientoLocalFotos implements AlmacenamientoFotos {
  private readonly raiz = resolve(env.UPLOADS_DIR);

  async guardar(buffer: Buffer, fecha: Date): Promise<ArchivosFoto> {
    const anio = String(fecha.getUTCFullYear()); const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0'); const nombre = `${randomUUID()}.webp`;
    const carpeta = resolve(this.raiz, 'fotos', anio, mes); const miniaturas = resolve(carpeta, 'miniaturas');
    await mkdir(miniaturas, { recursive: true });
    const ruta = resolve(carpeta, nombre); const rutaMiniatura = resolve(miniaturas, nombre);
    try {
      await sharp(buffer, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(ruta);
      await sharp(buffer, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 300, height: 300, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(rutaMiniatura);
    } catch (error) {
      await Promise.all([rm(ruta, { force: true }), rm(rutaMiniatura, { force: true })]);
      throw error;
    }
    const prefijo = `/uploads/fotos/${anio}/${mes}`;
    return { archivoUrl: `${prefijo}/${nombre}`, miniaturaUrl: `${prefijo}/miniaturas/${nombre}` };
  }

  async eliminar(urls: string[]) {
    await Promise.all(urls.map(async (url) => {
      const relativa = url.replace(/^\/uploads\//, '');
      const ruta = resolve(this.raiz, relativa);
      const dentroDeRaiz = relative(this.raiz, ruta);
      if (!dentroDeRaiz || dentroDeRaiz.startsWith(`..${sep}`) || dentroDeRaiz === '..') return;
      await rm(ruta, { force: true });
    }));
  }
}
