/**
 * Implementación del Repositorio de Administración
 * Usa Firestore para gestionar usuarios administradores
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { FIRESTORE_COLLECTIONS } from '@/core/config/firestore-constants';
import {
  IAdminRepository,
  AdminUser,
} from '@/domain/repositories/admin.repository.interface';
import { AdminUserDTO } from '../dtos/admin.dto';
import { AdminMapper } from '../mappers/admin.mapper';

export class AdminRepository implements IAdminRepository {
  /**
   * Verifica si un usuario está autorizado como administrador
   */
  async isUserAuthorized(userId: string): Promise<boolean> {
    // Por ahora, todos los usuarios autenticados tienen acceso
    // No hay distinción entre admin y usuarios normales
    // En el futuro se puede verificar una colección 'admins' o campo 'role'
    return true;
  }

  /**
   * Obtiene la información de un usuario administrador
   */
  async fetchAdminUser(userId: string): Promise<AdminUser | null> {
    // Por ahora, retornar un usuario básico sin verificar Firestore
    // ya que no hay distinción entre admin y usuarios normales
    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      // Si existe en Firestore, usar esos datos
      return AdminMapper.toDomain(userDoc.id, userDoc.data() as Partial<AdminUserDTO>);
    }

    // Si no existe en Firestore, crear un usuario básico
    // con datos mínimos (se llenará con Firebase Auth)
    return {
      uid: userId,
      email: '', // Se llenará desde Firebase Auth en el provider
      role: 'admin', // Por defecto todos son admin
      createdAt: new Date(),
    };
  }

  /**
   * Obtiene todos los usuarios administradores
   */
  async fetchAllAdminUsers(): Promise<AdminUser[]> {
    const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
    const snapshot = await getDocs(usersRef);

    const users = snapshot.docs.map((doc) =>
      AdminMapper.toDomain(doc.id, doc.data() as Partial<AdminUserDTO>)
    );

    return users;
  }

  /**
   * Crea o actualiza un usuario administrador
   */
  async upsertAdminUser(user: Omit<AdminUser, 'createdAt'>): Promise<void> {
    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid);

    // Verificar si el usuario ya existe
    const existingUser = await getDoc(userRef);

    if (existingUser.exists()) {
      // Actualizar usuario existente
      // Crear objeto con createdAt temporal para pasar al mapper
      const userWithDate: Omit<AdminUser, 'uid'> = {
        ...user,
        createdAt: new Date(), // Temporal, no se usará
      };
      const updateData = AdminMapper.toDTO(userWithDate);

      // No actualizar createdAt en usuarios existentes
      const { createdAt, ...updateFields } = updateData;

      await updateDoc(userRef, updateFields);
    } else {
      // Crear nuevo usuario
      const userWithDate: Omit<AdminUser, 'uid'> = {
        ...user,
        createdAt: new Date(),
      };
      const userData = AdminMapper.toDTO(userWithDate);

      // Sobrescribir createdAt con serverTimestamp
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
      });
    }
  }

  /**
   * Elimina un usuario administrador
   */
  async deleteAdminUser(userId: string): Promise<void> {
    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    await deleteDoc(userRef);
  }

  /**
   * Actualiza el rol de un usuario
   */
  async updateUserRole(
    userId: string,
    role: 'admin' | 'viewer'
  ): Promise<void> {
    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    await updateDoc(userRef, { role });
  }

  /**
   * Registra el último inicio de sesión de un usuario
   */
  async recordUserLogin(userId: string): Promise<void> {
    // Por ahora, no registrar login en Firestore
    // ya que no todos los usuarios tienen documento en la colección
    // En el futuro se puede implementar cuando se tenga la colección 'admins'
    return;
  }
}
