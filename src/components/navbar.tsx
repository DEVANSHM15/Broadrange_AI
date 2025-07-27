
"use client";

import Link from "next/link";
import { LogOut, Moon, Sun, Settings, LayoutDashboard, BookOpen, BarChartBig, CalendarDaysIcon, ListChecks, Bot } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

// Helper to get initials from a name
const getInitials = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};


// Navigation items for the dropdown menu
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planner", label: "AI Planner", icon: BookOpen },
  { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
  { href: "/analytics", label: "Analytics", icon: BarChartBig },
  { href: "/achievements", label: "Progress Hub", icon: ListChecks },
  { href: "/master-chatbot", label: "Chatbot", icon: Bot },
];


export function AppHeader() {
  const { currentUser, logout, isLoading } = useAuth();
  const [theme, setTheme] = useState("dark");
  const pathname = usePathname();
  
  useEffect(() => {
    // Moved theme logic to a single place to avoid conflicts
    const storedTheme = localStorage.getItem("theme_StudyPlannerAI") || 
                        (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    setTheme(storedTheme);
    if (storedTheme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme_StudyPlannerAI", newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href={currentUser ? "/dashboard" : "/"} className="mr-6 flex items-center space-x-2">
          <Image src="https://www.broadrange.ai/images/broadrange-logo.jpg" alt="Broadrange AI Logo" width={93} height={24} className="h-8 w-auto rounded-lg"/>
          <span className="font-bold sm:inline-block">CodeXStudy</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {currentUser && (
            <nav className="hidden md:flex items-center gap-4">
              {navItems.map(item => (
                <Link key={item.href} href={item.href} passHref>
                  <Button variant={pathname === item.href ? "secondary" : "ghost"} size="sm">
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          )}

          <Button onClick={toggleTheme} variant="ghost" size="icon" aria-label="Toggle theme">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Mobile Nav Links */}
                <div className="md:hidden">
                    {navItems.map(item => (
                        <DropdownMenuItem key={`mobile-${item.href}`} asChild>
                            <Link href={item.href}><item.icon className="mr-2 h-4 w-4"/> {item.label}</Link>
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                </div>
                
                <DropdownMenuItem asChild>
                    <Link href="/settings"><Settings className="mr-2 h-4 w-4"/> Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
             <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" asChild><Link href="/login">Sign In</Link></Button>
                <Button asChild><Link href="/register">Get Started</Link></Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// Kept for compatibility if other components import it, but it's not used for the primary layout anymore.
export function AppSidebar() {
  return null; 
}
