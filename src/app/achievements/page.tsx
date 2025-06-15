
"use client";

import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, CheckCircle2, Flame, Brain, Lightbulb, Trophy, Award, HelpCircle, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScheduleData, ScheduleTask, ParsedRawScheduleItem } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// This type and sample data are moved from dashboard
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  achieved: boolean;
  color?: string;
}

const sampleAchievements: Achievement[] = [
  { id: "first_plan", title: "Planner Pioneer", description: "Successfully created your first study plan.", icon: PlusCircle, achieved: false, color: "text-green-500" },
  { id: "task_initiate", title: "Task Starter", description: "Completed your first task in a study plan.", icon: CheckCircle2, achieved: false, color: "text-blue-500" },
  { id: "streak_beginner", title: "Study Dabbler", description: "Maintained a 3-day study streak.", icon: Flame, achieved: false, color: "text-orange-500" },
  { id: "quiz_taker", title: "Quiz Challenger", description: "Attempted your first AI-generated quiz.", icon: Brain, achieved: false, color: "text-purple-500" },
  { id: "reflection_reader", title: "Insight Seeker", description: "Viewed your first plan reflection.", icon: Lightbulb, achieved: false, color: "text-yellow-500"},
  { id: "plan_completer", title: "Finisher", description: "Successfully completed a full study plan.", icon: Trophy, achieved: false, color: "text-amber-600" },
];

const getPlannerStorageKey = (userEmail: string | undefined | null) =>
  userEmail ? `studyMindAiPlannerData_v2_${userEmail}` : `studyMindAiPlannerData_v2_guest`;

function parseTasksFromString(scheduleString: string, existingTasks?: ScheduleTask[]): ScheduleTask[] {
  try {
    const parsed = JSON.parse(scheduleString) as ParsedRawScheduleItem[];
    if (Array.isArray(parsed) && parsed.every(item => typeof item.date === 'string' && typeof item.task === 'string')) {
      if (existingTasks && existingTasks.length > 0 && existingTasks.length === parsed.length) {
         return parsed.map((item, index) => ({
          ...item,
          date: item.date,
          id: existingTasks[index]?.id || String(index),
          completed: existingTasks[index]?.completed || false,
          youtubeSearchQuery: item.youtubeSearchQuery,
          referenceSearchQuery: item.referenceSearchQuery,
          subTasks: existingTasks[index]?.subTasks || [],
          quizScore: existingTasks[index]?.quizScore,
          quizAttempted: existingTasks[index]?.quizAttempted || false,
        }));
      }
      return parsed.map((item, index) => ({
        ...item,
        date: item.date,
        id: String(index),
        completed: false,
        youtubeSearchQuery: item.youtubeSearchQuery,
        referenceSearchQuery: item.referenceSearchQuery,
        subTasks: [],
        quizScore: undefined,
        quizAttempted: false,
      }));
    }
    return existingTasks || [];
  } catch (error) {
    console.warn("AchievementsPage: Failed to parse schedule string:", error);
    return existingTasks || [];
  }
}


export default function AchievementsPage() {
  const { currentUser } = useAuth();
  const [currentStudyPlan, setCurrentStudyPlan] = useState<ScheduleData | null>(null);
  const [parsedTasksForPlan, setParsedTasksForPlan] = useState<ScheduleTask[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const plannerStorageKey = getPlannerStorageKey(currentUser?.email);

  const reloadDataFromStorage = useCallback(() => {
    setIsLoadingPlan(true);
    if (!currentUser?.email) {
        setCurrentStudyPlan(null);
        setParsedTasksForPlan([]);
        setIsLoadingPlan(false);
        return;
    }
    const savedPlanJson = localStorage.getItem(plannerStorageKey);
    if (savedPlanJson) {
        try {
            const savedPlan: ScheduleData = JSON.parse(savedPlanJson);
            let tasksToUse: ScheduleTask[] = savedPlan.tasks || [];
            if ((!tasksToUse || tasksToUse.length === 0) && savedPlan.scheduleString) {
                const newlyParsedTasks = parseTasksFromString(savedPlan.scheduleString, savedPlan.tasks);
                if (newlyParsedTasks.length > 0) tasksToUse = newlyParsedTasks;
            } else {
                 tasksToUse = tasksToUse.map(task => ({...task, subTasks: task.subTasks || [], quizScore: task.quizScore, quizAttempted: task.quizAttempted || false}));
            }
            setCurrentStudyPlan(savedPlan);
            setParsedTasksForPlan(tasksToUse);
        } catch (error) {
            console.error("AchievementsPage: Failed to parse saved plan:", error);
            setCurrentStudyPlan(null);
            setParsedTasksForPlan([]);
        }
    } else {
        setCurrentStudyPlan(null);
        setParsedTasksForPlan([]);
    }
    setIsLoadingPlan(false);
  }, [currentUser, plannerStorageKey]);

  useEffect(() => {
    reloadDataFromStorage();
    const handleStudyPlanUpdate = () => reloadDataFromStorage();
    window.addEventListener('studyPlanUpdated', handleStudyPlanUpdate);
    return () => window.removeEventListener('studyPlanUpdated', handleStudyPlanUpdate);
  }, [reloadDataFromStorage]);

  const completedTasksCount = parsedTasksForPlan.filter(task => task.completed).length;
  const isPlanCompleted = currentStudyPlan?.status === 'completed';

  const dynamicAchievements = useMemo(() => {
      return sampleAchievements.map(ach => {
        let achieved = ach.achieved; // Default to current state
        if (ach.id === 'first_plan' && currentStudyPlan) {
          achieved = true;
        }
        if (ach.id === 'task_initiate' && completedTasksCount > 0) {
           achieved = true;
        }
        if (ach.id === 'plan_completer' && isPlanCompleted) {
           achieved = true;
        }
        // More complex achievements like streaks or quiz performance would need dedicated tracking logic
        if (ach.id === 'quiz_taker' && parsedTasksForPlan.some(t => t.quizAttempted)) {
            achieved = true;
        }
        if (ach.id === 'reflection_reader' && currentStudyPlan?.status === 'completed' /* && reflection has been viewed - needs more state */) {
            // This is a placeholder, actual reflection viewing status would need tracking
            // For now, let's link it to completing a plan as a proxy
            achieved = currentStudyPlan?.status === 'completed';
        }
        return { ...ach, achieved };
      });
  }, [currentStudyPlan, completedTasksCount, isPlanCompleted, parsedTasksForPlan]);

  if (isLoadingPlan) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Award className="h-8 w-8 text-primary" /> Your Achievements
          </h1>
        </div>

        {!currentStudyPlan && (
          <Alert className="mb-8">
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>No Study Plan Data Found</AlertTitle>
            <AlertDescription>
              Some achievements are based on your study plan progress. Create or load a plan to see them update!
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dynamicAchievements.map((ach) => (
            <Card key={ach.id} className={`shadow-md transition-all hover:shadow-lg ${ach.achieved ? 'border-green-500/50 bg-green-500/5' : 'border-border'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-3">
                  <ach.icon className={`h-7 w-7 ${ach.achieved ? (ach.color || 'text-green-500') : 'text-muted-foreground/70'}`} />
                  {ach.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-sm ${ach.achieved ? 'text-foreground' : 'text-muted-foreground'}`}>{ach.description}</p>
              </CardContent>
              {ach.achieved && (
                <CardFooter className="pt-2 pb-3">
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white text-xs">Achieved!</Badge>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
        
        {/* Placeholder for future Plan History section */}
        <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-4">Plan History</h2>
            <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Coming Soon!</AlertTitle>
                <AlertDescription>
                    This section will show your past and current study plans.
                </AlertDescription>
            </Alert>
        </div>
      </div>
    </AppLayout>
  );
}
