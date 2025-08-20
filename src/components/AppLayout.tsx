
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

  if (isLoading && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Allow public pages to render without redirecting
  if (isPublicPage(pathname)) {
    return (
      <>
        <AppHeader />
        <main>{children}</main>
      </>
    );
  }

  // If loading is done and we are on a private page without a user,
  // this will show briefly before the useEffect redirects.
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // User is logged in, show the full app layout
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-grow">{children}</main>
    </div>
  );
}

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}
