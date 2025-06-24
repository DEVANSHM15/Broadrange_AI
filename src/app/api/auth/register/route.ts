
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import type { StoredUser, AISettings } from '@/types'; // Assuming AISettings is defined in types

interface RegisterRequestBody {
  name: string;
  email: string;
  password_unsafe: string; // Plain text from client
  studyLevel?: string;
  preferredStudyTime?: string;
  aiSettings?: AISettings;
  securityQuestion?: string;
  securityAnswer?: string; // Plain text security answer
}

const db = await getDb();

export async function POST(req: Request) {
  try {
    const body = await req.json() as RegisterRequestBody;

    const {
      name,
      email,
      password_unsafe,
      studyLevel,
      preferredStudyTime,
      aiSettings,
      securityQuestion,
      securityAnswer,
    } = body;

    if (!name || !email || !password_unsafe) {
      return NextResponse.json({ error: 'Missing required fields: name, email, or password' }, { status: 400 });
    }
    if (password_unsafe.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }
     if (securityQuestion && (!securityAnswer || securityAnswer.length < 3)) {
        return NextResponse.json({ error: 'Security answer must be at least 3 characters long if a question is provided' }, { status: 400 });
    }


    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password_unsafe, 10);
    let securityAnswer_hash = null;
    if (securityQuestion && securityAnswer) {
        securityAnswer_hash = await bcrypt.hash(securityAnswer, 10);
    }
    
    const now = new Date().toISOString();
    const aiSettings_json = aiSettings ? JSON.stringify(aiSettings) : null;

    const result = await db.run(
      `INSERT INTO users (name, email, password_hash, studyLevel, preferredStudyTime, aiSettings_json, securityQuestion, securityAnswer_hash, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      name,
      email,
      password_hash,
      studyLevel,
      preferredStudyTime,
      aiSettings_json,
      securityQuestion,
      securityAnswer_hash,
      now,
      now
    );

    if (!result.lastID) {
      return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
    }

    const newUser: Omit<StoredUser, 'password_unsafe'> = { // Return type should not include plain password
      id: result.lastID.toString(),
      name,
      email,
      studyLevel,
      preferredStudyTime,
      aiSettings,
      securityQuestion, // It's okay to return the question
      // Do NOT return securityAnswer_hash or password_hash
    };

    // Send welcome email (actual email sending logic is in its own API route)
    try {
        // Use req.nextUrl.origin to construct the absolute URL for the API call
        const welcomeEmailResponse = await fetch(`${req.nextUrl.origin}/api/send-welcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name }),
        });
        if (!welcomeEmailResponse.ok) {
            // Log a warning if the email fails but don't block registration
            console.warn(`Welcome email failed to send for ${email}: ${welcomeEmailResponse.statusText}`);
            try {
              const errorBody = await welcomeEmailResponse.json();
              console.warn("Welcome email error details:", errorBody);
            } catch (e) {
              // Ignore if error body is not JSON
            }
        }
    } catch (emailError) {
        console.error(`Error dispatching welcome email for ${email}:`, emailError);
    }


    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof SyntaxError) { // Check for JSON parsing errors specifically
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}
