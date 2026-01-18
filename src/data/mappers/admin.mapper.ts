/**
 * Mapper para AdminUser
 * Convierte entre AdminUserDTO (Firestore) y AdminUser (Dominio)
 */

import { Timestamp } from 'firebase/firestore';
import { AdminUser } from '@/domain/repositories/admin.repository.interface';
import { AdminUserDTO } from '../dtos/admin.dto';

export class AdminMapper {
  /**
   * Convierte un AdminUserDTO de Firestore a una entidad AdminUser del dominio
   */
  static toDomain(uid: string, dto: Partial<AdminUserDTO>): AdminUser {
    return {
      uid,
      email: dto.email || '',
      displayName: dto.displayName,
      photoURL: dto.photoURL,
      role: dto.role || 'admin', // Por defecto 'admin' si no existe el campo
      createdAt: dto.createdAt?.toDate() || new Date(), // Timestamp → Date
      lastLoginAt: dto.lastLoginAt?.toDate(), // Timestamp → Date (opcional)
    };
  }

  /**
   * Convierte una entidad AdminUser del dominio a un AdminUserDTO para Firestore
   */
  static toDTO(user: Omit<AdminUser, 'uid'>): AdminUserDTO {
    return {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: user.role,
      createdAt: Timestamp.fromDate(user.createdAt), // Date → Timestamp
      lastLoginAt: user.lastLoginAt
        ? Timestamp.fromDate(user.lastLoginAt)
        : undefined,
    };
  }

  /**
   * Convierte múltiples DTOs a entidades del dominio
   */
  static toDomainList(
    docs: Array<{ id: string; data: AdminUserDTO }>
  ): AdminUser[] {
    return docs.map((doc) => this.toDomain(doc.id, doc.data));
  }
}
