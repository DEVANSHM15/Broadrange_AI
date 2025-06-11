
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

const PUBLIC_PATHS = ['/', '/login', '/register', '/register/step2', '/register/step3', '/forgot-password']; // Added /forgot-password

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
  
  // If it's a public path, or if user is authenticated for protected paths, render content
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const showAppHeader = !isPublicPath && currentUser;

  // If it's a protected path and user is not loaded yet (but not loading anymore), it means redirect is about to happen
  if (!isPublicPath && !currentUser && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <>
      {showAppHeader && <AppHeader />}
      {/* Removed flex-grow from main, as RootLayout's div now handles it */}
      <main className={`${showAppHeader ? 'pt-4 md:pt-6' : ''}`}> 
        {children}
      </main>
    </>
  );
}
