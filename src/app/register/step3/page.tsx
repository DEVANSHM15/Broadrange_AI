
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, type RegisterData } from "@/contexts/auth-context";
import { Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form"; 
import Image from "next/image";

const step3Schema = z.object({
  plannerBotEnabled: z.boolean().default(true),
  reflectionAiEnabled: z.boolean().default(true),
  adaptiveAiEnabled: z.boolean().default(true),
});

type Step3FormData = z.infer<typeof step3Schema>;

export default function RegisterStep3Page() {
  const router = useRouter();
  const { toast } = useToast();
  const { register: registerUser, isLoading: authLoading, currentUser } = useAuth();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const form = useForm<Step3FormData>({ 
    resolver: zodResolver(step3Schema),
    defaultValues: {
      plannerBotEnabled: true,
      reflectionAiEnabled: true,
      adaptiveAiEnabled: true,
    }
  });

  useEffect(() => {
    if (currentUser) {
      router.replace('/dashboard');
    }
    if (!sessionStorage.getItem("registrationStep1Data") || !sessionStorage.getItem("registrationStep2Data")) {
        toast({ title: "Error", description: "Please complete previous steps first.", variant: "destructive" });
        router.push("/register");
        return;
    }
    const step3DataString = sessionStorage.getItem("registrationStep3Data");
    if (step3DataString) {
        const step3Data = JSON.parse(step3DataString);
        form.setValue("plannerBotEnabled", step3Data.plannerBotEnabled ?? true);
        form.setValue("reflectionAiEnabled", step3Data.reflectionAiEnabled ?? true);
        form.setValue("adaptiveAiEnabled", step3Data.adaptiveAiEnabled ?? true);
    }
  }, [currentUser, router, toast, form]);

  const onFinalSubmit = async (dataStep3: Step3FormData) => {
    setIsSubmittingForm(true);
    const step1DataString = sessionStorage.getItem("registrationStep1Data");
    const step2DataString = sessionStorage.getItem("registrationStep2Data");

    if (!step1DataString || !step2DataString) {
      toast({ title: "Error", description: "Registration data missing. Please start over.", variant: "destructive" });
      router.push("/register");
      setIsSubmittingForm(false);
      return;
    }

    try {
      const step1Data = JSON.parse(step1DataString);
      const step2Data = JSON.parse(step2DataString);

      const finalRegistrationData: RegisterData = {
        name: step1Data.name,
        email: step1Data.email,
        password_unsafe: step1Data.password,
        studyLevel: step2Data.studyLevel,
        preferredStudyTime: step2Data.preferredStudyTime,
        securityQuestion: step2Data.securityQuestion,
        securityAnswer: step2Data.securityAnswer,
        aiSettings: {
          plannerBotEnabled: dataStep3.plannerBotEnabled,
          reflectionAiEnabled: dataStep3.reflectionAiEnabled,
          adaptiveAiEnabled: dataStep3.adaptiveAiEnabled,
        }
      };
      
      const result = await registerUser(finalRegistrationData);

      if (result.success) {
        toast({
          title: "Registration Successful!",
          description: "Welcome to CodeXStudy! Your study assistant is ready.",
          action: <CheckCircle className="text-green-500" />
        });
        sessionStorage.removeItem("registrationStep1Data");
        sessionStorage.removeItem("registrationStep2Data");
        sessionStorage.removeItem("registrationStep3Data");
        // Router push to dashboard is handled by useEffect watching currentUser
      } else {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: result.message || "An unexpected error occurred.",
        });
      }
    } catch (error) {
      console.error("Registration finalization error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to finalize registration." });
    } finally {
      setIsSubmittingForm(false);
    }
  };
  
  const watchedFormValues = form.watch(); 
  useEffect(() => {
    sessionStorage.setItem("registrationStep3Data", JSON.stringify(watchedFormValues));
  }, [watchedFormValues]);


  if (authLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
   if (currentUser) return null;

  const agentSettingsFields = [
    { name: "plannerBotEnabled", emoji: "🤖", title: "PlannerBot", desc: "Creates and optimizes study schedules" },
    { name: "reflectionAiEnabled", emoji: "🔍", title: "ReflectionAI", desc: "Analyzes progress and provides insights" },
    { name: "adaptiveAiEnabled", emoji: "⚙️", title: "AdaptiveAI", desc: "Adapts plans based on your performance" },
  ] as const;


  return (
    <div className="w-full lg:grid min-h-screen lg:grid-cols-2">
       <div className="flex items-center justify-center py-12 animate-in fade-in-0 slide-in-from-left-2 duration-1000">
        <div className="mx-auto grid w-[400px] max-w-full gap-6 px-4">
          <div className="grid gap-2 text-center">
             <Link href="/" className="flex justify-center items-center gap-2 mb-4 text-2xl font-semibold text-primary">
              <Image src="https://www.broadrange.ai/images/broadrange-logo.jpg" alt="Broadrange AI Logo" width={108} height={32} className="h-8 w-auto rounded-lg"/>
              <span>CodeXStudy</span>
            </Link>
            <h1 className="text-3xl font-bold">AI Agent Setup</h1>
            <p className="text-balance text-muted-foreground">
              Step 3 of 3: Configure your CodeXStudy assistants.
            </p>
             <div className="flex justify-center gap-2 pt-2">
                {[1,2,3].map(step => (
                  <div key={step} className={`h-2 w-8 rounded-full ${step === 3 ? 'bg-primary' : 'bg-primary/50'}`}></div>
                ))}
            </div>
          </div>
          <Form {...form}> 
            <form onSubmit={form.handleSubmit(onFinalSubmit)} className="space-y-6"> 
              <div className="space-y-4">
                {agentSettingsFields.map((agent) => (
                  <FormField
                    key={agent.name}
                    control={form.control} 
                    name={agent.name}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <Label htmlFor={agent.name} className="text-base flex items-center gap-2">
                             <span className="text-xl">{agent.emoji}</span> {agent.title}
                          </Label>
                          <p className="text-sm text-muted-foreground pl-7">{agent.desc}</p>
                        </div>
                        <FormControl>
                          <Switch
                            id={agent.name}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <div className="flex gap-4 pt-4">
                 <Button 
                  type="button" 
                  variant="outline"
                  className="w-full" 
                  onClick={() => router.push('/register/step2')}
                >
                  Back
                </Button>
                <Button type="submit" className="w-full" disabled={isSubmittingForm || authLoading}>
                  {isSubmittingForm || authLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                      Completing Setup...
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
       <div className="hidden bg-muted lg:block animate-in fade-in-0 duration-1000">
        <Image
          src="https://placehold.co/1080x1920.png"
          alt="Abstract background image representing studying or learning"
          width="1080"
          height="1920"
          data-ai-hint="library study"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
