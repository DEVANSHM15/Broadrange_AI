
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const loginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Simple Google G logo SVG component
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.20455C17.64 8.56682 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.9705 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9464 17.64 9.20455Z" fill="#4285F4"/>
    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.96182 14.4205 5.26636 13.0177 4.50545 11.1886H1.51773V13.5082C3.00773 16.2264 5.79409 18 9 18Z" fill="#34A853"/>
    <path d="M4.50545 11.1886C4.28864 10.5745 4.16182 9.91182 4.16182 9.20455C4.16182 8.49727 4.28864 7.83455 4.50545 7.22045V4.89909H1.51773C0.963182 6.00318 0.654545 7.25182 0.654545 9.20455C0.654545 11.1573 0.963182 12.4059 1.51773 13.5082L4.50545 11.1886Z" fill="#FBBC05"/>
    <path d="M9 3.98864C10.3227 3.98864 11.5077 4.45591 12.4405 5.33045L15.0218 2.82136C13.4632 1.33773 11.4255 0.654545 9 0.654545C5.79409 0.654545 3.00773 2.37182 1.51773 4.89909L4.50545 7.22045C5.26636 5.39136 6.96182 3.98864 9 3.98864Z" fill="#EA4335"/>
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

  const handleGoogleSignIn = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Sign in with Google is not yet implemented.",
    });
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="flex items-center gap-2 mb-8 text-2xl font-semibold text-primary">
        <span className="flex items-center justify-center h-8 w-8 bg-primary text-primary-foreground rounded-full font-bold text-xl">B</span>
        <span>Broadrange AI</span>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to access your Broadrange AI study plans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <Input
                type="email"
                id="email"
                className={`${errors.email ? "border-destructive" : ""}`}
                {...register("email")}
                required
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                type="password"
                id="password"
                className={`${errors.password ? "border-destructive" : ""}`}
                {...register("password")}
                required
                placeholder="••••••••"
              />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Checkbox id="rememberMe" {...register("rememberMe")} />
                <Label htmlFor="rememberMe" className="text-sm font-normal">Remember me</Label>
              </div>
              <Button
                type="button"
                variant="link"
                className="text-sm h-auto p-0 font-normal"
                onClick={handleForgotPassword}
              >
                Forgot password?
              </Button>
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
          </form>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
            <GoogleIcon /> 
            <span className="ml-2">Sign in with Google</span>
          </Button>

        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm pt-6">
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create Account
            </Link>
          </p>
          <Link href="/" className="mt-4 text-primary hover:underline">
            &larr; Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
        

    