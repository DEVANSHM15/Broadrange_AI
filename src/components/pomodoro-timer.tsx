
"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";

const DEFAULT_WORK_MINUTES = 25;
const DEFAULT_SHORT_BREAK_MINUTES = 5;

export function PomodoroTimerModal() {
  const [isOpen, setIsOpen] = useState(false);

  const [inputFocusMinutes, setInputFocusMinutes] = useState(String(DEFAULT_WORK_MINUTES));
  const [inputBreakMinutes, setInputBreakMinutes] = useState(String(DEFAULT_SHORT_BREAK_MINUTES));

  const [activeFocusMinutes, setActiveFocusMinutes] = useState(DEFAULT_WORK_MINUTES);
  const [activeBreakMinutes, setActiveBreakMinutes] = useState(DEFAULT_SHORT_BREAK_MINUTES);
  
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Only reset the display time if the timer is NOT currently active.
    // This allows pausing without resetting the time.
    if (!isActive) {
      if (mode === "focus") {
        setTimeLeft(activeFocusMinutes * 60);
      } else {
        setTimeLeft(activeBreakMinutes * 60);
      }
    }
    // We intentionally exclude `isActive` from the dependency array to prevent this from running on pause.
    // The purpose is to update timeLeft only when mode or durations change while paused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFocusMinutes, activeBreakMinutes, mode]);


  const handleNextSession = useCallback(() => {
    setIsActive(false); 
    if (mode === "focus") {
      setMode("break");
    } else { 
      setMode("focus");
    }
  }, [mode]);


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isOpen && isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (isOpen && isActive && timeLeft === 0) {
      handleNextSession();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, isActive, timeLeft, handleNextSession]);


  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false); // Stop the timer
    setMode("focus"); // Always reset to focus mode

    const newFocusMins = parseInt(inputFocusMinutes, 10);
    const resetMinutes = (!isNaN(newFocusMins) && newFocusMins >= 1 && newFocusMins <= 120) 
      ? newFocusMins 
      : DEFAULT_WORK_MINUTES;

    if (activeFocusMinutes !== resetMinutes) {
      setActiveFocusMinutes(resetMinutes);
    }
    
    // Directly set the timeLeft state to ensure the display updates correctly.
    setTimeLeft(resetMinutes * 60);
  };
  
  const handleInputBlur = (inputType: 'focus' | 'break') => {
    if (inputType === 'focus') {
      const newFocusMins = parseInt(inputFocusMinutes, 10);
      if (!isNaN(newFocusMins) && newFocusMins >= 1 && newFocusMins <= 120) {
        setActiveFocusMinutes(newFocusMins);
      } else {
        setInputFocusMinutes(String(activeFocusMinutes)); // Revert if invalid
      }
    } else {
      const newBreakMins = parseInt(inputBreakMinutes, 10);
      if (!isNaN(newBreakMins) && newBreakMins >= 1 && newBreakMins <= 60) {
        setActiveBreakMinutes(newBreakMins);
      } else {
        setInputBreakMinutes(String(activeBreakMinutes)); // Revert if invalid
      }
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setIsActive(false); // Stop timer when closing modal
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Timer className="mr-2 h-4 w-4"/> Pomodoro Timer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-card to-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Pomodoro Timer</DialogTitle>
          <DialogDescription className="text-center">
            Stay focused and manage your study sessions effectively.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 text-center">
          <div className="mb-6">
            <div className="text-6xl font-bold text-primary tabular-nums">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider">
              {mode === 'focus' ? 'Focus Time' : 'Break Time'}
            </div>
          </div>
          <div className="flex justify-center gap-3 mb-8">
            <Button onClick={toggleTimer} size="lg" className="px-8">
              {isActive ? <Pause className="h-5 w-5 mr-2"/> : <Play className="h-5 w-5 mr-2"/>}
              {isActive ? "Pause" : (timeLeft > 0 && timeLeft < (mode === 'focus' ? activeFocusMinutes*60 : activeBreakMinutes*60) ? "Resume" : "Start")}
            </Button>
            <Button onClick={resetTimer} variant="outline" size="lg">
                <RotateCcw className="h-5 w-5 mr-2"/>Reset
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="space-y-1">
              <Label htmlFor="focus-time">Focus (min)</Label>
              <Input 
                type="number" 
                id="focus-time" 
                value={inputFocusMinutes} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInputFocusMinutes(e.target.value)}
                onBlur={() => handleInputBlur('focus')}
                min="1" max="120" 
                disabled={isActive}
                className="text-center"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="break-time">Break (min)</Label>
              <Input 
                type="number" 
                id="break-time" 
                value={inputBreakMinutes} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInputBreakMinutes(e.target.value)}
                onBlur={() => handleInputBlur('break')}
                min="1" max="60"
                disabled={isActive}
                className="text-center"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
