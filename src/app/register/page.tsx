
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
    //Send email
    try{
      await fetch("api/send-welcome",{
        method:"POST",
        headers:{
          "Content-Type": "application/json",
        },
        body:JSON.stringify({email:data.email,name:data.name}),
      });
    }catch(err){
      console.error("Failed to send welcome email:(",err);
    }
    router.push("/register/step2");
  };

  if (authLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (currentUser) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="flex items-center gap-2 mb-8 text-2xl font-semibold text-primary">
        {/* Logo Placeholder: Replace with your actual logo image component */}
        <span className="flex items-center justify-center h-8 w-8 bg-primary text-primary-foreground rounded-full font-bold text-xl">C</span>
        <span>CodeXStudy</span>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create Your Account</CardTitle>
          <CardDescription className="text-center">
            Step 1 of 3: Basic Information for CodeXStudy
          </CardDescription>
          <div className="flex justify-center gap-2 pt-2">
            {[1,2,3].map(step => (
              <div key={step} className={`h-2 w-8 rounded-full ${step === 1 ? 'bg-primary' : 'bg-muted'}`}></div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitStep1)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name"
                className={`${errors.name ? "border-destructive" : ""}`} 
                {...register("name")}
                required
                placeholder="John Doe"
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
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
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  id="password"
                  className={`${errors.password ? "border-destructive" : ""}`} 
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
                  <Progress value={passwordStrength} className="h-2" 
                    indicatorClassName={
                      passwordStrength < 50 ? "bg-destructive" :
                      passwordStrength < 75 ? "bg-yellow-500" :
                      "bg-green-500"
                    }
                  />
                  <p className="text-xs mt-1 text-muted-foreground">
                    Password strength: {
                      passwordStrength < 50 ? "Weak" :
                      passwordStrength < 75 ? "Medium" :
                      "Strong"
                    }
                  </p>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full">Continue to Step 2</Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
           <p className="text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign In
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
