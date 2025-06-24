import { NextResponse } from 'next/server';

// This endpoint is disabled.
export async function POST(req: Request) {
  return NextResponse.json(
    { error: 'This feature is currently disabled.' },
    { status: 501 } // 501 Not Implemented
  );
}
