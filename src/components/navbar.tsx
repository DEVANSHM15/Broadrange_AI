
"use client";

import Link from "next/link";
import { LogIn, UserPlus, LogOut, Moon, Sun, Settings, LayoutDashboard, BookOpen, BarChartBig, CalendarDaysIcon, ListChecks } from "lucide-react";
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
import { usePathname, useRouter } from "next/navigation";

export function AppHeader() {
  const { currentUser, logout, isLoading } = useAuth();
  const [theme, setTheme] = useState("dark");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
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
    if (newTheme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name || name.trim() === "") return "?";
    const trimmedName = name.trim();
    const nameParts = trimmedName.split(' ').filter(part => part.length > 0);
    if (nameParts.length === 0) return "?";
    if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
    return nameParts[0][0].toUpperCase() + nameParts[nameParts.length - 1][0].toUpperCase();
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/planner", label: "AI Planner", icon: BookOpen },
    { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
    // { href: "/weekly-diary", label: "Weekly Diary", icon: NotebookPen }, // Removed Weekly Diary
    { href: "/analytics", label: "Analytics", icon: BarChartBig },
    { href: "/achievements", label: "Progress Hub", icon: ListChecks },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href={currentUser ? "/dashboard" : "/"} className="mr-6 flex items-center space-x-2 text-primary">
          {/* Logo Placeholder: Replace with your actual logo image component */}
          <span className="flex items-center justify-center h-7 w-7 bg-primary text-primary-foreground rounded-full font-bold text-md">C</span>
          <span className="font-bold sm:inline-block">CodeXStudy</span>
        </Link>
        
        {currentUser && (
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "secondary" : "ghost"}
                size="sm"
                onClick={() => router.push(item.href)}
                className="justify-start"
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </nav>
        )}

        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button onClick={toggleTheme} variant="ghost" size="icon" aria-label="Toggle theme">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          {isLoading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse"></div>
          ) : currentUser ? (
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
                    <p className="text-sm font-medium leading-none">{currentUser.name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">
                  Sign In
                </Link>
              </Button>
              <Button asChild>
                <Link href="/register">
                  Get Started
                </Link>
              </Button>
            </div>
          )}
           {/* Mobile Menu Trigger for App Nav (if user is logged in) */}
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className={pathname === item.href ? "bg-accent" : ""}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {!currentUser && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link href="/login">Sign In</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/register">Get Started</Link></DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
