
"use client";

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatbotMessage, StudyAssistantChatOutput } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Send, MessageSquare, User, Bot, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatbotModal({ isOpen, onClose }: ChatbotModalProps) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { id: 'initial-bot-message', text: "Hi there! I'm your Study Assistant. How can I help you plan or analyze your studies today?", sender: 'bot', timestamp: Date.now() }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const query = inputValue.trim();
    if (!query || !currentUser) return;

    const newUserMessage: ChatbotMessage = {
      id: `user-${Date.now()}`,
      text: query,
      sender: 'user',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: query, currentUserId: currentUser.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Network error or unparseable response" }));
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }
      
      const result: StudyAssistantChatOutput = await response.json();
      
      const newBotMessage: ChatbotMessage = {
        id: `bot-${Date.now()}`,
        text: result.responseText,
        sender: 'bot',
        timestamp: Date.now(),
        error: !!result.error,
      };
      setMessages(prev => [...prev, newBotMessage]);

      if (result.navigationPath) {
        let path = result.navigationPath;
        if (result.navigationState && Object.keys(result.navigationState).length > 0) {
          const queryParams = new URLSearchParams(result.navigationState as Record<string, string>).toString();
          path += `?${queryParams}`;
        }
        router.push(path);
        onClose(); // Close chat modal after navigation
      }

    } catch (error) {
      console.error('Chatbot send message error:', error);
      const errorMessage: ChatbotMessage = {
        id: `error-${Date.now()}`,
        text: error instanceof Error ? error.message : "Sorry, something went wrong.",
        sender: 'bot',
        timestamp: Date.now(),
        error: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[80vh]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2"><MessageSquare className="text-primary"/> Study Assistant Bot</DialogTitle>
          <DialogDescription>Your AI-powered study companion.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow p-4 overflow-y-auto" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.sender === 'bot' && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Bot size={18} />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm",
                    msg.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-foreground rounded-bl-none',
                    msg.error ? 'bg-destructive text-destructive-foreground' : ''
                  )}
                >
                  {msg.error && <AlertCircle size={16} className="inline mr-1 mb-0.5"/>}
                  {msg.text}
                </div>
                {msg.sender === 'user' && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                    <User size={18} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end gap-2 justify-start">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Bot size={18} />
                </div>
                <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm bg-muted text-foreground rounded-bl-none">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex w-full gap-2">
            <Input
              type="text"
              placeholder="Ask about your plans, achievements..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-grow"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
