
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { askStudyAssistant } from '@/ai/flows/studyAssistantChatFlow';
import type { ChatMessage } from '@/types';

const db = await getDb();

// Reusable HTML snippet for the action buttons
const actionButtonsHTML = `
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

// Get all messages for a specific chat
export async function GET(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  const { chatId } = params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required for authorization' }, { status: 401 });
  }

  try {
    // Verify user owns the chat
    const chat = await db.get("SELECT id FROM chats WHERE id = ? AND userId = ?", chatId, userId);
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
    }

    const messages = await db.all<ChatMessage[]>("SELECT * FROM chat_messages WHERE chatId = ? ORDER BY createdAt ASC", chatId);
    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch messages for chat ${chatId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch messages', details: (error as Error).message }, { status: 500 });
  }
}

// Add a new message to a chat and get a response from the AI
export async function POST(
  req: Request,
  { params }: { params: { chatId: string } }
) {
    const { chatId } = params;
    const { userId, message, history } = await req.json();

    if (!userId || !message) {
        return NextResponse.json({ error: "User ID and message content are required" }, { status: 400 });
    }

    try {
        const chat = await db.get("SELECT id FROM chats WHERE id = ? AND userId = ?", chatId, userId);
        if (!chat) {
            return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
        }

        const now = new Date().toISOString();

        // Save user message
        await db.run(
            "INSERT INTO chat_messages (chatId, role, content, createdAt) VALUES (?, ?, ?, ?)",
            chatId, 'user', message, now
        );

        // Call AI for a response
        const aiResponse = await askStudyAssistant({ query: message, history, userId });
        
        // Append the action buttons to the AI's response
        const botResponseContent = aiResponse.response + actionButtonsHTML;

        // Save bot message
        await db.run(
            "INSERT INTO chat_messages (chatId, role, content, isHtml, createdAt) VALUES (?, ?, ?, ?, ?)",
            chatId, 'bot', botResponseContent, true, new Date().toISOString()
        );
        
        // Update chat's updatedAt timestamp
        await db.run("UPDATE chats SET updatedAt = ? WHERE id = ?", new Date().toISOString(), chatId);

        const botMessage: Omit<ChatMessage, 'id'> = {
            chatId,
            role: 'bot',
            content: botResponseContent,
            isHtml: true,
            createdAt: new Date().toISOString()
        }

        return NextResponse.json(botMessage, { status: 200 });
    } catch (error) {
        console.error(`Error processing message for chat ${chatId}:`, error);
        return NextResponse.json({ error: 'Failed to process message', details: (error as Error).message }, { status: 500 });
    }
}


// Delete a chat
export async function DELETE(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  const { chatId } = params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required for authorization' }, { status: 401 });
  }

  try {
    const chat = await db.get("SELECT id FROM chats WHERE id = ? AND userId = ?", chatId, userId);
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
    }

    await db.run("DELETE FROM chats WHERE id = ?", chatId);
    // Messages are deleted automatically due to ON DELETE CASCADE
    
    return NextResponse.json({ message: 'Chat deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete chat ${chatId}:`, error);
    return NextResponse.json({ error: 'Failed to delete chat', details: (error as Error).message }, { status: 500 });
  }
}
