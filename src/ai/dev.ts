
import { config } from 'dotenv';
config();

import '@/ai/flows/adaptive-re-planning.ts';
import '@/ai/flows/generate-study-schedule.ts';
import '@/ai/flows/generate-plan-reflection.ts';
import '@/ai/flows/generate-task-quiz-flow.ts'; // Added import for the new quiz flow
import '@/ai/flows/studyAssistantChatFlow.ts'; // Added import for the new chatbot flow

