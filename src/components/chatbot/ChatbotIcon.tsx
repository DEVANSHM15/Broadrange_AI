
"use client";

import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatbotIconProps {
  onClick: () => void;
}

export function ChatbotIcon({ onClick }: ChatbotIconProps) {
  return (
    <Button
      variant="default"
      size="icon"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
      onClick={onClick}
      aria-label="Open Study Assistant"
    >
      <MessageSquare className="h-7 w-7 text-primary-foreground" />
    </Button>
  );
}
