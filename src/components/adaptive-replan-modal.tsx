
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Edit3 } from "lucide-react";
import { useState, useEffect } from "react"; // Added useEffect
import { useToast } from "@/hooks/use-toast";
import { adaptiveRePlanning, type AdaptiveRePlanningInput, type AdaptiveRePlanningOutput } from "@/ai/flows/adaptive-re-planning";
import type { PlanInput } from "@/types";

const replanSchema = z.object({
  skippedDays: z.coerce.number().int().min(0, "Skipped days cannot be negative."),
  remainingDaysForNewPlan: z.coerce
    .number()
    .int()
    .min(1, "Remaining days must be at least 1."),
});

type ReplanFormData = z.infer<typeof replanSchema>;

interface AdaptiveReplanModalProps {
  originalScheduleJSON: string; // The stringified JSON of the current schedule
  planDetails: PlanInput;
  onReplanSuccess: (revisedSchedule: AdaptiveRePlanningOutput, newDurationDays: number) => void;
}

export function AdaptiveReplanModal({
  originalScheduleJSON,
  planDetails,
  onReplanSuccess,
}: AdaptiveReplanModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ReplanFormData>({
    resolver: zodResolver(replanSchema),
    defaultValues: {
      skippedDays: 0,
      remainingDaysForNewPlan: planDetails.studyDurationDays,
    },
  });

  // useEffect to sync form default if planDetails.studyDurationDays changes externally
  // or when modal is opened.
  useEffect(() => {
    if (isOpen) {
      // When modal opens, ensure the form reflects the current plan's duration.
      form.reset({
        skippedDays: 0, // Reset skipped days when opening
        remainingDaysForNewPlan: planDetails.studyDurationDays,
      });
    } else {
      // If modal is closed and the external plan duration has changed since last form value
      if (form.getValues("remainingDaysForNewPlan") !== planDetails.studyDurationDays) {
        form.reset({
          skippedDays: 0, // Keep skippedDays at 0 if synced when closed
          remainingDaysForNewPlan: planDetails.studyDurationDays,
        });
      }
    }
  }, [isOpen, planDetails.studyDurationDays, form]);


  const handleSubmit = async (data: ReplanFormData) => {
    setIsLoading(true);
    try {
      let tasks = [];
      try {
        tasks = JSON.parse(originalScheduleJSON);
        if (!Array.isArray(tasks)) {
          throw new Error("Parsed schedule is not an array.");
        }
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Schedule Data Error",
          description: "Could not read the original schedule to create a new plan.",
        });
        setIsLoading(false);
        return;
      }

      const input: AdaptiveRePlanningInput = {
        tasks: tasks,
        skippedDays: data.skippedDays,
        remainingDays: data.remainingDaysForNewPlan,
        subjects: planDetails.subjects,
        dailyStudyHours: planDetails.dailyStudyHours,
      };
      
      const result = await adaptiveRePlanning(input);
      
      if (result && result.revisedSchedule) {
        onReplanSuccess(result, data.remainingDaysForNewPlan);
        toast({
          title: "Plan Revised Successfully!",
          description: result.summary || "Your study plan has been updated.",
        });
        setIsOpen(false);
      } else {
        throw new Error("AI did not return a revised schedule.");
      }
    } catch (error) {
      console.error("Adaptive re-planning error:", error);
      toast({
        variant: "destructive",
        title: "Re-planning Failed",
        description: error instanceof Error ? error.message : "Could not revise the plan. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Edit3 className="mr-2 h-4 w-4" />
          Re-plan Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adaptive Re-planning</DialogTitle>
          <DialogDescription>
            Adjust your study plan based on missed days or changes in your schedule. Current plan duration: {planDetails.studyDurationDays} days.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="skippedDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Days Skipped</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remainingDaysForNewPlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Total Duration (Days)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Revising...
                  </>
                ) : (
                  "Revise Plan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
