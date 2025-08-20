
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
    <div className="flex flex-col min-h-[100dvh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background text-foreground">
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
        <section className="w-full py-20 md:py-28 lg:py-32 relative overflow-hidden">
          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="flex flex-col items-start space-y-6 text-left">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-br from-primary via-primary/80 to-foreground">
                      Supercharge Your Studies with AI
                  </h1>
                  <p className="max-w-[700px] text-muted-foreground md:text-xl">
                    Our intelligent agents deliver tailored study plans and insights to help you achieve your academic goals, faster and smarter than ever before.
                  </p>
                  <div className="flex gap-4">
                    <Button asChild size="lg" className="text-lg px-8 py-6 glowing-btn">
                        <Link href={currentUser ? "/dashboard" : "/register"}>
                          {currentUser ? "Open Dashboard" : "Get Started For Free"}
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                  </div>
              </div>
              <div className="w-full max-w-xl mx-auto lg:mx-0">
                  <Image
                      src="https://blog.cdn.cmarix.com/blog/wp-content/uploads/2022/05/Blog-1-2.png"
                      alt="AI Study Planner Dashboard"
                      width={800}
                      height={600}
                      className="rounded-xl border shadow-2xl shadow-primary/20"
                      data-ai-hint="dashboard planning"
                  />
              </div>
            </div>
          </div>
        </section>

        {/* Features & CTA Section with Background Glows */}
        <div className="relative overflow-hidden">
           {/* Background decoration */}
           <div className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse delay-500"></div>
           <div className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

          {/* Features Section */}
          <section className="w-full py-16 md:py-24 lg:py-28 bg-transparent">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary font-semibold">Core Features</div>
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Smart AI for Everyday Learning</h2>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Our platform is packed with features designed to enhance your learning experience and boost your productivity.
                  </p>
                </div>
              </div>
              <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:grid-cols-3 lg:gap-12 mt-12">
                <Card className="text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-card to-card hover:-translate-y-2 transition-transform duration-300">
                  <CardHeader className="items-center">
                    <div className="p-3.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <Layers className="h-7 w-7" />
                    </div>
                    <CardTitle className="mt-2">Personalized Plans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Optimal study schedules based on your goals.</p>
                  </CardContent>
                </Card>
                <Card className="text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-card to-card hover:-translate-y-2 transition-transform duration-300">
                  <CardHeader className="items-center">
                     <div className="p-3.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <BarChart className="h-7 w-7" />
                    </div>
                    <CardTitle className="mt-2">Advanced Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Visualize your progress with insightful analytics.</p>
                  </CardContent>
                </Card>
                <Card className="text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-card to-card hover:-translate-y-2 transition-transform duration-300">
                  <CardHeader className="items-center">
                     <div className="p-3.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <BookOpenCheck className="h-7 w-7" />
                    </div>
                    <CardTitle className="mt-2">AI-Powered Quizzes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Reinforce learning with on-demand quizzes.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
          
          {/* Final CTA */}
          <section className="w-full py-12 md:py-16 lg:py-20 border-t bg-transparent">
            <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Ready to Ace Your Studies?</h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Join CodeXStudy today and unlock your full academic potential. Your personalized study journey awaits.
                </p>
              </div>
              <div className="mx-auto w-full max-w-sm space-y-2">
                <Button asChild size="lg" className="glowing-btn">
                  <Link href={currentUser ? "/dashboard" : "/register"}>
                    {currentUser ? "Back to Dashboard" : "Sign Up Now"}
                    <Sparkles className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
