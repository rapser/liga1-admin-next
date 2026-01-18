/**
 * DTO para AdminUser
 * Representa la estructura del documento en Firestore
 */

import { Timestamp } from 'firebase/firestore';

export interface AdminUserDTO {
  /** Email del usuario */
  email: string;

  /** Nombre completo */
  displayName?: string;

  /** URL de foto de perfil */
  photoURL?: string;

  /** Rol del usuario */
  role: 'admin' | 'viewer';

  /** Fecha de creación como Timestamp */
  createdAt: Timestamp;

  /** Último login como Timestamp */
  lastLoginAt?: Timestamp;
}

/**
 * Tipo para crear un nuevo usuario admin
 */
export type CreateAdminUserDTO = Omit<AdminUserDTO, 'createdAt' | 'lastLoginAt'> & {
  createdAt?: Date;
  lastLoginAt?: Date;
};
