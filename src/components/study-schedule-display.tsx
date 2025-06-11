
"use client";

import type { ScheduleTask, PlanInput, ParsedRawScheduleItem, ScheduleData } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ListChecks, CalendarDays, AlertCircle, PieChartIcon as PieIcon, CheckCircle2, Link as LinkIcon, Search } from "lucide-react";
import { AdaptiveReplanModal } from "./adaptive-replan-modal";
import { type AdaptiveRePlanningOutput } from "@/ai/flows/adaptive-re-planning";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";

interface StudyScheduleDisplayProps {
  scheduleString: string;
  planDetails: PlanInput;
  onProgressUpdate: (updatedTasks: ScheduleTask[]) => void;
  onReplan: (revisedData: AdaptiveRePlanningOutput) => void;
  onFinishPlan: () => void; 
  planStatus?: 'active' | 'completed'; 
  initialTasks?: ScheduleTask[];
  daysToGoal?: number;
  successProbability?: number;
  totalHours?: number;
}

function tryParseSchedule(scheduleString: string, initialTasks?: ScheduleTask[]): ScheduleTask[] | null {
  try {
    const parsed = JSON.parse(scheduleString) as ParsedRawScheduleItem[];
    if (Array.isArray(parsed) && parsed.every(item => typeof item.date === 'string' && typeof item.task === 'string')) {
      if (initialTasks && initialTasks.length > 0 && initialTasks.length === parsed.length) {
         return parsed.map((item, index) => ({
          ...item,
          date: item.date,
          id: initialTasks[index]?.id || String(Date.now() + index),
          completed: initialTasks[index]?.completed || false,
          youtubeSearchQuery: item.youtubeSearchQuery,
          referenceSearchQuery: item.referenceSearchQuery,
          subTasks: initialTasks[index]?.subTasks || [],
          quizScore: initialTasks[index]?.quizScore,
          quizAttempted: initialTasks[index]?.quizAttempted || false,
        }));
      }
      return parsed.map((item, index) => ({
        ...item,
        date: item.date,
        id: String(Date.now() + index),
        completed: false,
        youtubeSearchQuery: item.youtubeSearchQuery,
        referenceSearchQuery: item.referenceSearchQuery,
        subTasks: [],
        quizScore: undefined,
        quizAttempted: false,
      }));
    }
    return null;
  } catch (error) {
    console.warn("Failed to parse schedule string as JSON array of {date, task, youtubeSearchQuery, referenceSearchQuery}:", error);
    return null;
  }
}


export function StudyScheduleDisplay({
  scheduleString,
  planDetails,
  onProgressUpdate,
  onReplan,
  onFinishPlan,
  planStatus,
  initialTasks,
  daysToGoal,
  successProbability,
  totalHours,
}: StudyScheduleDisplayProps) {

  const tasks = tryParseSchedule(scheduleString, initialTasks);

  const handleTaskToggle = (taskId: string) => {
    if (!tasks || planStatus === 'completed') return; 
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    onProgressUpdate(updatedTasks);
  };

  if (!tasks) {
    return (
      <Card className="w-full shadow-xl generated-plan">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-2"><CalendarDays /> Your Study Plan</CardTitle>
          <CardDescription>The AI-generated plan is shown below. Progress tracking is unavailable for this format.</CardDescription>
        </CardHeader>
        <CardContent>
           <Alert variant="default" className="mb-6 bg-accent/20 border-accent">
            <AlertCircle className="h-4 w-4 text-accent-foreground" />
            <AlertTitle className="text-accent-foreground">Note on Plan Format</AlertTitle>
            <AlertDescription className="text-accent-foreground/80">
              The AI returned a schedule that is not in a structured JSON format required for detailed tracking.
              You can see the raw plan text below. Adaptive re-planning and detailed progress tracking are unavailable for this format.
            </AlertDescription>
          </Alert>
          <div className="p-4 bg-muted rounded-md whitespace-pre-wrap font-mono text-sm overflow-x-auto plan-schedule">
            {scheduleString}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-6 pt-6">
        </CardFooter>
      </Card>
    );
  }

  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const totalTasksCount = tasks.length;
  const pendingTasksCount = totalTasksCount - completedTasksCount;
  const progressPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

  const overviewChartData = [
    { name: "Completed", value: completedTasksCount, fill: "hsl(var(--primary))" },
    { name: "Pending", value: pendingTasksCount, fill: "hsl(var(--muted))" },
  ];
  const overviewChartConfig: ChartConfig = {
    completed: { label: "Completed", color: "hsl(var(--primary))" },
    pending: { label: "Pending", color: "hsl(var(--muted))" },
  };

  const canFinishPlan = progressPercentage >= 80 && planStatus !== 'completed';


  return (
    <div className="space-y-8 generated-plan">
      <Card className="w-full shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-center">
            {planStatus === 'completed' ? "Completed Study Plan" : "Your Personalized Study Plan"}
          </CardTitle>
          <div className="plan-overview mt-4">
            <div className="plan-stat">
                <div className="stat-value">{daysToGoal ?? planDetails.studyDurationDays}</div>
                <div className="stat-label">Days to Goal</div>
            </div>
            <div className="plan-stat">
                <div className="stat-value">{successProbability ? `${successProbability}%` : `90%+`}</div>
                <div className="stat-label">Success Probability</div>
            </div>
            <div className="plan-stat">
                <div className="stat-value">{totalHours ?? planDetails.dailyStudyHours * planDetails.studyDurationDays}</div>
                <div className="stat-label">Total Hours</div>
            </div>
          </div>
           {planStatus === 'completed' && (
            <Alert variant="default" className="mt-4 bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
              <AlertTitle className="font-semibold">Plan Completed!</AlertTitle>
              <AlertDescription>
                Congratulations on finishing your study plan.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between mb-1 text-sm font-medium">
              <span>Progress</span>
              <span>{completedTasksCount} / {totalTasksCount} tasks completed</span>
            </div>
            <Progress value={progressPercentage} aria-label={`${progressPercentage.toFixed(0)}% completed`} className="w-full h-3" />
          </div>

          {totalTasksCount > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><PieIcon className="text-primary h-5 w-5"/>Progress Overview</h3>
              <ChartContainer config={overviewChartConfig} className="mx-auto aspect-square max-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={overviewChartData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={60} innerRadius={40}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text x={x} y={y} fill="hsl(var(--card-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {overviewChartData.map((entry) => ( <Cell key={`cell-${entry.name}`} fill={entry.fill} /> ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}

          <div className="plan-schedule max-h-[300px] overflow-y-auto pr-2 space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`schedule-day flex items-start space-x-3 p-3 rounded-md transition-all ${
                  task.completed ? "bg-green-600/20 dark:bg-green-800/30" : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <Checkbox
                  id={`task-${task.id}`}
                  checked={task.completed}
                  onCheckedChange={() => handleTaskToggle(task.id)}
                  aria-labelledby={`task-label-${task.id}`}
                  disabled={planStatus === 'completed'}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label
                    htmlFor={`task-${task.id}`}
                    id={`task-label-${task.id}`}
                    className={`schedule-task-label text-sm font-medium leading-tight ${
                      task.completed ? "line-through text-muted-foreground" : ""
                    } ${planStatus === 'completed' ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {task.task}
                  </label>
                  <p className={`text-xs text-muted-foreground mt-0.5 ${task.completed ? "line-through" : ""}`}>
                    {new Date(task.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  {(task.youtubeSearchQuery || task.referenceSearchQuery) && (
                      <div className="flex gap-3 mt-1.5">
                        {task.youtubeSearchQuery && (
                          <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(task.youtubeSearchQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1 opacity-80 hover:opacity-100"
                            title={`Search YouTube: "${task.youtubeSearchQuery}"`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.04 6.5c.14-.48.49-.9.96-1.11a2.57 2.57 0 0 1 2.34.38l5.34 3.36a1.73 1.73 0 0 1 0 2.74l-5.34 3.36a2.57 2.57 0 0 1-2.34.38c-.47-.21-.82-.63-.96-1.11Z"/><path d="M17.55 17.28c-1.18.37-2.7.6-4.55.6-4.79 0-8.5-2.01-8.5-4.5s3.71-4.5 8.5-4.5c1.85 0 3.37.23 4.55.6Z"/><path d="M22 12a9.9 9.9 0 0 1-7.45 9.67A9.37 9.37 0 0 1 12 22c-5.23 0-9.5-2.12-9.5-4.72V16M2.5 12C2.5 7 7.5 3 12.5 3s10 4 10 9"/></svg>
                             YouTube
                          </a>
                        )}
                        {task.referenceSearchQuery && (
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(task.referenceSearchQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1 opacity-80 hover:opacity-100"
                            title={`Search Web: "${task.referenceSearchQuery}"`}
                            onClick={(e) => e.stopPropagation()} 
                          >
                            <Search className="h-3 w-3"/> Web Search
                          </a>
                        )}
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="plan-actions pt-6 flex flex-col sm:flex-row gap-3">
          {planStatus !== 'completed' && (
            <AdaptiveReplanModal
              originalScheduleJSON={JSON.stringify(tasks.map(({id, completed, youtubeSearchQuery, referenceSearchQuery, subTasks, quizScore, quizAttempted, ...rest}) => rest))}
              planDetails={planDetails}
              onReplan={onReplan}
            />
          )}
          {canFinishPlan && (
            <Button onClick={onFinishPlan} variant="gooeyLeft" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Plan as Completed
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

