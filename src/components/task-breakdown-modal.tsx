
"use client";

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import type { ScheduleTask, SubTask } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, PlusCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TaskBreakdownModalProps {
  task: ScheduleTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: ScheduleTask) => void;
}

export function TaskBreakdownModal({ task, isOpen, onClose, onSave }: TaskBreakdownModalProps) {
  const [currentTask, setCurrentTask] = useState<ScheduleTask | null>(null);
  const [newSubTaskText, setNewSubTaskText] = useState('');

  useEffect(() => {
    if (task) {
      setCurrentTask({ ...task, subTasks: task.subTasks ? [...task.subTasks.map(st => ({...st}))] : [] });
    } else {
      setCurrentTask(null);
    }
  }, [task, isOpen]);

  if (!isOpen || !currentTask) {
    return null;
  }

  const handleAddSubTask = () => {
    if (newSubTaskText.trim() === '') return;
    const newSub: SubTask = {
      id: String(Date.now() + Math.random()),
      text: newSubTaskText.trim(),
      completed: false,
    };
    setCurrentTask(prev => prev ? ({ ...prev, subTasks: [...(prev.subTasks || []), newSub] }) : null);
    setNewSubTaskText('');
  };

  const handleSubTaskChange = (subTaskId: string, newText: string) => {
    setCurrentTask(prev => prev ? ({
      ...prev,
      subTasks: (prev.subTasks || []).map(st => st.id === subTaskId ? { ...st, text: newText } : st),
    }) : null);
  };

  const handleSubTaskToggle = (subTaskId: string) => {
    setCurrentTask(prev => prev ? ({
      ...prev,
      subTasks: (prev.subTasks || []).map(st => st.id === subTaskId ? { ...st, completed: !st.completed } : st),
    }) : null);
  };

  const handleDeleteSubTask = (subTaskId: string) => {
    setCurrentTask(prev => prev ? ({
      ...prev,
      subTasks: (prev.subTasks || []).filter(st => st.id !== subTaskId),
    }) : null);
  };

  const handleSaveChanges = () => {
    if (currentTask) {
      onSave(currentTask);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Break Down Task</DialogTitle>
          <DialogDescription>
            Manage sub-tasks for: <span className="font-semibold">{currentTask.task.substring(0, 50)}{currentTask.task.length > 50 ? '...' : ''}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New sub-task description"
              value={newSubTaskText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewSubTaskText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSubTask()}
            />
            <Button onClick={handleAddSubTask} size="icon" variant="outline">
              <PlusCircle className="h-4 w-4" />
              <span className="sr-only">Add Sub-task</span>
            </Button>
          </div>

          {currentTask.subTasks && currentTask.subTasks.length > 0 ? (
            <ScrollArea className="h-[200px] pr-3">
              <div className="space-y-3">
                {currentTask.subTasks.map(subTask => (
                  <div key={subTask.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                    <Checkbox
                      id={`subtask-check-${subTask.id}`}
                      checked={subTask.completed}
                      onCheckedChange={() => handleSubTaskToggle(subTask.id)}
                    />
                    <Input
                      id={`subtask-text-${subTask.id}`}
                      value={subTask.text}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleSubTaskChange(subTask.id, e.target.value)}
                      className={`flex-grow h-8 text-sm ${subTask.completed ? 'line-through text-muted-foreground' : ''}`}
                    />
                    <Button onClick={() => handleDeleteSubTask(subTask.id)} variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete Sub-task</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No sub-tasks yet. Add one above!</p>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSaveChanges}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
