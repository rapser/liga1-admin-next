/**
 * Layout del dashboard - envuelve todas las rutas bajo (dashboard) con
 * sidebar, navbar y área de contenido. Una sola fuente de verdad para el shell.
 */

import { DashboardLayout } from '@/presentation/components/layout';

export default function DashboardSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
