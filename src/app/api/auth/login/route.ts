
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
    const body = await req.json() as LoginRequestBody;
    const { email, password_unsafe } = body;

    if (!email || !password_unsafe) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = await getDb();
    const userFromDb = await db.get<StoredUser>(
      'SELECT id, name, email, password_hash, studyLevel, preferredStudyTime, aiSettings_json, securityQuestion FROM users WHERE email = ?',
      email
    );

    if (!userFromDb) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password_unsafe, userFromDb.password_hash!); // userFromDb.password_hash will exist if user exists

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Prepare user data to send back to client, excluding sensitive info
    const userToReturn: Omit<StoredUser, 'password_hash' | 'password_unsafe' | 'securityAnswer' | 'securityAnswer_hash'> = {
      id: userFromDb.id,
      name: userFromDb.name,
      email: userFromDb.email,
      studyLevel: userFromDb.studyLevel,
      preferredStudyTime: userFromDb.preferredStudyTime,
      aiSettings: userFromDb.aiSettings_json ? JSON.parse(userFromDb.aiSettings_json) : undefined,
      securityQuestion: userFromDb.securityQuestion,
    };

    // In a real app, you'd typically generate a session token (e.g., JWT) here
    // and send it back to the client to be stored and used for authenticated requests.
    // For now, just returning user info on successful login.
    return NextResponse.json(userToReturn, { status: 200 });

  } catch (error) {
    console.error('Login API error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}
