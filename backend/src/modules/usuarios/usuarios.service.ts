import { ConflictError, NotFoundError } from '../../shared/errors.ts';
import { generarPasswordHash } from '../../shared/password.ts';
import type { ActualizarUsuarioInput, CrearUsuarioInput } from './usuarios.schemas.ts';
import { UsuariosRepository } from './usuarios.repository.ts';

type Contexto = { actorId: string; ip?: string };

export class UsuariosService {
  constructor(private readonly repository = new UsuariosRepository()) {}

  listar(organizacionId: string, pagina: number, limite: number, busqueda: string) {
    return this.repository.listar(organizacionId, pagina, limite, busqueda);
  }

  async obtener(organizacionId: string, id: string) {
    const usuario = await this.repository.buscarPorId(organizacionId, id);
    if (!usuario) throw new NotFoundError('Usuario');
    return usuario;
  }

  async crear(organizacionId: string, entrada: CrearUsuarioInput, contexto: Contexto) {
    try {
      return await this.repository.crear(organizacionId, {
        nombre: entrada.nombre, email: entrada.email, rol: entrada.rol, activo: entrada.activo,
        passwordHash: await generarPasswordHash(entrada.password),
      }, contexto);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictError('El correo ya está registrado');
      throw error;
    }
  }

  async actualizar(organizacionId: string, id: string, entrada: ActualizarUsuarioInput, contexto: Contexto) {
    const { password, ...campos } = entrada;
    try {
      const usuario = await this.repository.actualizar(organizacionId, id, {
        ...campos, ...(password ? { passwordHash: await generarPasswordHash(password) } : {}),
      }, contexto);
      if (!usuario) throw new NotFoundError('Usuario');
      return usuario;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictError('El correo ya está registrado');
      throw error;
    }
  }

  async desactivar(organizacionId: string, id: string, contexto: Contexto) {
    if (id === contexto.actorId) throw new ConflictError('No puede desactivar su propio usuario');
    const usuario = await this.repository.desactivar(organizacionId, id, contexto);
    if (!usuario) throw new NotFoundError('Usuario');
    return usuario;
  }
}
