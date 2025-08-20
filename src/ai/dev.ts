
import { config } from 'dotenv';
config();

import '@/ai/flows/adaptive-re-planning.ts';
import '@/ai/flows/generate-study-schedule.ts';
import '@/ai/flows/generate-plan-reflection.ts';
import '@/ai/flows/studyAssistantChatFlow.ts';
import '@/ai/flows/generate-task-quiz-flow.ts';
import '@/ai/tools/getCurrentStudyPlanTool.ts';
import '@/ai/tools/proposeStudyPlanParametersTool.ts';
import '@/ai/tools/proposeReplanTool.ts'; // Added the new re-planning tool
