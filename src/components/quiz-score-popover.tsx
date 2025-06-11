
"use client";

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import type { ScheduleTask } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Edit2, Check, XCircle, Info, Activity, FileQuestion } from 'lucide-react'; // Added Activity, FileQuestion

interface QuizScorePopoverProps {
  task: ScheduleTask;
  onSave: (taskId: string, score: number | undefined, attempted: boolean) => void;
  onTakeQuiz?: (task: ScheduleTask) => void; // Optional callback to trigger quiz modal
  disabled?: boolean;
}

export function QuizScorePopover({ task, onSave, onTakeQuiz, disabled }: QuizScorePopoverProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (task.quizAttempted && typeof task.quizScore === 'number') {
      setInputValue(String(task.quizScore));
    } else {
      setInputValue('');
    }
  }, [task, popoverOpen]);

  const handleSave = () => {
    const scoreNum = parseInt(inputValue, 10);
    if (inputValue === '' || isNaN(scoreNum)) {
        onSave(task.id, undefined, true);
        toast({ title: "Quiz Attempted", description: `Marked as attempted for "${task.task.substring(0,20)}...". No score entered.`});
        setPopoverOpen(false);
        return;
    }

    if (scoreNum < 0 || scoreNum > 100) {
      toast({
        title: 'Invalid Score',
        description: 'Score must be between 0 and 100.',
        variant: 'destructive',
      });
      return;
    }
    onSave(task.id, scoreNum, true);
    toast({ title: "Score Saved!", description: `Score for "${task.task.substring(0,20)}..." updated.`});
    setPopoverOpen(false);
  };

  const handleMarkUnattempted = () => {
    onSave(task.id, undefined, false);
    toast({ title: "Score Cleared", description: `Quiz for "${task.task.substring(0,20)}..." marked as not attempted.`});
    setPopoverOpen(false);
  };

  const scoreDisplay = task.quizAttempted
    ? (typeof task.quizScore === 'number' ? `Score: ${task.quizScore}%` : 'Attempted (No Score)')
    : 'Log Score / Status'; // Updated text for clarity when no score

  const triggerButtonText = task.quizAttempted
    ? (typeof task.quizScore === 'number' ? `Score: ${task.quizScore}%` : 'Attempted (No Score)')
    : 'Quiz Status';

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-auto p-0 text-xs
                      ${task.quizAttempted
                        ? (typeof task.quizScore === 'number' ? 'text-green-600 dark:text-green-500 hover:text-green-700' : 'text-orange-500 hover:text-orange-600')
                        : 'text-muted-foreground hover:text-foreground'}`}
          disabled={disabled}
          title={task.quizAttempted ? (typeof task.quizScore === 'number' ? `Edit score (${task.quizScore}%)` : 'Edit Score (Attempted)') : 'Log quiz score or status'}
        >
          {task.quizAttempted ? <Activity className="mr-1 h-3 w-3" /> : <Activity className="mr-1 h-3 w-3" />}
          {triggerButtonText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Quiz Log</h4>
            <p className="text-sm text-muted-foreground truncate" title={task.task}>
              Task: {task.task.substring(0, 30)}{task.task.length > 30 ? '...' : ''}
            </p>
          </div>
          {onTakeQuiz && !disabled && ( // Show "Take Quiz" button if handler is provided and not disabled
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onTakeQuiz(task);
                setPopoverOpen(false);
              }}
              className="w-full text-purple-600 border-purple-500 hover:bg-purple-500/10"
            >
                <FileQuestion className="mr-2 h-4 w-4" />
                {task.quizAttempted ? "Retake AI Quiz" : "Take AI Quiz"}
            </Button>
          )}
          <div className="grid gap-2">
            <Label htmlFor="quiz-score" className="text-sm">Manual Score Entry (%):</Label>
            <Input
              id="quiz-score"
              type="number"
              min="0"
              max="100"
              value={inputValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
              placeholder="0-100 or blank"
              className="h-8"
            />
             <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                <Info size={12}/> Leave blank to mark as attempted without a specific score.
            </p>
          </div>
          <div className="flex flex-col space-y-2">
            <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              <Check className="mr-2 h-4 w-4"/>Save Score & Mark Attempted
            </Button>
            {task.quizAttempted && (
                 <Button onClick={handleMarkUnattempted} variant="outline" size="sm">
                    <XCircle className="mr-2 h-4 w-4"/>Clear Score & Mark Unattempted
                </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
