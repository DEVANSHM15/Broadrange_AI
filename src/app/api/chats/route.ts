
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Chat } from '@/types';

const db = await getDb();

// Get all chats for a user
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    try {
        const chats = await db.all<Chat[]>("SELECT * FROM chats WHERE userId = ? ORDER BY updatedAt DESC", userId);
        return NextResponse.json(chats, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch chats:", error);
        return NextResponse.json({ error: "Failed to fetch chats", details: (error as Error).message }, { status: 500 });
    }
}

// Create a new chat
export async function POST(req: Request) {
    const { userId, title } = await req.json();

    if (!userId || !title) {
        return NextResponse.json({ error: "User ID and title are required" }, { status: 400 });
    }

    try {
        const now = new Date().toISOString();
        const newChat: Chat = {
            id: `chat-${Date.now()}`,
            userId: userId,
            title: title,
            createdAt: now,
            updatedAt: now,
        };
        await db.run(
            "INSERT INTO chats (id, userId, title, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
            newChat.id, newChat.userId, newChat.title, newChat.createdAt, newChat.updatedAt
        );
        return NextResponse.json(newChat, { status: 201 });
    } catch (error) {
        console.error("Failed to create chat:", error);
        return NextResponse.json({ error: "Failed to create chat", details: (error as Error).message }, { status: 500 });
    }
}
