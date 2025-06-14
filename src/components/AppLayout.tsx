
"use client";

import type { ReactNode } from 'react';
import { AppHeader } from '@/components/navbar';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

const PUBLIC_PATHS = ['/', '/login', '/register', '/register/step2', '/register/step3', '/forgot-password'];

export default function AppLayout({ children }: AppLayoutProps) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return; // Wait until auth state is resolved

    if (!currentUser && !PUBLIC_PATHS.includes(pathname)) {
      router.replace('/login');
    }
  }, [currentUser, isLoading, router, pathname]);

  if (isLoading && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const showAppHeader = !isPublicPath && currentUser;

  if (!isPublicPath && !currentUser && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    // Ensure this div is a flex column and can grow, and its children can properly expand.
    // min-h-0 is added to help flex-grow work correctly in some nested flexbox scenarios.
    <div className="flex flex-col flex-grow min-h-0"> 
      {showAppHeader && <AppHeader />}
      {/* The main content area should grow to fill available space within this flex column. */}
      <main className={`flex-grow ${showAppHeader ? 'pt-4 md:pt-6' : ''}`}> 
        {children}
      </main>
    </div>
  );
}
