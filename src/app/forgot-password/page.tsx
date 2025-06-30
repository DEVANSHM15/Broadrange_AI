"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, CheckCircle, BookOpen, Mail, KeyRound, Lock } from "lucide-react";
import type { StoredUser } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const LOCAL_STORAGE_USERS_KEY = "studyMindAiUsers_v2";

const emailSchema = z.object({
  email: z.string().email("Invalid email address."),
});
type EmailFormData = z.infer<typeof emailSchema>;

const resetSchema = z.object({
  securityAnswer: z.string().min(1, "Security answer is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match.",
  path: ["confirmNewPassword"],
});
type ResetFormData = z.infer<typeof resetSchema>;

type ForgotPasswordStep = "emailInput" | "securityCheck" | "passwordResetDone" | "noRecovery";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<ForgotPasswordStep>("emailInput");
  const [isLoading, setIsLoading] = useState(false);
  const [userEmailForRecovery, setUserEmailForRecovery] = useState<string | null>(null);
  const [securityQuestionToDisplay, setSecurityQuestionToDisplay] = useState<string | null>(null);

  const emailForm = useForm<EmailFormData>({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm<ResetFormData>({ resolver: zodResolver(resetSchema) });

  const getStoredUsers = (): StoredUser[] => {
    const usersJson = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  };

  const saveStoredUsers = (users: StoredUser[]) => {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  };

  const handleEmailSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    const users = getStoredUsers();
    const user = users.find(u => u.email === data.email);

    if (user) {
      if (user.securityQuestion && user.securityAnswer) {
        setUserEmailForRecovery(user.email);
        setSecurityQuestionToDisplay(user.securityQuestion);
        setStep("securityCheck");
      } else {
        setStep("noRecovery");
        toast({
          title: "Password Recovery Not Available",
          description: "Security question and answer were not set up for this account.",
          variant: "default",
        });
      }
    } else {
      toast({
        title: "Account Not Found",
        description: "No account exists with this email address.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleResetSubmit = async (data: ResetFormData) => {
    setIsLoading(true);
    if (!userEmailForRecovery) {
      toast({ title: "Error", description: "Session expired. Please start over.", variant: "destructive" });
      setStep("emailInput");
      setIsLoading(false);
      return;
    }

    const users = getStoredUsers();
    const userIndex = users.findIndex(u => u.email === userEmailForRecovery);
    const user = users[userIndex];

    if (user && user.securityAnswer?.toLowerCase() === data.securityAnswer.toLowerCase()) {
      users[userIndex] = { ...user, password_unsafe: data.newPassword };
      saveStoredUsers(users);
      setStep("passwordResetDone");
      toast({
        title: "Password Reset Successful!",
        description: "You can now log in with your new password.",
      });
    } else {
      toast({
        title: "Incorrect Answer",
        description: "The answer to the security question was incorrect.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const renderContent = () => {
    switch (step) {
      case "emailInput":
        return (
            <>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Forgot Password?</CardTitle>
                    <CardDescription>
                        Enter your email to start the recovery process.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="email"
                                    id="email"
                                    className={`pl-10 ${emailForm.formState.errors.email ? "border-destructive" : ""}`}
                                    {...emailForm.register("email")}
                                    required
                                    placeholder="you@example.com"
                                />
                            </div>
                            {emailForm.formState.errors.email && <p className="text-xs text-destructive mt-1">{emailForm.formState.errors.email.message}</p>}
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Continue"}
                        </Button>
                    </form>
                </CardContent>
            </>
        );
      case "securityCheck":
        return (
            <>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl flex items-center justify-center gap-2"><ShieldCheck className="h-7 w-7 text-primary"/>Security Check</CardTitle>
                    <CardDescription>
                        Answer your security question to reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-center text-muted-foreground mb-1">Your security question is:</p>
                    <p className="font-semibold mb-3 p-3 bg-muted rounded-md text-center">{securityQuestionToDisplay}</p>
                    <form onSubmit={resetForm.handleSubmit(handleResetSubmit)} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="securityAnswer">Your Answer</Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    id="securityAnswer"
                                    className={`pl-10 ${resetForm.formState.errors.securityAnswer ? "border-destructive" : ""}`}
                                    {...resetForm.register("securityAnswer")}
                                    required
                                    placeholder="Your secret answer"
                                />
                            </div>
                            {resetForm.formState.errors.securityAnswer && <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.securityAnswer.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    id="newPassword"
                                    className={`pl-10 ${resetForm.formState.errors.newPassword ? "border-destructive" : ""}`}
                                    {...resetForm.register("newPassword")}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>
                            {resetForm.formState.errors.newPassword && <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.newPassword.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    id="confirmNewPassword"
                                    className={`pl-10 ${resetForm.formState.errors.confirmNewPassword ? "border-destructive" : ""}`}
                                    {...resetForm.register("confirmNewPassword")}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>
                            {resetForm.formState.errors.confirmNewPassword && <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.confirmNewPassword.message}</p>}
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Reset Password"}
                        </Button>
                    </form>
                </CardContent>
            </>
        );
      case "passwordResetDone":
        return (
            <CardContent className="text-center grid gap-4">
              <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-500"/> Password Reset!
              </h1>
              <p className="text-muted-foreground">
                Your password has been successfully updated.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Back to Sign In</Link>
              </Button>
            </CardContent>
        );
      case "noRecovery":
        return (
            <CardContent className="text-center grid gap-4">
              <h1 className="text-3xl font-bold">Recovery Not Set Up</h1>
              <p className="text-muted-foreground">
                Password recovery is not available for this account.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Back to Sign In</Link>
              </Button>
            </CardContent>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="mx-auto max-w-sm w-full">
            <div className="grid gap-2 text-center pt-6">
                 <Link href="/" className="flex justify-center items-center gap-2 text-2xl font-bold text-primary mb-4">
                    <BookOpen className="h-8 w-8" />
                    <span>CodeXStudy</span>
                </Link>
            </div>
            {renderContent()}
            <CardFooter className="justify-center">
                 <div className="text-sm">
                    {step !== "passwordResetDone" && (
                        <Link href="/login" className="underline">
                            Remember your password? Sign In
                        </Link>
                    )}
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}
