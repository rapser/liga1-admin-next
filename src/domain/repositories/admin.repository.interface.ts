/**
 * Interfaz del Repositorio de Administración
 * Define operaciones administrativas como autenticación y permisos
 */

export interface AdminUser {
  /** ID del usuario (Firebase UID) */
  uid: string;

  /** Email del usuario */
  email: string;

  /** Nombre completo del usuario */
  displayName?: string;

  /** URL de la foto de perfil */
  photoURL?: string;

  /** Rol del usuario en el sistema */
  role: 'admin' | 'viewer';

  /** Fecha de creación del usuario */
  createdAt: Date;

  /** Última vez que inició sesión */
  lastLoginAt?: Date;
}

export interface IAdminRepository {
  /**
   * Verifica si un usuario está autorizado como administrador
   */
  isUserAuthorized(userId: string): Promise<boolean>;

  /**
   * Obtiene la información de un usuario administrador
   */
  fetchAdminUser(userId: string): Promise<AdminUser | null>;

  /**
   * Obtiene todos los usuarios administradores
   */
  fetchAllAdminUsers(): Promise<AdminUser[]>;

  /**
   * Crea o actualiza un usuario administrador
   */
  upsertAdminUser(user: Omit<AdminUser, 'createdAt'>): Promise<void>;

  /**
   * Elimina un usuario administrador
   */
  deleteAdminUser(userId: string): Promise<void>;

  /**
   * Actualiza el rol de un usuario
   */
  updateUserRole(userId: string, role: 'admin' | 'viewer'): Promise<void>;

  /**
   * Registra el último inicio de sesión de un usuario
   */
  recordUserLogin(userId: string): Promise<void>;
}
