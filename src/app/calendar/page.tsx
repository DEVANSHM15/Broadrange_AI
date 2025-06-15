
"use client";
import { useState, useEffect, useCallback } from 'react';
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
import { addDays, subDays, format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths, isValid } from "date-fns";
import { TaskBreakdownModal } from '@/components/task-breakdown-modal';
import { LogScorePopover } from '@/components/log-score-popover';
import { QuizModal } from '@/components/quiz-modal';

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
    console.warn("[CalendarPage ParseTasks] Failed to parse schedule string:", error);
    return existingTasks || [];
  }
}


export default function CalendarPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [activeStudyPlan, setActiveStudyPlan] = useState<ScheduleData | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const plannerStorageKey = getPlannerStorageKey(currentUser?.email);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [selectedTaskForBreakdown, setSelectedTaskForBreakdown] = useState<ScheduleTask | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [selectedTaskForQuiz, setSelectedTaskForQuiz] = useState<ScheduleTask | null>(null);

  const reloadData = useCallback(() => {
    setIsLoadingPlan(true);
    if (!currentUser?.email) {
        setActiveStudyPlan(null);
        setIsLoadingPlan(false);
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
            } else { // If no active, pick most recent non-active for viewing
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
            currentActivePlan.tasks = tasksToUse;
        }
      } catch (error) {
        console.error("CalendarPage: Failed to parse saved plans:", error);
        currentActivePlan = null;
      }
    }
    setActiveStudyPlan(currentActivePlan);
    if (currentActivePlan?.planDetails?.startDate) {
        const sDate = parseISO(currentActivePlan.planDetails.startDate);
        if (isValid(sDate)) {
            setSelectedDate(sDate);
            setCurrentDisplayMonth(sDate);
        }
    } else {
        setSelectedDate(new Date());
        setCurrentDisplayMonth(new Date());
    }
    setIsLoadingPlan(false);
  }, [currentUser, plannerStorageKey]);


  useEffect(() => {
    reloadData();
    const handleStudyPlanUpdate = () => reloadData();
    window.addEventListener('studyPlanUpdated', handleStudyPlanUpdate);
    return () => window.removeEventListener('studyPlanUpdated', handleStudyPlanUpdate);
  }, [reloadData]);

  const getTasksForDate = (date: Date): ScheduleTask[] => {
    if (!activeStudyPlan || !activeStudyPlan.tasks) return [];
    const dateString = format(date, 'yyyy-MM-dd');
    return activeStudyPlan.tasks.filter(task => {
        try {
            return format(parseISO(task.date), 'yyyy-MM-dd') === dateString;
        } catch (e) {
            console.warn(`Error parsing task.date "${task.date}" for task ID ${task.id}`, e);
            return false;
        }
    });
  };

  const handleProgressUpdate = (updatedTasks: ScheduleTask[]) => {
    if (activeStudyPlan) {
      const now = new Date().toISOString();
      const updatedActivePlan = { ...activeStudyPlan, tasks: updatedTasks, updatedAt: now };
      setActiveStudyPlan(updatedActivePlan);
      
      const allPlansJson = localStorage.getItem(plannerStorageKey);
      if (allPlansJson) {
        try {
          let allPlans: ScheduleData[] = JSON.parse(allPlansJson);
          const planIndex = allPlans.findIndex(p => p.id === activeStudyPlan.id);
          if (planIndex !== -1) {
            allPlans[planIndex] = updatedActivePlan;
            localStorage.setItem(plannerStorageKey, JSON.stringify(allPlans));
            window.dispatchEvent(new CustomEvent('studyPlanUpdated'));
          }
        } catch (e) { console.error("Error updating progress in localStorage (Calendar)", e); }
      }
    }
  };

  const handleSaveQuizScore = (taskId: string, score: number | undefined, attempted: boolean) => {
    if (activeStudyPlan && activeStudyPlan.tasks) {
      const updatedTasks = activeStudyPlan.tasks.map(t =>
        t.id === taskId ? { ...t, quizScore: score, quizAttempted: attempted } : t
      );
      handleProgressUpdate(updatedTasks);
    }
  };

  const handleCalendarTaskToggle = (taskId: string) => {
    if (!activeStudyPlan || activeStudyPlan.status === 'completed' || activeStudyPlan.status === 'archived' || !activeStudyPlan.tasks) {
      toast({
        title: "Action Restricted",
        description: "Cannot modify tasks for a completed/archived plan or if no plan is active.",
        variant: "default",
      });
      return;
    }

    const updatedTasks = activeStudyPlan.tasks.map((task) =>
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
    if (!activeStudyPlan || !activeStudyPlan.tasks) return;
    const updatedGlobalTasks = activeStudyPlan.tasks.map(t =>
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

  if (!activeStudyPlan || !activeStudyPlan.planDetails) {
    return (
      <AppLayout>
        <main className="app-main active py-10">
          <div className="container mx-auto text-center">
             <Alert className="max-w-md mx-auto">
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>No Study Plan Found</AlertTitle>
                <AlertDescription>
                  Create or activate a study plan on the AI Planner page to see your calendar.
                </AlertDescription>
              </Alert>
          </div>
        </main>
      </AppLayout>
    );
  }

  let planStartDate: Date | null = null;
  let planEndDate: Date | null = null;

  if (activeStudyPlan.tasks.length > 0) {
      const firstTaskDate = parseISO(activeStudyPlan.tasks[0].date);
      const lastTaskDate = parseISO(activeStudyPlan.tasks[activeStudyPlan.tasks.length - 1].date);
      if (isValid(firstTaskDate)) planStartDate = firstTaskDate;
      if (isValid(lastTaskDate)) planEndDate = lastTaskDate;
  }
  if (!planStartDate && activeStudyPlan.planDetails.startDate && isValid(parseISO(activeStudyPlan.planDetails.startDate))) {
      planStartDate = parseISO(activeStudyPlan.planDetails.startDate);
  }
  if (!planStartDate) planStartDate = new Date(); // Fallback if no tasks and no start date
  if (!planEndDate) planEndDate = addDays(planStartDate, activeStudyPlan.planDetails.studyDurationDays || 30);


  return (
    <AppLayout>
      <main className="app-main active py-6 px-4 md:px-6">
        <div className="container mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex justify-between items-center">
                Study Calendar {activeStudyPlan.status === 'completed' ? "(Completed)" : activeStudyPlan.status === 'archived' ? "(Archived)" : ""}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentDisplayMonth(prev => subMonths(prev, 1))}>← Prev Month</Button>
                  <span className="text-lg font-medium w-36 text-center">
                    {currentDisplayMonth && isValid(currentDisplayMonth) ? format(currentDisplayMonth, 'MMMM yyyy') : "Loading..."}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDisplayMonth(prev => addMonths(prev, 1))}>Next Month →</Button>
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
                      if(date && isValid(date)) setCurrentDisplayMonth(date); 
                  }}
                  month={currentDisplayMonth}
                  onMonthChange={setCurrentDisplayMonth}
                  className="rounded-md border shadow-sm"
                  disabled={date => (planStartDate && date < startOfWeek(planStartDate)) || (planEndDate && date > endOfWeek(planEndDate))}
                  components={{
                    DayContent: ({ date, activeModifiers }) => {
                      const tasksOnDay = getTasksForDate(date);
                      const isSelected = activeModifiers.selected;
                      const isToday = activeModifiers.today;
                      const isCurrentMonthView = isValid(date) && isValid(currentDisplayMonth) && isSameMonth(date, currentDisplayMonth);
                      return (
                        <div className={`relative h-full w-full flex flex-col items-center justify-center ${!isCurrentMonthView ? 'text-muted-foreground/50' : ''}`}>
                          <span>{isValid(date) ? format(date, "d") : "X"}</span>
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
                {selectedDate && isValid(selectedDate) && (
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
                              disabled={activeStudyPlan?.status === 'completed' || activeStudyPlan?.status === 'archived'}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <Label htmlFor={`task-cal-${task.id}`} id={`task-cal-label-${task.id}`} className={`font-medium ${(activeStudyPlan?.status === 'completed' || activeStudyPlan?.status === 'archived') ? 'cursor-default' : 'cursor-pointer'}`}>
                                {task.task}
                              </Label>
                               <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                  {(task.youtubeSearchQuery || task.referenceSearchQuery) && (
                                  <div className="flex gap-2">
                                      {task.youtubeSearchQuery && (
                                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(task.youtubeSearchQuery)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1" title={`Search YouTube: ${task.youtubeSearchQuery}`} onClick={(e) => e.stopPropagation()}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.04 6.5c.14-.48.49-.9.96-1.11a2.57 2.57 0 0 1 2.34.38l5.34 3.36a1.73 1.73 0 0 1 0 2.74l-5.34 3.36a2.57 2.57 0 0 1-2.34.38c-.47-.21-.82-.63-.96-1.11Z"/><path d="M17.55 17.28c-1.18.37-2.7.6-4.55.6-4.79 0-8.5-2.01-8.5-4.5s3.71-4.5 8.5-4.5c1.85 0 3.37.23 4.55.6Z"/><path d="M22 12a9.9 9.9 0 0 1-7.45 9.67A9.37 9.37 0 0 1 12 22c-5.23 0-9.5-2.12-9.5-4.72V16M2.5 12C2.5 7 7.5 3 12.5 3s10 4 10 9"/></svg> YT
                                      </a>
                                      )}
                                      {task.referenceSearchQuery && (
                                      <a href={`https://www.google.com/search?q=${encodeURIComponent(task.referenceSearchQuery)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1" title={`Search Web: ${task.referenceSearchQuery}`} onClick={(e) => e.stopPropagation()}>
                                          <Search className="h-3 w-3"/> Web
                                      </a>
                                      )}
                                  </div>
                                  )}
                                  {(activeStudyPlan?.status !== 'completed' && activeStudyPlan?.status !== 'archived') && (
                                    <>
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenBreakdownModal(task)} className="h-auto p-0 text-xs text-primary/70 hover:text-primary" title="Break down this task">
                                        <ListTree className="mr-1 h-3 w-3"/> Sub-tasks ({task.subTasks?.length || 0})
                                    </Button>
                                     <Button variant="ghost" size="sm" onClick={() => handleOpenQuizModal(task)} className="h-auto p-0 text-xs text-purple-500 hover:text-purple-600" title="Take AI quiz for this task">
                                        <FileQuestion className="mr-1 h-3 w-3"/> Take AI Quiz
                                    </Button>
                                     <LogScorePopover
                                        task={task}
                                        onSave={handleSaveQuizScore}
                                        onTakeQuiz={handleOpenQuizModal}
                                        disabled={activeStudyPlan?.status === 'completed' || activeStudyPlan?.status === 'archived'}
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
        subjectContext={activeStudyPlan?.planDetails?.subjects}
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
