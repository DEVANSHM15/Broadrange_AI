"use client";

import Link from "next/link";
import { LogOut, Moon, Sun, Settings, LayoutDashboard, BookOpen, BarChartBig, CalendarDaysIcon, ListChecks, Bot, PanelLeft } from "lucide-react";
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
import Image from "next/image";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";


export function AppHeader() {
  const { currentUser, logout, isLoading } = useAuth();
  const [theme, setTheme] = useState("dark");
  
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme_StudyPlannerAI") || 'dark';
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href={currentUser ? "/dashboard" : "/"} className="mr-6 flex items-center space-x-2">
          <Image src="https://www.broadrange.ai/images/broadrange-logo.jpg" alt="Broadrange AI Logo" width={93} height={24} className="h-8 w-auto rounded-lg"/>
          <span className="font-bold sm:inline-block">CodeXStudy</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button onClick={toggleTheme} variant="ghost" size="icon" aria-label="Toggle theme">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          {!currentUser && (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function AppSidebar() {
  const { currentUser, logout } = useAuth();
  const [theme, setTheme] = useState("dark");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme_StudyPlannerAI") || 'dark';
    setTheme(storedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme_StudyPlannerAI", newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/planner", label: "AI Planner", icon: BookOpen },
    { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
    { href: "/analytics", label: "Analytics", icon: BarChartBig },
    { href: "/achievements", label: "Progress Hub", icon: ListChecks },
    { href: "/master-chatbot", label: "Chatbot", icon: Bot },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-foreground group-data-[collapsible=icon]:-ml-1">
             <Image src="https://www.broadrange.ai/images/broadrange-logo.jpg" alt="Broadrange AI Logo" width={93} height={24} className="h-7 w-auto rounded-md" />
            <span className="group-data-[collapsible=icon]:hidden">CodeXStudy</span>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                onClick={() => router.push(item.href)}
                isActive={pathname === item.href}
                tooltip={{ children: item.label }}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         <SidebarMenu>
            <SidebarMenuItem>
                 <SidebarMenuButton onClick={toggleTheme} tooltip={{ children: `Toggle ${theme === "light" ? "dark" : "light"} mode` }}>
                    {theme === 'light' ? <Moon /> : <Sun />}
                    <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip={{ children: currentUser?.name || 'User Profile' }}>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/20 text-xs">{getInitials(currentUser?.name)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{currentUser?.name || "User"}</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mb-2 ml-3" align="start" side="right" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser?.name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{currentUser?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
