
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, CheckCircle } from "lucide-react";
import type { StoredUser } from "@/types";

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="flex items-center gap-2 mb-8 text-2xl font-semibold text-primary">
        <span className="flex items-center justify-center h-8 w-8 bg-primary text-primary-foreground rounded-full font-bold text-xl">C</span>
        <span>CodeXStudy</span>
      </div>
      <Card className="w-full max-w-md">
        {step === "emailInput" && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Forgot Your Password?</CardTitle>
              <CardDescription className="text-center">
                Enter your email address to start the recovery process.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    type="email"
                    id="email"
                    className={`${emailForm.formState.errors.email ? "border-destructive" : ""}`}
                    {...emailForm.register("email")}
                    required
                    placeholder="you@example.com"
                  />
                  {emailForm.formState.errors.email && <p className="text-xs text-destructive mt-1">{emailForm.formState.errors.email.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Continue
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === "securityCheck" && securityQuestionToDisplay && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl text-center flex items-center justify-center gap-2"><ShieldCheck className="h-6 w-6 text-primary"/> Security Check</CardTitle>
              <CardDescription className="text-center">
                Answer your security question to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Your security question:</p>
              <p className="font-semibold mb-4 p-3 bg-muted rounded-md">{securityQuestionToDisplay}</p>
              <form onSubmit={resetForm.handleSubmit(handleResetSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="securityAnswer">Your Answer</Label>
                  <Input
                    type="text"
                    id="securityAnswer"
                    className={`${resetForm.formState.errors.securityAnswer ? "border-destructive" : ""}`}
                    {...resetForm.register("securityAnswer")}
                    required
                    placeholder="Your secret answer"
                  />
                  {resetForm.formState.errors.securityAnswer && <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.securityAnswer.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    type="password"
                    id="newPassword"
                    className={`${resetForm.formState.errors.newPassword ? "border-destructive" : ""}`}
                    {...resetForm.register("newPassword")}
                    required
                    placeholder="••••••••"
                  />
                  {resetForm.formState.errors.newPassword && <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.newPassword.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                  <Input
                    type="password"
                    id="confirmNewPassword"
                    className={`${resetForm.formState.errors.confirmNewPassword ? "border-destructive" : ""}`}
                    {...resetForm.register("confirmNewPassword")}
                    required
                    placeholder="••••••••"
                  />
                  {resetForm.formState.errors.confirmNewPassword && <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.confirmNewPassword.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Reset Password
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === "passwordResetDone" && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
                <CheckCircle className="h-7 w-7 text-green-500"/> Password Reset!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Your password has been successfully updated. You can now sign in with your new credentials.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Back to Sign In</Link>
              </Button>
            </CardContent>
          </>
        )}
        {step === "noRecovery" && (
             <>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Recovery Not Set Up</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Password recovery via security question is not available for this account because it was not configured during registration.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Back to Sign In</Link>
              </Button>
            </CardContent>
          </>
        )}

        <CardFooter className="flex flex-col items-center text-sm pt-6">
          {step !== "passwordResetDone" && (
            <Link href="/login" className="text-primary hover:underline">
              Remember your password? Sign In
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
