
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
      // console.log(`AppLayout: Redirecting from ${pathname} to /login because no currentUser and path is not public.`);
      router.replace('/login');
    }
  }, [currentUser, isLoading, router, pathname]);

  // 1. Initial Authentication Loading State
  if (isLoading) {
    // For protected paths, show a full-page spinner during the initial auth check.
    // For public paths, we can allow them to render as they don't depend on currentUser.
    if (!PUBLIC_PATHS.includes(pathname)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-3 text-muted-foreground">Verifying your session...</p>
        </div>
      );
    }
    // For public paths during initial isLoading, we let children render.
    // Alternatively, return null or a minimal loader if preferred.
    // For now, allowing public content to render immediately is fine.
  }

  // 2. Authentication Resolved (isLoading is false)
  if (!currentUser) {
    // User is NOT authenticated
    if (PUBLIC_PATHS.includes(pathname)) {
      // On a public path, render children without AppHeader
      // This div ensures the flex layout from RootLayout continues to work.
      return (
        <div className="flex flex-col flex-grow min-h-0">
          <main className="flex-grow">{children}</main>
        </div>
      );
    } else {
      // On a protected path without a user, redirection is imminent via useEffect.
      // Show a spinner while redirecting.
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-3 text-muted-foreground">Redirecting to login...</p>
        </div>
      );
    }
  }

  // 3. User IS Authenticated (currentUser exists, isLoading is false)
  // Render children with AppHeader (AppHeader will only render if path is not public, handled by its own logic)
  const showAppHeader = !PUBLIC_PATHS.includes(pathname); // This should generally be true here

  return (
    <div className="flex flex-col flex-grow min-h-0">
      {showAppHeader && <AppHeader />}
      <main className={`flex-grow ${showAppHeader ? 'pt-4 md:pt-6' : ''}`}>
        {children}
      </main>
    </div>
  );
}
