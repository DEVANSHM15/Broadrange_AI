
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
import { Edit2, Check, XCircle, Info, Activity, FileQuestion, BookText } from 'lucide-react';

interface LogScorePopoverProps {
  task: ScheduleTask;
  onSave: (taskId: string, score: number | undefined, attempted: boolean) => void;
  onTakeQuiz?: (task: ScheduleTask) => void;
  disabled?: boolean;
}

export function LogScorePopover({ task, onSave, onTakeQuiz, disabled }: LogScorePopoverProps) {
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
        toast({ title: "Task Attempted", description: `Marked as attempted for "${task.task.substring(0,20)}...". No specific score logged.`});
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
    toast({ title: "Manual Score Saved!", description: `Score for "${task.task.substring(0,20)}..." updated.`});
    setPopoverOpen(false);
  };

  const handleMarkUnattempted = () => {
    onSave(task.id, undefined, false);
    toast({ title: "Status Cleared", description: `Task "${task.task.substring(0,20)}..." marked as not attempted.`});
    setPopoverOpen(false);
  };

  const triggerButtonText = task.quizAttempted
    ? (typeof task.quizScore === 'number' ? `Score: ${task.quizScore}% (Edit)` : 'Attempted (Log Score)')
    : 'Log Score / Status';

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
          title={task.quizAttempted ? (typeof task.quizScore === 'number' ? `Current Score: ${task.quizScore}%. Click to edit or take AI quiz.` : 'Task marked attempted. Click to log score or take AI quiz.') : 'Log manual score or take AI quiz for this task.'}
        >
          {typeof task.quizScore === 'number' ? <Check className="mr-1 h-3 w-3 text-green-500"/> : <BookText className="mr-1 h-3 w-3" />}
          {triggerButtonText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96"> {/* Increased width from w-80 to w-96 */}
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Log Score/Status</h4>
            <p className="text-sm text-muted-foreground truncate" title={task.task}>
              Task: {task.task.substring(0, 40)}{task.task.length > 40 ? '...' : ''}
            </p>
          </div>

          {onTakeQuiz && !disabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if(onTakeQuiz) onTakeQuiz(task);
                setPopoverOpen(false);
              }}
              className="w-full text-purple-600 border-purple-500 hover:bg-purple-500/10"
            >
                <FileQuestion className="mr-2 h-4 w-4" />
                {task.quizAttempted ? "Retake AI Quiz" : "Take AI Quiz"}
            </Button>
          )}

          <div className="grid gap-2">
            <Label htmlFor={`manual-score-${task.id}`} className="text-sm">Manual Score Entry (%):</Label>
            <Input
              id={`manual-score-${task.id}`}
              type="number"
              min="0"
              max="100"
              value={inputValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
              placeholder="0-100 or blank"
              className="h-8"
              disabled={disabled}
            />
             <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                <Info size={12}/> Leave blank to mark as attempted without a specific score. Overrides AI quiz score if saved.
            </p>
          </div>
          {!disabled && (
            <div className="flex flex-col space-y-2">
              <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                <Check className="mr-2 h-4 w-4"/>Save & Mark Attempted
              </Button>
              {task.quizAttempted && (
                   <Button onClick={handleMarkUnattempted} variant="destructive" size="sm">
                      <XCircle className="mr-2 h-4 w-4"/>Clear Score & Mark Unattempted
                  </Button>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
