
"use client";
import AppLayout from "@/components/AppLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { InsightDisplayData, ScheduleData, ScheduleTask, PlanInput, ParsedRawScheduleItem } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect, useMemo } from "react";
import { differenceInWeeks, parseISO, format, startOfWeek, addWeeks } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HelpCircle, Loader2, Lightbulb, AlertCircle as AlertCircleIcon } from "lucide-react";
import { generatePlanReflection, type GeneratePlanReflectionInput, type GeneratePlanReflectionOutput } from "@/ai/flows/generate-plan-reflection";


const getPlannerStorageKey = (userEmail: string | undefined | null) =>
  userEmail ? `studyMindAiPlannerData_v2_${userEmail}` : `studyMindAiPlannerData_v2_guest`;

// Helper function to parse schedule string into tasks
function parseTasksFromString(scheduleString: string, existingTasks?: ScheduleTask[]): ScheduleTask[] {
  try {
    const parsed = JSON.parse(scheduleString) as ParsedRawScheduleItem[];
    if (Array.isArray(parsed) && parsed.every(item => typeof item.date === 'string' && typeof item.task === 'string')) {
      // If existingTasks are provided and lengths match, merge to preserve IDs/completion
      if (existingTasks && existingTasks.length > 0 && existingTasks.length === parsed.length) {
         return parsed.map((item, index) => ({
          ...item,
          date: item.date,
          id: existingTasks[index]?.id || String(index),
          completed: existingTasks[index]?.completed || false,
          youtubeSearchQuery: item.youtubeSearchQuery,
          quizScore: existingTasks[index]?.quizScore,
          quizAttempted: existingTasks[index]?.quizAttempted || false,
        }));
      }
      // Otherwise, create new tasks
      return parsed.map((item, index) => ({
        ...item,
        date: item.date,
        id: String(index),
        completed: false,
        youtubeSearchQuery: item.youtubeSearchQuery,
        quizScore: undefined,
        quizAttempted: false,
      }));
    }
    return existingTasks || []; // Return existing or empty if parsing fails significantly
  } catch (error) {
    console.warn("AnalyticsPage: Failed to parse schedule string:", error);
    return existingTasks || []; // Return existing or empty on error
  }
}

const staticExampleRecommendations: InsightDisplayData[] = [
  { agent: "🤖 PlannerBot", text: "Consider reviewing difficult topics at the start of your study session.", confidence: "Planning Principle" },
  { agent: "⚙️ AdaptiveAI", text: "If you're falling behind, use the re-plan feature to adjust your schedule.", confidence: "Adaptive Tip" },
  { agent: "📊 AnalyticsAI", text: "Users who consistently complete tasks show better long-term retention.", confidence: "General Observation" },
];

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function AnalyticsPage() {
  const { currentUser } = useAuth();
  const [currentStudyPlan, setCurrentStudyPlan] = useState<ScheduleData | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [planReflection, setPlanReflection] = useState<GeneratePlanReflectionOutput | null>(null);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const plannerStorageKey = getPlannerStorageKey(currentUser?.email);

  useEffect(() => {
    let isMounted = true;
    if (currentUser?.email) {
      const savedPlanJson = localStorage.getItem(plannerStorageKey);
      if (savedPlanJson) {
        try {
          const savedPlan: ScheduleData = JSON.parse(savedPlanJson);
          let tasksToUse = savedPlan.tasks || [];
          
          if ((!tasksToUse || tasksToUse.length === 0) && savedPlan.scheduleString) {
            const newlyParsedTasks = parseTasksFromString(savedPlan.scheduleString, savedPlan.tasks);
            if (newlyParsedTasks.length > 0) {
              tasksToUse = newlyParsedTasks;
              localStorage.setItem(plannerStorageKey, JSON.stringify({ ...savedPlan, tasks: tasksToUse })); 
            }
          } else if (tasksToUse.length > 0) {
            tasksToUse = tasksToUse.map(task => ({
              ...task,
              quizScore: task.quizScore,
              quizAttempted: task.quizAttempted || false,
            }));
            const updatedPlanForStorage = { ...savedPlan, tasks: tasksToUse };
            if (JSON.stringify(savedPlan.tasks) !== JSON.stringify(tasksToUse)) {
              localStorage.setItem(plannerStorageKey, JSON.stringify(updatedPlanForStorage));
            }
          }
          savedPlan.tasks = tasksToUse;


          if (isMounted) setCurrentStudyPlan(savedPlan);

          if (isMounted && savedPlan.status === 'completed' && savedPlan.planDetails && savedPlan.tasks.length > 0 && !planReflection && !isGeneratingReflection) {
            fetchPlanReflection(savedPlan, savedPlan.tasks, isMounted);
          }
        } catch (error) {
          console.error("Analytics: Failed to parse saved plan:", error);
          if (isMounted) setCurrentStudyPlan(null);
        }
      } else {
        if (isMounted) setCurrentStudyPlan(null);
      }
    } else if (!currentUser && typeof window !== 'undefined') {
        if (isMounted) setCurrentStudyPlan(null);
    }
    if (isMounted) setIsLoadingPlan(false);
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, plannerStorageKey]);


  const fetchPlanReflection = async (plan: ScheduleData, tasks: ScheduleTask[], isMounted: boolean) => {
    if (!plan.planDetails) return;
    if (isMounted) setIsGeneratingReflection(true);
    try {
      const input: GeneratePlanReflectionInput = {
        planDetails: plan.planDetails,
        tasks: tasks,
        completionDate: plan.completionDate,
      };
      const reflection = await generatePlanReflection(input);
      if (isMounted) setPlanReflection(reflection);
    } catch (error) {
      console.error("Failed to generate plan reflection for analytics:", error);
      if (isMounted) setPlanReflection(null);
    } finally {
      if (isMounted) setIsGeneratingReflection(false);
    }
  };

  const performanceData = useMemo(() => {
    if (!currentStudyPlan || !currentStudyPlan.tasks || currentStudyPlan.tasks.length === 0) return [];
    const completedTasks = currentStudyPlan.tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return [];
    
    const validTasks = currentStudyPlan.tasks.filter(task => {
        try {
            parseISO(task.date);
            return true;
        } catch { return false; }
    });

    if(validTasks.length === 0) return [];

    let planStartDateRef: Date;
     if (validTasks.length > 0) { 
        const earliestTaskDate = validTasks.reduce((earliest, task) =>
            parseISO(task.date) < parseISO(earliest.date) ? task : earliest
        ).date;
        planStartDateRef = parseISO(earliestTaskDate);
    } else {
        return [];
    }
    const planStartDate = startOfWeek(planStartDateRef, { weekStartsOn: 1 });
    const weeklyCompletion: { [week: string]: number } = {};
    
    completedTasks.forEach(task => {
      try {
        const taskDate = parseISO(task.date);
        const weekNumber = differenceInWeeks(taskDate, planStartDate) + 1;
        if (weekNumber < 1) return; 
        const weekKey = `Week ${weekNumber}`;
        weeklyCompletion[weekKey] = (weeklyCompletion[weekKey] || 0) + 1;
      } catch { /* ignore invalid task dates for this calculation */ }
    });

    return Object.entries(weeklyCompletion)
      .map(([week, count]) => ({ week, tasksCompleted: count }))
      .sort((a,b) => parseInt(a.week.split(' ')[1]) - parseInt(b.week.split(' ')[1]));
  }, [currentStudyPlan]);

  const performanceChartConfig: ChartConfig = {
    tasksCompleted: { label: "Tasks Completed", color: "hsl(var(--chart-1))" },
  };

  const subjectFocusData = useMemo(() => {
    if (!currentStudyPlan?.planDetails || !currentStudyPlan.tasks) return [];
    const { subjects } = currentStudyPlan.planDetails;
    const subjectArray = subjects.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
    if (subjectArray.length === 0) return [];

    const completedTasks = currentStudyPlan.tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return [];

    const subjectCounts: { [subject: string]: number } = {};
    subjectArray.forEach(sub => subjectCounts[sub] = 0);

    completedTasks.forEach(task => {
      const taskDescriptionLower = task.task.toLowerCase();
      for (const subject of subjectArray) {
        if (taskDescriptionLower.includes(subject)) {
          subjectCounts[subject]++;
          break; 
        }
      }
    });
    
    const totalCompletedWithSubject = Object.values(subjectCounts).reduce((sum, count) => sum + count, 0);
    if (totalCompletedWithSubject === 0) return subjectArray.map((name, index) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: 0, fill: chartColors[index % chartColors.length] }));


    return Object.entries(subjectCounts)
      .map(([name, count], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: count,
        fill: chartColors[index % chartColors.length],
      }))
      .filter(item => item.value > 0);
  }, [currentStudyPlan]);


  const subjectChartConfig = useMemo(() =>
    subjectFocusData.reduce((acc, subject) => {
      acc[subject.name] = { label: subject.name, color: subject.fill };
      return acc;
    }, {} as ChartConfig)
  , [subjectFocusData]);

  const dailyCompletionData = useMemo(() => {
    if (!currentStudyPlan || !currentStudyPlan.tasks) return [];
    const dailyMap: { [date: string]: number } = {};
    
    currentStudyPlan.tasks.filter(t => t.completed).forEach(task => {
      try {
        const formattedDate = format(parseISO(task.date), 'MMM d');
        dailyMap[formattedDate] = (dailyMap[formattedDate] || 0) + 1;
      } catch { /* ignore */ }
    });

    return Object.entries(dailyMap).map(([date, tasks]) => {
        const originalTask = currentStudyPlan.tasks.find(t => {
            try { return format(parseISO(t.date), 'MMM d') === date && t.completed; }
            catch { return false; }
        });
        return { date, tasks, originalDate: originalTask ? parseISO(originalTask.date) : new Date(0) }; 
    }).sort((a,b) => a.originalDate.getTime() - b.originalDate.getTime())
      .map(({date, tasks}) => ({date, tasks}));
  }, [currentStudyPlan]);

  const dailyCompletionChartConfig: ChartConfig = {
    tasks: { label: "Tasks Completed", color: "hsl(var(--chart-1))" },
  };

  if (isLoadingPlan) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!currentStudyPlan || !currentStudyPlan.planDetails) {
    return (
      <AppLayout>
        <main id="analytics" className="app-main active py-10">
          <div className="container mx-auto text-center">
             <Alert className="max-w-md mx-auto">
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>No Study Plan Found</AlertTitle>
                <AlertDescription>
                  Create a study plan to see your analytics here.
                </AlertDescription>
              </Alert>
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main id="analytics" className="app-main active">
        <div className="container mx-auto py-6 px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Study Analytics</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Card className="analytics-card">
              <CardHeader><CardTitle>Performance Trends (Tasks Completed per Week)</CardTitle></CardHeader>
              <CardContent className="h-[300px] p-2">
                {performanceData.length > 0 ? (
                  <ChartContainer config={performanceChartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="tasksCompleted" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-muted-foreground pt-10">No task completion data yet to show trends.</p>
                )}
              </CardContent>
            </Card>
            <Card className="analytics-card">
              <CardHeader><CardTitle>Subject Focus (Based on Completed Tasks)</CardTitle></CardHeader>
              <CardContent className="h-[300px] p-2">
                {subjectFocusData.length > 0 ? (
                  <ChartContainer config={subjectChartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                        <Pie data={subjectFocusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label >
                           {subjectFocusData.map((entry, index) => (
                            <Cell key={`cell-${entry.name}-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} iconSize={10} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                   <p className="text-center text-muted-foreground pt-10">No subject focus data to display. Complete tasks to see your focus areas.</p>
                )}
              </CardContent>
            </Card>
            <Card className="analytics-card md:col-span-2">
              <CardHeader><CardTitle>Daily Task Completion</CardTitle></CardHeader>
              <CardContent className="h-[300px] p-2">
                {dailyCompletionData.length > 0 ? (
                   <ChartContainer config={dailyCompletionChartConfig} className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyCompletionData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="tasks" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                  <p className="text-center text-muted-foreground pt-10">No tasks completed yet for daily tracking.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="analytics-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <Lightbulb className="h-6 w-6 text-yellow-400" />
                   AI-Generated Plan Reflection
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentStudyPlan?.status === 'completed' ? (
                  isGeneratingReflection ? (
                    <div className="flex flex-col items-center justify-center p-6">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                      <p className="text-muted-foreground">ReflectionAI is analyzing your performance...</p>
                    </div>
                  ) : planReflection ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Overall Completion</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold text-primary">{(planReflection.overallCompletionRate * 100).toFixed(0)}%</p></CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Main Reflection</CardTitle></CardHeader>
                        <CardContent><p className="text-xs">{planReflection.mainReflection}</p></CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Study Consistency</CardTitle></CardHeader>
                        <CardContent><p className="text-xs">{planReflection.consistencyObservation}</p></CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Next Plan Suggestion</CardTitle></CardHeader>
                        <CardContent><p className="text-xs">{planReflection.suggestionForNextPlan}</p></CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircleIcon className="h-4 w-4" />
                      <AlertTitle>Reflection Not Available</AlertTitle>
                      <AlertDescription>
                          We couldn't generate a reflection for this completed plan at the moment. This might be due to a lack of task data or an AI processing error.
                      </AlertDescription>
                    </Alert>
                  )
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                        Complete your study plan to receive personalized AI reflections on your performance. Here are some examples of what ReflectionAI might provide:
                    </p>
                    <div className="space-y-3">
                      {staticExampleRecommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 border rounded-md bg-muted/30">
                          <div className="rec-icon text-xl pt-0.5">{rec.agent.split(' ')[0]}</div>
                          <div className="flex-grow">
                            <div className="rec-text text-sm font-medium">{rec.text}</div>
                            {rec.confidence && <div className="text-xs text-muted-foreground">{rec.confidence}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
        </div>
      </main>
    </AppLayout>
  );
}

