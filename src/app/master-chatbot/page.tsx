
"use client";

import { useState, useRef, useEffect, type FormEvent, useCallback } from 'react';
import AppLayout from "@/components/AppLayout";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, Sparkles, PlusCircle, MessageSquare, Trash2, Layers, Award, BookOpen, Calendar, AreaChart, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { ChatMessage, Chat } from '@/types';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


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

const initialMessageHTML = `
    <p>Hello! I'm your study assistant. How can I help you use the app today? You can ask me about any feature, or use one of the quick actions to get started.</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
        <a href="/planner" style="display: block; text-decoration: none; color: inherit; padding: 12px; border-radius: 8px; text-align: center; font-weight: 500; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); transition: all 0.2s ease; box-shadow: 0 2px 8px -1px hsla(var(--primary) / 0.1); will-change: transform;">AI Planner</a>
        <a href="/calendar" style="display: block; text-decoration: none; color: inherit; padding: 12px; border-radius: 8px; text-align: center; font-weight: 500; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); transition: all 0.2s ease; box-shadow: 0 2px 8px -1px hsla(var(--primary) / 0.1); will-change: transform;">Calendar</a>
        <a href="/analytics" style="display: block; text-decoration: none; color: inherit; padding: 12px; border-radius: 8px; text-align: center; font-weight: 500; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); transition: all 0.2s ease; box-shadow: 0 2px 8px -1px hsla(var(--primary) / 0.1); will-change: transform;">Analytics</a>
        <a href="/achievements" style="display: block; text-decoration: none; color: inherit; padding: 12px; border-radius: 8px; text-align: center; font-weight: 500; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); transition: all 0.2s ease; box-shadow: 0 2px 8px -1px hsla(var(--primary) / 0.1); will-change: transform;">Progress Hub</a>
    </div>
    <style>
      a:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px -2px hsla(var(--primary) / 0.2);
        background: hsl(var(--accent));
      }
    </style>
`;


export default function MasterChatbotPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages, isSending]);


  const fetchChats = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/chats?userId=${currentUser.id}`);
      if (!response.ok) throw new Error("Failed to fetch chats");
      const data: Chat[] = await response.json();
      setChats(data);
      if (data.length > 0 && !activeChatId) {
        handleSelectChat(data[0].id);
      } else if (data.length === 0) {
        handleNewChat();
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not load chat history.", variant: "destructive" });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentUser, toast, activeChatId]);

  useEffect(() => {
    fetchChats();
  }, [currentUser]);

  const handleSelectChat = async (chatId: string) => {
    if (!currentUser) return;
    setActiveChatId(chatId);
    setMessages([]);
    setIsLoadingHistory(true);
    try {
        const response = await fetch(`/api/chats/${chatId}?userId=${currentUser.id}`);
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data: ChatMessage[] = await response.json();
        setMessages(data);
    } catch (error) {
        toast({ title: "Error", description: "Could not load chat messages.", variant: "destructive" });
    } finally {
        setIsLoadingHistory(false);
    }
  };

  const handleNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([{ role: 'bot', content: initialMessageHTML, isHtml: true, chatId: 'new', createdAt: new Date().toISOString() }]);
  }, []);
  
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending || !currentUser) return;

    const query = inputValue;
    setInputValue('');
    setIsSending(true);

    const userMessage: ChatMessage = { chatId: activeChatId || 'temp', role: 'user', content: query, createdAt: new Date().toISOString() };
    const newMessages = [...messages.filter(m => m.chatId !== 'new'), userMessage];
    setMessages(newMessages);
    
    let currentChatId = activeChatId;

    try {
        if (!currentChatId) {
            const createResponse = await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, title: query.substring(0, 40) + '...' }),
            });
            const newChat: Chat = await createResponse.json();
            currentChatId = newChat.id;
            setActiveChatId(newChat.id);
            setChats(prev => [newChat, ...prev]);
        }

        const historyForAI = newMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })) as { role: 'user' | 'model'; parts: { text: string }[] }[];
        
        const response = await fetch(`/api/chats/${currentChatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, message: query, history: historyForAI }),
        });
        
        if (!response.ok) throw new Error("Failed to get response from AI");

        const botMessage: ChatMessage = await response.json();
        setMessages(prev => [...prev.map(m => m.chatId === 'temp' ? {...m, chatId: currentChatId!} : m), botMessage]);
        
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: ChatMessage = { chatId: 'error', role: 'bot', content: "Sorry, I'm having trouble connecting. Please try again later.", createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
      if (currentChatId) {
        const chatToUpdate = chats.find(c => c.id === currentChatId);
        if (chatToUpdate) {
          chatToUpdate.updatedAt = new Date().toISOString();
          setChats(prev => [chatToUpdate, ...prev.filter(c => c.id !== currentChatId)]);
        } else {
           fetchChats();
        }
      }
    }
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete || !currentUser) return;
    try {
        const response = await fetch(`/api/chats/${chatToDelete.id}?userId=${currentUser.id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to delete chat");
        toast({ title: "Success", description: "Chat deleted." });
        setChats(prev => prev.filter(c => c.id !== chatToDelete.id));
        if (activeChatId === chatToDelete.id) {
            if(chats.length > 1) {
                handleSelectChat(chats.filter(c => c.id !== chatToDelete.id)[0].id);
            } else {
                handleNewChat();
            }
        }
    } catch (error) {
        toast({ title: "Error", description: "Could not delete chat.", variant: "destructive" });
    } finally {
        setChatToDelete(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-57px)]">
        {/* Left Sidebar for Chat History */}
        <aside className={cn(
            "flex-shrink-0 bg-card border-r flex-col transition-all duration-300 ease-in-out",
            isSidebarVisible ? "w-64 flex" : "w-0 hidden"
        )}>
          <div className="p-2">
            <Button variant="outline" className="w-full" onClick={handleNewChat}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Chat
            </Button>
          </div>
          <ScrollArea className="flex-grow">
            <div className="p-2 space-y-1">
              {isLoadingHistory ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </div>
              ) : (
                chats.map(chat => (
                  <div key={chat.id} className={cn("group flex items-center justify-between rounded-md p-2 text-sm cursor-pointer", activeChatId === chat.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}>
                    <button className="flex-grow text-left truncate" onClick={() => handleSelectChat(chat.id)}>
                      <MessageSquare className="inline h-4 w-4 mr-2 flex-shrink-0" />
                      {chat.title}
                    </button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => setChatToDelete(chat)}>
                       <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col h-full bg-background">
          <div className="flex items-center justify-between p-2 border-b">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarVisible(!isSidebarVisible)}>
                  {isSidebarVisible ? <PanelLeftClose /> : <PanelLeftOpen />}
              </Button>
              <div className="flex-grow text-center font-semibold">Master Agent</div>
              <Button variant="ghost" size="icon" onClick={handleNewChat} title="Start New Chat">
                  <PlusCircle />
              </Button>
          </div>

          <div className="flex-grow p-4 md:p-6 overflow-y-auto" ref={scrollRef}>
              <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message, index) => (
                  <div key={index} className={cn("flex items-start gap-3 text-sm", message.role === 'user' ? "justify-end" : "justify-start")}>
                  {message.role === 'bot' && <BotAvatar />}
                  <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-4 py-2",
                        "prose prose-sm dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-li:my-0",
                        message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                  >
                      {message.isHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: message.content }} />
                      ) : (
                      <p>{message.content}</p>
                      )}
                  </div>
                  {message.role === 'user' && (
                      <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(currentUser?.name)}</AvatarFallback>
                      </Avatar>
                  )}
                  </div>
              ))}
              {isSending && (
                  <div className="flex items-start gap-3 justify-start">
                  <BotAvatar />
                  <div className="bg-muted rounded-lg p-3 flex items-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                  </div>
              )}
              </div>
          </div>
          <div className="p-4 border-t bg-background">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSendMessage} className="w-full flex items-center gap-2">
              <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask how to use the app..."
                  autoComplete="off"
                  disabled={isSending}
                  className="flex-grow"
              />
              <Button type="submit" size="icon" disabled={isSending || !inputValue.trim()}>
                  <Send className="h-4 w-4" />
              </Button>
              </form>
            </div>
          </div>
        </main>
        
        {/* Right Sidebar for Quick Actions */}
        <aside className="w-72 flex-shrink-0 bg-card border-l hidden lg:flex flex-col p-4">
            <div className="space-y-2 mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="text-primary h-5 w-5" /> Quick Actions</h3>
                <p className="text-sm text-muted-foreground">Navigate to key app features.</p>
            </div>
            <div className="space-y-4">
                 <Link href="/planner" className="block">
                    <Card className="text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-card to-card hover:-translate-y-1 transition-transform duration-300">
                      <CardHeader className="items-center p-4">
                        <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <CardTitle className="mt-2 text-base">AI Planner</CardTitle>
                      </CardHeader>
                    </Card>
                 </Link>
                 <Link href="/calendar" className="block">
                    <Card className="text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-card to-card hover:-translate-y-1 transition-transform duration-300">
                      <CardHeader className="items-center p-4">
                         <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          <Calendar className="h-6 w-6" />
                        </div>
                        <CardTitle className="mt-2 text-base">Calendar</CardTitle>
                      </CardHeader>
                    </Card>
                 </Link>
                 <Link href="/analytics" className="block">
                    <Card className="text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-card to-card hover:-translate-y-1 transition-transform duration-300">
                      <CardHeader className="items-center p-4">
                         <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          <AreaChart className="h-6 w-6" />
                        </div>
                        <CardTitle className="mt-2 text-base">Analytics</CardTitle>
                      </CardHeader>
                    </Card>
                 </Link>
                 <Link href="/achievements" className="block">
                    <Card className="text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-card to-card hover:-translate-y-1 transition-transform duration-300">
                      <CardHeader className="items-center p-4">
                         <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          <Award className="h-6 w-6" />
                        </div>
                        <CardTitle className="mt-2 text-base">Progress Hub</CardTitle>
                      </CardHeader>
                    </Card>
                 </Link>
            </div>
        </aside>
      </div>

       <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the chat "{chatToDelete?.title}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteChat}>Confirm Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </AppLayout>
  );
}
