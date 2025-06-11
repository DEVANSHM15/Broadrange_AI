
"use client";
import * as React from 'react';
import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import AppLayout from "@/components/AppLayout";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, Trash2, Edit3, CalendarIcon as CalendarDaysIcon, Search, ChevronLeft, ChevronRight, ListTree, FileQuestion } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { generateStudySchedule, type GenerateStudyScheduleInput, type GenerateStudyScheduleOutput } from "@/ai/flows/generate-study-schedule";
import type { PlanInput, ScheduleData, ScheduleTask, ParsedRawScheduleItem } from "@/types";
import { type AdaptiveRePlanningOutput } from "@/ai/flows/adaptive-re-planning";
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parseISO, addDays, subDays, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths } from 'date-fns';
import { cn } from "@/lib/utils";
import { TaskBreakdownModal } from '@/components/task-breakdown-modal';
import { AdaptiveReplanModal } from '@/components/adaptive-replan-modal';
import { LogScorePopover } from '@/components/log-score-popover';
import { QuizModal } from '@/components/quiz-modal';


const getPlannerStorageKey = (userEmail: string | undefined | null) =>
  userEmail ? `studyMindAiPlannerData_v2_${userEmail}` : `studyMindAiPlannerData_v2_guest`;

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

    if (Array.isArray(parsed) && parsed.every(item => typeof item.date === 'string' && typeof item.task === 'string')) {
        return parsed.map((item, index) => ({
          date: item.date,
          task: item.task,
          id: String(Date.now() + index + Math.random()),
          completed: false,
          youtubeSearchQuery: item.youtubeSearchQuery,
          referenceSearchQuery: item.referenceSearchQuery,
          subTasks: [],
          quizScore: undefined,
          quizAttempted: false,
        }));
    }

    console.warn("[PlannerPage Load/Parse] Schedule string did not parse into expected array of objects. Returning existing tasks or empty array.");
    return existingTasks || [];
  } catch (error) {
    console.warn("[PlannerPage Load/Parse] Failed to parse schedule string:", error);
    return existingTasks || [];
  }
}

const initialPlannerData: PlanInput = {
  subjects: '',
  studyDurationDays: 30,
  dailyStudyHours: 3,
  subjectDetails: '',
  startDate: undefined,
};

export default function PlannerPage() {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

  const [plannerData, setPlannerData] = useState<PlanInput>(initialPlannerData);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);


  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<ScheduleData | null>(null);
  const plannerStorageKey = getPlannerStorageKey(currentUser?.email);

  // State for integrated calendar
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarDisplayMonth, setCalendarDisplayMonth] = useState(new Date());
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [selectedTaskForBreakdown, setSelectedTaskForBreakdown] = useState<ScheduleTask | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [selectedTaskForQuiz, setSelectedTaskForQuiz] = useState<ScheduleTask | null>(null);


  useEffect(() => {
    let isMounted = true;
    if (typeof window !== "undefined") {
      const savedPlanJson = localStorage.getItem(plannerStorageKey);
      if (savedPlanJson) {
        try {
          const savedPlan: ScheduleData = JSON.parse(savedPlanJson);
          let tasksToUse = savedPlan.tasks || [];

          if ((!tasksToUse || tasksToUse.length === 0) && savedPlan.scheduleString) {
            console.log("[PlannerPage Load] No tasks found in saved plan, attempting to parse from scheduleString:", savedPlan.scheduleString);
            const newlyParsedTasks = parseTasksFromString(savedPlan.scheduleString, savedPlan.tasks);
            if (newlyParsedTasks.length > 0) {
              console.log("[PlannerPage Load] Successfully parsed tasks from scheduleString:", newlyParsedTasks);
              tasksToUse = newlyParsedTasks;
              const updatedPlanForStorage = { ...savedPlan, tasks: tasksToUse };
              localStorage.setItem(plannerStorageKey, JSON.stringify(updatedPlanForStorage));
            } else {
              console.warn("[PlannerPage Load] Failed to parse tasks from scheduleString.");
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

          if (isMounted) {
            setGeneratedPlan(savedPlan);
            console.log("[PlannerPage Load] Loaded plan from localStorage. Tasks count:", tasksToUse.length, "First task if any:", tasksToUse[0]);
            if (savedPlan.planDetails) {
              setPlannerData({
                subjects: savedPlan.planDetails.subjects || '',
                dailyStudyHours: savedPlan.planDetails.dailyStudyHours || 3,
                studyDurationDays: savedPlan.planDetails.studyDurationDays || 30,
                subjectDetails: savedPlan.planDetails.subjectDetails || '',
                startDate: savedPlan.planDetails.startDate || undefined,
              });
              if (savedPlan.planDetails.startDate) {
                const sDate = parseISO(savedPlan.planDetails.startDate);
                setSelectedCalendarDate(sDate);
                setCalendarSelectedDate(sDate);
                setCalendarDisplayMonth(sDate);
              } else {
                 const today = new Date();
                 setSelectedCalendarDate(today);
                 setCalendarSelectedDate(today);
                 setCalendarDisplayMonth(today);
              }
            }
            setCurrentStep(3);
          }
        } catch (error) {
          console.error("[PlannerPage Load] Failed to parse or process saved plan:", error);
          localStorage.removeItem(plannerStorageKey);
          if (isMounted) {
              setPlannerData(initialPlannerData);
              setSelectedCalendarDate(undefined);
              setCalendarSelectedDate(new Date());
              setCalendarDisplayMonth(new Date());
              setGeneratedPlan(null);
              setCurrentStep(1);
          }
        }
      } else {
        console.log("[PlannerPage Load] No plan found in localStorage.");
        if (isMounted) {
          setPlannerData(initialPlannerData);
          setSelectedCalendarDate(undefined);
          setCalendarSelectedDate(new Date());
          setCalendarDisplayMonth(new Date());
          setGeneratedPlan(null);
          setCurrentStep(1);
        }
      }
    }
    return () => { isMounted = false; };
  }, [plannerStorageKey]);

  useEffect(() => {
    if (generatedPlan && generatedPlan.tasks) {
        console.log("[PlannerPage Render] generatedPlan.tasks count:", generatedPlan.tasks.length, "First task if any:", generatedPlan.tasks[0]);
    }
  }, [generatedPlan]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setPlannerData(prev => ({
      ...prev,
      [id]: (id === 'studyDurationDays' || id === 'dailyStudyHours') ? parseFloat(value) || 0 : value
    }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedCalendarDate(date);
    setPlannerData(prev => ({
      ...prev,
      startDate: date ? format(date, 'yyyy-MM-dd') : undefined,
    }));
  };

  const handleSelectChange = (id: string, value: string) => {
     if (id === 'dailyStudyHours') {
      setPlannerData(prev => ({ ...prev, dailyStudyHours: parseFloat(value) }));
    }
  };

  const validateInputs = (): { valid: boolean; field?: keyof PlanInput; message: string } => {
    if (!plannerData.subjects.trim()) {
      return { valid: false, field: "subjects", message: "Please enter the subjects you want to study." };
    }
    if (plannerData.studyDurationDays <= 0) {
      return { valid: false, field: "studyDurationDays", message: "Study duration must be at least 1 day." };
    }
    if (plannerData.dailyStudyHours <= 0) {
      return { valid: false, field: "dailyStudyHours", message: "Daily study hours must be positive." };
    }
    if (!plannerData.startDate) {
      return { valid: false, field: "startDate", message: "Please select a start date." };
    }
    return { valid: true, message: "" };
  };

  const startAnalysisAndGeneratePlan = async () => {
    const validationResult = validateInputs();
    if (!validationResult.valid) {
      toast({ title: `Invalid Input: ${validationResult.field || 'Unknown field'}`, description: validationResult.message, variant: "destructive" });
      return;
    }

    setCurrentStep(2);
    setIsAnalyzing(true);

    try {
      const aiInput: GenerateStudyScheduleInput = {
        subjects: plannerData.subjects,
        dailyStudyHours: plannerData.dailyStudyHours,
        studyDurationDays: plannerData.studyDurationDays,
        subjectDetails: plannerData.subjectDetails || undefined,
        startDate: plannerData.startDate,
      };

      const result: GenerateStudyScheduleOutput = await generateStudySchedule(aiInput);

      if (result && result.schedule) {
        const newPlanDetails: PlanInput = { ...plannerData };
        const initialTasks = parseTasksFromString(result.schedule, []);
        console.log("[PlannerPage Generate] AI result schedule string:", result.schedule);
        console.log("[PlannerPage Generate] Parsed initial tasks:", initialTasks);

        const newScheduleData: ScheduleData = {
            scheduleString: result.schedule,
            tasks: initialTasks,
            planDetails: newPlanDetails,
            status: 'active',
        };
        setGeneratedPlan(newScheduleData);
        if (typeof window !== "undefined") {
          localStorage.setItem(plannerStorageKey, JSON.stringify(newScheduleData));
          window.dispatchEvent(new CustomEvent('studyPlanUpdated'));
        }
        if (newPlanDetails.startDate) {
            const sDate = parseISO(newPlanDetails.startDate);
            setCalendarSelectedDate(sDate);
            setCalendarDisplayMonth(sDate);
        } else {
            const today = new Date();
            setCalendarSelectedDate(today);
            setCalendarDisplayMonth(today);
        }
        toast({ title: "Study Plan Generated!", description: "Your personalized study plan is ready.", variant: "default", action: <CheckCircle className="text-green-500"/> });
        setCurrentStep(3);
      } else {
        throw new Error("AI did not return a schedule.");
      }
    } catch (error: any) {
      console.error("Error generating study plan:", error);
      let description = "Could not generate the plan. Please try again.";
      let errorMessage = "";
       if (error instanceof Error) errorMessage = error.message;
       else if (typeof error === 'string') errorMessage = error;
       else if (error && typeof error.toString === 'function') errorMessage = error.toString();
       else if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') errorMessage = error.message;

      if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded") || errorMessage.toLowerCase().includes("service unavailable") || errorMessage.toLowerCase().includes("model is overloaded")) {
        description = "The AI model is currently overloaded or unavailable. Please try again in a few moments.";
      } else if (errorMessage.toLowerCase().includes("candidate was blocked due to")) {
        description = "The AI model blocked the request due to safety settings or content policy. Please revise your input."
      } else if (errorMessage) {
        description = `Details: ${errorMessage.substring(0,100)}${errorMessage.length > 100 ? '...' : ''}`;
      }

      toast({ title: "Planning Failed", description: description, variant: "destructive" });
      setCurrentStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProgressUpdate = (updatedTasks: ScheduleTask[]) => {
    if (generatedPlan) {
      const updatedScheduleData = { ...generatedPlan, tasks: updatedTasks };
      setGeneratedPlan(updatedScheduleData);
      if (typeof window !== "undefined") {
        localStorage.setItem(plannerStorageKey, JSON.stringify(updatedScheduleData));
        window.dispatchEvent(new CustomEvent('studyPlanUpdated'));
      }
    }
  };

  const handleSaveQuizScore = (taskId: string, score: number | undefined, attempted: boolean) => {
    if (generatedPlan && generatedPlan.tasks) {
      const updatedTasks = generatedPlan.tasks.map(t =>
        t.id === taskId ? { ...t, quizScore: score, quizAttempted: attempted } : t
      );
      handleProgressUpdate(updatedTasks);
    }
  };

  const handleReplanSuccess = (revisedData: AdaptiveRePlanningOutput, newDurationDays: number) => {
    if (generatedPlan && generatedPlan.planDetails) {
      const updatedPlanDetails: PlanInput = {
        ...generatedPlan.planDetails,
        studyDurationDays: newDurationDays,
      };
      const revisedTasks = parseTasksFromString(revisedData.revisedSchedule, []);
      const newScheduleData: ScheduleData = {
        ...generatedPlan,
        scheduleString: revisedData.revisedSchedule,
        tasks: revisedTasks.map(newTask => {
          const oldTask = generatedPlan.tasks.find(ot => ot.date === newTask.date && ot.task.split(':')[0] === newTask.task.split(':')[0]);
          return oldTask ? { ...newTask, quizScore: oldTask.quizScore, quizAttempted: oldTask.quizAttempted, subTasks: oldTask.subTasks } : newTask;
        }),
        planDetails: updatedPlanDetails,
        status: 'active',
      };
      setGeneratedPlan(newScheduleData);
      setPlannerData(updatedPlanDetails); 
      if (typeof window !== "undefined") {
        localStorage.setItem(plannerStorageKey, JSON.stringify(newScheduleData));
        console.log('[PlannerPage Replan Save] Saved to localStorage. New Duration:', newScheduleData.planDetails.studyDurationDays, 'Daily Hours:', newScheduleData.planDetails.dailyStudyHours);
        window.dispatchEvent(new CustomEvent('studyPlanUpdated'));
      }
      toast({ title: "Plan Revised", description: revisedData.summary || "Your study plan has been updated." });
    }
  };


  const resetPlannerAndGoToStep1 = (clearCurrentPlanData = true) => {
    if (clearCurrentPlanData) {
        setGeneratedPlan(null);
        setPlannerData(initialPlannerData);
        setSelectedCalendarDate(undefined);
        setCalendarSelectedDate(new Date());
        setCalendarDisplayMonth(new Date());
    } else if (generatedPlan && generatedPlan.planDetails) {
        setPlannerData(generatedPlan.planDetails);
        if (generatedPlan.planDetails.startDate) {
            setSelectedCalendarDate(parseISO(generatedPlan.planDetails.startDate));
        }
    }
    setCurrentStep(1);
  };

  const handleDeletePlan = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(plannerStorageKey);
      window.dispatchEvent(new CustomEvent('studyPlanUpdated'));
    }
    resetPlannerAndGoToStep1(true);
    toast({ title: "Plan Deleted Successfully", description: "Your study plan has been removed.", variant: "default" });
  };

  const handleMarkPlanAsCompleted = () => {
    if (generatedPlan) {
      const completedPlan = {
        ...generatedPlan,
        status: 'completed' as 'completed',
        completionDate: new Date().toISOString(),
      };
      setGeneratedPlan(completedPlan);
      if (typeof window !== "undefined") {
        localStorage.setItem(plannerStorageKey, JSON.stringify(completedPlan));
        window.dispatchEvent(new CustomEvent('studyPlanUpdated'));
      }
      toast({ title: "Plan Marked as Completed!", description: "Congratulations! You can now start a new plan or review this one.", variant: "default" });
    }
  };

  const getTasksForDate = (date: Date | undefined): ScheduleTask[] => {
    if (!date || !generatedPlan || !generatedPlan.tasks) {
        console.log("[PlannerPage GetTasks] No date, plan, or tasks. Date:", date, "Has Plan:", !!generatedPlan, "Has Tasks:", !!generatedPlan?.tasks);
        return [];
    }
    const dateString = format(date, 'yyyy-MM-dd');
    const foundTasks = generatedPlan.tasks.filter(task => {
        try {
            const taskDateString = format(parseISO(task.date), 'yyyy-MM-dd');
            return taskDateString === dateString;
        } catch (e) {
            console.warn(`[PlannerPage GetTasks] Error parsing task.date "${task.date}" for task ID ${task.id}`, e);
            return false;
        }
    });
    console.log(`[PlannerPage GetTasks] For date ${dateString}, found ${foundTasks.length} tasks. All tasks count: ${generatedPlan.tasks.length}`);
    return foundTasks;
  };

  const handleCalendarTaskToggle = (taskId: string) => {
    if (!generatedPlan || generatedPlan.status === 'completed' || !generatedPlan.tasks) {
      toast({ title: "Action Restricted", description: "Cannot modify tasks for a completed plan or if no plan is active.", variant: "default" });
      return;
    }
    const updatedTasks = generatedPlan.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task );
    handleProgressUpdate(updatedTasks);
    const changedTask = updatedTasks.find(t => t.id === taskId);
    toast({ title: `Task ${changedTask?.completed ? 'Completed' : 'Marked Incomplete'}`, description: `"${changedTask?.task.substring(0,30)}..." status updated.`, variant: "default" });
  };

  const handleOpenBreakdownModal = (task: ScheduleTask) => {
    setSelectedTaskForBreakdown(task);
    setIsBreakdownModalOpen(true);
  };

  const handleSaveSubTasks = (updatedTaskFromModal: ScheduleTask) => {
    if (!generatedPlan || !generatedPlan.tasks) return;
    const updatedGlobalTasks = generatedPlan.tasks.map(t => t.id === updatedTaskFromModal.id ? updatedTaskFromModal : t );
    handleProgressUpdate(updatedGlobalTasks);
    setIsBreakdownModalOpen(false);
    setSelectedTaskForBreakdown(null);
    toast({ title: "Sub-tasks updated", description: `Changes saved for task "${updatedTaskFromModal.task.substring(0,30)}...".`});
  };

  const handleOpenQuizModal = (task: ScheduleTask) => {
    setSelectedTaskForQuiz(task);
    setIsQuizModalOpen(true);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className="space-y-1">
              <Label htmlFor="subjects">Subjects & Priority</Label>
              <Input type="text" id="subjects" placeholder="e.g., Math (1), Physics (2), History (3)" value={plannerData.subjects} onChange={handleInputChange} />
               <p className="text-xs text-muted-foreground">Enter subjects, add priority in ( ) - lower is higher. Ex: Chem (1), Bio (2).</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !selectedCalendarDate && "text-muted-foreground")}>
                    <CalendarDaysIcon className="mr-2 h-4 w-4" />
                    {selectedCalendarDate ? format(selectedCalendarDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <ShadCalendar mode="single" selected={selectedCalendarDate} onSelect={handleDateSelect} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label htmlFor="subjectDetails">Subject Details (Optional)</Label>
              <Textarea id="subjectDetails" placeholder="e.g., Math: Algebra chapters 1-3. Physics: Kinematics." value={plannerData.subjectDetails || ""} onChange={handleInputChange} rows={3} />
               <p className="text-xs text-muted-foreground">Provide specific topics or chapters for more detailed planning.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="studyDurationDays">Study Duration (Days)</Label>
              <Input type="number" id="studyDurationDays" value={plannerData.studyDurationDays} onChange={handleInputChange} min="1" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dailyStudyHours">Daily Study Hours</Label>
              <Select value={String(plannerData.dailyStudyHours)} onValueChange={(value) => handleSelectChange('dailyStudyHours', value)}>
                  <SelectTrigger id="dailyStudyHours"><SelectValue placeholder="Select hours" /></SelectTrigger>
                  <SelectContent>
                      {[1,1.5,2,2.5,3,3.5,4,4.5,5,6,7,8].map(h => <SelectItem key={h} value={String(h)}>{h} hour{h > 1 ? 's' : ''}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            <Button onClick={startAnalysisAndGeneratePlan} className="w-full" disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Analyze & Plan
            </Button>
          </>
        );
      case 2:
        return (
          <div className="text-center py-10">
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" />
            <h3 className="text-xl font-semibold mb-2">AI Analysis in Progress...</h3>
            <p className="text-muted-foreground">Our AI agents are crafting your personalized study plan. This might take a moment.</p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-md"><span className="text-xl">🤖</span> PlannerBot: Optimizing schedule...</div>
              <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-md"><span className="text-xl">⚙️</span> AdaptiveAI: Calculating difficulty...</div>
            </div>
          </div>
        );
      case 3:
        if (generatedPlan && generatedPlan.planDetails) {
            const tasksForSelectedDate = getTasksForDate(calendarSelectedDate);
            const planStartDate = generatedPlan.tasks.length > 0 ? parseISO(generatedPlan.tasks[0].date) : new Date();
            const planEndDate = generatedPlan.tasks.length > 0 ? parseISO(generatedPlan.tasks[generatedPlan.tasks.length - 1].date) : addDays(new Date(), 30);

          return (
            <div className="flex flex-col md:flex-row gap-6 -mx-6 -my-6 p-6 bg-muted/20 rounded-b-lg">
              {/* Left Column: Calendar */}
              <div className="md:w-[340px] flex-shrink-0 bg-card p-4 rounded-lg shadow">
                <div className="flex items-center justify-between mb-3">
                    <Button variant="outline" size="icon" onClick={() => setCalendarDisplayMonth(subMonths(calendarDisplayMonth, 1))} aria-label="Previous month">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold text-center">
                        {format(calendarDisplayMonth, 'MMMM yyyy')}
                    </h2>
                    <Button variant="outline" size="icon" onClick={() => setCalendarDisplayMonth(addMonths(calendarDisplayMonth, 1))} aria-label="Next month">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <ShadCalendar
                  mode="single"
                  selected={calendarSelectedDate}
                  onSelect={(date) => {
                    setCalendarSelectedDate(date);
                    if(date) setCalendarDisplayMonth(date);
                  }}
                  month={calendarDisplayMonth}
                  onMonthChange={setCalendarDisplayMonth}
                  className="rounded-md border-0 shadow-none p-0"
                  disabled={date => date < startOfWeek(planStartDate) || date > endOfWeek(planEndDate)}
                  components={{
                    DayContent: ({ date, activeModifiers }) => {
                      const tasksOnDay = getTasksForDate(date);
                      const isSelected = activeModifiers.selected;
                      const isToday = activeModifiers.today;
                      const isCurrentDisplayMonth = isSameMonth(date, calendarDisplayMonth);
                      return (
                        <div className={`relative h-full w-full flex flex-col items-center justify-center ${!isCurrentDisplayMonth ? 'text-muted-foreground/50' : ''}`}>
                          <span>{format(date, "d")}</span>
                          {tasksOnDay.length > 0 && (
                            <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${isSelected || isToday ? 'bg-primary-foreground dark:bg-primary' : 'bg-primary dark:bg-primary-foreground'}`}></div>
                          )}
                        </div>
                      );
                    },
                  }}
                />
                <Button
                    onClick={() => resetPlannerAndGoToStep1(true)}
                    variant="outline"
                    className="w-full mt-4"
                >
                    Create New Study Plan
                </Button>
              </div>

              {/* Right Column: Tasks for selected day */}
              <div className="flex-grow bg-card p-4 rounded-lg shadow min-h-[400px]">
                {calendarSelectedDate ? (
                    <>
                        <h3 className="text-xl font-semibold mb-1">
                            {format(calendarSelectedDate, 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Day {generatedPlan.tasks.findIndex(t => { try { return format(parseISO(t.date), 'yyyy-MM-dd') === format(calendarSelectedDate, 'yyyy-MM-dd'); } catch { return false; } }) + 1} of {generatedPlan.planDetails.studyDurationDays}
                        </p>
                        {tasksForSelectedDate.length > 0 ? (
                        <ScrollArea className="h-[calc(100%-100px)] pr-3">
                            <ul className="space-y-3">
                            {tasksForSelectedDate.map(task => (
                                <li key={`cal-task-${task.id}`} className={`flex items-start gap-3 text-sm p-3 rounded-md transition-all shadow-sm ${task.completed ? 'bg-green-500/10 line-through text-muted-foreground' : 'bg-background hover:bg-accent/30'}`}>
                                <Checkbox
                                    id={`task-cal-${task.id}`}
                                    checked={task.completed}
                                    onCheckedChange={() => handleCalendarTaskToggle(task.id)}
                                    aria-labelledby={`task-cal-label-${task.id}`}
                                    disabled={generatedPlan?.status === 'completed'}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <Label htmlFor={`task-cal-${task.id}`} id={`task-cal-label-${task.id}`} className={`font-medium ${generatedPlan?.status === 'completed' ? 'cursor-default' : 'cursor-pointer'}`}>
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
                                      {generatedPlan?.status !== 'completed' && (
                                        <>
                                          <Button variant="ghost" size="sm" onClick={() => handleOpenBreakdownModal(task)} className="h-auto p-0 text-xs text-primary/70 hover:text-primary" title="Break down this task">
                                              <ListTree className="mr-1 h-3 w-3"/> Sub-tasks ({task.subTasks?.length || 0})
                                          </Button>
                                           <Button variant="ghost" size="sm" onClick={() => handleOpenQuizModal(task)} className="h-auto p-0 text-xs text-purple-500 hover:text-purple-600" title="Take quiz for this task">
                                              <FileQuestion className="mr-1 h-3 w-3"/> Take AI Quiz
                                          </Button>
                                          <LogScorePopover
                                            task={task}
                                            onSave={handleSaveQuizScore}
                                            onTakeQuiz={handleOpenQuizModal}
                                            disabled={generatedPlan?.status === 'completed'}
                                          />
                                        </>
                                      )}
                                  </div>
                                </div>
                            </li>
                            ))}
                        </ul>
                        </ScrollArea>
                        ) : (
                        <p className="text-center text-muted-foreground pt-12">No tasks scheduled for this day.</p>
                        )}
                    </>
                ) : (
                     <p className="text-center text-muted-foreground pt-12">Select a date on the calendar to see tasks.</p>
                )}
              </div>
            </div>
          );
        }
        return <p className="text-center text-muted-foreground">No plan generated yet. Please go back.</p>;
      default:
        return null;
    }
  };

  const stepTitles = ["Define Your Plan", "AI Analyzing", "Your Study Plan & Calendar"];
  const stepDescriptions = [
    "Tell us what you want to study, your timeline, and commitment.",
    "Our AI is crafting your optimal schedule.",
    "Review and manage your AI-generated study plan on the calendar."
  ];

  const completedTasksCount = generatedPlan?.tasks.filter(task => task.completed).length || 0;
  const totalTasksCount = generatedPlan?.tasks.length || 0;
  const progressPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
  const canFinishPlan = progressPercentage >= 80 && generatedPlan?.status !== 'completed';

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 md:px-6">
        <Card className="w-full max-w-5xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{stepTitles[currentStep - 1]}</CardTitle>
            <CardDescription className="text-center">{stepDescriptions[currentStep - 1]}</CardDescription>
            <div className="flex justify-center gap-2 pt-3">
              {[1,2,3].map(step => (
                <div key={step}
                     className={`h-1.5 flex-1 rounded-full transition-all duration-300 ease-in-out
                                ${currentStep === step ? 'bg-primary' : (currentStep > step ? 'bg-primary/60' : 'bg-muted')}`}
                ></div>
              ))}
            </div>
          </CardHeader>
          <CardContent className={`space-y-6 min-h-[300px] flex flex-col ${currentStep === 3 ? '' : 'justify-center'}`}>
            {renderStepContent()}
          </CardContent>
          {currentStep === 3 && generatedPlan && generatedPlan.planDetails && (
            <CardFooter className="flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t">
                <Button onClick={() => resetPlannerAndGoToStep1(generatedPlan.status === 'completed')} variant="outline" className="w-full sm:w-auto">
                  <Edit3 className="mr-2 h-4 w-4" />
                  {generatedPlan.status === 'completed' ? "Start New Plan" : "Modify Plan Details"}
                </Button>
                {generatedPlan.status !== 'completed' && (
                    <AdaptiveReplanModal
                        originalScheduleJSON={JSON.stringify(generatedPlan.tasks.map(({id, completed, youtubeSearchQuery, referenceSearchQuery, subTasks, quizScore, quizAttempted, ...rest}) => rest))}
                        planDetails={generatedPlan.planDetails}
                        onReplanSuccess={handleReplanSuccess}
                    />
                )}
                 {canFinishPlan && (
                    <Button onClick={handleMarkPlanAsCompleted} variant="default" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="mr-2 h-4 w-4" /> Mark Plan as Completed
                    </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto sm:ml-auto">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Plan
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your current study plan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeletePlan}>
                        Confirm Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
          )}
        </Card>
      </div>
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
        subjectContext={generatedPlan?.planDetails?.subjects}
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

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative overflow-y-auto", className)}
    {...props}
  >
    {children}
  </div>
));
ScrollArea.displayName = "ScrollArea";

