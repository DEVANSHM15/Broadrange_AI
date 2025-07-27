
"use client";

import Link from "next/link";
import Image from "next/image";
import {
  BrainCircuit,
  TrendingUp,
  CalendarCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

export default function LandingPage() {
  const { currentUser } = useAuth();

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image src="https://www.broadrange.ai/images/broadrange-logo.jpg" alt="Broadrange AI Logo" width={93} height={24} className="h-8 w-auto rounded-lg" />
            <span className="font-bold sm:inline-block">CodeXStudy</span>
          </Link>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center gap-4">
              {currentUser ? (
                <Button asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost">
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">Get Started</Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-28 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-4">
                 <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Accelerate Your Learning
                  </h1>
                  <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                    Highly personalized study plans, expertly curated to meet your objectives and drive your academic success forward.
                  </p>
              </div>
              <div className="space-x-4">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                    <Link href={currentUser ? "/dashboard" : "/register"}>
                      {currentUser ? "Open Dashboard" : "Get Started"}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
              </div>
               <div className="w-full max-w-5xl pt-8">
                <Image
                  src="https://placehold.co/1200x600.png"
                  alt="AI Study Planner Dashboard"
                  width={1200}
                  height={600}
                  className="rounded-xl shadow-2xl shadow-primary/20"
                  data-ai-hint="dashboard analytics"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-16 lg:py-20 bg-secondary/40">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything You Need to Succeed</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform is packed with features designed to enhance your learning experience and boost your productivity.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:grid-cols-3 lg:gap-12 mt-12">
              <div className="grid gap-1 text-center">
                <div className="flex justify-center items-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <BrainCircuit className="h-8 w-8" />
                    </div>
                </div>
                <h3 className="text-lg font-bold">AI-Powered Planning</h3>
                <p className="text-sm text-muted-foreground">Intelligent agents create optimal study schedules based on your subjects and goals.</p>
              </div>
              <div className="grid gap-1 text-center">
                 <div className="flex justify-center items-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <TrendingUp className="h-8 w-8" />
                    </div>
                </div>
                <h3 className="text-lg font-bold">Adaptive Learning</h3>
                <p className="text-sm text-muted-foreground">The system adjusts your plan based on your progress and performance, keeping you on track.</p>
              </div>
              <div className="grid gap-1 text-center">
                 <div className="flex justify-center items-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <CalendarCheck className="h-8 w-8" />
                    </div>
                </div>
                <h3 className="text-lg font-bold">Progress Tracking</h3>
                <p className="text-sm text-muted-foreground">Visualize your progress with insightful analytics and stay motivated with achievements.</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Final CTA */}
        <section className="w-full py-12 md:py-16 lg:py-20 border-t">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Ready to Ace Your Studies?</h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Join CodeXStudy today and unlock your full academic potential. Your personalized study journey awaits.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
              <Button asChild size="lg">
                <Link href={currentUser ? "/dashboard" : "/register"}>
                  {currentUser ? "Back to Dashboard" : "Sign Up Now"}
                  <Sparkles className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
