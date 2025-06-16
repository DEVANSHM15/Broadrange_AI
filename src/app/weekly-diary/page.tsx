
"use client";

import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from 'react';

export default function WeeklyDiaryPage() {
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    // Ensure this runs only on the client after hydration
    setCurrentDate(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  // Placeholder data for tasks, as in the image
  const tasksToDoPlaceholders = Array(4).fill(null);
  const tasksCompletedPlaceholders = Array(4).fill(null);
  const weekNumber = 1; // This can be made dynamic later

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="w-full max-w-3xl mx-auto shadow-lg border border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-3xl font-bold tracking-wider uppercase text-gray-700 dark:text-gray-300">
              Weekly Diary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-8 md:px-10">
            <div className="flex justify-between items-center mb-8 text-lg font-medium text-gray-600 dark:text-gray-400">
              <p>WEEK : {weekNumber}</p>
              <p>DATE : {currentDate || "Loading..."}</p>
            </div>

            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                Tasks to be done:
              </h2>
              <ol className="space-y-3 text-md text-gray-800 dark:text-gray-200">
                {tasksToDoPlaceholders.map((_, index) => (
                  <li key={`todo-${index}`} className="flex items-center">
                    <span className="mr-3 text-gray-500 dark:text-gray-400">{index + 1}.</span>
                    <div className="flex-grow h-px bg-gray-300 dark:bg-gray-600"></div> {/* Line for task */}
                  </li>
                ))}
              </ol>
            </div>

            <Separator className="my-8 border-gray-300 dark:border-gray-600" />

            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                Tasks Completed:
              </h2>
              <ol className="space-y-3 text-md text-gray-800 dark:text-gray-200">
                {tasksCompletedPlaceholders.map((_, index) => (
                  <li key={`completed-${index}`} className="flex items-center">
                    <span className="mr-3 text-gray-500 dark:text-gray-400">{index + 1}.</span>
                    <div className="flex-grow h-px bg-gray-300 dark:bg-gray-600"></div> {/* Line for task */}
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
