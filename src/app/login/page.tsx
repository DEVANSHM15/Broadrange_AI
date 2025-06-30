
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
import { Checkbox } from "@/components/ui/checkbox";
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import Image from "next/image";

const loginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().optional(),
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
  
  const handleGoogleLoginSuccess = (credentialResponse: CredentialResponse) => {
    console.log("Google Login Success:", credentialResponse);
    // In a real app, you would send the credential to your backend
    // to verify the token, then create a session or issue a JWT.
    toast({
      title: "Google Login Initiated",
      description: "This is a placeholder. Backend logic is needed to complete login.",
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
    <div className="w-full lg:grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 animate-in fade-in-0 slide-in-from-left-2 duration-1000">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <Link href="/" className="flex justify-center items-center gap-2 mb-4 text-2xl font-semibold text-primary">
                <Image src="https://www.broadrange.ai/images/broadrange-logo.jpg" alt="Broadrange AI Logo" width={108} height={32} className="h-8 w-auto rounded-lg"/>
                <span>CodeXStudy</span>
            </Link>
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="text-balance text-muted-foreground">
              Sign in to access your study plans
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
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
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Button
                  type="button"
                  variant="link"
                  className="ml-auto inline-block text-sm underline"
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </Button>
              </div>
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
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <div className="flex justify-center">
             <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={() => {
                  console.error('Google Login Failed');
                  toast({
                    variant: "destructive",
                    title: "Google Login Failed",
                    description: "An error occurred during Google authentication.",
                  });
                }}
                width="350px"
              />
          </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block animate-in fade-in-0 duration-1000">
        <Image
          src="https://placehold.co/1080x1920.png"
          alt="Abstract background image representing studying or learning"
          width="1080"
          height="1920"
          data-ai-hint="library study"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
