"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { ChatbotModal } from './ChatbotModal';

export function ChatbotIcon() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="icon"
          className="rounded-full shadow-lg w-14 h-14"
          onClick={() => setIsModalOpen(true)}
          aria-label="Open Chatbot"
        >
          <MessageCircle className="h-7 w-7" />
        </Button>
      </div>
      <ChatbotModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
