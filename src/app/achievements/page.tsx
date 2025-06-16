
"use client";

import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, CheckCircle2, Flame, Brain, Lightbulb, Trophy, Award, HelpCircle, Loader2, ListChecks, Edit, BookOpen, ArchiveIcon, ClockIcon, BarChart3, Mountain } from "lucide-react"; // Added Mountain for potential use
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ScheduleData, ScheduleTask } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseISO, isValid, formatDistanceToNowStrict } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Achievement {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string; // Kept for potential future use (e.g., tooltips)
  achieved: boolean;
  value?: number; // For displaying numbers like "14"
  unit?: string;  // For units like "DAYS"
  // color prop is no longer used for direct styling of the new badge, 
  // but kept in case of future logic that might reference it.
  color?: string; 
}

const sampleAchievements: Achievement[] = [
  { id: "first_plan", title: "Planner Pioneer", description: "Successfully created your first study plan.", icon: PlusCircle, achieved: false },
  { id: "task_initiate", title: "Task Starter", description: "Completed your first task in a study plan.", icon: CheckCircle2, achieved: false },
  { id: "streak_beginner", title: "Study Dabbler", value: 3, unit: "DAYS", description: "Maintained a 3-day study streak.", icon: Flame, achieved: false }, 
  { id: "quiz_taker", title: "Quiz Challenger", description: "Attempted your first AI-generated quiz.", icon: Brain, achieved: false },
  { id: "reflection_reader", title: "Insight Seeker", description: "Viewed your first plan reflection.", icon: Lightbulb, achieved: false},
  { id: "plan_completer", title: "Finisher", description: "Successfully completed a full study plan.", icon: Trophy, achieved: false },
  // Example of how a more advanced streak could be structured:
  // { id: "super_streak", title: "Super Streak", value: 14, unit: "DAYS", description: "Kept a 14-day study habit!", icon: Mountain, achieved: false },
];

// Helper function to ensure tasks have necessary fields, especially after fetching from API
function ensureTaskStructure(tasks: ScheduleTask[] | undefined, planId: string): ScheduleTask[] {
  if (!tasks) return [];
  return tasks.map((task, index) => ({
    ...task,
    id: task.id || `task-${planId}-${index}-${new Date(task.date).getTime()}-${Math.random().toString(36).substring(2,9)}`,
    completed: Boolean(task.completed), // Ensure boolean
    subTasks: task.subTasks || [],
    quizScore: task.quizScore,
    quizAttempted: Boolean(task.quizAttempted), // Ensure boolean
    notes: task.notes || undefined,
  }));
}

interface PlanDisplayCardProps {
  plan: ScheduleData;
  cardType: 'active' | 'completed' | 'archived';
}

const PlanDisplayCard: React.FC<PlanDisplayCardProps> = ({ plan, cardType }) => {
  const completedTasksCount = useMemo(() => plan.tasks.filter(task => task.completed).length, [plan.tasks]);
  const totalTasksCount = useMemo(() => plan.tasks.length, [plan.tasks]);
  const progressPercentage = useMemo(() => totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0, [completedTasksCount, totalTasksCount]);

  let titleIcon = <ListChecks className="text-primary h-6 w-6" />;
  let titleText = "Plan Details";
  let borderColor = "border-primary/50";

  if (cardType === 'completed') {
    titleIcon = <CheckCircle2 className="text-green-500 h-6 w-6" />;
    titleText = "Completed Plan";
    borderColor = "border-green-500/50";
  } else if (cardType === 'archived') {
    titleIcon = <ArchiveIcon className="text-gray-500 h-6 w-6" />;
    titleText = "Archived Plan";
    borderColor = "border-gray-500/50";
  } else if (cardType === 'active') {
     titleIcon = <ClockIcon className="text-blue-500 h-6 w-6" />;
     titleText = "Active Plan";
     borderColor = "border-blue-500/50";
  }


  return (
    <Card className={`shadow-lg ${borderColor}`}>
      <CardHeader>
        <CardTitle className="text-xl flex items-center justify-between">
          <span className="flex items-center gap-2">{titleIcon} {titleText}</span>
          <Badge variant={plan.status === 'completed' ? 'default' : (plan.status === 'active' ? 'secondary' : 'outline')} 
                 className={plan.status === 'completed' ? 'bg-green-600' : (plan.status === 'active' ? 'bg-blue-500 text-white' : '')}>
            {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
          </Badge>
        </CardTitle>
        <CardDescription>
          {plan.planDetails.subjects || "N/A"}
          {plan.status === 'completed' && plan.completionDate && isValid(parseISO(plan.completionDate)) 
            ? ` - Completed on ${new Date(plan.completionDate).toLocaleDateString()}`
            : (plan.updatedAt && isValid(parseISO(plan.updatedAt)) ? ` - Last updated ${formatDistanceToNowStrict(parseISO(plan.updatedAt), { addSuffix: true })}` : ' - Date N/A')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <h4 className="font-medium text-muted-foreground">Duration</h4>
            <p className="font-semibold">{plan.planDetails.studyDurationDays} days</p>
          </div>
          <div>
            <h4 className="font-medium text-muted-foreground">Daily Study</h4>
            <p className="font-semibold">{plan.planDetails.dailyStudyHours} hours</p>
          </div>
        </div>
        {totalTasksCount > 0 && (
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <h4 className="font-medium text-muted-foreground">Progress</h4>
              <span className="text-muted-foreground">{completedTasksCount} / {totalTasksCount} tasks</span>
            </div>
            <Progress value={progressPercentage} className="h-2" indicatorClassName={plan.status === 'completed' ? "bg-green-500" : (plan.status === 'active' ? "bg-blue-500" : "bg-primary")} />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button asChild className="w-full sm:flex-grow" variant="outline">
          <Link href={`/planner?planId=${plan.id}`}> 
            <Edit className="mr-2 h-4 w-4"/>
            {plan.status === 'completed' || plan.status === 'archived' ? "Review Plan Details" : "View or Edit Plan"}
          </Link>
        </Button>
        {cardType === 'completed' && (
          <Button asChild className="w-full sm:flex-grow" variant="default">
            <Link href={`/analytics?planId=${plan.id}`}>
              <BarChart3 className="mr-2 h-4 w-4" /> Analyze Plan
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};


export default function AchievementsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [allStudyPlans, setAllStudyPlans] = useState<ScheduleData[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  const reloadDataFromApi = useCallback(async () => {
    if (!currentUser?.id) {
        setAllStudyPlans([]);
        setIsLoadingPlans(false);
        return;
    }
    setIsLoadingPlans(true);
    try {
        const response = await fetch(`/api/plans?userId=${currentUser.id}`);
        if (!response.ok) {
            let errorMessage = `Failed to fetch plans. Status: ${response.status}`;
            let errorDetailMessage = "";
            try {
              const errorData = await response.json();
              if (errorData.error) {
                errorMessage = String(errorData.error);
                if (errorData.details) {
                  errorDetailMessage = String(errorData.details);
                }
              } else if (response.statusText) {
                errorMessage = `Failed to fetch plans: ${response.statusText} (Status: ${response.status})`;
              }
            } catch (e) {
              // If response.json() fails, use the original statusText if available
              if (response.statusText) {
                 errorMessage = `Failed to fetch plans: ${response.statusText} (Status: ${response.status})`;
              }
            }
            const finalMessage = errorDetailMessage 
                ? `${errorMessage} (Details: ${errorDetailMessage})` 
                : errorMessage;
            throw new Error(finalMessage);
        }
        const loadedPlans: ScheduleData[] = await response.json();
        const processedPlans = loadedPlans.map(p => ({
            ...p,
            tasks: ensureTaskStructure(p.tasks, p.id)
        })).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); 
        setAllStudyPlans(processedPlans);

    } catch (error) {
        console.error("AchievementsPage: Failed to fetch plans:", error);
        toast({ title: "Error Loading Plans", description: (error as Error).message, variant: "destructive" });
        setAllStudyPlans([]);
    } finally {
        setIsLoadingPlans(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    reloadDataFromApi();
    const handleStudyPlanUpdate = () => reloadDataFromApi();
    window.addEventListener('studyPlanUpdated', handleStudyPlanUpdate);
    return () => window.removeEventListener('studyPlanUpdated', handleStudyPlanUpdate);
  }, [reloadDataFromApi]);

  const hasCompletedAnyPlan = useMemo(() => allStudyPlans.some(plan => plan.status === 'completed'), [allStudyPlans]);

  const dynamicAchievements = useMemo(() => {
      // TODO: Implement more sophisticated achievement logic, especially for streaks.
      return sampleAchievements.map(ach => {
        let achieved = false;
        // Basic achievement logic based on current data
        switch (ach.id) {
          case 'first_plan':
            achieved = allStudyPlans.length > 0;
            break;
          case 'task_initiate':
            achieved = allStudyPlans.some(plan => (plan.tasks || []).some(task => task.completed));
            break;
          case 'streak_beginner':
            achieved = false; // Placeholder: Actual streak logic needed here.
            // For demo, let's assume 'Study Dabbler' for 3 days is achieved if any plan has >=3 completed tasks
            // This is a very loose interpretation for demo purposes.
            if (allStudyPlans.some(plan => (plan.tasks || []).filter(t => t.completed).length >= (ach.value || 3) )) {
                 // achieved = true; // Temporarily enable for visual testing if needed.
            }
            break;
          case 'quiz_taker':
            achieved = allStudyPlans.some(plan => (plan.tasks || []).some(task => task.quizAttempted === true));
            break;
          case 'reflection_reader':
            // True if any plan is completed AND the user has likely seen analytics (implicitly by plan being completed)
            achieved = hasCompletedAnyPlan; 
            break;
          case 'plan_completer':
            achieved = hasCompletedAnyPlan;
            break;
          default:
            achieved = ach.achieved; 
        }
        return { ...ach, achieved };
      });
  }, [allStudyPlans, hasCompletedAnyPlan]);

  const activePlans = useMemo(() => allStudyPlans.filter(p => p.status === 'active'), [allStudyPlans]);
  const completedPlans = useMemo(() => allStudyPlans.filter(p => p.status === 'completed'), [allStudyPlans]);
  const archivedPlans = useMemo(() => allStudyPlans.filter(p => p.status === 'archived'), [allStudyPlans]);


  if (isLoadingPlans && allStudyPlans.length === 0) { 
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 md:px-6 space-y-12">
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Award className="h-8 w-8 text-primary" /> Your Achievements
            </h1>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dynamicAchievements.map((ach) => (
              <div
                key={ach.id}
                className={`rounded-xl shadow-lg flex flex-col items-center justify-center text-center p-4 space-y-2 min-h-[14rem] h-full w-full transition-all duration-300 ease-in-out transform hover:shadow-2xl hover:-translate-y-1
                            ${ach.achieved 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-card border border-dashed opacity-75 hover:opacity-100'
                            }`}
                title={ach.description} // Show description on hover
              >
                <div className="relative mt-2 mb-1"> {/* Adjusted margins */}
                  <ach.icon className={`h-16 w-16 ${ach.achieved ? 'text-primary-foreground/90 opacity-90' : 'text-muted-foreground/60'}`} />
                  {ach.value !== undefined && (
                    <span className={`absolute inset-0 flex items-center justify-center text-2xl font-bold pointer-events-none ${ach.achieved ? 'text-primary-foreground' : 'text-card-foreground'}`}>
                      {ach.value}
                    </span>
                  )}
                </div>
                {ach.unit && (
                  <p className={`text-xs uppercase font-semibold tracking-wider ${ach.achieved ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>
                    {ach.unit}
                  </p>
                )}
                <h3 className={`text-lg font-medium ${ach.achieved ? 'text-primary-foreground' : 'text-card-foreground'}`}>
                  {ach.title}
                </h3>
              </div>
            ))}
          </div>
        </section>
        
        <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <h2 className="text-2xl font-semibold">Your Study Plans</h2>
                <Button asChild variant="default" className="mt-3 md:mt-0">
                    <Link href="/planner" className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4"/> Create New Plan
                        <Badge variant="destructive" className="ml-2">NEW!</Badge>
                    </Link>
                </Button>
            </div>

            {isLoadingPlans ? (
                 <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/30 min-h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
            ) : allStudyPlans.length === 0 ? (
                <Alert>
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>No Study Plans Yet</AlertTitle>
                    <AlertDescription>
                        You haven't created any study plans. Click "Create New Plan" to get started!
                    </AlertDescription>
                </Alert>
            ) : (
              <div className="space-y-8">
                {activePlans.length > 0 && (
                  <div>
                    <h3 className="text-xl font-medium mb-4">Active Plans</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {activePlans.map(plan => <PlanDisplayCard key={plan.id} plan={plan} cardType="active" />)}
                    </div>
                  </div>
                )}

                {completedPlans.length > 0 && (
                  <div>
                    <h3 className="text-xl font-medium mb-4">Completed Plans</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {completedPlans.map(plan => <PlanDisplayCard key={plan.id} plan={plan} cardType="completed" />)}
                    </div>
                  </div>
                )}

                {archivedPlans.length > 0 && (
                  <div>
                    <h3 className="text-xl font-medium mb-4">Archived Plans</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {archivedPlans.map(plan => <PlanDisplayCard key={plan.id} plan={plan} cardType="archived" />)}
                    </div>
                  </div>
                )}
                 {(activePlans.length === 0 && completedPlans.length === 0 && archivedPlans.length === 0 && allStudyPlans.length > 0) && (
                    <Alert>
                        <HelpCircle className="h-4 w-4" />
                        <AlertTitle>No Plans in Main Categories</AlertTitle>
                        <AlertDescription>
                            Your existing plans might have an uncategorized status. This is unusual.
                        </AlertDescription>
                    </Alert>
                )}
              </div>
            )}
        </section>
      </div>
    </AppLayout>
  );
}
