
"use client";

import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Zap, Brain, Settings as SettingsIcon, PlusCircle, ListChecks, Edit, HelpCircle, Lightbulb, CheckCircle2, Loader2, AlertCircle, BarChart3, BookOpen, CalendarDaysIcon, Target, MessageCircle, Repeat, Sparkles, Hourglass, Flame, Gauge, Star, BookCopy, Award, PanelLeft, Bell } from "lucide-react";
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
import Image from "next/image";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const studyTips = [
  "Break down large tasks into smaller, manageable chunks.",
  "Use the Pomodoro Technique to maintain focus.",
  "Teach what you learn to someone else to solidify understanding.",
  "Test yourself regularly, don't just re-read notes.",
  "Take short breaks every hour to stay refreshed.",
  "Stay hydrated and get enough sleep for optimal brain function.",
  "Find a dedicated study space free from distractions.",
  "Reward yourself after completing a challenging task or study session.",
  "Review material regularly, not just before an exam (spaced repetition).",
  "Set specific, measurable, achievable, relevant, and time-bound (SMART) goals.",
  "Don't be afraid to ask for help if you're stuck on a topic.",
  "Visualize your success and stay positive!",
  "Active recall (retrieving information from memory) is more effective than passive review.",
  "Mix up your study subjects to keep things fresh and improve retention (interleaving).",
  "Practice explaining concepts in your own words, as if teaching someone else.",
  "Get adequate sleep; it's crucial for memory consolidation.",
  "Create a study schedule and stick to it as much as possible.",
];

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [activeStudyPlan, setActiveStudyPlan] = useState<ScheduleData | null>(null);
  const [allUserPlans, setAllUserPlans] = useState<ScheduleData[]>([]);
  
  const [planReflection, setPlanReflection] = useState<GeneratePlanReflectionOutput | null>(null);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [reflectionError, setReflectionError] = useState<string | null>(null);
  
  const [isLoadingPlanData, setIsLoadingPlanData] = useState(true);
  const [currentTip, setCurrentTip] = useState("");


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
        toast({ title: "Error Loading Plan Data", description: "Failed to fetch plans from server.", variant: "destructive" });
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
        currentPlanToDisplay = activePlans.length > 0 ? activePlans[0] : null;
      }
      setActiveStudyPlan(currentPlanToDisplay);
      setPlanReflection(null);
      setReflectionError(null);

    } catch (error) {
      toast({ title: "Network Error", description: `Could not connect to fetch plans. ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsLoadingPlanData(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    reloadDataFromApi();
    const handleStudyPlanUpdate = () => reloadDataFromApi();
    window.addEventListener('studyPlanUpdated', handleStudyPlanUpdate);
    
    setCurrentTip(studyTips[Math.floor(Math.random() * studyTips.length)]);
    const tipInterval = setInterval(() => {
      setCurrentTip(studyTips[Math.floor(Math.random() * studyTips.length)]);
    }, 30000);
    
    return () => {
      window.removeEventListener('studyPlanUpdated', handleStudyPlanUpdate);
      clearInterval(tipInterval);
    };
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


  const { completedTasksCount, totalTasksCount, progressPercentage } = useMemo(() => {
    if (!activeStudyPlan) return { completedTasksCount: 0, totalTasksCount: 0, progressPercentage: 0 };
    const tasks = activeStudyPlan.tasks;
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completedTasksCount: completed, totalTasksCount: total, progressPercentage: progress };
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
      <div className="h-full w-full flex">
        <div className="flex-grow h-full overflow-y-auto">
            <div className="p-6 space-y-8">
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Hi, {currentUser?.name?.split(' ')[0] || 'User'}!</h1>
                  <p className="text-muted-foreground">Welcome back, let's get studying.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <PomodoroTimerModal />
                </div>
              </header>

              <section>
                 <h2 className="text-xl font-semibold mb-3">Current Plan</h2>
                 {activeStudyPlan ? (
                    <Card className="bg-primary/10 border-primary/20">
                      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex-grow space-y-2">
                            <CardTitle className="text-lg">{activeStudyPlan.planDetails.subjects}</CardTitle>
                             <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{activeStudyPlan.planDetails.studyDurationDays} days</span>
                                <span>&bull;</span>
                                <span>{activeStudyPlan.planDetails.dailyStudyHours} hrs/day</span>
                             </div>
                             {totalTasksCount > 0 && (
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span>Progress</span>
                                        <span>{completedTasksCount} / {totalTasksCount}</span>
                                    </div>
                                    <Progress value={progressPercentage} className="h-2" />
                                </div>
                             )}
                        </div>
                        <Button asChild><Link href={`/planner?planId=${activeStudyPlan.id}`}>View Plan <Edit className="ml-2 h-4 w-4"/></Link></Button>
                      </CardContent>
                    </Card>
                 ) : (
                    <Alert>
                        <HelpCircle className="h-4 w-4" />
                        <AlertTitle>No Active Study Plan</AlertTitle>
                        <AlertDescription>
                        Create an AI-powered study plan to get started.
                        <Button asChild variant="link" className="p-0 h-auto ml-1"><Link href="/planner">Create Plan</Link></Button>
                        </AlertDescription>
                    </Alert>
                 )}
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Your Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Streak</CardTitle><Flame className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">0</div></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Tasks Done</CardTitle><CheckCircle2 className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{completedTasksCount}</div></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Achievements</CardTitle><Award className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{allUserPlans.length > 0 ? 1 : 0}</div></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Plans Made</CardTitle><ListChecks className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{allUserPlans.length}</div></CardContent></Card>
                </div>
              </section>

              <section>
                 <h2 className="text-xl font-semibold mb-3">Recently Completed Plans</h2>
                 <ScrollArea className="h-48">
                    <div className="space-y-3 pr-4">
                        {allUserPlans.filter(p => p.status === 'completed').length > 0 ? (
                             allUserPlans.filter(p => p.status === 'completed').map(plan => (
                                <Card key={plan.id} className="bg-card/50">
                                    <CardContent className="p-3 flex justify-between items-center">
                                        <div className="flex-grow">
                                            <p className="font-semibold">{plan.planDetails.subjects}</p>
                                            <p className="text-xs text-muted-foreground">Completed: {format(parseISO(plan.completionDate!), 'PP')}</p>
                                        </div>
                                        <Button asChild variant="secondary" size="sm"><Link href={`/analytics?planId=${plan.id}`}>Analyze</Link></Button>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center pt-8">No completed plans yet. Finish one to see it here!</p>
                        )}
                    </div>
                 </ScrollArea>
              </section>
            </div>
        </div>
        <aside className="hidden lg:block w-[350px] flex-shrink-0 border-l bg-muted/20 h-full">
           <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                             <Lightbulb className="text-yellow-400" /> Study Wisdom
                        </CardTitle>
                    </CardHeader>
                     <CardContent>
                        <p className="text-sm text-muted-foreground italic">
                            "{currentTip}"
                        </p>
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="text-primary"/> AI Reflection</CardTitle>
                        <CardDescription>Insights from your last completed plan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isGeneratingReflection ? <Loader2 className="mx-auto h-6 w-6 animate-spin"/> :
                         reflectionError ? <p className="text-xs text-destructive">{reflectionError}</p> :
                         planReflection ? (
                            <>
                                <p className="text-sm"><strong>Consistency:</strong> {planReflection.consistencyObservation}</p>
                                <p className="text-sm"><strong>Suggestion:</strong> {planReflection.suggestionForNextPlan}</p>
                                <Button variant="link" size="sm" asChild className="p-0"><Link href="/analytics">View Full Analytics</Link></Button>
                            </>
                         ) : <p className="text-sm text-muted-foreground">Complete a plan to get AI reflections.</p>
                        }
                    </CardContent>
                 </Card>

            </div>
           </ScrollArea>
        </aside>
      </div>
    </AppLayout>
  );
}
