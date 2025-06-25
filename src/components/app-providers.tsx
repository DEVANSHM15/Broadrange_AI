
"use client";

import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { GoogleOAuthProvider } from '@react-oauth/google';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>{children}</AuthProvider>
    </GoogleOAuthProvider>
  );
}
