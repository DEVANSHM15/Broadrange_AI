
"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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

  // Effect to update timeLeft IF an active duration (focus/break) or mode changes,
  // AND the timer is currently NOT active.
  // This allows changing settings for the current mode while paused, and having timeLeft update.
  // It also sets the initial timeLeft based on default mode and activeFocusMinutes.
  useEffect(() => {
    if (!isActive) {
      if (mode === "focus") {
        setTimeLeft(activeFocusMinutes * 60);
      } else {
        setTimeLeft(activeBreakMinutes * 60);
      }
    }
  }, [activeFocusMinutes, activeBreakMinutes, mode]); // REMOVED isActive from dependency array

  const syncActiveDurationsFromInputs = useCallback(() => {
    let focusUpdated = false;
    let breakUpdated = false;

    const newFocus = parseInt(inputFocusMinutes, 10);
    if (!isNaN(newFocus) && newFocus >= 1 && newFocus <= 120) {
      if (activeFocusMinutes !== newFocus) {
        setActiveFocusMinutes(newFocus);
        focusUpdated = true;
      }
    } else {
      setInputFocusMinutes(String(activeFocusMinutes)); 
    }
    
    const newBreak = parseInt(inputBreakMinutes, 10);
    if (!isNaN(newBreak) && newBreak >= 1 && newBreak <= 60) {
       if (activeBreakMinutes !== newBreak) {
        setActiveBreakMinutes(newBreak);
        breakUpdated = true;
      }
    } else {
       setInputBreakMinutes(String(activeBreakMinutes)); 
    }
    return { focusUpdated, breakUpdated };
  }, [inputFocusMinutes, inputBreakMinutes, activeFocusMinutes, activeBreakMinutes]);


  const handleNextSession = useCallback(() => {
    setIsActive(false); 
    syncActiveDurationsFromInputs(); // Ensure active durations are up-to-date from inputs
    
    if (mode === "focus") {
      setMode("break");
      setTimeLeft(activeBreakMinutes * 60); // Uses the (potentially) updated activeBreakMinutes
    } else { 
      setMode("focus");
      setTimeLeft(activeFocusMinutes * 60); // Uses the (potentially) updated activeFocusMinutes
    }
  }, [mode, syncActiveDurationsFromInputs, activeFocusMinutes, activeBreakMinutes]);


  // Effect for the countdown interval
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
    syncActiveDurationsFromInputs(); 
    if (!isActive) { 
      // If timeLeft is 0, it means a session just ended or timer was reset.
      // We need to set timeLeft to the full duration for the current mode.
      // The useEffect [activeFocusMinutes, activeBreakMinutes, mode] handles this if !isActive
      // by setting timeLeft. So, this explicit check might only be needed if that useEffect
      // hasn't run yet or for absolute clarity.
      if (timeLeft === 0) { 
        if (mode === 'focus') {
          setTimeLeft(activeFocusMinutes * 60);
        } else {
          setTimeLeft(activeBreakMinutes * 60);
        }
      }
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    syncActiveDurationsFromInputs(); 
    setMode("focus"); 
    setTimeLeft(activeFocusMinutes * 60); 
  };
  
  const handleInputBlur = (inputType: 'focus' | 'break') => {
    let newDuration = 0;
    if (inputType === 'focus') {
      const newFocus = parseInt(inputFocusMinutes, 10);
      if (!isNaN(newFocus) && newFocus >= 1 && newFocus <= 120) {
        setActiveFocusMinutes(newFocus);
        newDuration = newFocus * 60;
      } else {
        setInputFocusMinutes(String(activeFocusMinutes)); // Revert invalid input
        newDuration = activeFocusMinutes * 60; // Keep current active duration
      }
    } else { // break
      const newBreak = parseInt(inputBreakMinutes, 10);
      if (!isNaN(newBreak) && newBreak >= 1 && newBreak <= 60) {
        setActiveBreakMinutes(newBreak);
        newDuration = newBreak * 60;
      } else {
        setInputBreakMinutes(String(activeBreakMinutes)); // Revert invalid input
        newDuration = activeBreakMinutes * 60; // Keep current active duration
      }
    }

    // If timer is not active AND the blurred input matches the current mode, update timeLeft
    if (!isActive) {
      if (mode === inputType) {
        setTimeLeft(newDuration);
      }
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) { 
        setInputFocusMinutes(String(activeFocusMinutes));
        setInputBreakMinutes(String(activeBreakMinutes));
        // If timer is not active when opening, ensure timeLeft matches current mode & active duration
        if (!isActive) {
            if (mode === 'focus') {
                setTimeLeft(activeFocusMinutes * 60);
            } else {
                setTimeLeft(activeBreakMinutes * 60);
            }
        }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Timer className="mr-2 h-4 w-4"/> Pomodoro Timer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
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

