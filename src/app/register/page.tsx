
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

// This page now acts as a redirector to the unified login page.
export default function RegisterRedirectPage() {
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (currentUser) {
        router.replace('/dashboard');
      } else {
        // Redirect to the login page, which now handles both login and signup.
        // A query param could be used to default to the sign-up view, but for now,
        // we'll just redirect to the main auth page.
        router.replace('/login');
      }
    }
  }, [router, currentUser, isLoading]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
