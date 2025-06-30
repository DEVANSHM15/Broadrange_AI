
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
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
        router.push("/register");
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
    <div className="w-full lg:grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 animate-in fade-in-0 slide-in-from-left-2 duration-1000">
        <div className="mx-auto grid w-[400px] max-w-full gap-6 px-4">
          <div className="grid gap-2 text-center">
            <Link href="/" className="flex justify-center items-center gap-2 mb-4 text-2xl font-semibold text-primary">
              <Image src="https://www.broadrange.ai/images/broadrange-logo.jpg" alt="Broadrange AI Logo" width={108} height={32} className="h-8 w-auto rounded-lg"/>
              <span>CodeXStudy</span>
            </Link>
            <h1 className="text-3xl font-bold">Study & Security Setup</h1>
            <p className="text-balance text-muted-foreground">
              Step 2 of 3: Preferences and security for password recovery.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              {[1,2,3].map(step => (
                <div key={step} className={`h-2 w-8 rounded-full ${step === 2 ? 'bg-primary' : (step < 2 ? 'bg-primary/50' : 'bg-muted')}`}></div>
              ))}
            </div>
          </div>
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
                      <Input 
                        id="securityQuestion" 
                        placeholder="e.g., What is your mother's maiden name?" 
                        {...field} 
                        className={`${form.formState.errors.securityQuestion ? "border-destructive" : ""}`}
                      />
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
                      <Input 
                        id="securityAnswer" 
                        type="password" 
                        placeholder="Your secret answer" 
                        {...field} 
                        className={`${form.formState.errors.securityAnswer ? "border-destructive" : ""}`}
                      />
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
                  onClick={() => router.push('/register')}
                >
                  Back
                </Button>
                <Button type="submit" className="w-full">Continue to Step 3</Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
      <div className="hidden bg-muted lg:block animate-in fade-in-0 duration-1000">
        <Image
          src="data:image/jpeg;base64,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j/qFfc1vSSiXwuIAF26tmX9dBmT9pRKlSq/jKSL8QeBl+InOcHTyoE+bJpHvNJjTPxWbehebiUdQtGTPKX9Ix5S/pGRaeIVmZAe0trixG8A6E7943bplm9KL2M92S6a1mF1FQjmASPGejQrnTJU91vqlm2Zi0emuUgWABHEWHKS845iefLqmnbCjQqSa1KOmzKg3UWHqQ/VPXkFX5p/dP1S7ZxzEZxzEe3S4HYXJQauHysCykMAQLixAYgnfwJUeAiWbpKyGmLkZ7jLz7/Zb90rM2UancjisUTjhdjmP3Ytg3VMag1FqdX1HzGPqPZ9qygdE9qeS4zDYi9glRS36hOV/wBktP0LtDBJXpVKNQXR1Kn1Ebx3jf7J+cNr7PfD1qlB/OpsVPfyI7iLH2zD1dPDPEt/U0UZXVj9b3krAYfMbnzR8TND9zWv5Xs7CV2a/wAmEbmXpXpsT6yl/bLmqgCw3SudXKyJRhnmfYiJnLRERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQD/2Q=="
          alt="Abstract background image representing studying or learning"
          width="1080"
          height="1920"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
