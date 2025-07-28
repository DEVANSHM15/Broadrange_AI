"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Mail, Lock, LogIn, UserPlus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Image from "next/image";

// Schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});
type LoginFormData = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});
type RegisterFormData = z.infer<typeof registerSchema>;


// Sign-in Form Component
const SignInForm = ({ onSignIn, isLoading }: { onSignIn: (data: LoginFormData) => void, isLoading: boolean }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  return (
    <div className="animate-in fade-in-50 duration-700">
      <Link href="/" className="flex justify-center items-center gap-2 mb-6 text-foreground hover:opacity-80 transition-opacity">
          <Image src="https://www.broadrange.ai/images/broadrange-logo.jpg" alt="Broadrange AI Logo" width={93} height={24} className="h-8 w-auto rounded-lg" />
          <span className="text-xl font-bold sm:inline-block">CodeXStudy</span>
      </Link>
      <h1 className="text-3xl font-bold mb-2 text-center">Sign In</h1>
      <p className="text-muted-foreground text-center mb-8">or use your email account</p>
      <form onSubmit={handleSubmit(onSignIn)} className="grid gap-4">
        <div className="grid gap-2">
            <Label htmlFor="login-email">Email</Label>
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" id="login-email" className="pl-10 h-11" {...register("email")} placeholder="you@example.com" />
            </div>
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
        </div>
        <div className="grid gap-2">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="password" id="login-password" className="pl-10 h-11" {...register("password")} placeholder="••••••••" />
            </div>
             {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
        </div>
        <div className="text-sm text-right">
            <Link href="/forgot-password" className="underline text-muted-foreground hover:text-primary">
                Forgot your password?
            </Link>
        </div>
        <Button type="submit" className="w-full h-11 text-base font-semibold mt-4" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Sign In"}
        </Button>
      </form>
    </div>
  );
};

// Sign-up Form Component
const SignUpForm = ({ onSignUp, isLoading }: { onSignUp: (data: RegisterFormData) => void, isLoading: boolean }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  return (
    <div className="animate-in fade-in-50 duration-700">
        <Link href="/" className="flex justify-center items-center gap-2 mb-6 text-foreground hover:opacity-80 transition-opacity">
            <Image src="https://www.broadrange.ai/images/broadrange-logo.jpg" alt="Broadrange AI Logo" width={93} height={24} className="h-8 w-auto rounded-lg" />
            <span className="text-xl font-bold sm:inline-block">CodeXStudy</span>
        </Link>
        <h1 className="text-3xl font-bold mb-2 text-center">Create Account</h1>
        <p className="text-muted-foreground text-center mb-8">to start your journey</p>
        <form onSubmit={handleSubmit(onSignUp)} className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="register-name">Full Name</Label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="register-name" {...register("name")} placeholder="John Doe" className="pl-10 h-11" /></div>
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="register-email">Email Address</Label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" id="register-email" {...register("email")} placeholder="you@example.com" className="pl-10 h-11"/></div>
                 {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" id="register-password" {...register("password")} placeholder="••••••••" className="pl-10 h-11"/></div>
                 {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold mt-4" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Sign Up"}
            </Button>
        </form>
    </div>
  );
};


export default function UnifiedAuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login, isLoading: authLoading, currentUser } = useAuth();
  
  const [isSignUpActive, setIsSignUpActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  const handleSignInSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    const result = await login(data.email, data.password);
    if (result.success) {
        toast({ title: "Login Successful", description: "Welcome back!" });
    } else {
        toast({ variant: "destructive", title: "Login Failed", description: result.message || "Invalid credentials." });
    }
    setIsSubmitting(false);
  };
  
  const handleSignUpSubmit = async (data: RegisterFormData) => {
    sessionStorage.setItem("registrationStep1Data", JSON.stringify(data));
    router.push("/register/step2");
  };

  if (authLoading || currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className={cn(
        "relative w-full max-w-4xl min-h-[650px] bg-card rounded-2xl shadow-2xl overflow-hidden",
        "transition-all duration-700 ease-in-out"
      )}>

        {/* Form Panels Container */}
        <div
          className={cn(
            "absolute top-0 left-0 h-full w-1/2 flex items-center justify-center transition-transform duration-700 ease-in-out",
            isSignUpActive ? "translate-x-full" : "translate-x-0"
          )}
        >
          <div
            className={cn(
              "absolute w-full h-full p-8 md:p-12 flex flex-col justify-center transition-opacity duration-300 ease-in-out",
              isSignUpActive ? "opacity-0" : "opacity-100 z-10"
            )}
          >
            <SignInForm onSignIn={handleSignInSubmit} isLoading={isSubmitting} />
          </div>
          <div
            className={cn(
              "absolute w-full h-full p-8 md:p-12 flex flex-col justify-center transition-opacity duration-300 ease-in-out",
              isSignUpActive ? "opacity-100 z-10" : "opacity-0"
            )}
          >
            <SignUpForm onSignUp={handleSignUpSubmit} isLoading={isSubmitting} />
          </div>
        </div>

        {/* Overlay Container */}
        <div
          className={cn(
            "absolute top-0 left-1/2 w-1/2 h-full overflow-hidden z-20 transition-transform duration-700 ease-in-out",
            isSignUpActive ? "-translate-x-full" : "translate-x-0"
          )}
        >
          <div
            className={cn(
              "relative bg-primary text-primary-foreground h-full w-[200%] transition-transform duration-700 ease-in-out",
              isSignUpActive ? "translate-x-1/2" : "translate-x-0"
            )}
          >
            {/* Sign Up Overlay */}
            <div
              className={cn(
                "absolute top-0 left-0 w-1/2 h-full px-8 flex flex-col justify-center items-center text-center"
              )}
            >
              <UserPlus className="h-16 w-16 mb-4" />
              <h2 className="text-3xl font-bold mb-4">Hello, Friend!</h2>
              <p className="max-w-xs mb-8">Enter your personal details and start your journey with us</p>
              <Button
                variant="outline"
                onClick={() => setIsSignUpActive(true)}
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full max-w-xs"
              >
                Sign Up
              </Button>
            </div>

            {/* Sign In Overlay */}
            <div
              className={cn(
                "absolute top-0 right-0 w-1/2 h-full px-8 flex flex-col justify-center items-center text-center"
              )}
            >
              <LogIn className="h-16 w-16 mb-4" />
              <h2 className="text-3xl font-bold mb-4">Welcome Back!</h2>
              <p className="max-w-xs mb-8">To keep connected with us please login with your personal info</p>
              <Button
                variant="outline"
                onClick={() => setIsSignUpActive(false)}
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full max-w-xs"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}