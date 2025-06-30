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
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="flex items-center gap-2 mb-8 text-2xl font-semibold text-primary">
        <Image src="https://www.broadrange.ai/images/broadrange-logo.jpg" alt="Broadrange AI Logo" width={108} height={28} className="rounded-lg"/>
        <span>CodeXStudy</span>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to access your CodeXStudy study plans.
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
          <div className="relative my-4">
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
                width="364px"
              />
          </div>
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
