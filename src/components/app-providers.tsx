"use client";

import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { GoogleOAuthProvider } from '@react-oauth/google';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  if (!googleClientId) {
    console.warn(
      "WARNING: NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set or is empty. " +
      "Google Sign-In will not work. Please check your .env file and ensure " +
      "the variable is correctly named and has a value, then restart your development server."
    );
  }
  
  // Conditionally wrap with GoogleOAuthProvider ONLY if the client ID exists.
  // This prevents the app from crashing if the environment variable is missing.
  if (googleClientId) {
    return (
        <GoogleOAuthProvider clientId={googleClientId}>
            <AuthProvider>{children}</AuthProvider>
        </GoogleOAuthProvider>
    );
  }

  // Fallback for when no Google Client ID is provided.
  // The rest of the app can still function with standard email/password auth.
  return <AuthProvider>{children}</AuthProvider>;
}
