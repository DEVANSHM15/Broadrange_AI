
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Eye, EyeOff, User, Mail, Lock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type Step1FormData = z.infer<typeof step1Schema>;

export default function RegisterStep1Page() {
  const router = useRouter();
  const { currentUser, isLoading: authLoading } = useAuth();
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
  });

  const passwordValue = watch("password");

  useEffect(() => {
    if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  useEffect(() => {
    let score = 0;
    if (passwordValue) {
      if (passwordValue.length >= 8) score += 25; else if (passwordValue.length >= 6) score += 10;
      if (/[a-z]/.test(passwordValue)) score += 25;
      if (/[A-Z]/.test(passwordValue)) score += 25;
      if (/[0-9]/.test(passwordValue)) score += 25;
      if (/[^a-zA-Z0-9]/.test(passwordValue) && passwordValue.length > 0) score = Math.min(score + 15, 100);
    }
    setPasswordStrength(score);
  }, [passwordValue]);
  
  const onSubmitStep1 = async (data: Step1FormData) => {
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
        <div className="w-full max-w-4xl flex flex-col md:flex-row-reverse bg-card rounded-2xl shadow-2xl overflow-hidden">
            
            {/* Form Panel */}
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                <h1 className="text-3xl font-bold mb-2 text-center">Create Account</h1>
                 <p className="text-muted-foreground text-center mb-8">
                    Step 1: Your Account Details
                </p>
                <form onSubmit={handleSubmit(onSubmitStep1)} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="name"
                                className={`pl-10 h-11 bg-input border-border focus:bg-accent/30 ${errors.name ? "border-destructive" : ""}`} 
                                {...register("name")}
                                required
                                placeholder="John Doe"
                            />
                        </div>
                        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                type="email" 
                                id="email"
                                className={`pl-10 h-11 bg-input border-border focus:bg-accent/30 ${errors.email ? "border-destructive" : ""}`} 
                                {...register("email")}
                                required
                                placeholder="you@example.com"
                            />
                        </div>
                        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                type={showPassword ? "text" : "password"} 
                                id="password"
                                className={`pl-10 h-11 bg-input border-border focus:bg-accent/30 ${errors.password ? "border-destructive" : ""}`} 
                                {...register("password")}
                                required
                                placeholder="••••••••"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                        {passwordValue && (
                            <div className="mt-2">
                                <Progress value={passwordStrength} className="h-1" 
                                indicatorClassName={
                                    passwordStrength < 50 ? "bg-destructive" :
                                    passwordStrength < 75 ? "bg-yellow-500" :
                                    "bg-green-500"
                                }
                                />
                            </div>
                        )}
                    </div>
                    <Button type="submit" className="w-full h-11 text-base font-semibold mt-4">Continue</Button>
                </form>
            </div>

            {/* Overlay Panel */}
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center items-center bg-primary text-primary-foreground text-center">
                <UserPlus className="h-16 w-16 mb-4"/>
                <h2 className="text-3xl font-bold mb-4">Welcome!</h2>
                <p className="max-w-xs mb-8">
                    Already have an account? Sign in to access your study plans.
                </p>
                <Button asChild variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full max-w-xs">
                    <Link href="/login">Sign In</Link>
                </Button>
            </div>
            
        </div>
    </div>
  );
}
