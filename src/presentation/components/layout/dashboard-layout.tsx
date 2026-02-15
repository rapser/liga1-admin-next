/**
 * DashboardLayout Component
 * Layout principal del dashboard con Sidebar y Navbar
 */

'use client';

import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { ReactNode, useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Sidebar - Fixed Left */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content Area */}
      <div className={cn(
        'transition-all duration-300',
        isCollapsed ? 'ml-20' : 'ml-64'
      )}>
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
