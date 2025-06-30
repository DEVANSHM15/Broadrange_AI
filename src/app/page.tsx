"use client";

import Link from "next/link";
import Image from "next/image";
import {
  BrainCircuit,
  TrendingUp,
  CalendarCheck,
  ArrowRight,
  Sparkles,
  BookOpen,
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
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-bold sm:inline-block">Broadrange AI</span>
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
        <section className="w-full py-12 md:py-20 lg:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                   <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-primary">
                    Revolutionize Your Study Habits
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Broadrange AI transforms your study routine with intelligent, adaptive plans tailored just for you. Stop guessing, start achieving.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg" className="text-lg px-8 py-6">
                    <Link href={currentUser ? "/dashboard" : "/register"}>
                      {currentUser ? "Open Dashboard" : "Start For Free"}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://static.vecteezy.com/system/resources/previews/050/965/360/non_2x/open-notebook-with-blank-pages-next-to-a-cup-of-coffee-on-a-wooden-desk-photo.jpg"
                width={600}
                height={400}
                alt="Notebook and coffee on a desk"
                data-ai-hint="notebook coffee"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square"
                priority
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-16 lg:py-20 bg-muted/40">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Key Features</div>
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

        {/* How It Works Section */}
        <section className="w-full py-12 md:py-16 lg:py-20">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Get Started in 3 Easy Steps</h2>
                    <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                        Achieving your academic goals has never been more straightforward.
                    </p>
                </div>
                <div className="relative grid gap-10 sm:grid-cols-3">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 hidden sm:block"></div>
                     <Card className="relative p-6">
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg border-4 border-background">1</div>
                        <CardHeader className="pt-8">
                            <CardTitle>Create Your Plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Tell our AI your subjects, how much time you have, and your goals. Get a personalized schedule in seconds.</p>
                        </CardContent>
                    </Card>
                    <Card className="relative p-6">
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg border-4 border-background">2</div>
                        <CardHeader className="pt-8">
                            <CardTitle>Follow and Track</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Follow your daily tasks, mark them as complete, take quizzes, and watch your progress bar grow.</p>
                        </CardContent>
                    </Card>
                    <Card className="relative p-6">
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg border-4 border-background">3</div>
                        <CardHeader className="pt-8">
                            <CardTitle>Analyze & Adapt</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Review your performance analytics. If you fall behind, let AdaptiveAI recalibrate your plan instantly.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>

        {/* Final CTA */}
        <section className="w-full py-12 md:py-16 lg:py-20 bg-primary/10">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Ready to Ace Your Studies?</h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Join Broadrange AI today and unlock your full academic potential. Your personalized study journey awaits.
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
