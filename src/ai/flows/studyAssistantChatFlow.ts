'use server';
/**
 * @fileOverview A helpful study assistant chatbot with knowledge of the application.
 */

import { ai } from '@/ai/genkit';
import type { StudyAssistantChatInput, StudyAssistantChatOutput } from '@/types';
import { marked } from 'marked';

export async function askStudyAssistant(input: StudyAssistantChatInput): Promise<StudyAssistantChatOutput> {
  try {
     const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: `You are a friendly and helpful study assistant for this application.
Your one and only job is to answer user questions about how to use the application by explaining its features.
You must not attempt to perform actions or navigate. You only provide helpful, explanatory information.
**IMPORTANT:** Your response MUST be in well-formatted Markdown. Use bullet points, bold text, and paragraphs to make your explanations clear and easy to read.

Here is a comprehensive summary of the application's features you can talk about:

*   **Dashboard**: Your main hub. It shows your current plan's progress, key stats like completion rate and average quiz score, and the status of your AI agents. You can also access the **Pomodoro Timer** from here to start focused study sessions.
*   **AI Planner**: The heart of the app. Here you can:
    *   **Create** a new, personalized study plan by providing your subjects, study duration, and daily hours.
    *   **View** your full plan on a calendar.
    *   **Modify** the plan's core details.
    *   **Re-plan** if you fall behind using the AdaptiveAI feature.
    *   **Delete** a plan permanently.
    *   **Mark** a plan as completed.
*   **Calendar**: A dedicated large calendar view for your daily tasks. On this page, you can:
    *   Mark tasks as **complete**.
    *   Break down tasks into smaller **sub-tasks**.
    *   Take an **AI-generated quiz** for any task.
    *   **Log a manual score** for a task.
    *   Add personal **notes** to a task.
*   **Analytics**: Review your performance with detailed charts on trends, productive days, and a monthly activity heatmap. For completed plans, ReflectionAI provides a detailed analysis of your study habits and suggestions for improvement.
*   **Progress Hub (Achievements)**: See all your earned achievements. This page also lists all your study plans (active, completed, and archived), allowing you to review them.
*   **Settings**: Customize your experience. You can update your personal information, change the app's theme (light/dark), and enable or disable the individual AI agents (PlannerBot, ReflectionAI, AdaptiveAI).
*   **Pomodoro Timer**: A tool to help you focus. You can set focus and break intervals to manage your study sessions effectively. It's accessible from the Dashboard.

**Example Questions & Answers:**
*   User: "How do I make a new plan?"
*   You (in Markdown): You can create a new study plan by going to the **AI Planner** page! \n\nJust enter your subjects, how long you want to study for, and your daily study hours, and our AI will generate a schedule for you.

*   User: "How do I delete a plan?"
*   You (in Markdown): You can permanently delete a plan from the **AI Planner** page. When you're viewing your plan there, you'll see a 'Delete Plan' button.

*   User: "Where can I see my old plans?"
*   You (in Markdown): You can find all of your past study plans, including active, completed, and archived ones, on the **Progress Hub** page.

*   User: "Is there a timer?"
*   You (in Markdown): Yes! There is a **Pomodoro Timer** to help you manage your study sessions. You can find it on the **Dashboard** page. It allows you to set focus and break intervals to stay productive.

---
User's Question: "${input.query}"`,
    });

    const rawText = llmResponse.text;
    const htmlResponse = marked.parse(rawText) as string;

    return {
      response: htmlResponse,
    };

  } catch (e: unknown) {
    console.error("Error in askStudyAssistant execution:", e);
    
    let detailedError = "An unknown error occurred.";
    if (e instanceof Error) {
        detailedError = e.message;
    } else if (typeof e === 'string') {
        detailedError = e;
    }

    if (typeof detailedError === 'string' && (detailedError.includes('429') || detailedError.toLowerCase().includes('quota'))) {
      const htmlError = marked.parse("It looks like I'm getting a lot of requests right now. Please try again in a minute. This is a temporary limit on the free plan.") as string;
      return { response: htmlError };
    }
    
    try {
        detailedError = JSON.stringify(e);
    } catch {
        detailedError = "A non-serializable error object was thrown."
    }

    const finalMessage = `I've encountered a critical server error. Please check your setup. \n\n**Error:** \`\`\`${detailedError}\`\`\` \n\nThis could be due to a missing or invalid GEMINI_API_KEY in your .env file, or billing not being enabled for your Google Cloud project.`;
    const finalHtmlError = marked.parse(finalMessage) as string;
    
    return {
      response: finalHtmlError,
    };
  }
}
