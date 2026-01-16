/**
 * Página principal - Redirige al login o dashboard
 */

import { redirect } from 'next/navigation';

export default function Home() {
  // Redirigir directamente al login
  // El AuthProvider se encargará de redirigir al dashboard si ya está autenticado
  redirect('/login');
}
