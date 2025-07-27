
"use client";

import Link from "next/link";
import Image from "next/image";
import {
  BrainCircuit,
  TrendingUp,
  CalendarCheck,
  ArrowRight,
  Sparkles,
  Layers,
  BarChart,
  BookOpenCheck
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
        <section className="w-full py-20 md:py-28 lg:py-32 relative">
          <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom dark:border-b dark:border-slate-100/5 [mask-image:linear-gradient(to_bottom,transparent,black)]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>

          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div className="flex flex-col items-start space-y-6">
                 <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none text-left">
                    Transforming Ideas into Reality with AI
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl text-left">
                    Experience the future of personalized education. Our intelligent agents deliver tailored study plans and insights to help you achieve your academic goals.
                  </p>
                  <div className="flex gap-4">
                    <Button asChild size="lg" className="text-lg px-8 py-6">
                        <Link href={currentUser ? "/dashboard" : "/register"}>
                          {currentUser ? "Open Dashboard" : "Get Started"}
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                     <Button asChild size="lg" className="text-lg px-8 py-6" variant="outline">
                        <Link href={currentUser ? "/master-chatbot" : "/register"}>
                          Chat with AI
                        </Link>
                    </Button>
                  </div>
              </div>
              <div className="relative w-full h-full min-h-[300px] md:min-h-[400px]">
                <Image
                  src="https://blog.cdn.cmarix.com/blog/wp-content/uploads/2022/05/Blog-1-2.png"
                  alt="E-learning and online study illustration"
                  layout="fill"
                  objectFit="contain"
                  className="rounded-xl"
                  data-ai-hint="e-learning online study"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-16 md:py-24 lg:py-28 bg-card/40">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary font-semibold">ABOUT US</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">We build for you</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform is packed with features designed to enhance your learning experience and boost your productivity.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:grid-cols-3 lg:gap-12 mt-12">
              <div className="grid gap-2 text-center items-center justify-center">
                <div className="flex justify-center items-center mb-3">
                    <div className="p-3.5 rounded-lg bg-secondary text-primary border border-border">
                        <Layers className="h-7 w-7" />
                    </div>
                </div>
                <h3 className="text-lg font-bold">Personalized Plans</h3>
                <p className="text-sm text-muted-foreground">Optimal study schedules based on your goals.</p>
              </div>
              <div className="grid gap-2 text-center items-center justify-center">
                 <div className="flex justify-center items-center mb-3">
                    <div className="p-3.5 rounded-lg bg-secondary text-primary border border-border">
                        <BarChart className="h-7 w-7" />
                    </div>
                </div>
                <h3 className="text-lg font-bold">Advanced Analytics</h3>
                <p className="text-sm text-muted-foreground">Visualize your progress with insightful analytics.</p>
              </div>
              <div className="grid gap-2 text-center items-center justify-center">
                 <div className="flex justify-center items-center mb-3">
                    <div className="p-3.5 rounded-lg bg-secondary text-primary border border-border">
                        <BookOpenCheck className="h-7 w-7" />
                    </div>
                </div>
                <h3 className="text-lg font-bold">AI-Powered Quizzes</h3>
                <p className="text-sm text-muted-foreground">Reinforce learning with on-demand quizzes.</p>
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
