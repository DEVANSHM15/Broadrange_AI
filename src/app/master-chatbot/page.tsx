
"use client";

import Link from "next/link";
import {
  BookOpen,
  BarChartBig,
  ListChecks,
  CalendarDaysIcon,
  Bot,
  Sparkles,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    href: "/planner",
    label: "AI Planner",
    description: "Create and manage your study plans.",
    icon: BookOpen,
  },
  {
    href: "/calendar",
    label: "Calendar",
    description: "View your daily schedule and tasks.",
    icon: CalendarDaysIcon,
  },
  {
    href: "/analytics",
    label: "Analytics",
    description: "Track your performance and insights.",
    icon: BarChartBig,
  },
  {
    href: "/achievements",
    label: "Progress Hub",
    description: "View achievements and all plans.",
    icon: ListChecks,
  },
];

export default function MasterChatbotPage() {
  return (
    <AppLayout>
      <div className="container mx-auto max-w-4xl py-12 px-4 md:px-6">
        <div className="text-center space-y-4 mb-12">
          <Bot className="mx-auto h-16 w-16 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">
            👋 Welcome to your all-in-one assistant!
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            I'm here to help you access all the features of CodeXStudy.
            Select an option below to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Link href={feature.href} key={feature.href} legacyBehavior>
              <a className="block h-full">
                <Card className="h-full hover:border-primary hover:bg-primary/5 transition-all duration-200 ease-in-out cursor-pointer flex flex-col">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{feature.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
