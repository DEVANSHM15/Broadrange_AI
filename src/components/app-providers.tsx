
"use client";

import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
// import { ThemeProvider } from "next-themes"; // Example for dark mode

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  // If you add dark mode toggle later, wrap with ThemeProvider:
  // return (
  //   <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  //     <AuthProvider>{children}</AuthProvider>
  //   </ThemeProvider>
  // );
  return <AuthProvider>{children}</AuthProvider>;
}
