"use client";

import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
      <AuthProvider>{children}</AuthProvider>
  );
}
