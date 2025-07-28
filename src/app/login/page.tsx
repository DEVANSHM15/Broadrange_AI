
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Mail, Lock, User } from "lucide-react";
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
    <div className="flex flex-col items-center justify-center h-full px-10 text-center">
      <h1 className="text-3xl font-bold mb-4">Sign In</h1>
      <form onSubmit={handleSubmit(onSignIn)} className="grid gap-4 w-full">
        <div className="grid gap-2 text-left">
            <Label htmlFor="login-email">Email</Label>
            <Input type="email" id="login-email" {...register("email")} placeholder="you@example.com" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
        </div>
        <div className="grid gap-2 text-left">
            <Label htmlFor="login-password">Password</Label>
            <Input type="password" id="login-password" {...register("password")} placeholder="••••••••" />
             {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
        </div>
        <div className="text-sm text-center">
            <Link href="/forgot-password" className="underline text-muted-foreground hover:text-primary">
                Forgot your password?
            </Link>
        </div>
        <Button type="submit" className="w-full text-base font-semibold mt-2" disabled={isLoading}>
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
    <div className="flex flex-col items-center justify-center h-full px-10 text-center">
        <h1 className="text-3xl font-bold mb-4">Create Account</h1>
        <form onSubmit={handleSubmit(onSignUp)} className="grid gap-4 w-full">
            <div className="grid gap-2 text-left">
                <Label htmlFor="register-name">Full Name</Label>
                <Input id="register-name" {...register("name")} placeholder="John Doe" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2 text-left">
                <Label htmlFor="register-email">Email Address</Label>
                <Input type="email" id="register-email" {...register("email")} placeholder="you@example.com" />
                 {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2 text-left">
                <Label htmlFor="register-password">Password</Label>
                <Input type="password" id="register-password" {...register("password")} placeholder="••••••••" />
                 {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full text-base font-semibold mt-2" disabled={isLoading}>
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
        "relative w-full max-w-4xl min-h-[600px] bg-card rounded-2xl shadow-2xl overflow-hidden",
        "transition-all duration-700 ease-in-out",
        {"right-panel-active": isSignUpActive}
      )} id="container">
        
        {/* Sign Up Form Panel */}
        <div className="absolute top-0 h-full w-1/2 left-0 opacity-0 z-10 transition-all ease-in-out duration-500 form-container sign-up-container">
            <SignUpForm onSignUp={handleSignUpSubmit} isLoading={isSubmitting} />
        </div>

        {/* Sign In Form Panel */}
        <div className="absolute top-0 h-full w-1/2 left-0 opacity-100 z-20 transition-all ease-in-out duration-500 form-container sign-in-container">
            <SignInForm onSignIn={handleSignInSubmit} isLoading={isSubmitting} />
        </div>

        {/* Overlay Container */}
        <div className="absolute top-0 left-1/2 w-1/2 h-full overflow-hidden z-30 transition-transform duration-600 ease-in-out overlay-container">
          <div className="relative -left-full h-full w-[200%] bg-primary text-primary-foreground transition-transform duration-600 ease-in-out overlay">
            
            {/* Sign In Overlay */}
            <div className="absolute top-0 h-full w-1/2 flex items-center justify-center flex-col px-10 text-center transition-transform duration-600 ease-in-out overlay-panel overlay-left">
              <h1 className="text-3xl font-bold">Welcome Back!</h1>
              <p className="text-sm mt-4 mb-6">To keep connected with us please login with your personal info</p>
              <Button
                variant="outline"
                onClick={() => setIsSignUpActive(false)}
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full max-w-xs"
                id="signIn"
              >
                Sign In
              </Button>
            </div>

            {/* Sign Up Overlay */}
            <div className="absolute top-0 h-full w-1/2 right-0 flex items-center justify-center flex-col px-10 text-center transition-transform duration-600 ease-in-out overlay-panel overlay-right">
              <h1 className="text-3xl font-bold">Hello, Friend!</h1>
              <p className="text-sm mt-4 mb-6">Enter your personal details and start your journey with us</p>
              <Button
                variant="outline"
                onClick={() => setIsSignUpActive(true)}
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full max-w-xs"
                id="signUp"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>

        <style jsx>{`
            #container.right-panel-active .sign-in-container {
                transform: translateX(100%);
                opacity: 0;
            }
            #container.right-panel-active .sign-up-container {
                transform: translateX(100%);
                opacity: 1;
                z-index: 5;
                animation: show 0.6s;
            }
            #container.right-panel-active .overlay-container {
                transform: translateX(-100%);
            }
            #container.right-panel-active .overlay {
                transform: translateX(50%);
            }
            #container.right-panel-active .overlay-left {
                transform: translateX(0);
            }
            #container.right-panel-active .overlay-right {
                transform: translateX(20%);
            }
            @keyframes show {
                0%, 49.99% {
                    opacity: 0;
                    z-index: 1;
                }
                50%, 100% {
                    opacity: 1;
                    z-index: 5;
                }
            }
            .overlay-left {
                transform: translateX(-20%);
            }
        `}</style>
      </div>
    </div>
  );
}
