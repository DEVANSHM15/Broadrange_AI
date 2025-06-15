
"use client";

import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Zap, Brain, Settings as SettingsIcon, PlusCircle, ListChecks, Edit, HelpCircle, Lightbulb, CheckCircle2, Loader2, AlertCircle, BarChart3, BookOpen, CalendarDaysIcon, Target, MessageCircle, Repeat, Sparkles, Hourglass, Flame, Gauge, Star, BookCopy, Award } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { PomodoroTimerModal } from "@/components/pomodoro-timer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AgentDisplayData, ScheduleData, ScheduleTask, ParsedRawScheduleItem, PlanInput } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generatePlanReflection, type GeneratePlanReflectionInput, type GeneratePlanReflectionOutput } from "@/ai/flows/generate-plan-reflection";
import { Badge } from "@/components/ui/badge";
import { parseISO, isValid } from "date-fns";


const sampleAgentData: AgentDisplayData[] = [
  { name: "PlannerBot", avatar: "🤖", role: "Study Planning", confidence: 92, agentKey: "planner" },
  { name: "ReflectionAI", avatar: "🔍", role: "Progress Analysis", confidence: 87, agentKey: "reflection" },
  { name: "AdaptiveAI", avatar: "⚙️", role: "Dynamic Adjustment", confidence: 94, agentKey: "adaptive" },
];


const getPlannerStorageKey = (userEmail: string | undefined | null) =>
  userEmail ? `studyMindAiPlannerData_v2_array_${userEmail}` : `studyMindAiPlannerData_v2_array_guest`;


function parseTasksFromString(scheduleString: string, planId: string, existingTasks?: ScheduleTask[]): ScheduleTask[] {
  try {
    const parsed = JSON.parse(scheduleString) as ParsedRawScheduleItem[];
    if (Array.isArray(parsed) && parsed.every(item => typeof item.date === 'string' && typeof item.task === 'string')) {
      return parsed.map((item, index) => {
        const existingTask = existingTasks?.find(et => et.id.startsWith(`task-${planId}-${index}`)); // Match by planId and index
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
    console.warn("DashboardPage: Failed to parse schedule string:", error);
    return existingTasks || [];
  }
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
  const [agents, setAgents] = useState<AgentDisplayData[]>(sampleAgentData);
  const [activeStudyPlan, setActiveStudyPlan] = useState<ScheduleData | null>(null);
  const [parsedTasksForActivePlan, setParsedTasksForActivePlan] = useState<ScheduleTask[]>([]);
  const [planReflection, setPlanReflection] = useState<GeneratePlanReflectionOutput | null>(null);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const plannerStorageKey = getPlannerStorageKey(currentUser?.email);
  const [currentTip, setCurrentTip] = useState("");


  const reloadDataFromStorage = useCallback(() => {
    if (!currentUser?.email) {
        setActiveStudyPlan(null);
        setParsedTasksForActivePlan([]);
        setPlanReflection(null);
        return;
    }
    const savedPlansJson = localStorage.getItem(plannerStorageKey);
    let currentActivePlan: ScheduleData | null = null;

    if (savedPlansJson) {
        try {
            const allPlans: ScheduleData[] = JSON.parse(savedPlansJson);
            if (Array.isArray(allPlans) && allPlans.length > 0) {
                const activePlans = allPlans.filter(p => p.status === 'active').sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                if (activePlans.length > 0) {
                    currentActivePlan = activePlans[0];
                } else {
                    const mostRecentCompleted = allPlans.filter(p => p.status === 'completed').sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                    if (mostRecentCompleted.length > 0) currentActivePlan = mostRecentCompleted[0];
                }
                if (!currentActivePlan) { // Fallback to most recently updated if no active/completed
                    currentActivePlan = allPlans.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                }
            }
            
            if (currentActivePlan) {
                let tasksToUse = currentActivePlan.tasks || [];
                if ((!tasksToUse || tasksToUse.length === 0) && currentActivePlan.scheduleString) {
                     tasksToUse = parseTasksFromString(currentActivePlan.scheduleString, currentActivePlan.id, currentActivePlan.tasks);
                } else {
                     tasksToUse = tasksToUse.map(task => ({...task, subTasks: task.subTasks || [], quizScore: task.quizScore, quizAttempted: task.quizAttempted || false}));
                }
                currentActivePlan.tasks = tasksToUse; // Ensure plan object has updated tasks
                setActiveStudyPlan(currentActivePlan);
                setParsedTasksForActivePlan(tasksToUse);
            } else {
                setActiveStudyPlan(null);
                setParsedTasksForActivePlan([]);
            }
            
        } catch (error) {
            console.error("Dashboard: Failed to parse or process plans:", error);
            setActiveStudyPlan(null);
            setParsedTasksForActivePlan([]);
        }
    } else {
        setActiveStudyPlan(null);
        setParsedTasksForActivePlan([]);
    }
    setPlanReflection(null); // Reset reflection as plan context might have changed
  }, [currentUser, plannerStorageKey]);


  useEffect(() => {
    reloadDataFromStorage(); 

    const handleStudyPlanUpdate = () => {
      console.log('studyPlanUpdated event received by dashboard, reloading data.');
      reloadDataFromStorage();
    };
    window.addEventListener('studyPlanUpdated', handleStudyPlanUpdate);
    return () => window.removeEventListener('studyPlanUpdated', handleStudyPlanUpdate);
  }, [reloadDataFromStorage]);

  useEffect(() => {
    const fetchPlanReflection = async () => {
        if (activeStudyPlan && activeStudyPlan.status === 'completed' && parsedTasksForActivePlan.length > 0 && activeStudyPlan.planDetails) {
            setIsGeneratingReflection(true);
            try {
                const input: GeneratePlanReflectionInput = {
                    planDetails: activeStudyPlan.planDetails,
                    tasks: parsedTasksForActivePlan,
                    completionDate: activeStudyPlan.completionDate
                };
                const reflectionResult = await generatePlanReflection(input);
                setPlanReflection(reflectionResult);
            } catch (error) {
                console.error("Dashboard: Failed to generate plan reflection:", error);
                setPlanReflection(null);
            } finally {
                setIsGeneratingReflection(false);
            }
        } else if (activeStudyPlan?.status !== 'completed') {
            setPlanReflection(null); 
        }
    };
    fetchPlanReflection();
  }, [activeStudyPlan, parsedTasksForActivePlan]);


  useEffect(() => {
    const agentConfidenceInterval = setInterval(() => {
      setAgents(prevAgents => prevAgents.map(agent => ({
        ...agent,
        confidence: Math.min(99, Math.max(80, agent.confidence + Math.floor(Math.random() * 3) - 1))
      })));
    }, 3000);
    
    setCurrentTip(studyTips[Math.floor(Math.random() * studyTips.length)]);
    const tipInterval = setInterval(() => {
      setCurrentTip(prevTip => {
        let newTip = prevTip;
        while (newTip === prevTip) {
          newTip = studyTips[Math.floor(Math.random() * studyTips.length)];
        }
        return newTip;
      });
    }, 30000); 

    return () => {
      clearInterval(agentConfidenceInterval);
      clearInterval(tipInterval);
    };
  }, []);

  const completedTasksCount = parsedTasksForActivePlan.filter(task => task.completed).length;
  const totalTasksCount = parsedTasksForActivePlan.length;
  const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const isPlanCompleted = activeStudyPlan?.status === 'completed';

  const totalStudyHours = useMemo(() => {
    if (activeStudyPlan?.planDetails) {
        return activeStudyPlan.planDetails.dailyStudyHours * activeStudyPlan.planDetails.studyDurationDays;
    }
    return "N/A";
  }, [activeStudyPlan]);


  const averageQuizScore = useMemo(() => {
    const attemptedQuizzes = parsedTasksForActivePlan.filter(
      (task) => task.quizAttempted && typeof task.quizScore === 'number'
    );
    if (attemptedQuizzes.length === 0) return "N/A";
    const totalScore = attemptedQuizzes.reduce((sum, task) => sum + (task.quizScore || 0), 0);
    return Math.round(totalScore / attemptedQuizzes.length);
  }, [parsedTasksForActivePlan]);

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 md:px-6 space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {currentUser?.name?.split(' ')[0] || 'User'}! 👋</h1>
            <p className="text-muted-foreground">Your AI agents are ready to assist.</p>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            {(!activeStudyPlan || activeStudyPlan.status !== 'active') && (
              <Button asChild>
                <Link href="/planner"><span><PlusCircle className="mr-2 h-4 w-4"/>Create Study Plan</span></Link>
              </Button>
            )}
            <PomodoroTimerModal />
          </div>
        </div>

        {activeStudyPlan && activeStudyPlan.planDetails && (
          <section>
            <Card className={`border shadow-lg ${activeStudyPlan.status === 'completed' ? 'border-green-500/70' : (activeStudyPlan.status === 'archived' ? 'border-gray-500/50' : 'border-primary/50')}`}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {activeStudyPlan.status === 'completed' ? <CheckCircle2 className="text-green-500 h-6 w-6" /> : <ListChecks className="text-primary h-6 w-6" />}
                    {activeStudyPlan.status === 'completed' ? "Recently Completed Plan" : (activeStudyPlan.status === 'archived' ? "Archived Plan" : "Your Current Study Plan")}
                  </span>
                </CardTitle>
                <CardDescription>
                    {activeStudyPlan.status === 'completed' ? `Completed on ${activeStudyPlan.completionDate && isValid(parseISO(activeStudyPlan.completionDate)) ? new Date(activeStudyPlan.completionDate).toLocaleDateString() : 'N/A'}. Well done!`
                     : activeStudyPlan.status === 'archived' ? `Archived on ${isValid(parseISO(activeStudyPlan.updatedAt)) ? new Date(activeStudyPlan.updatedAt).toLocaleDateString() : 'N/A'}.`
                     : "A quick look at your ongoing plan."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Subjects</h4>
                  <p className="font-semibold">{activeStudyPlan.planDetails.subjects || "N/A"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Duration</h4>
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
                    <Progress value={progressPercentage} className="h-2" indicatorClassName={isPlanCompleted ? "bg-green-500" : "bg-primary"} />
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/planner"><span><Edit className="mr-2 h-4 w-4"/> {isPlanCompleted || activeStudyPlan.status === 'archived' ? "Review Plan Details" : "View or Edit Full Plan"}</span></Link>
                </Button>
              </CardFooter>
            </Card>
          </section>
        )}

        {!activeStudyPlan && (
          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>No Study Plan Found</AlertTitle>
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
                <p className="text-xs text-muted-foreground">Estimate from plan</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Day Streak</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Streak tracking soon!</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTasksCount > 0 ? `${progressPercentage}%` : 'N/A'}</div>
                <p className="text-xs text-muted-foreground">{totalTasksCount > 0 ? `From current/last plan` : 'No plan data'}</p>
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

         {activeStudyPlan?.status === 'completed' && (
          <section>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold mb-2 flex items-center justify-center gap-2">
                    <Lightbulb className="h-6 w-6 text-yellow-400" /> AI-Generated Plan Reflection
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  ReflectionAI has analyzed your completed plan. Here's a summary:
                </p>
            </div>
            {isGeneratingReflection && (
              <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/50">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">ReflectionAI is analyzing...</p>
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
                    <p className="text-xs text-muted-foreground">of tasks marked completed.</p>
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
            {!planReflection && !isGeneratingReflection && activeStudyPlan?.status === 'completed' && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Reflection Not Available</AlertTitle>
                    <AlertDescription>
                        Could not generate a reflection for this plan.
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
    
