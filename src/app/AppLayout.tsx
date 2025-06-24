
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
    if (isLoading) return; 

    if (!currentUser && !PUBLIC_PATHS.includes(pathname)) {
      router.replace('/login');
    }
  }, [currentUser, isLoading, router, pathname]);

  if (isLoading) {
    if (!PUBLIC_PATHS.includes(pathname)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-3 text-muted-foreground">Verifying your session...</p>
        </div>
      );
    }
  }

  if (!currentUser) {
    if (PUBLIC_PATHS.includes(pathname)) {
      return (
        <div className="flex flex-col flex-grow min-h-0">
          <main className="flex-grow">{children}</main>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-3 text-muted-foreground">Redirecting to login...</p>
        </div>
      );
    }
  }

  // User IS Authenticated
  const showAppHeader = !PUBLIC_PATHS.includes(pathname);

  return (
    <div className="flex flex-col flex-grow min-h-0">
      {showAppHeader && <AppHeader />}
      <main className={`flex-grow ${showAppHeader ? 'pt-4 md:pt-6' : ''}`}>
        {children}
      </main>
    </div>
  );
}
