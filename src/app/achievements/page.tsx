
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
import { parseISO, isValid } from "date-fns";

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
  userEmail ? `studyMindAiPlannerData_v2_array_${userEmail}` : `studyMindAiPlannerData_v2_array_guest`;

function parseTasksFromString(scheduleString: string, planId: string, existingTasks?: ScheduleTask[]): ScheduleTask[] {
  try {
    const parsed = JSON.parse(scheduleString) as ParsedRawScheduleItem[];
    if (Array.isArray(parsed) && parsed.every(item => typeof item.date === 'string' && typeof item.task === 'string')) {
      return parsed.map((item, index) => {
        const existingTask = existingTasks?.find(et => et.id.startsWith(`task-${planId}-${index}`));
        return {
          ...item,
          date: item.date,
          id: existingTask?.id || `task-${planId}-${index}-${new Date(item.date).getTime()}-${Math.random().toString(36).substring(2,9)}`,
          completed: existingTask?.completed || false,
          youtubeSearchQuery: item.youtubeSearchQuery,
          referenceSearchQuery: item.referenceSearchQuery,
          subTasks: existingTask?.subTasks || [],
          quizScore: existingTask?.quizScore,
          quizAttempted: existingTask?.quizAttempted || false,
        };
      });
    }
    return existingTasks || [];
  } catch (error) {
    console.warn("AchievementsPage: Failed to parse schedule string:", error);
    return existingTasks || [];
  }
}


export default function AchievementsPage() {
  const { currentUser } = useAuth();
  const [activeStudyPlan, setActiveStudyPlan] = useState<ScheduleData | null>(null);
  const [parsedTasksForActivePlan, setParsedTasksForActivePlan] = useState<ScheduleTask[]>([]);
  const [allStudyPlans, setAllStudyPlans] = useState<ScheduleData[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const plannerStorageKey = getPlannerStorageKey(currentUser?.email);

  const reloadDataFromStorage = useCallback(() => {
    setIsLoadingPlans(true);
    if (!currentUser?.email) {
        setActiveStudyPlan(null);
        setParsedTasksForActivePlan([]);
        setAllStudyPlans([]);
        setIsLoadingPlans(false);
        return;
    }
    const savedPlansJson = localStorage.getItem(plannerStorageKey);
    let currentActivePlan: ScheduleData | null = null;
    let loadedPlans: ScheduleData[] = [];

    if (savedPlansJson) {
        try {
            loadedPlans = JSON.parse(savedPlansJson);
            if (Array.isArray(loadedPlans) && loadedPlans.length > 0) {
                // Determine active plan logic (e.g., last active or most recent)
                const activePlans = loadedPlans.filter(p => p.status === 'active').sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                if (activePlans.length > 0) {
                    currentActivePlan = activePlans[0];
                } else {
                    const mostRecentCompleted = loadedPlans.filter(p => p.status === 'completed').sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                    if (mostRecentCompleted.length > 0) currentActivePlan = mostRecentCompleted[0];
                }
                 if (!currentActivePlan) { // Fallback to most recently updated if no active/completed
                    currentActivePlan = loadedPlans.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                }
            }
            
            if (currentActivePlan) {
                let tasksToUse = currentActivePlan.tasks || [];
                if ((!tasksToUse || tasksToUse.length === 0) && currentActivePlan.scheduleString) {
                     tasksToUse = parseTasksFromString(currentActivePlan.scheduleString, currentActivePlan.id, currentActivePlan.tasks);
                } else {
                     tasksToUse = tasksToUse.map(task => ({...task, subTasks: task.subTasks || [], quizScore: task.quizScore, quizAttempted: task.quizAttempted || false}));
                }
                currentActivePlan.tasks = tasksToUse;
            }
        } catch (error) {
            console.error("AchievementsPage: Failed to parse saved plans:", error);
            currentActivePlan = null;
            loadedPlans = [];
        }
    }
    setActiveStudyPlan(currentActivePlan);
    setParsedTasksForActivePlan(currentActivePlan?.tasks || []);
    setAllStudyPlans(loadedPlans);
    setIsLoadingPlans(false);
  }, [currentUser, plannerStorageKey]);

  useEffect(() => {
    reloadDataFromStorage();
    const handleStudyPlanUpdate = () => reloadDataFromStorage();
    window.addEventListener('studyPlanUpdated', handleStudyPlanUpdate);
    return () => window.removeEventListener('studyPlanUpdated', handleStudyPlanUpdate);
  }, [reloadDataFromStorage]);

  const completedTasksCount = useMemo(() => parsedTasksForActivePlan.filter(task => task.completed).length, [parsedTasksForActivePlan]);
  const totalTasksCount = useMemo(() => parsedTasksForActivePlan.length, [parsedTasksForActivePlan]);
  const progressPercentage = useMemo(() => totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0, [completedTasksCount, totalTasksCount]);
  
  // For "Finisher" and "Insight Seeker", we check if *any* plan is completed.
  const hasCompletedAnyPlan = useMemo(() => allStudyPlans.some(plan => plan.status === 'completed'), [allStudyPlans]);

  const dynamicAchievements = useMemo(() => {
      return sampleAchievements.map(ach => {
        let achieved = false;
        switch (ach.id) {
          case 'first_plan':
            achieved = allStudyPlans.length > 0; // Achieved if any plan exists
            break;
          case 'task_initiate':
            // Achieved if any task in any plan is completed
            achieved = allStudyPlans.some(plan => (plan.tasks || []).some(task => task.completed));
            break;
          case 'streak_beginner':
            achieved = false; // Static for now
            break;
          case 'quiz_taker':
            // Achieved if any task in any plan has been attempted
            achieved = allStudyPlans.some(plan => (plan.tasks || []).some(task => task.quizAttempted === true));
            break;
          case 'reflection_reader':
            achieved = hasCompletedAnyPlan; // Tied to completing any plan
            break;
          case 'plan_completer':
            achieved = hasCompletedAnyPlan; // Tied to completing any plan
            break;
          default:
            achieved = ach.achieved; 
        }
        return { ...ach, achieved };
      });
  }, [allStudyPlans, hasCompletedAnyPlan]);

  if (isLoadingPlans && !activeStudyPlan) { 
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

        {!activeStudyPlan && !isLoadingPlans && allStudyPlans.length === 0 && (
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
            <h2 className="text-2xl font-semibold mb-4">Plan Overview</h2>
            {isLoadingPlans ? (
                 <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/30">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
            ) : activeStudyPlan && activeStudyPlan.planDetails ? (
                <Card className={`border shadow-lg ${activeStudyPlan.status === 'completed' ? 'border-green-500/50' : (activeStudyPlan.status === 'archived' ? 'border-gray-500/50' : 'border-primary/50')}`}>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            {activeStudyPlan.status === 'completed' ? <CheckCircle2 className="text-green-500 h-6 w-6" /> : <ListChecks className="text-primary h-6 w-6" />}
                            {activeStudyPlan.status === 'completed' ? "Last Completed Plan" : (activeStudyPlan.status === 'archived' ? "Last Archived Plan" : "Current Active Plan")}
                        </span>
                        </CardTitle>
                        <CardDescription>
                            {activeStudyPlan.status === 'completed' ? `Completed on ${activeStudyPlan.completionDate && isValid(parseISO(activeStudyPlan.completionDate)) ? new Date(activeStudyPlan.completionDate).toLocaleDateString() : 'N/A'}.`
                             : activeStudyPlan.status === 'archived' ? `Archived on ${isValid(parseISO(activeStudyPlan.updatedAt)) ? new Date(activeStudyPlan.updatedAt).toLocaleDateString() : 'N/A'}.`
                             : "Your ongoing study journey."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Subjects</h4>
                        <p className="font-semibold">{activeStudyPlan.planDetails.subjects || "N/A"}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Original Duration</h4>
                            <p className="font-semibold">{activeStudyPlan.planDetails.studyDurationDays} days</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Daily Study</h4>
                            <p className="font-semibold">{activeStudyPlan.planDetails.dailyStudyHours} hours</p>
                        </div>
                        </div>
                        {totalTasksCount > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                            <h4 className="text-sm font-medium text-muted-foreground">Progress</h4>
                            <span className="text-xs text-muted-foreground">{completedTasksCount} / {totalTasksCount} tasks</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" indicatorClassName={activeStudyPlan.status === 'completed' ? "bg-green-500" : "bg-primary"} />
                        </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full" variant="outline">
                            <Link href="/planner">
                                <Edit className="mr-2 h-4 w-4"/>
                                {activeStudyPlan.status === 'completed' || activeStudyPlan.status === 'archived' ? "Review Plan Details" : "View or Edit Plan"}
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
             <p className="text-xs text-muted-foreground text-center mt-4">
                Note: This section shows your most recent plan. Full history browsing coming soon.
             </p>
        </div>
      </div>
    </AppLayout>
  );
}
