
import type { Metadata } from 'next';
import './globals.css';
import './style.css'; 
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from '@/components/app-providers';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'CodeXStudy', 
  description: 'AI-Powered Study Planning Assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Updated favicon to 'C' for CodeXStudy */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>C</text></svg>" />
      </head>
      <body className="antialiased flex flex-col min-h-screen bg-background font-sans" suppressHydrationWarning>
        <AppProviders>
          <div className="flex-grow">
            {children}
          </div>
          <Toaster />
          <footer className="py-6 md:py-8 border-t bg-background">
            <div className="container mx-auto text-center text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} CodeXStudy. All rights reserved.
            </div>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
