
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
          src="data:image/jpeg;base64,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j/qFfc1vSSiXwuIAF26tmX9dBmT9pRKlSq/jKSL8QeBl+InOcHTyoE+bJpHvNJjTPxWbehebiUdQtGTPKX9Ix5S/pGRaeIVmZAe0trixG8A6E7943bplm9KL2M92S6a1mF1FQjmASPGejQrnTJU91vqlm2Zi0emuUgWABHEWHKS845iefLqmnbCjQqSa1KOmzKg3UWHqQ/VPXkFX5p/dP1S7ZxzEZxzEe3S4HYXJQauHysCykMAQLixAYgnfwJUeAiWbpKyGmLkZ7jLz7/Zb90rM2UancjisUTjhdjmP3Ytg3VMag1FqdX1HzGPqPZ9qygdE9qeS4zDYi9glRS36hOV/wBktP0LtDBJXpVKNQXR1Kn1Ebx3jf7J+cNr7PfD1qlB/OpsVPfyI7iLH2zD1dPDPEt/U0UZXVj9b3krAYfMbnzR8TND9zWv5Xs7CV2a/wAmEbmXpXpsT6yl/bLmqgCw3SudXKyJRhnmfYiJnLRERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQD/2Q=="
          alt="Abstract background image representing studying or learning"
          width="1080"
          height="1920"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
