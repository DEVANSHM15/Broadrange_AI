
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
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Cell } from "recharts";
import type { InsightDisplayData, ScheduleData, ScheduleTask, PlanInput, ParsedRawScheduleItem } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { differenceInWeeks, parseISO, format, startOfWeek, addWeeks, isValid, getDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDate } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HelpCircle, Loader2, Lightbulb, AlertCircle as AlertCircleIcon, Target, MessageSquareText, Repeat, SparklesIcon, CalendarDays } from "lucide-react";
import { generatePlanReflection, type GeneratePlanReflectionInput, type GeneratePlanReflectionOutput } from "@/ai/flows/generate-plan-reflection";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


// Helper function to ensure tasks have necessary fields, especially after fetching from API
function ensureTaskStructure(tasks: ScheduleTask[] | undefined, planId: string): ScheduleTask[] {
  if (!tasks) return [];
  return tasks.map((task, index) => ({
    ...task,
    id: task.id || `task-${planId}-${index}-${new Date(task.date).getTime()}-${Math.random().toString(36).substring(2,9)}`,
    completed: Boolean(task.completed), // Explicitly cast to boolean
    quizAttempted: Boolean(task.quizAttempted), // Explicitly cast to boolean
    subTasks: task.subTasks || [],
    quizScore: task.quizScore,
  }));
}

const staticExampleRecommendations: InsightDisplayData[] = [
  { agent: "🤖 PlannerBot", text: "Consider reviewing difficult topics at the start of your study session.", confidence: "Planning Principle" },
  { agent: "⚙️ AdaptiveAI", text: "If you're falling behind, use the re-plan feature to adjust your schedule.", confidence: "Adaptive Tip" },
  { agent: "📊 AnalyticsAI", text: "Users who consistently complete tasks show better long-term retention.", confidence: "General Observation" },
];


const dayOfWeekColors = [ // More distinct colors
  "hsl(var(--chart-1))", // Sun - Primary Blue
  "hsl(140 70% 50%)",   // Mon - Green
  "hsl(190 70% 50%)",   // Tue - Cyan
  "hsl(30 90% 55%)",    // Wed - Orange
  "hsl(var(--chart-5))",// Thu - Purple
  "hsl(330 70% 60%)",   // Fri - Pink
  "hsl(60 80% 50%)",    // Sat - Yellow
];


function AnalyticsPageContent() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const planIdFromQuery = searchParams.get('planId');

  const [currentStudyPlanForAnalytics, setCurrentStudyPlanForAnalytics] = useState<ScheduleData | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [planReflection, setPlanReflection] = useState<GeneratePlanReflectionOutput | null>(null);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);

  const reloadDataForAnalytics = useCallback(async () => {
    if (!currentUser?.id) {
      setCurrentStudyPlanForAnalytics(null);
      setIsLoadingPlan(false);
      return;
    }
    setIsLoadingPlan(true);
    let planToAnalyze: ScheduleData | null = null;

    try {
      if (planIdFromQuery) {
        const response = await fetch(`/api/plans/${planIdFromQuery}?userId=${currentUser.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast({ title: "Plan Not Found", description: `Could not find plan with ID: ${planIdFromQuery}`, variant: "destructive" });
          } else {
            throw new Error(`Failed to fetch specific plan: ${response.statusText}`);
          }
        } else {
          const fetchedPlan = await response.json();
           if (fetchedPlan) {
             planToAnalyze = {
                ...fetchedPlan,
                tasks: ensureTaskStructure(fetchedPlan.tasks, fetchedPlan.id)
             };
           }
        }
      }
      
      if (!planToAnalyze) { 
        const response = await fetch(`/api/plans?userId=${currentUser.id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch plans: ${response.statusText}`);
        }
        const allPlans: ScheduleData[] = await response.json();

        if (allPlans && allPlans.length > 0) {
          const completedPlans = allPlans.filter(p => p.status === 'completed').sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          if (completedPlans.length > 0) {
            planToAnalyze = completedPlans[0];
          } else {
            const activePlans = allPlans.filter(p => p.status === 'active').sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            if (activePlans.length > 0) planToAnalyze = activePlans[0];
          }
          if (!planToAnalyze && allPlans.length > 0) {
              planToAnalyze = allPlans.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
          }
        }
      }
      
      if (planToAnalyze) {
          planToAnalyze.tasks = ensureTaskStructure(planToAnalyze.tasks, planToAnalyze.id);
      }
      setCurrentStudyPlanForAnalytics(planToAnalyze);

    } catch (error) {
      console.error("Analytics: Failed to fetch or process plans:", error);
      toast({ title: "Error Loading Data", description: (error as Error).message, variant: "destructive" });
      setCurrentStudyPlanForAnalytics(null);
    } finally {
      setIsLoadingPlan(false);
    }
  }, [currentUser, toast, planIdFromQuery]);


  useEffect(() => {
    reloadDataForAnalytics();
    const handleStudyPlanUpdate = () => reloadDataForAnalytics();
    window.addEventListener('studyPlanUpdated', handleStudyPlanUpdate);
    return () => window.removeEventListener('studyPlanUpdated', handleStudyPlanUpdate);
  }, [reloadDataForAnalytics, planIdFromQuery]);

  const fetchPlanReflection = useCallback(async (plan: ScheduleData) => {
    if (!plan.planDetails || !plan.tasks || plan.tasks.length === 0 ) return;
    if (isGeneratingReflection) return;
    
    const tasksForReflection = ensureTaskStructure(plan.tasks, plan.id);

    setIsGeneratingReflection(true);
    setPlanReflection(null);
    try {
      const input: GeneratePlanReflectionInput = {
        planDetails: plan.planDetails,
        tasks: tasksForReflection, 
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
           detailMessage = `Data sent to AI for reflection was not in the expected format. Ensure tasks have boolean 'completed' status. Details: ${error.message.substring(0,200)}`;
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
  }, [toast]);

  useEffect(() => {
    if (currentStudyPlanForAnalytics && currentStudyPlanForAnalytics.status === 'completed') {
      fetchPlanReflection(currentStudyPlanForAnalytics);
    } else {
      setPlanReflection(null); 
    }
  }, [currentStudyPlanForAnalytics, fetchPlanReflection]);


  const performanceData = useMemo(() => {
    if (!currentStudyPlanForAnalytics || !currentStudyPlanForAnalytics.tasks || currentStudyPlanForAnalytics.tasks.length === 0) return [];
    const completedTasks = currentStudyPlanForAnalytics.tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return [];
    
    const validTasks = currentStudyPlanForAnalytics.tasks.filter(task => task.date && isValid(parseISO(task.date)));
    if(validTasks.length === 0) return [];

    const planStartDateRef = parseISO(validTasks.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())[0].date);
    const planStartDate = startOfWeek(planStartDateRef, { weekStartsOn: 1 }); // Assuming week starts on Monday
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
    if (!currentStudyPlanForAnalytics || !currentStudyPlanForAnalytics.tasks) return [];
    const completedTasks = currentStudyPlanForAnalytics.tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return [];

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const taskCountsByDay: { [day: string]: number } = daysOfWeek.reduce((acc, day) => {
      acc[day] = 0;
      return acc;
    }, {} as { [day: string]: number });

    completedTasks.forEach(task => {
      if (task.date && isValid(parseISO(task.date))) {
        const dayIndex = getDay(parseISO(task.date)); // 0 for Sunday, 1 for Monday, ...
        const dayName = daysOfWeek[dayIndex];
        taskCountsByDay[dayName]++;
      }
    });
    
    return daysOfWeek.map((day, index) => ({
      day,
      tasksCompleted: taskCountsByDay[day],
      fill: dayOfWeekColors[index % dayOfWeekColors.length],
    }));
  }, [currentStudyPlanForAnalytics]);
  
  const productiveDaysChartConfig: ChartConfig = productiveDaysData.reduce((acc, item) => {
      acc[item.day] = { label: item.day, color: item.fill };
      return acc;
  }, {} as ChartConfig);


  const dailyCompletionData = useMemo(() => {
    if (!currentStudyPlanForAnalytics || !currentStudyPlanForAnalytics.tasks) return [];
    const dailyMap: { [date: string]: number } = {};
    
    currentStudyPlanForAnalytics.tasks.filter(t => t.completed && t.date && isValid(parseISO(t.date))).forEach(task => {
      const formattedDate = format(parseISO(task.date), 'MMM d');
      dailyMap[formattedDate] = (dailyMap[formattedDate] || 0) + 1;
    });

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
    if (!currentStudyPlanForAnalytics || !currentStudyPlanForAnalytics.tasks || currentStudyPlanForAnalytics.tasks.length === 0) {
      return { monthName: format(new Date(), "MMMM yyyy"), days: [] };
    }
  
    let targetDate: Date;
    if (currentStudyPlanForAnalytics.planDetails.startDate && isValid(parseISO(currentStudyPlanForAnalytics.planDetails.startDate))) {
      targetDate = parseISO(currentStudyPlanForAnalytics.planDetails.startDate);
    } else {
      const sortedTasks = [...currentStudyPlanForAnalytics.tasks].sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
      targetDate = parseISO(sortedTasks[0].date);
    }
    if (!isValid(targetDate)) targetDate = new Date(); // Fallback if no valid date found
  
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);
    const displayStartDate = startOfWeek(monthStart);
    const displayEndDate = endOfWeek(monthEnd);
  
    const days = eachDayOfInterval({ start: displayStartDate, end: displayEndDate }).map(day => {
      const tasksCompleted = currentStudyPlanForAnalytics.tasks.filter(
        task => task.completed && task.date && isValid(parseISO(task.date)) && isSameDay(parseISO(task.date), day)
      ).length;
      return {
        date: day,
        tasksCompleted,
        isCurrentMonth: isSameMonth(day, monthStart),
      };
    });
  
    return { monthName: format(monthStart, "MMMM yyyy"), days };
  }, [currentStudyPlanForAnalytics]);

  const getHeatmapColor = (count: number): string => {
    if (count === 0) return "bg-muted/30 hover:bg-muted/50"; // Very light gray for no tasks
    if (count <= 1) return "bg-green-200 hover:bg-green-300 dark:bg-green-900 dark:hover:bg-green-800"; // Lightest green
    if (count <= 3) return "bg-green-400 hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600"; // Medium green
    if (count <= 5) return "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400"; // Darker green
    return "bg-green-800 hover:bg-green-900 dark:bg-green-300 dark:hover:bg-green-200"; // Darkest green
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
                <AlertTitle>{planIdFromQuery ? "Specific Plan Not Found" : "No Study Plan Found"}</AlertTitle>
                <AlertDescription>
                  {planIdFromQuery 
                    ? `Could not load analytics for the specified plan. It might have been deleted or there was an issue fetching it.`
                    : "Complete a study plan to see your analytics and reflections here. Create a new one on the AI Planner page."
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
                    : ` (Updated: ${planUpdatedAt})`}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Card className="analytics-card shadow-md hover:shadow-lg transition-shadow">
              <CardHeader><CardTitle>Performance Trends (Tasks/Week)</CardTitle></CardHeader>
              <CardContent className="h-[300px] p-4 relative"> {/* Adjusted padding */}
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
              <CardContent className="h-[300px] p-4 relative"> {/* Adjusted padding */}
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
              <CardContent className="h-[300px] p-4 relative"> {/* Adjusted padding */}
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
                <CardTitle className="flex items-center gap-2"><CalendarDays className="text-primary h-5 w-5"/> Monthly Activity Heatmap</CardTitle>
                <CardDescription>{monthlyActivityData.monthName}</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {monthlyActivityData.days.length > 0 ? (
                  <TooltipProvider>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {daysOfWeekShort.map(day => (
                        <div key={day} className="font-medium text-muted-foreground pb-1">{day}</div>
                      ))}
                      {monthlyActivityData.days.map(({ date, tasksCompleted, isCurrentMonth }) => (
                        <Tooltip key={date.toISOString()} delayDuration={100}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-full aspect-square rounded flex items-center justify-center border transition-colors
                                          ${isCurrentMonth ? getHeatmapColor(tasksCompleted) : 'bg-background/50 text-muted-foreground/50 cursor-default'}
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
                  <div className="flex items-center justify-center min-h-[150px]">
                     <p className="text-center text-muted-foreground">No activity data for this month in the current plan.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="analytics-card bg-card shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                   <Lightbulb className="h-7 w-7 text-yellow-400" />
                   AI Plan Reflection
                </CardTitle>
                <CardDescription>Insights from your completed study journey.</CardDescription>
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
                          We couldn't generate a reflection for this completed plan. This might be due to a lack of task data or an AI processing error.
                      </AlertDescription>
                    </Alert>
                  )
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                        Complete your study plan to receive personalized AI reflections. Example insights you might see:
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

    
