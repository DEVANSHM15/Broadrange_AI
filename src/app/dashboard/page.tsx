
"use client";

import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Zap, Brain, Settings as SettingsIcon, PlusCircle, ListChecks, Edit, HelpCircle, Lightbulb, CheckCircle2, Loader2, AlertCircle, BarChart3, BookOpen, CalendarDaysIcon, Target, MessageCircle, Repeat, Sparkles, Hourglass, Flame, Gauge, Star, BookCopy, Trophy, Award, ShieldCheck } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { PomodoroTimerModal } from "@/components/pomodoro-timer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AgentDisplayData, ScheduleData, ScheduleTask, ParsedRawScheduleItem, PlanInput } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generatePlanReflection, type GeneratePlanReflectionInput, type GeneratePlanReflectionOutput } from "@/ai/flows/generate-plan-reflection";
import { Badge } from "@/components/ui/badge";


const sampleAgentData: AgentDisplayData[] = [
  { name: "PlannerBot", avatar: "🤖", role: "Study Planning", confidence: 92, agentKey: "planner" },
  { name: "ReflectionAI", avatar: "🔍", role: "Progress Analysis", confidence: 87, agentKey: "reflection" },
  { name: "AdaptiveAI", avatar: "⚙️", role: "Dynamic Adjustment", confidence: 94, agentKey: "adaptive" },
];


const getPlannerStorageKey = (userEmail: string | undefined | null) =>
  userEmail ? `studyMindAiPlannerData_v2_${userEmail}` : `studyMindAiPlannerData_v2_guest`;

// Helper function to parse schedule string into tasks
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
    console.warn("DashboardPage: Failed to parse schedule string:", error);
    return existingTasks || [];
  }
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  achieved: boolean; 
  color?: string; 
}

const sampleAchievements: Achievement[] = [
  { id: "first_plan", title: "Planner Pioneer", description: "Successfully created your first study plan.", icon: PlusCircle, achieved: true, color: "text-green-500" },
  { id: "task_initiate", title: "Task Starter", description: "Completed your first task in a study plan.", icon: CheckCircle2, achieved: false, color: "text-blue-500" },
  { id: "streak_beginner", title: "Study Dabbler", description: "Maintained a 3-day study streak.", icon: Flame, achieved: false, color: "text-orange-500" },
  { id: "quiz_taker", title: "Quiz Challenger", description: "Attempted your first AI-generated quiz.", icon: Brain, achieved: false, color: "text-purple-500" },
  { id: "reflection_reader", title: "Insight Seeker", description: "Viewed your first plan reflection.", icon: Lightbulb, achieved: false, color: "text-yellow-500"},
  { id: "plan_completer", title: "Finisher", description: "Successfully completed a full study plan.", icon: Trophy, achieved: false, color: "text-amber-600" },
];


export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [agents, setAgents] = useState<AgentDisplayData[]>(sampleAgentData);
  const [currentStudyPlan, setCurrentStudyPlan] = useState<ScheduleData | null>(null);
  const [parsedTasksForPlan, setParsedTasksForPlan] = useState<ScheduleTask[]>([]);
  const [planReflection, setPlanReflection] = useState<GeneratePlanReflectionOutput | null>(null);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const plannerStorageKey = getPlannerStorageKey(currentUser?.email);


  const reloadDataFromStorage = useCallback(() => {
    if (!currentUser?.email) {
        setCurrentStudyPlan(null);
        setParsedTasksForPlan([]);
        setPlanReflection(null); // Clear reflection when no user
        return;
    }
    const savedPlanJson = localStorage.getItem(plannerStorageKey);
    if (savedPlanJson) {
        try {
            const savedPlan: ScheduleData = JSON.parse(savedPlanJson);
            console.log("[Dashboard Reload] Read from localStorage. Duration:", savedPlan.planDetails?.studyDurationDays, "Status:", savedPlan.status, "Subjects:", savedPlan.planDetails?.subjects, "Daily Hours:", savedPlan.planDetails?.dailyStudyHours);

            let tasksToUse: ScheduleTask[] = savedPlan.tasks || [];
            if ((!tasksToUse || tasksToUse.length === 0) && savedPlan.scheduleString) {
                const newlyParsedTasks = parseTasksFromString(savedPlan.scheduleString, savedPlan.tasks);
                if (newlyParsedTasks.length > 0) tasksToUse = newlyParsedTasks;
            } else {
                 tasksToUse = tasksToUse.map(task => ({...task, subTasks: task.subTasks || [], quizScore: task.quizScore, quizAttempted: task.quizAttempted || false}));
            }

            setCurrentStudyPlan(savedPlan);
            setParsedTasksForPlan(tasksToUse);
            // Reflection fetching is now handled by a separate useEffect watching currentStudyPlan
        } catch (error) {
            console.error("Dashboard: Failed to parse saved plan on reload:", error);
            setCurrentStudyPlan(null);
            setParsedTasksForPlan([]);
            setPlanReflection(null);
        }
    } else {
        setCurrentStudyPlan(null);
        setParsedTasksForPlan([]);
        setPlanReflection(null);
    }
  }, [currentUser, plannerStorageKey]);


  useEffect(() => {
    reloadDataFromStorage(); // Initial load

    const handleStudyPlanUpdate = () => {
      console.log('studyPlanUpdated event received by dashboard, reloading data.');
      reloadDataFromStorage();
    };

    window.addEventListener('studyPlanUpdated', handleStudyPlanUpdate);

    return () => {
      window.removeEventListener('studyPlanUpdated', handleStudyPlanUpdate);
    };
  }, [reloadDataFromStorage]);

  // useEffect for fetching plan reflection when currentStudyPlan or tasks change
  useEffect(() => {
    const fetchPlanReflection = async () => {
        if (currentStudyPlan && currentStudyPlan.status === 'completed' && parsedTasksForPlan.length > 0 && currentStudyPlan.planDetails) {
            setIsGeneratingReflection(true);
            try {
                const input: GeneratePlanReflectionInput = {
                    planDetails: currentStudyPlan.planDetails,
                    tasks: parsedTasksForPlan,
                    completionDate: currentStudyPlan.completionDate
                };
                const reflectionResult = await generatePlanReflection(input);
                setPlanReflection(reflectionResult);
            } catch (error) {
                console.error("Dashboard: Failed to generate plan reflection:", error);
                setPlanReflection(null);
            } finally {
                setIsGeneratingReflection(false);
            }
        } else if (currentStudyPlan?.status !== 'completed') {
            setPlanReflection(null); // Clear reflection if plan is not completed
        }
    };
    fetchPlanReflection();
  }, [currentStudyPlan, parsedTasksForPlan]);


  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prevAgents => prevAgents.map(agent => ({
        ...agent,
        confidence: Math.min(99, Math.max(80, agent.confidence + Math.floor(Math.random() * 3) - 1))
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const completedTasksCount = parsedTasksForPlan.filter(task => task.completed).length;
  const totalTasksCount = parsedTasksForPlan.length;
  const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const isPlanCompleted = currentStudyPlan?.status === 'completed';

  // Recalculate totalStudyHours whenever currentStudyPlan changes
  const totalStudyHours = useMemo(() => {
    if (currentStudyPlan?.planDetails) {
        return currentStudyPlan.planDetails.dailyStudyHours * currentStudyPlan.planDetails.studyDurationDays;
    }
    return "N/A";
  }, [currentStudyPlan]);


  const averageQuizScore = useMemo(() => {
    const attemptedQuizzes = parsedTasksForPlan.filter(
      (task) => task.quizAttempted && typeof task.quizScore === 'number'
    );
    if (attemptedQuizzes.length === 0) {
      return "N/A";
    }
    const totalScore = attemptedQuizzes.reduce((sum, task) => sum + (task.quizScore || 0), 0);
    return Math.round(totalScore / attemptedQuizzes.length);
  }, [parsedTasksForPlan]);

  const studyTips = [
    "Break down large tasks into smaller, manageable chunks.",
    "Use the Pomodoro Technique to maintain focus.",
    "Teach what you learn to someone else to solidify understanding.",
    "Test yourself regularly, don't just re-read notes.",
    "Take short breaks every hour to stay refreshed.",
    "Stay hydrated and get enough sleep for optimal brain function.",
    "Find a dedicated study space free from distractions."
  ];
  const [currentTip, setCurrentTip] = useState("");

  useEffect(() => {
    setCurrentTip(studyTips[Math.floor(Math.random() * studyTips.length)]);
  }, []);

  // Debug log for when the component renders to see currentStudyPlan
  console.log("[Dashboard Render] Current Plan Duration from state:", currentStudyPlan?.planDetails?.studyDurationDays, "Total Study Hours KPI:", totalStudyHours);

  // Update placeholder achievements based on current data (simple example)
  const dynamicAchievements = useMemo(() => {
      return sampleAchievements.map(ach => {
        if (ach.id === 'first_plan' && currentStudyPlan) {
          return { ...ach, achieved: true };
        }
        if (ach.id === 'task_initiate' && completedTasksCount > 0) {
           return { ...ach, achieved: true };
        }
        if (ach.id === 'plan_completer' && isPlanCompleted) {
           return { ...ach, achieved: true };
        }
        // Add more dynamic achievement checks here later
        return ach;
      });
  }, [currentStudyPlan, completedTasksCount, isPlanCompleted]);

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 md:px-6 space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {currentUser?.name?.split(' ')[0] || 'User'}! 👋</h1>
            <p className="text-muted-foreground">Your AI agents have been working while you were away.</p>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            {(!currentStudyPlan || isPlanCompleted) && (
              <Button asChild>
                <Link href="/planner"><span><PlusCircle className="mr-2 h-4 w-4"/>Create Study Plan</span></Link>
              </Button>
            )}
            <PomodoroTimerModal />
          </div>
        </div>

        {currentStudyPlan && currentStudyPlan.planDetails && (
          <section>
            <Card className={`border shadow-lg ${isPlanCompleted ? 'border-green-500/70' : 'border-primary/50'}`}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {isPlanCompleted ? <CheckCircle2 className="text-green-500 h-6 w-6" /> : <ListChecks className="text-primary h-6 w-6" />}
                    {isPlanCompleted ? "Recently Completed Plan" : "Your Current Study Plan"}
                  </span>
                </CardTitle>
                <CardDescription>
                    {isPlanCompleted ?
                        `Completed on ${currentStudyPlan.completionDate ? new Date(currentStudyPlan.completionDate).toLocaleDateString() : 'N/A'}. Well done!`
                        : "A quick look at your ongoing plan."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Subjects</h4>
                  <p className="font-semibold">{currentStudyPlan.planDetails.subjects || "N/A"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Current Duration</h4>
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
                <Button asChild className="w-full">
                  <Link href="/planner"><span><Edit className="mr-2 h-4 w-4"/> {isPlanCompleted ? "Review Completed Plan" : "View or Edit Full Plan"}</span></Link>
                </Button>
              </CardFooter>
            </Card>
          </section>
        )}

        {!currentStudyPlan && (
          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>No Active Study Plan</AlertTitle>
            <AlertDescription>
              Create your first AI-powered study plan to see your stats and insights here!
              <Button asChild variant="link" className="p-0 h-auto ml-1">
                <Link href="/planner"><span>Get Started</span></Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <section>
          <h2 className="text-2xl font-semibold mb-4">Key Performance Indicators</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Study Hours</CardTitle>
                <BookCopy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStudyHours}</div>
                <p className="text-xs text-muted-foreground">Estimate based on plan</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Day Streak</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Personal best!</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTasksCount > 0 ? `${progressPercentage}%` : 'N/A'}</div>
                <p className="text-xs text-muted-foreground">{totalTasksCount > 0 ? `From current plan` : 'No active plan'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageQuizScore}{typeof averageQuizScore === 'number' ? '%' : ''}</div>
                <p className="text-xs text-muted-foreground">{averageQuizScore !== "N/A" ? "From quizzes" : "No quizzes taken"}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Your Achievements</h2>
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
        </section>

         <section>
          <h2 className="text-2xl font-semibold mb-4">AI Agents Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map(agent => (
              <Card key={agent.agentKey}>
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <span className="text-3xl mt-1">{agent.avatar}</span>
                  <div className="flex-grow">
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <CardDescription className="text-sm">{agent.role}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Confidence: {agent.confidence}%</p>
                  <Progress
                    value={agent.confidence}
                    className="h-1.5 mt-1"
                    indicatorClassName={
                      agent.confidence < 60 ? "bg-red-500" :
                      agent.confidence < 85 ? "bg-yellow-500" :
                      "bg-green-500"
                    }
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

         {isPlanCompleted && (
          <section>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center justify-center gap-2">
                    <Lightbulb className="h-6 w-6 text-yellow-400" /> AI-Generated Plan Reflection
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  ReflectionAI has analyzed your completed plan. Here's a summary of its findings:
                </p>
            </div>
            {isGeneratingReflection && (
              <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/50">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">ReflectionAI is analyzing your performance...</p>
              </div>
            )}
            {planReflection && !isGeneratingReflection && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overall Completion</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{(planReflection.overallCompletionRate * 100).toFixed(0)}%</div>
                    <p className="text-xs text-muted-foreground">of tasks marked as completed.</p>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Main Reflection</CardTitle>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent><p className="text-sm">{planReflection.mainReflection}</p></CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Study Consistency</CardTitle>
                     <Repeat className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent><p className="text-sm">{planReflection.consistencyObservation}</p></CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Next Plan Suggestion</CardTitle>
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent><p className="text-sm">{planReflection.suggestionForNextPlan}</p></CardContent>
                </Card>
              </div>
            )}
            {!planReflection && !isGeneratingReflection && currentStudyPlan?.status === 'completed' && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Reflection Not Available</AlertTitle>
                    <AlertDescription>
                        We couldn't generate a reflection for this plan at the moment. This might be because there were no tasks in the plan or an error occurred.
                    </AlertDescription>
                </Alert>
            )}
          </section>
        )}

        <section>
            <h2 className="text-2xl font-semibold mb-4">Quick Actions &amp; Tips</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Zap className="text-primary"/>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Button variant="outline" asChild className="w-full">
                            <Link href="/planner"><span><BookOpen className="mr-2"/>AI Planner</span></Link>
                        </Button>
                        <Button variant="outline" asChild className="w-full">
                            <Link href="/calendar"><span><CalendarDaysIcon className="mr-2"/>Calendar</span></Link>
                        </Button>
                        <Button variant="outline" asChild className="w-full">
                            <Link href="/analytics"><span><BarChart3 className="mr-2"/>Analytics</span></Link>
                        </Button>
                         <PomodoroTimerModal />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Lightbulb className="text-yellow-400"/>Study Wisdom</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground italic">
                            "{currentTip}"
                        </p>
                    </CardContent>
                </Card>
            </div>
        </section>

      </div>
    </AppLayout>
  );
}
    

    

    


    


