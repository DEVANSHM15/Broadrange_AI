
"use client";

import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, CheckCircle2, Flame, Brain, Lightbulb, Trophy, Award, HelpCircle, Loader2, ListChecks, Edit } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ScheduleData, ScheduleTask, ParsedRawScheduleItem, PlanInput } from "@/types";
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
  { id: "streak_beginner", title: "Study Dabbler", description: "Maintained a 3-day study streak.", icon: Flame, achieved: false, color: "text-orange-500" }, // Streak logic not yet implemented
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
          id: existingTasks[index]?.id || String(Date.now() + index + Math.random()),
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
        id: String(Date.now() + index + Math.random()),
        completed: false,
        youtubeSearchQuery: item.youtubeSearchQuery,
        referenceSearchQuery: item.referenceSearchQuery,
        subTasks: [],
        quizScore: undefined,
        quizAttempted: false,
      }));
    }
    console.warn("AchievementsPage: Failed to parse schedule string into expected array of objects.");
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
                 // Ensure subTasks, quizScore, and quizAttempted are initialized if not present
                 tasksToUse = tasksToUse.map(task => ({
                    ...task, 
                    subTasks: task.subTasks || [], 
                    quizScore: task.quizScore, 
                    quizAttempted: task.quizAttempted || false
                }));
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

  const completedTasksCount = useMemo(() => parsedTasksForPlan.filter(task => task.completed).length, [parsedTasksForPlan]);
  const totalTasksCount = useMemo(() => parsedTasksForPlan.length, [parsedTasksForPlan]);
  const progressPercentage = useMemo(() => totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0, [completedTasksCount, totalTasksCount]);
  const isPlanCompleted = useMemo(() => currentStudyPlan?.status === 'completed', [currentStudyPlan]);


  const dynamicAchievements = useMemo(() => {
      return sampleAchievements.map(ach => {
        let achieved = false; // Start with false, explicitly set to true if conditions met
        switch (ach.id) {
          case 'first_plan':
            achieved = !!currentStudyPlan;
            break;
          case 'task_initiate':
            achieved = completedTasksCount > 0;
            break;
          case 'streak_beginner':
            // Placeholder: True streak logic would be more complex and require daily tracking.
            // For now, this badge remains unachieved by default unless manually set or future logic added.
            achieved = false; // Or keep ach.achieved if you want to manually test it
            break;
          case 'quiz_taker':
            achieved = parsedTasksForPlan.some(task => task.quizAttempted === true);
            break;
          case 'reflection_reader':
            // Assumes viewing reflection is tied to plan completion
            achieved = isPlanCompleted;
            break;
          case 'plan_completer':
            achieved = isPlanCompleted;
            break;
          default:
            achieved = ach.achieved; // Retain original static value if not specifically handled
        }
        return { ...ach, achieved };
      });
  }, [currentStudyPlan, completedTasksCount, isPlanCompleted, parsedTasksForPlan]);

  if (isLoadingPlan && !currentStudyPlan) { 
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

        {!currentStudyPlan && !isLoadingPlan && (
          <Alert className="mb-8">
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>No Study Plan Data Found</AlertTitle>
            <AlertDescription>
              Achievements are based on your study plan progress. Create or load a plan to see them update!
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
        
        <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-4">Plan History</h2>
            {isLoadingPlan ? (
                 <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/30">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
            ) : currentStudyPlan && currentStudyPlan.planDetails ? (
                <Card className={`border shadow-lg ${isPlanCompleted ? 'border-green-500/50' : 'border-primary/50'}`}>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            {isPlanCompleted ? <CheckCircle2 className="text-green-500 h-6 w-6" /> : <ListChecks className="text-primary h-6 w-6" />}
                            {isPlanCompleted ? "Last Completed Plan" : "Current Active Plan"}
                        </span>
                        </CardTitle>
                        <CardDescription>
                            {isPlanCompleted ?
                                `Completed on ${currentStudyPlan.completionDate ? new Date(currentStudyPlan.completionDate).toLocaleDateString() : 'N/A'}.`
                                : "Your ongoing study journey."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Subjects</h4>
                        <p className="font-semibold">{currentStudyPlan.planDetails.subjects || "N/A"}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Original Duration</h4>
                            <p className="font-semibold">{currentStudyPlan.planDetails.studyDurationDays} days</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Daily Study</h4>
                            <p className="font-semibold">{currentStudyPlan.planDetails.dailyStudyHours} hours</p>
                        </div>
                        </div>
                        {totalTasksCount > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                            <h4 className="text-sm font-medium text-muted-foreground">Progress</h4>
                            <span className="text-xs text-muted-foreground">{completedTasksCount} / {totalTasksCount} tasks</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" indicatorClassName={isPlanCompleted ? "bg-green-500" : "bg-primary"} />
                        </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full" variant="outline">
                            <Link href="/planner">
                                <Edit className="mr-2 h-4 w-4"/>
                                {isPlanCompleted ? "Review Plan Details" : "View or Edit Plan"}
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                <Alert>
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>No Plan History Found</AlertTitle>
                    <AlertDescription>
                        Once you create and complete study plans, they will appear here.
                        <Button asChild variant="link" className="p-0 h-auto ml-1">
                            <Link href="/planner">Create a new plan</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}
             {/* Placeholder for future: Listing multiple past plans */}
             <p className="text-xs text-muted-foreground text-center mt-4">
                Note: This section currently shows your most recent plan. Full history with multiple plans coming soon.
             </p>
        </div>
      </div>
    </AppLayout>
  );
}
