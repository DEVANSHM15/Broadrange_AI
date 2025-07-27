
"use client";

import Link from "next/link";
import {
  BookOpen,
  BarChartBig,
  ListChecks,
  CalendarDaysIcon,
  Bot,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const features = [
  {
    href: "/planner",
    label: "AI Planner",
    description: "Create, view, or adapt your study plan.",
    icon: BookOpen,
  },
  {
    href: "/calendar",
    label: "Calendar",
    description: "Manage daily tasks and log progress.",
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
    description: "View achievements and all your plans.",
    icon: ListChecks,
  },
];

export default function MasterChatbotPage() {
  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl flex-grow flex flex-col justify-center py-12 px-4 md:px-6">
        <div className="flex items-start space-x-4">
          <Avatar className="h-10 w-10 border">
            <AvatarFallback>
              <Bot />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-4">
            <div className="bg-muted p-4 rounded-lg rounded-tl-none">
              <p className="font-semibold">CodeXStudy Assistant</p>
              <p className="text-muted-foreground">
                Hello! I'm here to help you navigate the app. What would you like to do today?
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feature) => (
                <Link href={feature.href} key={feature.href} passHref>
                  <Button
                    variant="outline"
                    className="w-full h-auto justify-start p-4 text-left"
                  >
                    <div className="flex items-center w-full">
                      <div className="mr-4">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-semibold">{feature.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
