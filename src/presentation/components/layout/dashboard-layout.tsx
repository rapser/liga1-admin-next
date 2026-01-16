/**
 * DashboardLayout Component
 * Layout principal del dashboard con Sidebar y Navbar
 */

'use client';

import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Sidebar - Fixed Left */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-64 transition-all duration-300">
        {/* Navbar - Sticky Top */}
        <Navbar />

        {/* Page Content */}
        <main
          className={cn(
            'min-h-[calc(100vh-5rem)] p-6',
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
