
"use client";

import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Zap, Brain, Settings as SettingsIcon, PlusCircle, ListChecks, Edit, HelpCircle, Lightbulb, CheckCircle2, Loader2, AlertCircle, BarChart3, BookOpen, CalendarDaysIcon, Target, MessageCircle, Repeat, Sparkles, Hourglass, Flame, Gauge, Star, BookCopy, Award, LogOut, Moon, Sun, Bot, LayoutDashboard, BarChartBig } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { PomodoroTimerModal } from "@/components/pomodoro-timer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AgentDisplayData, ScheduleData, ScheduleTask, ParsedRawScheduleItem, PlanInput } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generatePlanReflection, type GeneratePlanReflectionInput, type GeneratePlanReflectionOutput } from "@/ai/flows/generate-plan-reflection";
import { Badge } from "@/components/ui/badge";
import { parseISO, isValid, differenceInDays, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePathname } from "next/navigation";


function ensureTaskStructure(tasks: ScheduleTask[] | undefined, planId: string): ScheduleTask[] {
  if (!tasks) return [];
  return tasks.map((task, index) => ({
    ...task,
    id: task.id || `task-${planId}-${index}-${new Date(task.date).getTime()}-${Math.random().toString(36).substring(2,9)}`,
    completed: Boolean(task.completed),
    subTasks: task.subTasks || [],
    quizScore: task.quizScore,
    quizAttempted: Boolean(task.quizAttempted),
    notes: task.notes || undefined,
  }));
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [activeStudyPlan, setActiveStudyPlan] = useState<ScheduleData | null>(null);
  const [allUserPlans, setAllUserPlans] = useState<ScheduleData[]>([]);
  
  const [planReflection, setPlanReflection] = useState<GeneratePlanReflectionOutput | null>(null);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [reflectionError, setReflectionError] = useState<string | null>(null);
  
  const [isLoadingPlanData, setIsLoadingPlanData] = useState(true);

  const reloadDataFromApi = useCallback(async () => {
    if (!currentUser?.id) {
      setActiveStudyPlan(null);
      setAllUserPlans([]);
      setIsLoadingPlanData(false);
      return;
    }

    setIsLoadingPlanData(true);
    try {
      const response = await fetch(`/api/plans?userId=${currentUser.id}`);
      
      if (!response.ok) {
        let apiErrorMessage = "Failed to fetch plans from server.";
        let apiErrorDetails = `Server responded with status: ${response.status}.`;
        try {
            const errorData = await response.json();
            apiErrorMessage = String(errorData.error || apiErrorMessage);
            apiErrorDetails = String(errorData.details || apiErrorDetails);
        } catch (parseError) {
            apiErrorDetails = `Server returned status ${response.status} but the error message was not in the expected JSON format. Please check server logs. (${response.statusText})`;
        }
        toast({ title: "Error Loading Plan Data", description: `${apiErrorMessage} ${apiErrorDetails}`, variant: "destructive" });
        setIsLoadingPlanData(false); 
        return;
      }
      
      const allPlans: ScheduleData[] = await response.json();
      const processedPlans = allPlans.map(p => ({
        ...p,
        tasks: ensureTaskStructure(p.tasks, p.id),
      }));
      setAllUserPlans(processedPlans);

      let currentPlanToDisplay: ScheduleData | null = null;
      if (processedPlans.length > 0) {
        const activePlans = processedPlans.filter(p => p.status === 'active').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        if (activePlans.length > 0) {
            currentPlanToDisplay = activePlans[0];
        } else {
            const completedPlans = processedPlans.filter(p => p.status === 'completed').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            currentPlanToDisplay = completedPlans.length > 0 ? completedPlans[0] : null;
        }
      }
      setActiveStudyPlan(currentPlanToDisplay);
      setPlanReflection(null);
      setReflectionError(null);

    } catch (error) {
      console.error("Dashboard: Error fetching plans:", error);
      toast({ title: "Network Error", description: `Could not connect to fetch plans. ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsLoadingPlanData(false);
    }
  }, [currentUser, toast]);


  useEffect(() => {
    reloadDataFromApi();
    const handleStudyPlanUpdate = () => reloadDataFromApi();
    window.addEventListener('studyPlanUpdated', handleStudyPlanUpdate);
    return () => window.removeEventListener('studyPlanUpdated', handleStudyPlanUpdate);
  }, [reloadDataFromApi]);

 const fetchPlanReflection = useCallback(async () => {
      const lastCompletedPlan = allUserPlans
        .filter(p => p.status === 'completed' && p.tasks.length > 0)
        .sort((a,b) => new Date(b.completionDate!).getTime() - new Date(a.completionDate!).getTime())[0];
      
      if (!lastCompletedPlan) return;
      
      setIsGeneratingReflection(true);
      setPlanReflection(null);
      setReflectionError(null);
      try {
          const input: GeneratePlanReflectionInput = {
              planDetails: lastCompletedPlan.planDetails,
              tasks: lastCompletedPlan.tasks,
              completionDate: lastCompletedPlan.completionDate
          };
          const reflectionResult = await generatePlanReflection(input);
          setPlanReflection(reflectionResult);
      } catch (error) {
          setReflectionError(error instanceof Error ? error.message : "An unknown error occurred.");
      } finally {
          setIsGeneratingReflection(false);
      }
  }, [allUserPlans]);


  useEffect(() => {
    if (allUserPlans.length > 0) {
        fetchPlanReflection();
    }
  }, [allUserPlans, fetchPlanReflection]);


  const { completedTasksCount, totalTasksCount, progressPercentage, averageQuizScore } = useMemo(() => {
    if (!activeStudyPlan) return { completedTasksCount: 0, totalTasksCount: 0, progressPercentage: 0, averageQuizScore: 0 };
    const tasks = activeStudyPlan.tasks;
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const quizedTasks = tasks.filter(t => t.quizAttempted && typeof t.quizScore === 'number');
    const avgScore = quizedTasks.length > 0 
      ? Math.round(quizedTasks.reduce((sum, task) => sum + task.quizScore!, 0) / quizedTasks.length) 
      : 0;

    return { completedTasksCount: completed, totalTasksCount: total, progressPercentage: progress, averageQuizScore: avgScore };
  }, [activeStudyPlan]);


  if (isLoadingPlanData) {
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
      <main className="flex-1 p-6 overflow-y-auto">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Welcome back, {currentUser?.name?.split(' ')[0] || 'User'}!</h1>
              <p className="text-muted-foreground">Here's your study dashboard overview.</p>
            </div>
            <div className="flex items-center gap-2 mt-3 sm:mt-0">
                <PomodoroTimerModal />
                <Button asChild variant="default">
                  <Link href="/planner">
                    <BookOpen className="mr-2 h-4 w-4" /> AI Planner
                  </Link>
                </Button>
              </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content column */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/> Current Study Plan</CardTitle>
                  <CardDescription>
                    {activeStudyPlan ? `Plan: ${activeStudyPlan.planDetails.subjects}` : "No active plan found."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeStudyPlan ? (
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{completedTasksCount} / {totalTasksCount} tasks</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-center">
                          <div>
                            <p className="text-2xl font-bold">{totalTasksCount}</p>
                            <p className="text-xs text-muted-foreground">Total Tasks</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{completedTasksCount}</p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{totalTasksCount - completedTasksCount}</p>
                            <p className="text-xs text-muted-foreground">Pending</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{averageQuizScore}%</p>
                            <p className="text-xs text-muted-foreground">Avg. Quiz Score</p>
                          </div>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <HelpCircle className="h-4 w-4" />
                      <AlertTitle>No Active Plan</AlertTitle>
                      <AlertDescription>
                        You don't have an active study plan. Go to the AI Planner to create one.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2">
                    <Button asChild variant="default" className="w-full sm:w-auto">
                        <Link href="/planner" className="flex-grow text-center"><Edit className="mr-2 h-4 w-4"/> {activeStudyPlan ? "View/Edit Plan" : "Create Plan"} </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href="/calendar" className="flex-grow text-center"><CalendarDaysIcon className="mr-2 h-4 w-4"/> View Calendar</Link>
                    </Button>
                </CardFooter>
              </Card>

            </div>

            {/* Right sidebar content */}
            <div className="space-y-8">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> AI Reflection</CardTitle>
                  <CardDescription>Insights from your last completed study plan.</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[120px]">
                  {isGeneratingReflection ? (
                      <div className="flex items-center justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                  ) : reflectionError ? (
                      <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{reflectionError}</AlertDescription></Alert>
                  ) : planReflection ? (
                      <div className="space-y-3 text-sm">
                        <p><strong>Overall Performance:</strong> {planReflection.mainReflection}</p>
                        <p><strong>Consistency:</strong> {planReflection.consistencyObservation}</p>
                      </div>
                  ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Complete a study plan to unlock AI-powered reflections on your performance.</p>
                  )}
                </CardContent>
                <CardFooter>
                    <Button asChild variant="link" className="p-0 h-auto">
                        <Link href="/analytics">Go to Full Analytics <BarChart3 className="ml-2 h-4 w-4"/></Link>
                    </Button>
                </CardFooter>
              </Card>

              <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Star className="text-yellow-400"/> Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-3xl font-bold">0</p>
                      <p className="text-xs text-muted-foreground">Study Streak</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-3xl font-bold">{allUserPlans.length}</p>
                      <p className="text-xs text-muted-foreground">Plans Created</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-3xl font-bold">{allUserPlans.filter(p => p.status === 'completed').length}</p>
                      <p className="text-xs text-muted-foreground">Plans Done</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-3xl font-bold">{allUserPlans.length > 0 ? 1 : 0}+</p>
                      <p className="text-xs text-muted-foreground">Achievements</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="secondary" className="w-full">
                          <Link href="/achievements"><Award className="mr-2 h-4 w-4"/> View Progress Hub</Link>
                    </Button>
                  </CardFooter>
                </Card>
            </div>
          </div>
      </main>
    </AppLayout>
  );
}

    