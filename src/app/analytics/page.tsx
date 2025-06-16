
"use client";
import AppLayout from "@/components/AppLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Cell, PieChart, Pie } from "recharts";
import type { InsightDisplayData, ScheduleData, ScheduleTask, PlanInput, ParsedRawScheduleItem } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { differenceInWeeks, parseISO, format, startOfWeek, endOfWeek, addWeeks, isValid, getDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDate, addMonths, subMonths, getDaysInMonth } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HelpCircle, Loader2, Lightbulb, AlertCircle as AlertCircleIcon, Target, MessageSquareText, Repeat, SparklesIcon, CalendarDays, ChevronLeft, ChevronRight, BarChartHorizontalBig, TrendingUp, Activity } from "lucide-react";
import { generatePlanReflection, type GeneratePlanReflectionInput, type GeneratePlanReflectionOutput } from "@/ai/flows/generate-plan-reflection";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";


// Helper function to ensure tasks have necessary fields, especially after fetching from API
function ensureTaskStructure(tasks: ScheduleTask[] | undefined, planId: string): ScheduleTask[] {
  if (!tasks) return [];
  return tasks.map((task, index) => ({
    ...task,
    id: task.id || `task-${planId}-${index}-${new Date(task.date).getTime()}-${Math.random().toString(36).substring(2,9)}`,
    completed: Boolean(task.completed),
    quizAttempted: Boolean(task.quizAttempted),
    subTasks: task.subTasks || [],
    quizScore: task.quizScore,
    notes: task.notes || undefined,
  }));
}

const staticExampleRecommendations: InsightDisplayData[] = [
  { agent: "🤖 PlannerBot", text: "Consider reviewing difficult topics at the start of your study session.", confidence: "Planning Principle" },
  { agent: "⚙️ AdaptiveAI", text: "If you're falling behind, use the re-plan feature to adjust your schedule.", confidence: "Adaptive Tip" },
  { agent: "📊 AnalyticsAI", text: "Users who consistently complete tasks show better long-term retention.", confidence: "General Observation" },
];


const dayOfWeekColors = [
    "hsl(var(--chart-1))",       // Primary Blue
    "hsl(142.1 70.6% 45.3%)",    // Lush Green
    "hsl(190 70% 50%)",          // Bright Cyan/Teal
    "hsl(26.1 80.4% 53.1%)",     // Bright Orange
    "hsl(262.1 83.3% 57.8%)",    // Vivid Purple
    "hsl(320.1 70.8% 58.2%)",    // Vivid Pink
    "hsl(47.9 95.8% 53.1%)",     // Bright Yellow
];


function AnalyticsPageContent() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const planIdFromQuery = searchParams.get('planId');
  const autoShowReflectionParam = searchParams.get('autoShowReflection'); // For chatbot interaction

  const [currentStudyPlanForAnalytics, setCurrentStudyPlanForAnalytics] = useState<ScheduleData | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [planReflection, setPlanReflection] = useState<GeneratePlanReflectionOutput | null>(null);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [heatmapDisplayMonth, setHeatmapDisplayMonth] = useState<Date>(startOfMonth(new Date()));

  const reloadDataForAnalytics = useCallback(async (targetPlanId?: string) => {
    if (!currentUser?.id) {
      setCurrentStudyPlanForAnalytics(null);
      setIsLoadingPlan(false);
      return;
    }
    setIsLoadingPlan(true);
    let planToAnalyze: ScheduleData | null = null;
    const idToFetch = targetPlanId || planIdFromQuery;

    try {
      if (idToFetch) {
        const response = await fetch(`/api/plans/${idToFetch}?userId=${currentUser.id}`);
        if (response.ok) {
          const fetchedPlan = await response.json();
          if (fetchedPlan) {
            planToAnalyze = {
              ...fetchedPlan,
              tasks: ensureTaskStructure(fetchedPlan.tasks, fetchedPlan.id)
            };
          }
        } else {
          if (response.status === 404) {
            toast({ title: "Plan Not Found", description: `Could not find plan with ID: ${idToFetch}`, variant: "destructive" });
          } else {
            const errorData = await response.json().catch(() => ({ error: `Failed to fetch specific plan: ${response.statusText}` }));
            throw new Error(errorData.error || `Failed to fetch specific plan: ${response.statusText}`);
          }
          planToAnalyze = null; 
        }
      } else { 
        const response = await fetch(`/api/plans?userId=${currentUser.id}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `Failed to fetch plans: ${response.statusText}` }));
          throw new Error(errorData.error || `Failed to fetch plans: ${response.statusText}`);
        }
        const allPlans: ScheduleData[] = await response.json();

        if (allPlans && allPlans.length > 0) {
          const processedAllPlans = allPlans.map(p => ({
            ...p,
            tasks: ensureTaskStructure(p.tasks, p.id)
          }));

          const activePlans = processedAllPlans.filter(p => p.status === 'active').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          if (activePlans.length > 0) {
            planToAnalyze = activePlans[0];
          } else {
            const completedPlans = processedAllPlans.filter(p => p.status === 'completed').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            if (completedPlans.length > 0) {
              planToAnalyze = completedPlans[0];
            } else { 
              planToAnalyze = processedAllPlans.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
            }
          }
        }
      }
      
      setCurrentStudyPlanForAnalytics(planToAnalyze);

    } catch (error) {
      console.error("Analytics: Failed to fetch or process plans:", error);
      toast({ title: "Error Loading Data", description: (error as Error).message, variant: "destructive" });
      setCurrentStudyPlanForAnalytics(null);
    } finally {
      setIsLoadingPlan(false);
    }
  }, [currentUser, toast, planIdFromQuery]); // Removed autoShowReflectionParam from deps

  useEffect(() => {
    if (currentStudyPlanForAnalytics) {
      let initialHeatmapDate: Date | null = null;
      if (currentStudyPlanForAnalytics.planDetails.startDate && isValid(parseISO(currentStudyPlanForAnalytics.planDetails.startDate))) {
        initialHeatmapDate = parseISO(currentStudyPlanForAnalytics.planDetails.startDate);
      } else if (currentStudyPlanForAnalytics.tasks.length > 0) {
        const sortedTasksByDate = [...currentStudyPlanForAnalytics.tasks]
          .filter(task => task.date && isValid(parseISO(task.date)))
          .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
        if (sortedTasksByDate.length > 0) {
          initialHeatmapDate = parseISO(sortedTasksByDate[0].date);
        }
      }
      if (initialHeatmapDate && isValid(initialHeatmapDate)) {
        setHeatmapDisplayMonth(startOfMonth(initialHeatmapDate));
      } else {
        setHeatmapDisplayMonth(startOfMonth(new Date()));
      }
    }
  }, [currentStudyPlanForAnalytics]);


  useEffect(() => {
    reloadDataForAnalytics(); // Will use planIdFromQuery if present
    const handleStudyPlanUpdate = () => reloadDataForAnalytics();
    window.addEventListener('studyPlanUpdated', handleStudyPlanUpdate);
    return () => window.removeEventListener('studyPlanUpdated', handleStudyPlanUpdate);
  }, [reloadDataForAnalytics]); // reloadDataForAnalytics itself now depends on planIdFromQuery

 const fetchPlanReflection = useCallback(async (plan: ScheduleData, forceFetch: boolean = false) => {
    if (!plan.planDetails || !plan.tasks || plan.tasks.length === 0) return;
    if (isGeneratingReflection && !forceFetch) return; 
    
    setIsGeneratingReflection(true);
    if (forceFetch) setPlanReflection(null); // Clear old reflection if forcing
    
    try {
      const input: GeneratePlanReflectionInput = {
        planDetails: plan.planDetails,
        tasks: plan.tasks, 
        completionDate: plan.completionDate,
      };
      const reflection = await generatePlanReflection(input);
      setPlanReflection(reflection);
    } catch (error) {
      console.error("Failed to generate plan reflection for analytics:", error);
      let detailMessage = "An AI processing error occurred. Please try again later.";
      if (error instanceof Error) {
        if (error.message.includes("AI failed to generate a reflection") || error.message.includes("Output was null")) {
          detailMessage = "The AI couldn't structure its response for reflection. This can sometimes happen. You might try again or check the plan data.";
        } else if (error.message.includes("Plan details and tasks are required")) {
          detailMessage = "Missing necessary plan data to generate the reflection.";
        } else if (error.message.toLowerCase().includes("schema validation failed") || error.message.toLowerCase().includes("parse errors")) {
           detailMessage = `Data sent to AI for reflection was not in the expected format. Details: ${error.message.substring(0,200)}`;
        } else if (error.message.length < 150) { 
          detailMessage = error.message;
        }
      }
      toast({
          title: "Reflection Generation Error",
          description: detailMessage,
          variant: "destructive"
      });
      setPlanReflection(null); 
    } finally {
      setIsGeneratingReflection(false);
    }
  }, [toast, isGeneratingReflection]); 

  useEffect(() => {
    if (currentStudyPlanForAnalytics && currentStudyPlanForAnalytics.status === 'completed') {
      // If autoShowReflectionParam is true, force fetch, otherwise fetch normally (cached if already there)
      const force = autoShowReflectionParam === 'true';
      fetchPlanReflection(currentStudyPlanForAnalytics, force);
    } else {
      setPlanReflection(null); 
    }
  }, [currentStudyPlanForAnalytics, fetchPlanReflection, autoShowReflectionParam]);


  const performanceData = useMemo(() => {
    if (!currentStudyPlanForAnalytics || !currentStudyPlanForAnalytics.tasks || currentStudyPlanForAnalytics.tasks.length === 0) return [];
    const completedTasks = currentStudyPlanForAnalytics.tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return [];
    
    const validTasks = currentStudyPlanForAnalytics.tasks.filter(task => task.date && isValid(parseISO(task.date)));
    if(validTasks.length === 0) return [];

    const planStartDateRef = parseISO(validTasks.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())[0].date);
    const planStartDate = startOfWeek(planStartDateRef, { weekStartsOn: 1 });
    const weeklyCompletion: { [week: string]: number } = {};
    
    completedTasks.forEach(task => {
      if (!task.date || !isValid(parseISO(task.date))) return;
      const taskDate = parseISO(task.date);
      const weekNumber = differenceInWeeks(taskDate, planStartDate) + 1;
      if (weekNumber < 1) return; 
      const weekKey = `Week ${weekNumber}`;
      weeklyCompletion[weekKey] = (weeklyCompletion[weekKey] || 0) + 1;
    });

    return Object.entries(weeklyCompletion)
      .map(([week, count]) => ({ week, tasksCompleted: count }))
      .sort((a,b) => parseInt(a.week.split(' ')[1]) - parseInt(b.week.split(' ')[1]));
  }, [currentStudyPlanForAnalytics]);

  const performanceChartConfig: ChartConfig = {
    tasksCompleted: { label: "Tasks Completed", color: "hsl(var(--chart-1))" },
  };

  const productiveDaysData = useMemo(() => {
    if (!currentStudyPlanForAnalytics || !currentStudyPlanForAnalytics.tasks || currentStudyPlanForAnalytics.tasks.length === 0) return [];
    const completedTasks = currentStudyPlanForAnalytics.tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return [];

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const taskCountsByDay: { [day: string]: number } = daysOfWeek.reduce((acc, day) => {
      acc[day] = 0;
      return acc;
    }, {} as { [day: string]: number });

    completedTasks.forEach(task => {
      if (task.date && isValid(parseISO(task.date))) {
        const dayIndex = getDay(parseISO(task.date));
        const dayName = daysOfWeek[dayIndex];
        taskCountsByDay[dayName]++;
      }
    });
    
    const data = daysOfWeek.map((day, index) => ({
      day,
      tasksCompleted: taskCountsByDay[day] || 0,
      fill: dayOfWeekColors[index % dayOfWeekColors.length],
    }));
    
    if (data.every(d => d.tasksCompleted === 0)) return [];
    return data;

  }, [currentStudyPlanForAnalytics]);
  
  const productiveDaysChartConfig: ChartConfig = useMemo(() => {
    return (productiveDaysData || []).reduce((acc, item) => {
        acc[item.day] = { label: item.day, color: item.fill };
        return acc;
    }, {} as ChartConfig);
  }, [productiveDaysData]);


  const dailyCompletionData = useMemo(() => {
    if (!currentStudyPlanForAnalytics || !currentStudyPlanForAnalytics.tasks || currentStudyPlanForAnalytics.tasks.length === 0) return [];
    const dailyMap: { [date: string]: number } = {};
    
    currentStudyPlanForAnalytics.tasks.filter(t => t.completed && t.date && isValid(parseISO(t.date))).forEach(task => {
      const formattedDate = format(parseISO(task.date), 'MMM d');
      dailyMap[formattedDate] = (dailyMap[formattedDate] || 0) + 1;
    });
    if (Object.keys(dailyMap).length === 0) return [];

    return Object.entries(dailyMap).map(([date, tasks]) => {
        const originalTask = currentStudyPlanForAnalytics.tasks.find(t => t.date && isValid(parseISO(t.date)) && format(parseISO(t.date), 'MMM d') === date && t.completed);
        return { date, tasks, originalDate: originalTask ? parseISO(originalTask.date) : new Date(0) }; 
    }).sort((a,b) => a.originalDate.getTime() - b.originalDate.getTime())
      .map(({date, tasks}) => ({date, tasks}));
  }, [currentStudyPlanForAnalytics]);

  const dailyCompletionChartConfig: ChartConfig = {
    tasks: { label: "Tasks Completed", color: "hsl(var(--chart-1))" },
  };

  const monthlyActivityData = useMemo(() => {
    if (!currentStudyPlanForAnalytics || !currentStudyPlanForAnalytics.tasks || !isValid(heatmapDisplayMonth)) {
      return { monthName: format(heatmapDisplayMonth, "MMMM yyyy"), days: [], totalTasksInMonth: 0, daysStudiedInMonth: 0, totalDaysInDisplayedMonth: 0, busiestDayInMonth: { name: "N/A", count: 0 } };
    }
  
    const targetDate = heatmapDisplayMonth;
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);
    const displayStartDate = startOfWeek(monthStart);
    const displayEndDate = endOfWeek(monthEnd);
  
    let totalTasksInMonth = 0;
    let daysStudiedInMonth = 0;
    const tasksPerDayOfWeekInMonth: { [day: number]: number } = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
    const totalDaysInDisplayedMonth = getDaysInMonth(targetDate);

    const days = eachDayOfInterval({ start: displayStartDate, end: displayEndDate }).map(day => {
      const tasksOnThisDay = currentStudyPlanForAnalytics.tasks.filter(
        task => task.completed && task.date && isValid(parseISO(task.date)) && isSameDay(parseISO(task.date), day)
      );
      const tasksCompletedCount = tasksOnThisDay.length;
      const isCurrent = isSameMonth(day, monthStart);

      if (isCurrent) {
        totalTasksInMonth += tasksCompletedCount;
        if (tasksCompletedCount > 0) {
          daysStudiedInMonth++;
          const dayOfWeekIndex = getDay(day);
          tasksPerDayOfWeekInMonth[dayOfWeekIndex] = (tasksPerDayOfWeekInMonth[dayOfWeekIndex] || 0) + tasksCompletedCount;
        }
      }
      return {
        date: day,
        tasksCompleted: tasksCompletedCount,
        isCurrentMonth: isCurrent,
      };
    });

    let busiestDayNum = 0;
    let maxTasksOnDay = 0;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (let i = 0; i < 7; i++) {
        if (tasksPerDayOfWeekInMonth[i] > maxTasksOnDay) {
            maxTasksOnDay = tasksPerDayOfWeekInMonth[i];
            busiestDayNum = i;
        }
    }
    const busiestDayInMonth = { name: dayNames[busiestDayNum], count: maxTasksOnDay };
  
    return { monthName: format(monthStart, "MMMM yyyy"), days, totalTasksInMonth, daysStudiedInMonth, totalDaysInDisplayedMonth, busiestDayInMonth };
  }, [currentStudyPlanForAnalytics, heatmapDisplayMonth]);

  const getHeatmapColor = (count: number): string => {
    if (count === 0) return "bg-muted/30 hover:bg-muted/50";
    if (count <= 1) return "bg-green-200 hover:bg-green-300 dark:bg-green-900 dark:hover:bg-green-800";
    if (count <= 3) return "bg-green-400 hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600";
    if (count <= 5) return "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400";
    return "bg-green-800 hover:bg-green-900 dark:bg-green-300 dark:hover:bg-green-200";
  };

  const handlePrevMonthHeatmap = () => {
    setHeatmapDisplayMonth(prev => subMonths(prev, 1));
  };
  const handleNextMonthHeatmap = () => {
    setHeatmapDisplayMonth(prev => addMonths(prev, 1));
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

  if (!currentStudyPlanForAnalytics || !currentStudyPlanForAnalytics.planDetails) {
    return (
      <AppLayout>
        <main id="analytics" className="app-main active py-10">
          <div className="container mx-auto text-center">
             <Alert className="max-w-md mx-auto">
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>{planIdFromQuery ? "Specified Plan Not Found" : "No Study Plan Found"}</AlertTitle>
                <AlertDescription>
                  {planIdFromQuery 
                    ? `Could not load analytics for the specified plan. It might have been deleted or there was an issue fetching it.`
                    : "Complete a study plan, or have an active one, to see your analytics here. Create a new one on the AI Planner page."
                  }
                </AlertDescription>
              </Alert>
          </div>
        </main>
      </AppLayout>
    );
  }
  
  const planUpdatedAt = currentStudyPlanForAnalytics.updatedAt && isValid(parseISO(currentStudyPlanForAnalytics.updatedAt)) 
                        ? format(parseISO(currentStudyPlanForAnalytics.updatedAt), 'PPp') 
                        : 'N/A';

  const daysOfWeekShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <AppLayout>
      <main id="analytics" className="app-main active">
        <div className="container mx-auto py-6 px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Study Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1 md:mt-0">
                Displaying analytics for: <span className="font-semibold text-primary">{currentStudyPlanForAnalytics.planDetails.subjects}</span> 
                {currentStudyPlanForAnalytics.status === 'completed' && currentStudyPlanForAnalytics.completionDate && isValid(parseISO(currentStudyPlanForAnalytics.completionDate))
                    ? ` (Completed: ${format(parseISO(currentStudyPlanForAnalytics.completionDate), 'PP')})`
                    : ` (Status: ${currentStudyPlanForAnalytics.status.charAt(0).toUpperCase() + currentStudyPlanForAnalytics.status.slice(1)}, Updated: ${planUpdatedAt})`}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Card className="analytics-card shadow-md hover:shadow-lg transition-shadow">
              <CardHeader><CardTitle>Performance Trends (Tasks/Week)</CardTitle></CardHeader>
              <CardContent className="h-[300px] p-4 relative">
                {performanceData.length > 0 ? (
                  <ChartContainer config={performanceChartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line type="monotone" dataKey="tasksCompleted" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--chart-1))" }} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-center text-muted-foreground p-4">No task completion data yet to show trends for this plan.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="analytics-card shadow-md hover:shadow-lg transition-shadow">
              <CardHeader><CardTitle>Productive Days of the Week</CardTitle></CardHeader>
              <CardContent className="h-[300px] p-4 relative">
                {productiveDaysData.length > 0 ? (
                  <ChartContainer config={productiveDaysChartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productiveDaysData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="tasksCompleted" radius={[4, 4, 0, 0]} barSize={25}>
                           {productiveDaysData.map((entry, index) => (
                            <Cell key={`cell-${entry.day}-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                   <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-center text-muted-foreground p-4">No completed tasks to show productive days for this plan.</p>
                   </div>
                )}
              </CardContent>
            </Card>
            <Card className="analytics-card md:col-span-2 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader><CardTitle>Daily Task Completion</CardTitle></CardHeader>
              <CardContent className="h-[300px] p-4 relative">
                {dailyCompletionData.length > 0 ? (
                   <ChartContainer config={dailyCompletionChartConfig} className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyCompletionData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                           <Legend />
                          <Bar dataKey="tasks" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-center text-muted-foreground p-4">No tasks completed yet for daily tracking in this plan.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="analytics-card md:col-span-2 shadow-md hover:shadow-lg transition-shadow">
               <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CalendarDays className="text-primary h-5 w-5"/> Monthly Activity
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevMonthHeatmap} aria-label="Previous month">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-base font-medium w-36 text-center tabular-nums">
                      {monthlyActivityData.monthName}
                    </span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNextMonthHeatmap} aria-label="Next month">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 flex flex-col md:flex-row gap-6 items-start">
                <div className="md:w-1/2 lg:w-2/5 flex-shrink-0 mx-auto md:mx-0">
                  <div className="max-w-sm mx-auto">
                    {monthlyActivityData.days.length > 0 ? (
                      <TooltipProvider>
                        <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
                          {daysOfWeekShort.map(day => (
                            <div key={day} className="font-medium text-muted-foreground pb-1 text-[10px]">{day}</div>
                          ))}
                          {monthlyActivityData.days.map(({ date, tasksCompleted, isCurrentMonth }) => (
                            <Tooltip key={date.toISOString()} delayDuration={100}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`w-full aspect-square rounded-sm flex items-center justify-center border border-transparent transition-colors text-[10px]
                                              ${isCurrentMonth ? getHeatmapColor(tasksCompleted) : 'bg-background/30 text-muted-foreground/30 cursor-default'}
                                              ${isCurrentMonth && tasksCompleted > 0 ? 'text-primary-foreground dark:text-background font-semibold' : (isCurrentMonth ? 'text-muted-foreground' : '')}
                                            `}
                                >
                                  {getDate(date)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{format(date, "PPP")}: {tasksCompleted} task{tasksCompleted !== 1 ? 's' : ''} completed</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                    ) : (
                      <div className="flex items-center justify-center min-h-[100px]">
                         <p className="text-center text-muted-foreground">No activity data for this month in the current plan.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:w-1/2 lg:w-3/5 space-y-3 pt-2 md:pt-0">
                    <h4 className="text-lg font-semibold text-primary mb-2">
                        Insights for {monthlyActivityData.monthName}
                    </h4>
                    {monthlyActivityData.days.length > 0 ? (
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                                <span>Total Tasks Completed: <strong className="text-foreground">{monthlyActivityData.totalTasksInMonth}</strong></span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-muted-foreground" />
                                <span>Active Study Days: <strong className="text-foreground">{monthlyActivityData.daysStudiedInMonth}</strong> / {monthlyActivityData.totalDaysInDisplayedMonth}</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <BarChartHorizontalBig className="h-5 w-5 text-muted-foreground" />
                                <span>Busiest Day: <strong className="text-foreground">{monthlyActivityData.busiestDayInMonth.name}</strong> ({monthlyActivityData.busiestDayInMonth.count} tasks)</span>
                            </li>
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No activity stats to display for this month.</p>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="analytics-card bg-card shadow-xl" id="aiPlanReflectionSection">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                   <Lightbulb className="h-7 w-7 text-yellow-400" />
                   AI Plan Reflection
                </CardTitle>
                <CardDescription>Insights from your study journey. Reflections are generated for completed plans.</CardDescription>
              </CardHeader>
              <CardContent>
                {currentStudyPlanForAnalytics?.status === 'completed' ? (
                  isGeneratingReflection ? (
                    <div className="flex flex-col items-center justify-center p-8 min-h-[200px] bg-muted/30 rounded-lg">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                      <p className="text-muted-foreground text-lg">ReflectionAI is thinking...</p>
                    </div>
                  ) : planReflection ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-background/50 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                            <Target className="h-6 w-6 text-primary" />
                            <CardTitle className="text-md font-medium">Overall Completion</CardTitle>
                        </CardHeader>
                        <CardContent><p className="text-4xl font-bold text-primary pl-9">{(planReflection.overallCompletionRate * 100).toFixed(0)}%</p></CardContent>
                      </Card>
                      <Card className="bg-background/50 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                            <MessageSquareText className="h-6 w-6 text-primary" />
                            <CardTitle className="text-md font-medium">Main Reflection</CardTitle>
                        </CardHeader>
                        <CardContent><p className="text-sm text-foreground/90 pl-9">{planReflection.mainReflection}</p></CardContent>
                      </Card>
                      <Card className="bg-background/50 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                            <Repeat className="h-6 w-6 text-primary" />
                            <CardTitle className="text-md font-medium">Study Consistency</CardTitle>
                        </CardHeader>
                        <CardContent><p className="text-sm text-foreground/90 pl-9">{planReflection.consistencyObservation}</p></CardContent>
                      </Card>
                      <Card className="bg-background/50 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                             <SparklesIcon className="h-6 w-6 text-primary" />
                            <CardTitle className="text-md font-medium">Suggestion for Next Plan</CardTitle>
                        </CardHeader>
                        <CardContent><p className="text-sm text-foreground/90 pl-9">{planReflection.suggestionForNextPlan}</p></CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Alert variant="destructive" className="min-h-[200px] flex flex-col justify-center items-center text-center bg-destructive/10">
                      <AlertCircleIcon className="h-8 w-8 mb-3" />
                      <AlertTitle className="text-lg">Reflection Not Available</AlertTitle>
                      <AlertDescription className="mt-1">
                          We couldn't generate a reflection for this completed plan. This might be due to insufficient task data or an AI processing error.
                      </AlertDescription>
                    </Alert>
                  )
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                        AI reflections are generated once a plan is marked as 'completed'. Example insights you might see:
                    </p>
                    <div className="space-y-3">
                      {staticExampleRecommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 border rounded-md bg-muted/50 shadow-sm">
                          <div className="rec-icon text-xl pt-0.5 text-primary">{rec.agent.split(' ')[0]}</div>
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


export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    }>
      <AnalyticsPageContent />
    </Suspense>
  );
}
