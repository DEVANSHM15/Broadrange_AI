"use client";

import type { PlanInput } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const planInputSchema = z.object({
  subjects: z.string().min(1, "Please enter at least one subject."),
  dailyStudyHours: z.coerce
    .number()
    .min(0.5, "Daily study hours must be at least 0.5.")
    .max(24, "Daily study hours cannot exceed 24."),
  studyDurationDays: z.coerce
    .number()
    .int()
    .min(1, "Study duration must be at least 1 day.")
    .max(365, "Study duration cannot exceed 365 days."),
});

interface PlanInputFormProps {
  onSubmit: (data: PlanInput) => Promise<void>;
  isLoading: boolean;
  defaultValues?: Partial<PlanInput>;
}

export function PlanInputForm({ onSubmit, isLoading, defaultValues }: PlanInputFormProps) {
  const form = useForm<PlanInput>({
    resolver: zodResolver(planInputSchema),
    defaultValues: {
      subjects: defaultValues?.subjects || "",
      dailyStudyHours: defaultValues?.dailyStudyHours || 3,
      studyDurationDays: defaultValues?.studyDurationDays || 30,
    },
  });

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-center">Create Your Study Plan</CardTitle>
        <CardDescription className="text-center">
          Tell us about your study goals, and we'll generate a personalized plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subjects"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subjects</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Math, Physics, History" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter the subjects you want to study, separated by commas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dailyStudyHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Study Hours</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" placeholder="e.g., 3" {...field} />
                  </FormControl>
                  <FormDescription>
                    How many hours can you study per day?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="studyDurationDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Study Duration (Days)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 30" {...field} />
                  </FormControl>
                  <FormDescription>
                    For how many days do you want to study?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                "Generate Plan"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
