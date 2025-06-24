
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import type { StoredUser } from '@/types';

interface LoginRequestBody {
  email: string;
  password_unsafe: string; // Plain text password from client
}

export async function POST(req: Request) {
  try {
    const db = await getDb();
    const body = await req.json() as LoginRequestBody;
    const { email, password_unsafe } = body;

    if (!email || !password_unsafe) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Select all necessary fields, including password_hash
    const userFromDbRow = await db.get<{
        id: number; // SQLite ID is number
        name: string;
        email: string;
        password_hash: string; // Expected from DB
        studyLevel?: string;
        preferredStudyTime?: string;
        aiSettings_json?: string;
        securityQuestion?: string;
    }>(
      'SELECT id, name, email, password_hash, studyLevel, preferredStudyTime, aiSettings_json, securityQuestion FROM users WHERE email = ?',
      email
    );

    if (!userFromDbRow) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // More robust check for password_hash
    if (!userFromDbRow.password_hash || typeof userFromDbRow.password_hash !== 'string' || userFromDbRow.password_hash.trim() === '') {
      console.error(`User ${email} found but password_hash is missing, not a string, or empty.`);
      // This indicates a data integrity issue. For security, treat as an invalid login attempt.
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password_unsafe, userFromDbRow.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Prepare user data to send back to client, excluding sensitive info
    // Ensure the ID is converted to a string to match StoredUser type
    const userToReturn: Omit<StoredUser, 'password_hash' | 'password_unsafe' | 'securityAnswer' | 'securityAnswer_hash'> = {
      id: String(userFromDbRow.id), // Convert number ID to string
      name: userFromDbRow.name,
      email: userFromDbRow.email,
      studyLevel: userFromDbRow.studyLevel,
      preferredStudyTime: userFromDbRow.preferredStudyTime,
      aiSettings: userFromDbRow.aiSettings_json ? JSON.parse(userFromDbRow.aiSettings_json) : undefined,
      securityQuestion: userFromDbRow.securityQuestion,
    };

    return NextResponse.json(userToReturn, { status: 200 });

  } catch (error) {
    console.error('Login API error:', error);
    if (error instanceof SyntaxError) { // Check for JSON parsing errors specifically
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}
