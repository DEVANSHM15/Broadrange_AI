
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, BookOpen, ShieldQuestion, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Image from "next/image";

const step2Schema = z.object({
  studyLevel: z.string().min(1, "Please select your study level."),
  preferredStudyTime: z.string().min(1, "Please select your preferred study time."),
  securityQuestion: z.string().min(5, "Security question must be at least 5 characters."),
  securityAnswer: z.string().min(3, "Security answer must be at least 3 characters."),
});

type Step2FormData = z.infer<typeof step2Schema>;

const studyTimeOptions = [
  { value: "morning", label: "🌅 Morning (6 AM - 12 PM)" },
  { value: "afternoon", label: "☀️ Afternoon (12 PM - 6 PM)" },
  { value: "evening", label: "🌙 Evening (6 PM - 12 AM)" },
  { value: "flexible", label: "⏰ Flexible" },
];

export default function RegisterStep2Page() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, isLoading: authLoading } = useAuth();

  const form = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: { 
      studyLevel: "", 
      preferredStudyTime: "",
      securityQuestion: "",
      securityAnswer: "",
    }
  });

  useEffect(() => {
    if (currentUser) {
      router.replace('/dashboard');
    }
    if (!sessionStorage.getItem("registrationStep1Data")) {
        toast({ title: "Error", description: "Please complete step 1 first.", variant: "destructive" });
        router.push("/login");
        return;
    }
    const step2DataString = sessionStorage.getItem("registrationStep2Data");
    if (step2DataString) {
        try {
            const step2Data = JSON.parse(step2DataString);
            form.setValue("studyLevel", step2Data.studyLevel || "");
            form.setValue("preferredStudyTime", step2Data.preferredStudyTime || "");
            form.setValue("securityQuestion", step2Data.securityQuestion || "");
            form.setValue("securityAnswer", step2Data.securityAnswer || "");
        } catch (error) {
            console.error("Error parsing step 2 data from session storage:", error);
        }
    }
  }, [currentUser, router, toast, form]);

  const onSubmitStep2 = (data: Step2FormData) => {
    sessionStorage.setItem("registrationStep2Data", JSON.stringify(data));
    router.push("/register/step3");
  };

  const watchedFormValues = form.watch();
  useEffect(() => {
    sessionStorage.setItem("registrationStep2Data", JSON.stringify(watchedFormValues));
  }, [watchedFormValues]);

  if (authLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
   if (currentUser) return null;

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="mx-auto max-w-md w-full">
            <CardHeader className="text-center">
                <Link href="/" className="flex justify-center items-center gap-2 text-2xl font-bold text-primary mb-2">
                    <Image src="https://www.broadrange.ai/images/broadrange-logo.jpg" alt="Broadrange AI Logo" width={93} height={24} className="h-8 w-auto rounded-lg" />
                    <span className="font-bold sm:inline-block">CodeXStudy</span>
                </Link>
                <CardTitle className="text-2xl">Study & Security Setup</CardTitle>
                <CardDescription>
                    Step 2 of 3: Preferences and security.
                </CardDescription>
                <div className="flex justify-center gap-2 pt-2">
                    {[1,2,3].map(step => (
                    <div key={step} className={`h-2 w-8 rounded-full ${step === 2 ? 'bg-primary' : (step < 2 ? 'bg-primary/50' : 'bg-muted')}`}></div>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitStep2)} className="space-y-6">
                        <FormField
                        control={form.control}
                        name="studyLevel"
                        render={({ field }) => (
                            <FormItem>
                            <Label>Study Level</Label>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger className={`${form.formState.errors.studyLevel ? "border-destructive" : ""}`}>
                                    <SelectValue placeholder="Select your study level" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="high-school">High School</SelectItem>
                                <SelectItem value="undergraduate">Undergraduate</SelectItem>
                                <SelectItem value="graduate">Graduate</SelectItem>
                                <SelectItem value="professional">Professional Certification</SelectItem>
                                <SelectItem value="lifelong-learner">Lifelong Learner</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        
                        <FormField
                        control={form.control}
                        name="preferredStudyTime"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                            <Label>Preferred Study Time</Label>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid grid-cols-2 gap-4"
                                >
                                {studyTimeOptions.map((option) => (
                                    <FormItem key={option.value} className="flex items-center space-x-2">
                                    <Label
                                        htmlFor={`time-${option.value}`}
                                        className={`flex items-center justify-center p-3 border rounded-md cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground w-full
                                                    ${field.value === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-input'}`}
                                    >
                                        <FormControl>
                                        <RadioGroupItem value={option.value} id={`time-${option.value}`} className="sr-only" />
                                        </FormControl>
                                        {option.label}
                                    </Label>
                                    </FormItem>
                                ))}
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <FormField
                        control={form.control}
                        name="securityQuestion"
                        render={({ field }) => (
                            <FormItem>
                            <Label htmlFor="securityQuestion">Security Question</Label>
                            <FormControl>
                                <div className="relative">
                                <ShieldQuestion className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="securityQuestion" 
                                    placeholder="e.g., Your first pet's name?" 
                                    {...field} 
                                    className={`pl-10 ${form.formState.errors.securityQuestion ? "border-destructive" : ""}`}
                                />
                                </div>
                            </FormControl>
                            <FormDescription>This will be used for password recovery.</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <FormField
                        control={form.control}
                        name="securityAnswer"
                        render={({ field }) => (
                            <FormItem>
                            <Label htmlFor="securityAnswer">Security Answer</Label>
                            <FormControl>
                                <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="securityAnswer" 
                                    type="password" 
                                    placeholder="Your secret answer" 
                                    {...field} 
                                    className={`pl-10 ${form.formState.errors.securityAnswer ? "border-destructive" : ""}`}
                                />
                                </div>
                            </FormControl>
                             <FormDescription>Keep this answer memorable and secure.</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <div className="flex gap-4 pt-2">
                            <Button 
                                type="button" 
                                variant="outline"
                                className="w-full" 
                                onClick={() => router.push('/login')}
                            >
                                Back
                            </Button>
                            <Button type="submit" className="w-full">Continue to Step 3</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
