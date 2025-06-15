
"use client";
import * as React from 'react';
import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import AppLayout from "@/components/AppLayout";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, Trash2, Edit3, CalendarIcon as CalendarDaysIcon, Search, ChevronLeft, ChevronRight, ListTree, FileQuestion, PlusCircle, Info } from 'lucide-react';
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
import { format, parseISO, addDays, subDays, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, isValid } from 'date-fns';
import { cn } from "@/lib/utils";
import { TaskBreakdownModal } from '@/components/task-breakdown-modal';
import { AdaptiveReplanModal } from '@/components/adaptive-replan-modal';
import { LogScorePopover } from '@/components/log-score-popover';
import { QuizModal } from '@/components/quiz-modal';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


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
          date: item.date, // Ensure date is correctly formatted from source
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
    console.warn("[PlannerPage ParseTasks] Schedule string did not parse into expected array of objects. Returning existing tasks or empty array.");
    return existingTasks || [];
  } catch (error) {
    console.warn("[PlannerPage ParseTasks] Failed to parse schedule string:", error, "String was:", scheduleString.substring(0,100));
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
  const [currentStep, setCurrentStep] = useState(1); // 1: Input, 2: Analyzing, 3: Display/Manage
  const { toast } = useToast();

  const [plannerFormInput, setPlannerFormInput] = useState<PlanInput>(initialPlannerData);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activePlan, setActivePlan] = useState<ScheduleData | null>(null);
  const plannerStorageKey = getPlannerStorageKey(currentUser?.email);

  const [calendarSelectedDateForDisplay, setCalendarSelectedDateForDisplay] = useState<Date | undefined>(new Date());
  const [calendarDisplayMonth, setCalendarDisplayMonth] = useState(new Date());
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [selectedTaskForBreakdown, setSelectedTaskForBreakdown] = useState<ScheduleTask | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [selectedTaskForQuiz, setSelectedTaskForQuiz] = useState<ScheduleTask | null>(null);

  // Load plans from localStorage
  useEffect(() => {
    let isMounted = true;
    if (typeof window !== "undefined" && currentUser?.email) {
      const savedPlansJson = localStorage.getItem(plannerStorageKey);
      let currentActivePlan: ScheduleData | null = null;
      if (savedPlansJson) {
        try {
          const allPlans: ScheduleData[] = JSON.parse(savedPlansJson);
          if (Array.isArray(allPlans) && allPlans.length > 0) {
            // Find the most recent 'active' plan, or if none, the most recent 'completed' plan
            const activePlans = allPlans.filter(p => p.status === 'active').sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            if (activePlans.length > 0) {
              currentActivePlan = activePlans[0];
            } else {
              const completedPlans = allPlans.filter(p => p.status === 'completed').sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
              if (completedPlans.length > 0) currentActivePlan = completedPlans[0];
            }
            // If still no plan, take the most recently updated one regardless of status
            if (!currentActivePlan) {
                currentActivePlan = allPlans.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
            }
          }
        } catch (error) {
          console.error("[PlannerPage Load] Failed to parse plans array:", error);
          localStorage.removeItem(plannerStorageKey); // Clear corrupted data
        }
      }

      if (isMounted) {
        if (currentActivePlan) {
          setActivePlan(currentActivePlan);
          setPlannerFormInput(currentActivePlan.planDetails);
           const startDate = currentActivePlan.planDetails.startDate ? parseISO(currentActivePlan.planDetails.startDate) : new Date();
           if (isValid(startDate)) {
            setSelectedCalendarDate(startDate);
            setCalendarSelectedDateForDisplay(startDate);
            setCalendarDisplayMonth(startDate);
          } else {
             const today = new Date();
             setSelectedCalendarDate(today);
             setCalendarSelectedDateForDisplay(today);
             setCalendarDisplayMonth(today);
          }
          setCurrentStep(3);
        } else {
          setActivePlan(null);
          setPlannerFormInput(initialPlannerData);
          setSelectedCalendarDate(undefined);
          setCalendarSelectedDateForDisplay(new Date());
          setCalendarDisplayMonth(new Date());
          setCurrentStep(1);
        }
      }
    }
    return () => { isMounted = false; };
  }, [plannerStorageKey, currentUser]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setPlannerFormInput(prev => ({
      ...prev,
      [id]: (id === 'studyDurationDays' || id === 'dailyStudyHours') ? parseFloat(value) || 0 : value
    }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedCalendarDate(date);
    setPlannerFormInput(prev => ({
      ...prev,
      startDate: date ? format(date, 'yyyy-MM-dd') : undefined,
    }));
  };

  const handleSelectChange = (id: string, value: string) => {
     if (id === 'dailyStudyHours') {
      setPlannerFormInput(prev => ({ ...prev, dailyStudyHours: parseFloat(value) }));
    }
  };

  const validateInputs = (): { valid: boolean; field?: keyof PlanInput; message: string } => {
    if (!plannerFormInput.subjects.trim()) {
      return { valid: false, field: "subjects", message: "Please enter the subjects you want to study." };
    }
    if (plannerFormInput.studyDurationDays <= 0) {
      return { valid: false, field: "studyDurationDays", message: "Study duration must be at least 1 day." };
    }
    if (plannerFormInput.dailyStudyHours <= 0) {
      return { valid: false, field: "dailyStudyHours", message: "Daily study hours must be positive." };
    }
    if (!plannerFormInput.startDate) {
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
        subjects: plannerFormInput.subjects,
        dailyStudyHours: plannerFormInput.dailyStudyHours,
        studyDurationDays: plannerFormInput.studyDurationDays,
        subjectDetails: plannerFormInput.subjectDetails || undefined,
        startDate: plannerFormInput.startDate,
      };

      const result: GenerateStudyScheduleOutput = await generateStudySchedule(aiInput);

      if (result && result.schedule) {
        const now = new Date().toISOString();
        const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(2,9)}`;
        const newPlan: ScheduleData = {
          id: planId,
          createdAt: now,
          updatedAt: now,
          scheduleString: result.schedule,
          tasks: parseTasksFromString(result.schedule, planId, []),
          planDetails: { ...plannerFormInput },
          status: 'active',
        };
        
        let allPlans: ScheduleData[] = [];
        const savedPlansJson = localStorage.getItem(plannerStorageKey);
        if (savedPlansJson) {
            try { allPlans = JSON.parse(savedPlansJson); } catch { /* ignore parse error, start fresh */ }
        }
        // Mark other active plans as archived or handle as per desired logic
        allPlans = allPlans.map(p => p.status === 'active' ? {...p, status: 'archived', updatedAt: now } : p);
        allPlans.push(newPlan);

        localStorage.setItem(plannerStorageKey, JSON.stringify(allPlans));
        setActivePlan(newPlan);
        window.dispatchEvent(new CustomEvent('studyPlanUpdated'));
        
        const sDate = newPlan.planDetails.startDate ? parseISO(newPlan.planDetails.startDate) : new Date();
        if(isValid(sDate)) {
            setCalendarSelectedDateForDisplay(sDate);
            setCalendarDisplayMonth(sDate);
        } else {
            const today = new Date();
            setCalendarSelectedDateForDisplay(today);
            setCalendarDisplayMonth(today);
        }

        toast({ title: "Study Plan Generated!", description: "Your new study plan is ready.", variant: "default", action: <CheckCircle className="text-green-500"/> });
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
       // ... (rest of error handling)
      toast({ title: "Planning Failed", description: description, variant: "destructive" });
      setCurrentStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProgressUpdate = (updatedTasks: ScheduleTask[]) => {
    if (activePlan) {
      const now = new Date().toISOString();
      const updatedActivePlan = { ...activePlan, tasks: updatedTasks, updatedAt: now };
      setActivePlan(updatedActivePlan);
      
      const allPlansJson = localStorage.getItem(plannerStorageKey);
      if (allPlansJson) {
        try {
          let allPlans: ScheduleData[] = JSON.parse(allPlansJson);
          const planIndex = allPlans.findIndex(p => p.id === activePlan.id);
          if (planIndex !== -1) {
            allPlans[planIndex] = updatedActivePlan;
            localStorage.setItem(plannerStorageKey, JSON.stringify(allPlans));
            window.dispatchEvent(new CustomEvent('studyPlanUpdated'));
          }
        } catch (e) { console.error("Error updating progress in localStorage", e); }
      }
    }
  };
  
  const handleSaveQuizScore = (taskId: string, score: number | undefined, attempted: boolean) => {
    if (activePlan && activePlan.tasks) {
      const updatedTasks = activePlan.tasks.map(t =>
        t.id === taskId ? { ...t, quizScore: score, quizAttempted: attempted } : t
      );
      handleProgressUpdate(updatedTasks);
    }
  };

  const handleReplanSuccess = (revisedData: AdaptiveRePlanningOutput, newDurationDays: number) => {
    if (activePlan && activePlan.planDetails) {
      const now = new Date().toISOString();
      const updatedPlanDetails: PlanInput = {
        ...activePlan.planDetails,
        studyDurationDays: newDurationDays,
      };
      const revisedTasks = parseTasksFromString(revisedData.revisedSchedule, activePlan.id, activePlan.tasks); // Pass existing tasks for potential ID reuse
      const replannedActivePlan: ScheduleData = {
        ...activePlan,
        scheduleString: revisedData.revisedSchedule,
        tasks: revisedTasks,
        planDetails: updatedPlanDetails,
        updatedAt: now,
        status: 'active', // Ensure it's active
      };
      setActivePlan(replannedActivePlan);
      setPlannerFormInput(updatedPlanDetails); 
      
      const allPlansJson = localStorage.getItem(plannerStorageKey);
      if (allPlansJson) {
          try {
              let allPlans: ScheduleData[] = JSON.parse(allPlansJson);
              const planIndex = allPlans.findIndex(p => p.id === activePlan.id);
              if (planIndex !== -1) {
                  allPlans[planIndex] = replannedActivePlan;
                  localStorage.setItem(plannerStorageKey, JSON.stringify(allPlans));
                  window.dispatchEvent(new CustomEvent('studyPlanUpdated'));
                  toast({ title: "Plan Revised", description: revisedData.summary || "Your study plan has been updated." });
              } else {
                  toast({ title: "Error", description: "Could not find the plan to update after replan.", variant: "destructive" });
              }
          } catch (e) { console.error("Error saving replanned data to localStorage", e); }
      }
    }
  };

  const startNewPlanCreation = () => {
    setActivePlan(null);
    setPlannerFormInput(initialPlannerData);
    setSelectedCalendarDate(undefined);
    setCalendarSelectedDateForDisplay(new Date());
    setCalendarDisplayMonth(new Date());
    setCurrentStep(1);
  };

  const handleDeletePlan = () => {
    if (!activePlan) return;
    const allPlansJson = localStorage.getItem(plannerStorageKey);
    if (allPlansJson) {
        try {
            let allPlans: ScheduleData[] = JSON.parse(allPlansJson);
            allPlans = allPlans.filter(p => p.id !== activePlan.id);
            localStorage.setItem(plannerStorageKey, JSON.stringify(allPlans));
            window.dispatchEvent(new CustomEvent('studyPlanUpdated'));
            toast({ title: "Plan Deleted", description: "The study plan has been removed.", variant: "default" });
            startNewPlanCreation(); // Go to create new plan screen
        } catch (e) { console.error("Error deleting plan from localStorage", e); }
    }
  };

  const handleMarkPlanAsCompleted = () => {
    if (activePlan) {
      const now = new Date().toISOString();
      const completedPlan: ScheduleData = {
        ...activePlan,
        status: 'completed',
        completionDate: now,
        updatedAt: now,
      };
      setActivePlan(completedPlan);
      
      const allPlansJson = localStorage.getItem(plannerStorageKey);
       if (allPlansJson) {
          try {
            let allPlans: ScheduleData[] = JSON.parse(allPlansJson);
            const planIndex = allPlans.findIndex(p => p.id === activePlan.id);
            if (planIndex !== -1) {
                allPlans[planIndex] = completedPlan;
                localStorage.setItem(plannerStorageKey, JSON.stringify(allPlans));
                window.dispatchEvent(new CustomEvent('studyPlanUpdated'));
                toast({ title: "Plan Marked as Completed!", description: "Congratulations!", variant: "default" });
            }
          } catch (e) { console.error("Error marking plan complete in localStorage", e); }
      }
    }
  };
  
  const getTasksForDate = (date: Date | undefined): ScheduleTask[] => {
    if (!date || !activePlan || !activePlan.tasks) return [];
    const dateString = format(date, 'yyyy-MM-dd');
    return activePlan.tasks.filter(task => {
        try {
            return format(parseISO(task.date), 'yyyy-MM-dd') === dateString;
        } catch (e) {
            console.warn(`Error parsing task.date "${task.date}" for task ID ${task.id}`, e);
            return false;
        }
    });
  };

  const handleCalendarTaskToggle = (taskId: string) => {
    if (!activePlan || activePlan.status === 'completed' || activePlan.status === 'archived' || !activePlan.tasks) {
      toast({ title: "Action Restricted", description: "Cannot modify tasks for a completed/archived plan or if no plan is active.", variant: "default" });
      return;
    }
    const updatedTasks = activePlan.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task );
    handleProgressUpdate(updatedTasks); // This will save to localStorage and update state
    const changedTask = updatedTasks.find(t => t.id === taskId);
    toast({ title: `Task ${changedTask?.completed ? 'Completed' : 'Marked Incomplete'}`, description: `"${changedTask?.task.substring(0,30)}..." status updated.`, variant: "default" });
  };

  const handleOpenBreakdownModal = (task: ScheduleTask) => {
    setSelectedTaskForBreakdown(task);
    setIsBreakdownModalOpen(true);
  };

  const handleSaveSubTasks = (updatedTaskFromModal: ScheduleTask) => {
    if (!activePlan || !activePlan.tasks) return;
    const updatedGlobalTasks = activePlan.tasks.map(t => t.id === updatedTaskFromModal.id ? updatedTaskFromModal : t );
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
      case 1: // Input Form
        return (
          <>
            <div className="space-y-1">
              <Label htmlFor="subjects">Subjects & Priority</Label>
              <Input type="text" id="subjects" placeholder="e.g., Math (1), Physics (2), History (3)" value={plannerFormInput.subjects} onChange={handleInputChange} />
               <p className="text-xs text-muted-foreground">Enter subjects, add priority in ( ) - lower is higher. Ex: Chem (1), Bio (2).</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !selectedCalendarDate && "text-muted-foreground")}>
                    <CalendarDaysIcon className="mr-2 h-4 w-4" />
                    {selectedCalendarDate && isValid(selectedCalendarDate) ? format(selectedCalendarDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <ShadCalendar mode="single" selected={selectedCalendarDate} onSelect={handleDateSelect} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label htmlFor="subjectDetails">Subject Details (Optional)</Label>
              <Textarea id="subjectDetails" placeholder="e.g., Math: Algebra chapters 1-3. Physics: Kinematics." value={plannerFormInput.subjectDetails || ""} onChange={handleInputChange} rows={3} />
               <p className="text-xs text-muted-foreground">Provide specific topics or chapters for more detailed planning.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="studyDurationDays">Study Duration (Days)</Label>
              <Input type="number" id="studyDurationDays" value={plannerFormInput.studyDurationDays} onChange={handleInputChange} min="1" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dailyStudyHours">Daily Study Hours</Label>
              <Select value={String(plannerFormInput.dailyStudyHours)} onValueChange={(value) => handleSelectChange('dailyStudyHours', value)}>
                  <SelectTrigger id="dailyStudyHours"><SelectValue placeholder="Select hours" /></SelectTrigger>
                  <SelectContent>
                      {[1,1.5,2,2.5,3,3.5,4,4.5,5,6,7,8].map(h => <SelectItem key={h} value={String(h)}>{h} hour{h > 1 ? 's' : ''}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            <Button onClick={startAnalysisAndGeneratePlan} className="w-full" disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Generate New Plan
            </Button>
             {activePlan && (
                <Button onClick={() => {
                    if (activePlan) {
                        setPlannerFormInput(activePlan.planDetails);
                        const sDate = activePlan.planDetails.startDate ? parseISO(activePlan.planDetails.startDate) : new Date();
                        if(isValid(sDate)){
                            setSelectedCalendarDate(sDate);
                            setCalendarSelectedDateForDisplay(sDate);
                            setCalendarDisplayMonth(sDate);
                        }
                        setCurrentStep(3); // Go back to viewing the current plan
                    }
                }} variant="outline" className="w-full">
                    Cancel & View Current Plan
                </Button>
            )}
          </>
        );
      case 2: // Analyzing
        return (
          <div className="text-center py-10">
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" />
            <h3 className="text-xl font-semibold mb-2">AI Analysis in Progress...</h3>
            <p className="text-muted-foreground">Our AI agents are crafting your personalized study plan. This might take a moment.</p>
          </div>
        );
      case 3: // Display/Manage Plan
        if (!activePlan || !activePlan.planDetails) {
           return (
             <div className="text-center py-10">
               <Info className="h-12 w-12 text-primary mx-auto mb-4" />
               <h3 className="text-xl font-semibold mb-2">No Active Plan</h3>
               <p className="text-muted-foreground mb-4">You don't have an active study plan right now.</p>
               <Button onClick={startNewPlanCreation}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Create a New Study Plan
               </Button>
             </div>
           );
        }
            const tasksForSelectedDate = getTasksForDate(calendarSelectedDateForDisplay);
            let planStartDate: Date | null = null;
            let planEndDate: Date | null = null;

            if (activePlan.tasks.length > 0) {
                const firstTaskDate = parseISO(activePlan.tasks[0].date);
                const lastTaskDate = parseISO(activePlan.tasks[activePlan.tasks.length - 1].date);
                if (isValid(firstTaskDate)) planStartDate = firstTaskDate;
                if (isValid(lastTaskDate)) planEndDate = lastTaskDate;
            }
             if (!planStartDate) planStartDate = new Date(); // Fallback
             if (!planEndDate) planEndDate = addDays(planStartDate, activePlan.planDetails.studyDurationDays || 30); // Fallback


          return (
            <div className="flex flex-col md:flex-row gap-6 -mx-6 -my-6 p-6 bg-muted/20 rounded-b-lg">
              <div className="md:w-[340px] flex-shrink-0 bg-card p-4 rounded-lg shadow">
                <div className="flex items-center justify-between mb-3">
                    <Button variant="outline" size="icon" onClick={() => setCalendarDisplayMonth(subMonths(calendarDisplayMonth, 1))} aria-label="Previous month">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold text-center">
                        {isValid(calendarDisplayMonth) ? format(calendarDisplayMonth, 'MMMM yyyy') : "Invalid Date"}
                    </h2>
                    <Button variant="outline" size="icon" onClick={() => setCalendarDisplayMonth(addMonths(calendarDisplayMonth, 1))} aria-label="Next month">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <ShadCalendar
                  mode="single"
                  selected={calendarSelectedDateForDisplay}
                  onSelect={(date) => {
                    setCalendarSelectedDateForDisplay(date);
                    if(date && isValid(date)) setCalendarDisplayMonth(date);
                  }}
                  month={calendarDisplayMonth}
                  onMonthChange={setCalendarDisplayMonth}
                  className="rounded-md border-0 shadow-none p-0"
                  disabled={date => (planStartDate && date < startOfWeek(planStartDate)) || (planEndDate && date > endOfWeek(planEndDate))}
                  components={{
                    DayContent: ({ date, activeModifiers }) => {
                      const tasksOnDay = getTasksForDate(date);
                      const isSelected = activeModifiers.selected;
                      const isToday = activeModifiers.today;
                      const isCurrentDisplayMonth = isValid(date) && isValid(calendarDisplayMonth) && isSameMonth(date, calendarDisplayMonth);
                      return (
                        <div className={`relative h-full w-full flex flex-col items-center justify-center ${!isCurrentDisplayMonth ? 'text-muted-foreground/50' : ''}`}>
                          <span>{isValid(date) ? format(date, "d") : "X"}</span>
                          {tasksOnDay.length > 0 && (
                            <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${isSelected || isToday ? 'bg-primary-foreground dark:bg-primary' : 'bg-primary dark:bg-primary-foreground'}`}></div>
                          )}
                        </div>
                      );
                    },
                  }}
                />
                <Button onClick={startNewPlanCreation} variant="outline" className="w-full mt-4">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Plan
                </Button>
              </div>

              <div className="flex-grow bg-card p-4 rounded-lg shadow min-h-[400px]">
                {calendarSelectedDateForDisplay && isValid(calendarSelectedDateForDisplay) ? (
                    <>
                        <h3 className="text-xl font-semibold mb-1">
                            {format(calendarSelectedDateForDisplay, 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Day {activePlan.tasks.findIndex(t => { try { return format(parseISO(t.date), 'yyyy-MM-dd') === format(calendarSelectedDateForDisplay, 'yyyy-MM-dd'); } catch { return false; } }) + 1} of {activePlan.planDetails.studyDurationDays}
                             {activePlan.status === 'completed' ? <span className="ml-2 text-green-600 font-semibold">(Completed)</span> : activePlan.status === 'archived' ? <span className="ml-2 text-gray-500 font-semibold">(Archived)</span> : ''}
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
                                    disabled={activePlan?.status === 'completed' || activePlan?.status === 'archived'}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <Label htmlFor={`task-cal-${task.id}`} id={`task-cal-label-${task.id}`} className={`font-medium ${(activePlan?.status === 'completed' || activePlan?.status === 'archived') ? 'cursor-default' : 'cursor-pointer'}`}>
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
                                      {(activePlan?.status !== 'completed' && activePlan?.status !== 'archived') && (
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
                                            disabled={activePlan?.status === 'completed' || activePlan?.status === 'archived'}
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
      default:
        return null;
    }
  };

  const stepTitles = ["Define Your Plan", "AI Analyzing", "Your Study Plan & Calendar"];
  const stepDescriptions = [
    "Tell us what you want to study, your timeline, and commitment.",
    "Our AI is crafting your optimal schedule.",
    activePlan?.status === 'completed' ? "This plan is completed. Review it or create a new one." : activePlan?.status === 'archived' ? "This plan is archived. Review it or create a new one." : "Review and manage your AI-generated study plan on the calendar."
  ];

  const completedTasksCount = activePlan?.tasks.filter(task => task.completed).length || 0;
  const totalTasksCount = activePlan?.tasks.length || 0;
  const progressPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
  const canFinishPlan = activePlan?.status === 'active' && progressPercentage >= 80;


  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 md:px-6">
        <Card className="w-full max-w-5xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{stepTitles[currentStep - 1]}</CardTitle>
            <CardDescription className="text-center">{stepDescriptions[currentStep - 1]}</CardDescription>
             {currentStep !==2 && (
                <div className="flex justify-center gap-2 pt-3">
                {[1,3].map(stepIndicator => ( // Only show step 1 and 3 indicators visually
                    <div key={stepIndicator}
                        className={`h-1.5 w-16 rounded-full transition-all duration-300 ease-in-out
                                    ${(currentStep === 1 && stepIndicator === 1) || (currentStep === 3 && stepIndicator === 3) ? 'bg-primary' : 'bg-muted'}`}
                    ></div>
                ))}
                </div>
            )}
          </CardHeader>
          <CardContent className={`space-y-6 min-h-[300px] flex flex-col ${currentStep === 3 ? '' : 'justify-center'}`}>
            {renderStepContent()}
          </CardContent>
          {currentStep === 3 && activePlan && activePlan.planDetails && (
            <CardFooter className="flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t">
                 <Button onClick={() => {
                    setPlannerFormInput(activePlan.planDetails); // Load current plan details into form
                    setSelectedCalendarDate(activePlan.planDetails.startDate ? parseISO(activePlan.planDetails.startDate) : undefined);
                    setCurrentStep(1); // Go to edit mode (step 1)
                 }} variant="outline" className="w-full sm:w-auto" disabled={activePlan.status === 'completed' || activePlan.status === 'archived'}>
                  <Edit3 className="mr-2 h-4 w-4" /> Modify Plan Details
                </Button>

                {(activePlan.status === 'active') && (
                    <AdaptiveReplanModal
                        originalScheduleJSON={JSON.stringify(activePlan.tasks.map(({id, completed, youtubeSearchQuery, referenceSearchQuery, subTasks, quizScore, quizAttempted, ...rest}) => rest))}
                        planDetails={activePlan.planDetails}
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
                      <Trash2 className="mr-2 h-4 w-4" /> Delete This Plan
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the plan titled "{activePlan.planDetails.subjects.substring(0,30)}...".
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
        subjectContext={activePlan?.planDetails?.subjects}
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

