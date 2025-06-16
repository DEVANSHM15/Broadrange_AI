
import { NextResponse } from 'next/server';
import { studyAssistantChat, type StudyAssistantChatInput } from '@/ai/flows/studyAssistantChatFlow';
import { StreamingTextResponse, streamText } from 'ai'; // For potential future streaming

export async function POST(req: Request) {
  try {
    const { userQuery, currentUserId } = (await req.json()) as StudyAssistantChatInput;

    if (!userQuery || !currentUserId) {
      return NextResponse.json({ error: 'userQuery and currentUserId are required' }, { status: 400 });
    }

    const flowInput: StudyAssistantChatInput = { userQuery, currentUserId };
    const result = await studyAssistantChat(flowInput);

    if (result.error) {
      // If the flow itself caught an error and returned it in the structured output
      return NextResponse.json(result, { status: 200 }); // Or 500 if you prefer to signal flow error as server error
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('/api/chat error:', error);
    let errorMessage = 'An internal server error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // This is for errors in the API route itself, not errors from the flow handled above
    return NextResponse.json({ responseText: "Sorry, I couldn't connect to the assistant right now.", error: errorMessage }, { status: 500 });
  }
}
