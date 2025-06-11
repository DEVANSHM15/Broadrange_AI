
"use client";

import Link from "next/link";
import { Zap, BarChart3, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

export default function LandingPage() {
  const { currentUser } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="py-4 px-6 md:px-10 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-primary">
            {/* Logo Placeholder: Replace with your actual logo image component */}
            <span className="flex items-center justify-center h-7 w-7 bg-primary text-primary-foreground rounded-full font-bold text-md">B</span>
            <span>Broadrange AI</span>
          </Link>
          <nav className="flex items-center gap-4">
            {currentUser ? (
              <Button asChild variant="default">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild variant="default">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-16 md:py-24 lg:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container mx-auto text-center px-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Smarter Studying Starts Here
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Leverage the power of AI to create personalized study plans, track your progress,
              and achieve your academic goals faster than ever with Broadrange AI.
            </p>
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link href={currentUser ? "/dashboard" : "/register"}>
                {currentUser ? "Open Dashboard" : "Get Started For Free"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-semibold text-center mb-12">
              Why Choose Broadrange AI Study Planner?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader className="items-center">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
                    <Zap className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl">AI-Powered Planning</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Our intelligent agents analyze your subjects and goals to create optimal study schedules.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="items-center">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
                    <BarChart3 className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl">Adaptive Learning</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  The system adjusts your plan based on your progress and performance, keeping you on track.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="items-center">
                   <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
                    <Target className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl">Personalized Insights</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Gain valuable insights into your study habits and identify areas for improvement.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Removed the footer from here, as it's handled by RootLayout */}
      {/* 
      <footer className="py-8 border-t">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} Broadrange AI. All rights reserved.
        </div>
      </footer> 
      */}
    </div>
  );
}
