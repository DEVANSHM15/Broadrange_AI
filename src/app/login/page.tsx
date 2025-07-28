
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Mail, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login, isLoading: authLoading, currentUser } = useAuth();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    }
  });

  useEffect(() => {
    if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmittingForm(true);
    try {
      const result = await login(data.email, data.password);
      
      if (result.success) {
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: result.message || "Invalid email or password. Please try again.",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Error",
        description: "An unexpected error occurred. Please try again later.",
      });
    } finally {
        setIsSubmittingForm(false);
    }
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
      <div className="w-full max-w-4xl flex flex-col md:flex-row bg-card rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Form Panel */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
            <h1 className="text-3xl font-bold mb-2 text-center">Sign In</h1>
            <p className="text-muted-foreground text-center mb-8">
              or use your email account
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
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
                        type="password"
                        id="password"
                        className={`pl-10 h-11 bg-input border-border focus:bg-accent/30 ${errors.password ? "border-destructive" : ""}`}
                        {...register("password")}
                        required
                        placeholder="••••••••"
                        />
                    </div>
                    {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                </div>
                <div className="text-sm text-right">
                    <Link href="/forgot-password" className="underline text-muted-foreground hover:text-primary">
                        Forgot your password?
                    </Link>
                </div>
                <Button type="submit" className="w-full h-11 text-base font-semibold mt-4" disabled={isSubmittingForm}>
                    {isSubmittingForm ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        "Sign In"
                    )}
                </Button>
            </form>
        </div>

        {/* Overlay Panel */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center items-center bg-primary text-primary-foreground text-center">
            <LogIn className="h-16 w-16 mb-4"/>
            <h2 className="text-3xl font-bold mb-4">Hello, Friend!</h2>
            <p className="max-w-xs mb-8">
              Enter your personal details and start your journey with us
            </p>
            <Button asChild variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full max-w-xs">
                <Link href="/register">Sign Up</Link>
            </Button>
        </div>

      </div>
    </div>
  );
}
