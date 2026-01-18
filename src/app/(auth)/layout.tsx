/**
 * Layout para rutas de autenticación (públicas)
 * Solo incluye el AuthProvider, sin navbar ni sidebar
 */

import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
