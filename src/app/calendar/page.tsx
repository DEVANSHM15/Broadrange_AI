
"use client";
import { useState, useEffect } from 'react';
import AppLayout from "@/components/AppLayout";
import { Button } from '@/components/ui/button';
import { Loader2, ListTree, Search, HelpCircle, FileQuestion } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { ScheduleData, ScheduleTask, ParsedRawScheduleItem } from "@/types";
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { addDays, subDays, format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from "date-fns";
import { TaskBreakdownModal } from '@/components/task-breakdown-modal';
import { LogScorePopover } from '@/components/log-score-popover'; // Updated import
import { QuizModal } from '@/components/quiz-modal';

const getPlannerStorageKey = (userEmail: string | undefined | null) =>
  userEmail ? `studyMindAiPlannerData_v2_${userEmail}` : `studyMindAiPlannerData_v2_guest`;

// Helper function to parse schedule string into tasks (consistent with other pages)
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
     console.warn("[CalendarPage Load/Parse] Schedule string did not parse into expected array of objects. Returning existing tasks or empty array.");
    return existingTasks || [];
  } catch (error) {
    console.warn("[CalendarPage Load/Parse] Failed to parse schedule string:", error);
    return existingTasks || [];
  }
}


export default function CalendarPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [currentStudyPlan, setCurrentStudyPlan] = useState<ScheduleData | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const plannerStorageKey = getPlannerStorageKey(currentUser?.email);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date()); // Changed from currentDisplayDate
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [selectedTaskForBreakdown, setSelectedTaskForBreakdown] = useState<ScheduleTask | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [selectedTaskForQuiz, setSelectedTaskForQuiz] = useState<ScheduleTask | null>(null);

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
              const updatedPlanForStorage = { ...savedPlan, tasks: tasksToUse };
              localStorage.setItem(plannerStorageKey, JSON.stringify(updatedPlanForStorage));
            }
          } else if (tasksToUse.length > 0) {
            tasksToUse = tasksToUse.map(task => ({
                ...task,
                subTasks: task.subTasks || [],
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
        } catch (error) {
          console.error("CalendarPage: Failed to parse saved plan:", error);
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
  }, [currentUser, plannerStorageKey]);

  const previousMonth = () => { // Renamed for clarity
    setCurrentDisplayMonth(prev => subMonths(prev, 1));
    setSelectedDate(prev => subMonths(prev || new Date(), 1)); // Update selectedDate as well
  };
  const nextMonth = () => { // Renamed for clarity
    setCurrentDisplayMonth(prev => addMonths(prev, 1));
    setSelectedDate(prev => addMonths(prev || new Date(), 1)); // Update selectedDate as well
  };

  const getTasksForDate = (date: Date): ScheduleTask[] => {
    if (!currentStudyPlan || !currentStudyPlan.tasks) return [];
    const dateString = format(date, 'yyyy-MM-dd');
    return currentStudyPlan.tasks.filter(task => {
        try {
            return format(parseISO(task.date), 'yyyy-MM-dd') === dateString;
        } catch (e) {
            console.warn(`Error parsing task.date "${task.date}" for task ID ${task.id}`, e);
            return false;
        }
    });
  };

  const handleProgressUpdate = (updatedTasks: ScheduleTask[]) => {
    if (currentStudyPlan) {
      const updatedScheduleData = { ...currentStudyPlan, tasks: updatedTasks };
      setCurrentStudyPlan(updatedScheduleData);
      if (typeof window !== "undefined") {
        localStorage.setItem(plannerStorageKey, JSON.stringify(updatedScheduleData));
      }
    }
  };

  const handleSaveQuizScore = (taskId: string, score: number | undefined, attempted: boolean) => {
    if (currentStudyPlan && currentStudyPlan.tasks) {
      const updatedTasks = currentStudyPlan.tasks.map(t =>
        t.id === taskId ? { ...t, quizScore: score, quizAttempted: attempted } : t
      );
      handleProgressUpdate(updatedTasks);
    }
  };

  const handleCalendarTaskToggle = (taskId: string) => {
    if (!currentStudyPlan || currentStudyPlan.status === 'completed' || !currentStudyPlan.tasks) {
      toast({
        title: "Action Restricted",
        description: "Cannot modify tasks for a completed plan or if no plan is active.",
        variant: "default",
      });
      return;
    }

    const updatedTasks = currentStudyPlan.tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );

    handleProgressUpdate(updatedTasks);

    const changedTask = updatedTasks.find(t => t.id === taskId);
    toast({
      title: `Task ${changedTask?.completed ? 'Completed' : 'Marked Incomplete'}`,
      description: `"${changedTask?.task.substring(0,30)}..." status updated.`,
      variant: "default",
    });
  };

  const handleOpenBreakdownModal = (task: ScheduleTask) => {
    setSelectedTaskForBreakdown(task);
    setIsBreakdownModalOpen(true);
  };

  const handleSaveSubTasks = (updatedTaskFromModal: ScheduleTask) => {
    if (!currentStudyPlan || !currentStudyPlan.tasks) return;

    const updatedGlobalTasks = currentStudyPlan.tasks.map(t =>
      t.id === updatedTaskFromModal.id ? updatedTaskFromModal : t
    );

    handleProgressUpdate(updatedGlobalTasks);

    setIsBreakdownModalOpen(false);
    setSelectedTaskForBreakdown(null);
    toast({ title: "Sub-tasks updated", description: `Changes saved for task "${updatedTaskFromModal.task.substring(0,30)}...".`});
  };

  const handleOpenQuizModal = (task: ScheduleTask) => {
    setSelectedTaskForQuiz(task);
    setIsQuizModalOpen(true);
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
        <main className="app-main active py-10">
          <div className="container mx-auto text-center">
             <Alert className="max-w-md mx-auto">
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>No Study Plan Found</AlertTitle>
                <AlertDescription>
                  Create a study plan on the AI Planner page to see your calendar here.
                </AlertDescription>
              </Alert>
          </div>
        </main>
      </AppLayout>
    );
  }

  const planStartDate = currentStudyPlan.tasks.length > 0 ? parseISO(currentStudyPlan.tasks[0].date) : new Date();
  const planEndDate = currentStudyPlan.tasks.length > 0 ? parseISO(currentStudyPlan.tasks[currentStudyPlan.tasks.length - 1].date) : addDays(new Date(), 30);


  return (
    <AppLayout>
      <main className="app-main active py-6 px-4 md:px-6">
        <div className="container mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex justify-between items-center">
                Study Calendar
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={previousMonth}>← Prev Month</Button>
                  <span className="text-lg font-medium w-36 text-center">
                    {currentDisplayMonth ? format(currentDisplayMonth, 'MMMM yyyy') : format(new Date(), 'MMMM yyyy')}
                  </span>
                  <Button variant="outline" size="sm" onClick={nextMonth}>Next Month →</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-auto mx-auto">
                <ShadCalendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                      setSelectedDate(date);
                      if(date) setCurrentDisplayMonth(date); // Sync month view on date selection
                  }}
                  month={currentDisplayMonth}
                  onMonthChange={setCurrentDisplayMonth}
                  className="rounded-md border shadow-sm"
                  disabled={date => date < startOfWeek(planStartDate) || date > endOfWeek(planEndDate)}
                  components={{
                    DayContent: ({ date, activeModifiers }) => {
                      const tasksOnDay = getTasksForDate(date);
                      const isSelected = activeModifiers.selected;
                      const isToday = activeModifiers.today;
                      const isCurrentMonthView = isSameMonth(date, currentDisplayMonth);
                      return (
                        <div className={`relative h-full w-full flex flex-col items-center justify-center ${!isCurrentMonthView ? 'text-muted-foreground/50' : ''}`}>
                          <span>{format(date, "d")}</span>
                          {tasksOnDay.length > 0 && (
                            <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${isSelected || isToday ? 'bg-primary-foreground dark:bg-primary' : 'bg-primary dark:bg-primary-foreground'}`}></div>
                          )}
                        </div>
                      );
                    },
                  }}
                />
              </div>
              <div className="flex-grow lg:max-w-xl">
                {selectedDate && (
                  <div className="p-4 bg-muted/30 rounded-md h-full min-h-[300px] lg:min-h-[400px]">
                    <h3 className="text-xl font-semibold mb-4 border-b pb-2">
                      Tasks for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </h3>
                    {getTasksForDate(selectedDate).length > 0 ? (
                      <ul className="space-y-3 max-h-[320px] lg:max-h-[calc(100%-60px)] overflow-y-auto pr-2">
                        {getTasksForDate(selectedDate).map(task => (
                          <li key={`cal-${task.id}`} className={`flex items-start gap-3 text-sm p-3 rounded-md transition-all shadow-sm ${task.completed ? 'bg-green-500/10 line-through text-muted-foreground' : 'bg-background hover:bg-accent/30'}`}>
                            <Checkbox
                              id={`task-cal-${task.id}`}
                              checked={task.completed}
                              onCheckedChange={() => handleCalendarTaskToggle(task.id)}
                              aria-labelledby={`task-cal-label-${task.id}`}
                              disabled={currentStudyPlan?.status === 'completed'}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <Label htmlFor={`task-cal-${task.id}`} id={`task-cal-label-${task.id}`} className={`font-medium ${currentStudyPlan?.status === 'completed' ? 'cursor-default' : 'cursor-pointer'}`}>
                                {task.task}
                              </Label>
                               <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                  {(task.youtubeSearchQuery || task.referenceSearchQuery) && (
                                  <div className="flex gap-2">
                                      {task.youtubeSearchQuery && (
                                      <a
                                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(task.youtubeSearchQuery)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1"
                                          title={`Search YouTube: ${task.youtubeSearchQuery}`}
                                          onClick={(e) => e.stopPropagation()}
                                      >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.04 6.5c.14-.48.49-.9.96-1.11a2.57 2.57 0 0 1 2.34.38l5.34 3.36a1.73 1.73 0 0 1 0 2.74l-5.34 3.36a2.57 2.57 0 0 1-2.34.38c-.47-.21-.82-.63-.96-1.11Z"/><path d="M17.55 17.28c-1.18.37-2.7.6-4.55.6-4.79 0-8.5-2.01-8.5-4.5s3.71-4.5 8.5-4.5c1.85 0 3.37.23 4.55.6Z"/><path d="M22 12a9.9 9.9 0 0 1-7.45 9.67A9.37 9.37 0 0 1 12 22c-5.23 0-9.5-2.12-9.5-4.72V16M2.5 12C2.5 7 7.5 3 12.5 3s10 4 10 9"/></svg>
                                          YT
                                      </a>
                                      )}
                                      {task.referenceSearchQuery && (
                                      <a
                                          href={`https://www.google.com/search?q=${encodeURIComponent(task.referenceSearchQuery)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1"
                                          title={`Search Web: ${task.referenceSearchQuery}`}
                                          onClick={(e) => e.stopPropagation()}
                                      >
                                          <Search className="h-3 w-3"/> Web
                                      </a>
                                      )}
                                  </div>
                                  )}
                                  {currentStudyPlan?.status !== 'completed' && (
                                    <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenBreakdownModal(task)}
                                        className="h-auto p-0 text-xs text-primary/70 hover:text-primary"
                                        title="Break down this task"
                                    >
                                        <ListTree className="mr-1 h-3 w-3"/> Sub-tasks ({task.subTasks?.length || 0})
                                    </Button>
                                     <Button variant="ghost" size="sm" onClick={() => handleOpenQuizModal(task)} className="h-auto p-0 text-xs text-purple-500 hover:text-purple-600" title="Take AI quiz for this task">
                                        <FileQuestion className="mr-1 h-3 w-3"/> Take AI Quiz
                                    </Button>
                                     <LogScorePopover
                                        task={task}
                                        onSave={handleSaveQuizScore}
                                        onTakeQuiz={handleOpenQuizModal}
                                        disabled={currentStudyPlan?.status === 'completed'}
                                      />
                                    </>
                                  )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-center text-muted-foreground pt-12">No tasks scheduled for this day.</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <TaskBreakdownModal
        isOpen={isBreakdownModalOpen}
        task={selectedTaskForBreakdown}
        onClose={() => {
            setIsBreakdownModalOpen(false);
            setSelectedTaskForBreakdown(null);
        }}
        onSave={handleSaveSubTasks}
      />
       <QuizModal
        task={selectedTaskForQuiz}
        subjectContext={currentStudyPlan?.planDetails?.subjects}
        isOpen={isQuizModalOpen}
        onClose={() => {
            setIsQuizModalOpen(false);
            setSelectedTaskForQuiz(null);
        }}
        onQuizComplete={handleSaveQuizScore}
      />
    </AppLayout>
  );
}

