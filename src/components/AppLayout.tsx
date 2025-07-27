"use client";

import type { ReactNode } from 'react';
import { AppHeader, AppSidebar } from '@/components/navbar';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

const PUBLIC_PATHS = ['/', '/login', '/register', '/register/step2', '/register/step3', '/forgot-password'];

function AppLayoutContent({ children }: AppLayoutProps) {
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

  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  if (isPublicPage) {
     return (
        <div className="flex flex-col flex-grow min-h-0">
          <AppHeader />
          <main className="flex-grow">{children}</main>
        </div>
      );
  }

  if (!currentUser) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-3 text-muted-foreground">Redirecting to login...</p>
        </div>
      );
  }

  // User is logged in, show sidebar layout
  return (
    <>
      <AppSidebar />
      <main className="flex-grow">
        {children}
      </main>
    </>
  );
}


export default function AppLayout({ children }: AppLayoutProps) {
    return (
        <SidebarProvider>
            <AppLayoutContent>{children}</AppLayoutContent>
        </SidebarProvider>
    );
}
