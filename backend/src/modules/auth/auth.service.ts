import { AppError } from '../../shared/errors.ts';
import { verificarPassword } from '../../shared/password.ts';
import { crearAccessToken, crearRefreshToken, fechaExpiracionRefresh, hashToken, verificarRefreshToken } from '../../shared/tokens.ts';
import type { AuthUser } from '../../shared/types.ts';
import { AuthRepository } from './auth.repository.ts';

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  private crearPayload(usuario: { id: string; organizacionId: string; rol: AuthUser['rol']; email: string }): AuthUser {
    return { id: usuario.id, organizationId: usuario.organizacionId, rol: usuario.rol, email: usuario.email };
  }

  private presentarUsuario(usuario: { id: string; organizacionId: string; nombre: string; email: string; rol: AuthUser['rol'] }) {
    return {
      id: usuario.id, name: usuario.nombre, nombre: usuario.nombre, email: usuario.email,
      role: usuario.rol, rol: usuario.rol,
      organizationId: usuario.organizacionId, organizacionId: usuario.organizacionId,
    };
  }

  async iniciarSesion(email: string, password: string) {
    const usuario = await this.repository.buscarUsuarioPorEmail(email);
    if (!usuario || !(await verificarPassword(password, usuario.passwordHash))) {
      throw new AppError(401, 'Correo o contraseña incorrectos', 'CREDENCIALES_INVALIDAS');
    }
    const refreshToken = crearRefreshToken(usuario.id);
    await this.repository.guardarToken(usuario.id, hashToken(refreshToken), fechaExpiracionRefresh());
    return { accessToken: crearAccessToken(this.crearPayload(usuario)), refreshToken, usuario: this.presentarUsuario(usuario) };
  }

  async renovarSesion(tokenAnterior?: string) {
    if (!tokenAnterior) throw new AppError(401, 'Sesión no renovable', 'REFRESH_INVALIDO');
    let usuarioId: string;
    try { usuarioId = verificarRefreshToken(tokenAnterior).sub; }
    catch { throw new AppError(401, 'Sesión vencida', 'REFRESH_INVALIDO'); }
    const tokenGuardado = await this.repository.buscarTokenVigente(hashToken(tokenAnterior));
    if (!tokenGuardado || tokenGuardado.usuarioId !== usuarioId) throw new AppError(401, 'Sesión revocada', 'REFRESH_INVALIDO');
    const usuario = await this.repository.buscarUsuarioPorId(usuarioId);
    if (!usuario) throw new AppError(401, 'Usuario no disponible', 'REFRESH_INVALIDO');
    const refreshToken = crearRefreshToken(usuario.id);
    const rotado = await this.repository.rotarToken(hashToken(tokenAnterior), usuario.id, hashToken(refreshToken), fechaExpiracionRefresh());
    if (!rotado) throw new AppError(401, 'La sesión ya fue renovada', 'REFRESH_REUTILIZADO');
    return { accessToken: crearAccessToken(this.crearPayload(usuario)), refreshToken, usuario: this.presentarUsuario(usuario) };
  }

  async cerrarSesion(token?: string) { if (token) await this.repository.revocarToken(hashToken(token)); }

  async obtenerPerfil(usuarioId: string, organizacionId: string) {
    const usuario = await this.repository.buscarUsuarioPorId(usuarioId, organizacionId);
    if (!usuario) throw new AppError(404, 'Usuario no encontrado', 'USUARIO_NO_ENCONTRADO');
    return usuario;
  }
}
