
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
import { Loader2, ShieldCheck, CheckCircle, Mail, KeyRound, Lock, HelpCircle } from "lucide-react";
import type { StoredUser } from "@/types";

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
    if (typeof window === 'undefined') return [];
    const usersJson = localStorage.getItem("studyMindAiUsers_v2");
    return usersJson ? JSON.parse(usersJson) : [];
  };

  const saveStoredUsers = (users: StoredUser[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("studyMindAiUsers_v2", JSON.stringify(users));
    }
  };

  const handleEmailSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    // Placeholder for backend call
    setTimeout(() => {
        // Mock API call to check for user
        const user = { email: data.email, securityQuestion: "What was your first pet's name?" }; // Mock user

        if (user) {
            if (user.securityQuestion) {
                setUserEmailForRecovery(user.email);
                setSecurityQuestionToDisplay(user.securityQuestion);
                setStep("securityCheck");
            } else {
                setStep("noRecovery");
            }
        } else {
            toast({
                title: "Account Not Found",
                description: "No account exists with this email address.",
                variant: "destructive",
            });
        }
        setIsLoading(false);
    }, 1000);
  };

  const handleResetSubmit = async (data: ResetFormData) => {
    setIsLoading(true);
    // Placeholder for backend call
    setTimeout(() => {
        if (data.securityAnswer.toLowerCase() === 'buddy') { // Mock check
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
    }, 1000);
  };

  const renderContent = () => {
    switch (step) {
      case "emailInput":
        return (
            <>
                <h1 className="text-3xl font-bold mb-2 text-center">Forgot Password?</h1>
                <p className="text-muted-foreground text-center mb-8">
                    Enter your email to start recovery.
                </p>
                <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="email" id="email"
                                className={`pl-10 h-11 bg-input border-border focus:bg-accent/30 ${emailForm.formState.errors.email ? "border-destructive" : ""}`}
                                {...emailForm.register("email")}
                                required
                                placeholder="you@example.com"
                            />
                        </div>
                        {emailForm.formState.errors.email && <p className="text-xs text-destructive mt-1">{emailForm.formState.errors.email.message}</p>}
                    </div>
                    <Button type="submit" className="w-full h-11" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Continue"}
                    </Button>
                </form>
            </>
        );
      case "securityCheck":
        return (
            <>
                <h1 className="text-3xl font-bold mb-2 text-center">Security Check</h1>
                 <p className="text-muted-foreground text-center mb-4">
                    Answer your security question.
                </p>
                <p className="font-semibold mb-4 p-3 bg-muted rounded-md text-center">{securityQuestionToDisplay}</p>
                <form onSubmit={resetForm.handleSubmit(handleResetSubmit)} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="securityAnswer">Your Answer</Label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="text" id="securityAnswer" className={`pl-10 h-11 ${resetForm.formState.errors.securityAnswer ? "border-destructive" : ""}`} {...resetForm.register("securityAnswer")} required placeholder="Your secret answer" />
                        </div>
                        {resetForm.formState.errors.securityAnswer && <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.securityAnswer.message}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="password" id="newPassword" className={`pl-10 h-11 ${resetForm.formState.errors.newPassword ? "border-destructive" : ""}`} {...resetForm.register("newPassword")} required placeholder="••••••••" />
                        </div>
                        {resetForm.formState.errors.newPassword && <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.newPassword.message}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="password" id="confirmNewPassword" className={`pl-10 h-11 ${resetForm.formState.errors.confirmNewPassword ? "border-destructive" : ""}`} {...resetForm.register("confirmNewPassword")} required placeholder="••••••••" />
                        </div>
                        {resetForm.formState.errors.confirmNewPassword && <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.confirmNewPassword.message}</p>}
                    </div>
                    <Button type="submit" className="w-full h-11" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Reset Password"}
                    </Button>
                </form>
            </>
        );
      case "passwordResetDone":
        return (
            <div className="text-center grid gap-4 pt-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto"/>
              <h1 className="text-3xl font-bold">Password Reset!</h1>
              <p className="text-muted-foreground">Your password has been successfully updated.</p>
              <Button asChild className="w-full">
                <Link href="/login">Back to Sign In</Link>
              </Button>
            </div>
        );
      case "noRecovery":
        return (
            <div className="text-center grid gap-4 pt-8">
                <HelpCircle className="h-16 w-16 text-destructive mx-auto"/>
                <h1 className="text-3xl font-bold">Recovery Not Available</h1>
                <p className="text-muted-foreground">Security questions were not set up for this account.</p>
                <Button asChild className="w-full">
                    <Link href="/login">Back to Sign In</Link>
                </Button>
            </div>
        );
      default: return null;
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-4xl flex flex-col md:flex-row bg-card rounded-2xl shadow-2xl overflow-hidden">
            
            {/* Form Panel */}
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                {renderContent()}
            </div>

            {/* Overlay Panel */}
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center items-center bg-primary text-primary-foreground text-center">
                <ShieldCheck className="h-16 w-16 mb-4"/>
                <h2 className="text-3xl font-bold mb-4">Need Help?</h2>
                <p className="max-w-xs mb-8">
                    Remember your password after all? Head back to the sign-in page.
                </p>
                <Button asChild variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full max-w-xs">
                    <Link href="/login">Sign In</Link>
                </Button>
            </div>

        </div>
    </div>
  );
}
