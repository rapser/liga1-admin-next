/**
 * AuthProvider - Proveedor de Autenticación
 * Maneja el estado de autenticación del usuario con Firebase Auth
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/core/config/firebase';
import { AdminRepository } from '@/data/repositories/admin.repository';
import { AdminUser } from '@/domain/repositories/admin.repository.interface';

interface AuthContextType {
  /** Usuario autenticado de Firebase */
  user: User | null;

  /** Información completa del admin desde Firestore */
  adminUser: AdminUser | null;

  /** Indica si el usuario es administrador */
  isAdmin: boolean;

  /** Indica si el usuario es viewer (solo lectura) */
  isViewer: boolean;

  /** Indica si está cargando la información de autenticación */
  loading: boolean;

  /** Función para iniciar sesión con Google */
  signInWithGoogle: () => Promise<void>;

  /** Función para iniciar sesión con Email y Password */
  signInWithEmail: (email: string, password: string) => Promise<void>;

  /** Función para cerrar sesión */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const adminRepository = new AdminRepository();

  useEffect(() => {
    // Escuchar cambios en el estado de autenticación
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Verificar si el usuario está autorizado
          const isAuthorized = await adminRepository.isUserAuthorized(
            firebaseUser.uid
          );

          if (isAuthorized) {
            // Crear AdminUser con datos de Firebase Authentication
            const admin: AdminUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || undefined,
              photoURL: firebaseUser.photoURL || undefined,
              role: 'admin', // Por ahora todos son admin
              createdAt: new Date(),
            };
            setAdminUser(admin);

            // Registrar el login (por ahora no hace nada)
            await adminRepository.recordUserLogin(firebaseUser.uid);
          } else {
            // Usuario no autorizado, cerrar sesión
            console.warn('Usuario no autorizado:', firebaseUser.email);
            setAdminUser(null);
            await firebaseSignOut(auth);
          }
        } catch (error) {
          console.error('Error al verificar autorización:', error);
          setAdminUser(null);
        }
      } else {
        setAdminUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
      });

      const result = await signInWithPopup(auth, provider);

      // Verificar si el usuario está autorizado
      const isAuthorized = await adminRepository.isUserAuthorized(result.user.uid);

      if (!isAuthorized) {
        // Si no está autorizado, cerrar sesión inmediatamente
        await firebaseSignOut(auth);
        throw new Error(
          'No tienes permisos para acceder a este panel. Contacta al administrador.'
        );
      }
    } catch (error: any) {
      // Detectar si el usuario canceló el popup
      const isCancelled = 
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/popup-blocked';

      if (isCancelled) {
        // Si el usuario canceló, no lanzar error, solo resetear loading
        console.log('Login con Google cancelado por el usuario');
        setLoading(false);
        // Lanzar un error específico que se maneje silenciosamente en la página de login
        throw new Error('LOGIN_CANCELLED');
      }

      console.error('Error al iniciar sesión:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);

      // Iniciar sesión con email y password
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Verificar si el usuario está autorizado
      const isAuthorized = await adminRepository.isUserAuthorized(result.user.uid);

      if (!isAuthorized) {
        // Si no está autorizado, cerrar sesión inmediatamente
        await firebaseSignOut(auth);
        throw new Error(
          'No tienes permisos para acceder a este panel. Contacta al administrador.'
        );
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setAdminUser(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    adminUser,
    isAdmin: adminUser?.role === 'admin',
    isViewer: adminUser?.role === 'viewer',
    loading,
    signInWithGoogle,
    signInWithEmail,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para usar el contexto de autenticación
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
