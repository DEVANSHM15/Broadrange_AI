
"use client";

import { useState, useRef, useEffect, type FormEvent } from 'react';
import AppLayout from "@/components/AppLayout";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, Layers, BarChart, BookOpenCheck, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import { askStudyAssistant } from '@/ai/flows/studyAssistantChatFlow';
import type { StudyAssistantChatInput } from '@/types';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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

const BotAvatar = () => (
    <Avatar className="h-8 w-8 border-2 border-primary/50">
        <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
        </div>
    </Avatar>
);

const featureCards = [
    {
        icon: Layers,
        title: "Personalized Plans",
        description: "Optimal study schedules based on your goals.",
        href: "/planner"
    },
    {
        icon: BarChart,
        title: "Advanced Analytics",
        description: "Visualize your progress with insightful analytics.",
        href: "/analytics"
    },
    {
        icon: BookOpenCheck,
        title: "AI-Powered Quizzes",
        description: "Reinforce learning with on-demand quizzes.",
        href: "/calendar"
    }
];

export default function MasterChatbotPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      { sender: 'bot', text: "Hello! I'm your study assistant. Ask me anything about how to use the application.", isHtml: false },
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
      <main className="flex-grow p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
          {/* Main Chat Area */}
          <div className="lg:col-span-2 h-full flex flex-col bg-card border rounded-lg shadow-lg">
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
              <div className="p-4 border-t bg-background rounded-b-lg">
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
          {/* Right Sidebar */}
          <div className="hidden lg:flex flex-col bg-card border rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-primary mb-2">Feature Spotlight</h2>
            <p className="text-sm text-muted-foreground mb-6">Discover what you can do. Ask me for more details on any feature!</p>
            <div className="space-y-4">
              {featureCards.map((card, index) => (
                <Link href={card.href} key={index} passHref>
                  <Card className="text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-card to-card hover:-translate-y-1 transition-transform duration-300 cursor-pointer">
                    <CardHeader className="items-center pb-2">
                      <div className="p-3 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <card.icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="mt-2 text-base">{card.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{card.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
