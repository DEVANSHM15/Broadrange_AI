"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Eye, EyeOff, BookOpen, User, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Image from "next/image";

const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type Step1FormData = z.infer<typeof step1Schema>;

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" {...props}>
        <path
        fill="currentColor"
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.98-4.66 1.98-3.57 0-6.47-2.9-6.47-6.47s2.9-6.47 6.47-6.47c1.98 0 3.33.83 4.1 1.59l2.42-2.42C18.13 2.56 15.79 1.5 12.48 1.5c-5.46 0-9.92 4.46-9.92 9.92s4.46 9.92 9.92 9.92c5.29 0 9.4-3.69 9.4-9.59 0-.6-.05-1.18-.16-1.72h-9.24z"
        />
    </svg>
);


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
    <div className="w-full min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="mx-auto max-w-sm w-full">
            <CardHeader className="text-center">
                <Link href="/" className="flex justify-center items-center gap-2 text-2xl font-bold text-primary mb-2">
                    <Image src="https://www.broadrange.ai/images/broadrange-logo.jpg" alt="Broadrange AI Logo" width={93} height={24} className="h-8 w-auto rounded-lg" />
                    <span className="font-bold sm:inline-block">CodeXStudy</span>
                </Link>
                <CardTitle className="text-2xl">Create an Account</CardTitle>
                <CardDescription>
                    Step 1 of 3: Enter your information below.
                </CardDescription>
                <div className="flex justify-center gap-2 pt-2">
                    {[1,2,3].map(step => (
                    <div key={step} className={`h-2 w-8 rounded-full ${step === 1 ? 'bg-primary' : 'bg-muted'}`}></div>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmitStep1)} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="name"
                            className={`pl-10 ${errors.name ? "border-destructive" : ""}`} 
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
                            className={`pl-10 ${errors.email ? "border-destructive" : ""}`} 
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
                            className={`pl-10 ${errors.password ? "border-destructive" : ""}`} 
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
                        Sign up with Google
                    </Button>
                </form>
            </CardContent>
             <CardFooter className="justify-center">
                <div className="text-sm">
                    Already have an account?{" "}
                    <Link href="/login" className="underline">
                        Sign In
                    </Link>
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}
