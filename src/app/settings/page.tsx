
"use client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth, type RegisterData } from "@/contexts/auth-context";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Loader2, User, Bell, Zap, Palette, Save, Settings as SettingsIcon, Brain } from "lucide-react"; // Added Brain
import type { StoredUser } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


const settingsSchema = z.object({
  name: z.string().min(1, "Name cannot be empty"),
  email: z.string().email().readonly(),
  theme: z.string().optional(), 
  notificationFrequency: z.string().optional(),
  plannerBotEnabled: z.boolean().optional(),
  reflectionAiEnabled: z.boolean().optional(),
  adaptiveAiEnabled: z.boolean().optional(),
  studyLevel: z.string().optional(),
  preferredStudyTime: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { currentUser, updateUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("dark"); // UI state for theme select

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "",
      email: "",
      studyLevel: "",
      preferredStudyTime: "",
      plannerBotEnabled: true,
      reflectionAiEnabled: true,
      adaptiveAiEnabled: true,
      theme: "dark",
      notificationFrequency: "real-time",
    }
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        name: currentUser.name || "",
        email: currentUser.email || "",
        studyLevel: currentUser.studyLevel || "",
        preferredStudyTime: currentUser.preferredStudyTime || "",
        plannerBotEnabled: currentUser.aiSettings?.plannerBotEnabled ?? true,
        reflectionAiEnabled: currentUser.aiSettings?.reflectionAiEnabled ?? true,
        adaptiveAiEnabled: currentUser.aiSettings?.adaptiveAiEnabled ?? true,
        theme: localStorage.getItem("theme_StudyPlannerAI") || (typeof window !== "undefined" && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
        notificationFrequency: localStorage.getItem("notificationFrequency_StudyPlannerAI") || "real-time",
      });
      setCurrentTheme(localStorage.getItem("theme_StudyPlannerAI") || (typeof window !== "undefined" && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
    }
  }, [currentUser, form.reset]);

  const handleThemeChange = (value: string) => {
    setCurrentTheme(value); // Update local UI state for the Select component
    localStorage.setItem("theme_StudyPlannerAI", value);
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove('light', 'dark');
      if (value === 'system') {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.add('light');
        }
      } else {
        document.documentElement.classList.add(value);
      }
    }
    form.setValue("theme", value); // Update RHF state
  };

  const handleNotificationFrequencyChange = (value: string) => {
    localStorage.setItem("notificationFrequency_StudyPlannerAI", value);
    form.setValue("notificationFrequency", value); // Update RHF state
  };

  const onSubmit = async (data: SettingsFormData) => {
    if (!currentUser) return;
    setIsSaving(true);
    
    const updatePayload: Partial<StoredUser> = {
      name: data.name,
      studyLevel: data.studyLevel,
      preferredStudyTime: data.preferredStudyTime,
      aiSettings: {
        plannerBotEnabled: data.plannerBotEnabled!,
        reflectionAiEnabled: data.reflectionAiEnabled!,
        adaptiveAiEnabled: data.adaptiveAiEnabled!,
      },
    };

    const success = await updateUser(updatePayload);
    
    if (success) {
      toast({ title: "Settings Saved!", description: "Your preferences have been updated." });
    } else {
      toast({ title: "Error", description: "Could not save settings.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  if (authLoading && !currentUser) {
     return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const agentSettingsFields = [
    { name: "plannerBotEnabled", title: "PlannerBot", desc: "Automatic schedule optimization", icon: <Zap className="h-5 w-5 text-primary"/> },
    { name: "reflectionAiEnabled", title: "ReflectionAI", desc: "Progress analysis and insights", icon: <Brain className="h-5 w-5 text-primary"/> },
    { name: "adaptiveAiEnabled", title: "AdaptiveAI", desc: "Real-time plan adjustments", icon: <SettingsIcon className="h-5 w-5 text-primary"/> },
  ] as const;


  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Settings</h1>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary"/> Account Information</CardTitle>
                <CardDescription>Manage your personal details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input {...field} readOnly className="bg-muted cursor-not-allowed"/></FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary"/> Preferences</CardTitle>
                <CardDescription>Customize the app appearance and notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => ( // field is not directly used for value due to local state `currentTheme`
                    <FormItem>
                      <FormLabel>Theme</FormLabel>
                      <Select value={currentTheme} onValueChange={handleThemeChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="system">Auto (System)</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notificationFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Frequency</FormLabel>
                       <Select value={field.value} onValueChange={handleNotificationFrequencyChange}>
                        <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="real-time">Real-time</SelectItem>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                       </Select>
                    </FormItem>
                  )}
                 />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary"/> AI Agents Configuration</CardTitle>
                <CardDescription>Enable or disable specific AI assistants.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {agentSettingsFields.map(agent => (
                  <FormField
                    key={agent.name}
                    control={form.control}
                    name={agent.name as keyof SettingsFormData}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center gap-2">{agent.icon} {agent.title}</FormLabel>
                          <FormDescription className="pl-7">{agent.desc}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </CardContent>
            </Card>
            
            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || authLoading}>
                    {isSaving || authLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4"/>Save Changes</>}
                </Button>
            </div>
          </form>
        </FormProvider>
      </div>
    </AppLayout>
  );
}
