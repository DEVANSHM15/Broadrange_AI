
"use client";

import { useState, useRef, useEffect, type FormEvent } from 'react';
import AppLayout from "@/components/AppLayout";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, BookOpen, BarChart3, CalendarDaysIcon, ListChecks, LogOut, SettingsIcon, LayoutDashboard, BarChartBig, Bot } from 'lucide-react';
import { cn } from "@/lib/utils";
import { askStudyAssistant } from '@/ai/flows/studyAssistantChatFlow';
import type { StudyAssistantChatInput } from '@/types';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { usePathname } from 'next/navigation';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  isHtml?: boolean;
}

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

function LocalSidebar() {
    const { currentUser, logout } = useAuth();
    const pathname = usePathname();

    return (
        <aside className="hidden lg:flex flex-col w-64 border-r bg-background p-4 space-y-4">
            <div className="flex items-center gap-3 px-2">
                <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(currentUser?.name)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold text-sm">{currentUser?.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                </div>
            </div>
            <nav className="flex-grow space-y-1">
                 {navItems.map(item => (
                    <Link key={item.href} href={item.href} passHref>
                        <Button variant={pathname === item.href ? "secondary" : "ghost"} className="w-full justify-start gap-2">
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Button>
                    </Link>
                ))}
            </nav>
            <div className="space-y-1">
                 <Link href="/settings" passHref>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                        <SettingsIcon className="h-4 w-4" /> Settings
                    </Button>
                </Link>
                 <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
                    <LogOut className="h-4 w-4" /> Sign Out
                </Button>
            </div>
        </aside>
    );
}

const features = [
  { href: "/planner", label: "AI Planner" },
  { href: "/calendar", label: "Calendar" },
  { href: "/analytics", label: "Analytics" },
  { href: "/achievements", label: "Progress Hub" },
];

const BotAvatar = () => (
    <Avatar className="h-8 w-8 border-2 border-primary/50">
        <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
            >
                <path
                d="M16.5 7.5V12.5C16.5 14.7091 14.7091 16.5 12.5 16.5H2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                />
                <path
                d="M7.5 16.5V11.5C7.5 9.29086 9.29086 7.5 11.5 7.5H21.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                />
                <path
                d="M12 7.5C12 5.84315 10.6569 4.5 9 4.5C7.34315 4.5 6 5.84315 6 7.5C6 9.15685 7.34315 10.5 9 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                />
                <path
                d="M18 7.5C18 9.15685 16.6569 10.5 15 10.5C13.3431 10.5 12 9.15685 12 7.5"
                stroke="currentColor"
                strokeWidth="1.5"
                />
                <path
                d="M12.5 16.5H11.5C9.29086 16.5 7.5 18.2909 7.5 20.5V21.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                />
                <path
                d="M16.5 12.5V14.5C16.5 16.7091 14.7091 18.5 12.5 18.5H12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                />
            </svg>
        </div>
    </Avatar>
);

export default function MasterChatbotPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      { sender: 'bot', text: "Hello! I'm your study assistant. Ask me anything about how to use the application, or use the shortcuts below to navigate.", isHtml: false },
    ]);
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        }
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = { sender: 'user', text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const input: StudyAssistantChatInput = {
        query: userMessage.text,
      };
      const result = await askStudyAssistant(input);

      const botMessage: ChatMessage = { sender: 'bot', text: result.response, isHtml: true };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: ChatMessage = { sender: 'bot', text: "Sorry, I'm having trouble connecting. Please try again later.", isHtml: false };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-57px)]">
        <LocalSidebar />
        <main className="flex-grow flex flex-col bg-muted/30">
            <div className="flex-grow flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-3xl h-full flex flex-col bg-card border rounded-lg shadow-lg">
                    <ScrollArea className="flex-grow p-6" ref={scrollAreaRef}>
                        <div className="space-y-6">
                        {messages.map((message, index) => (
                            <div
                            key={index}
                            className={cn(
                                "flex items-start gap-3 text-sm",
                                message.sender === 'user' ? "justify-end" : "justify-start"
                            )}
                            >
                            {message.sender === 'bot' && <BotAvatar />}
                            <div
                                className={cn(
                                "max-w-[85%] rounded-lg px-4 py-2",
                                "prose prose-sm dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-li:my-0",
                                message.sender === 'user'
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                )}
                            >
                                {message.isHtml ? (
                                <div dangerouslySetInnerHTML={{ __html: message.text }} />
                                ) : (
                                <p>{message.text}</p>
                                )}
                                
                                {message.sender === 'bot' && index === 0 && (
                                <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                                    {features.map((feature) => (
                                        <Link href={feature.href} key={feature.href} passHref>
                                            <Button variant="outline" className="w-full justify-start bg-background">
                                                {feature.label}
                                            </Button>
                                        </Link>
                                    ))}
                                </div>
                                )}
                            </div>
                            {message.sender === 'user' && (
                                <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials(currentUser?.name)}</AvatarFallback>
                                </Avatar>
                            )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-start gap-3 justify-start">
                            <BotAvatar />
                            <div className="bg-muted rounded-lg p-3 flex items-center">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                            </div>
                        )}
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t bg-background">
                        <form onSubmit={handleSendMessage} className="w-full flex items-center gap-2">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask how to use the app..."
                            autoComplete="off"
                            disabled={isLoading}
                            className="flex-grow"
                        />
                        <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                        </form>
                    </div>
                </div>
            </div>
        </main>
      </div>
    </AppLayout>
  );
}

    