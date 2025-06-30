"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, BookOpen, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" {...props}>
        <path
        fill="currentColor"
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.98-4.66 1.98-3.57 0-6.47-2.9-6.47-6.47s2.9-6.47 6.47-6.47c1.98 0 3.33.83 4.1 1.59l2.42-2.42C18.13 2.56 15.79 1.5 12.48 1.5c-5.46 0-9.92 4.46-9.92 9.92s4.46 9.92 9.92 9.92c5.29 0 9.4-3.69 9.4-9.59 0-.6-.05-1.18-.16-1.72h-9.24z"
        />
    </svg>
);

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
      rememberMe: false,
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
        setIsSubmittingForm(false);
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: result.message || "Invalid email or password. Please try again.",
        });
        setIsSubmittingForm(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Error",
        description: "An unexpected error occurred. Please try again later.",
      });
      setIsSubmittingForm(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  if (authLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (currentUser && !authLoading) return null;

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="mx-auto max-w-sm w-full">
            <CardHeader className="text-center">
                <Link href="/" className="flex justify-center items-center gap-2 text-2xl font-bold text-primary mb-2">
                    <BookOpen className="h-8 w-8" />
                    <span>CodeXStudy</span>
                </Link>
                <CardTitle className="text-2xl">Welcome Back</CardTitle>
                <CardDescription>
                    Sign in to access your study plans
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                            type="email"
                            id="email"
                            className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                            {...register("email")}
                            required
                            placeholder="you@example.com"
                            />
                        </div>
                        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                    </div>
                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Password</Label>
                            <Button
                            type="button"
                            variant="link"
                            className="ml-auto inline-block text-sm underline h-auto p-0"
                            onClick={handleForgotPassword}
                            >
                            Forgot password?
                            </Button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                            type="password"
                            id="password"
                            className={`pl-10 ${errors.password ? "border-destructive" : ""}`}
                            {...register("password")}
                            required
                            placeholder="••••••••"
                            />
                        </div>
                        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="rememberMe" {...register("rememberMe")} />
                        <Label htmlFor="rememberMe" className="text-sm font-normal">Remember me</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmittingForm}>
                        {isSubmittingForm ? (
                            <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Signing In...
                            </>
                        ) : (
                            "Sign In"
                        )}
                    </Button>
                     <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                            Or continue with
                            </span>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" type="button">
                        <GoogleIcon className="mr-2 h-4 w-4" />
                        Sign in with Google
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="justify-center">
                 <div className="text-sm">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="underline">
                        Create Account
                    </Link>
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}
