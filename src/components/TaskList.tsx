import { useState } from 'react';
import { Task } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

// Helper function to determine card styling based on coefficient
const getTaskCardStyles = (coefficient: number | null) => {
  if (coefficient === null) {
    // Default style for tasks without a coefficient
    return {
      backgroundColor: 'var(--card)',
      borderLeft: '4px solid var(--border)',
    };
  }

  let backgroundColor = 'var(--coef-average-bg)';
  let borderLeftColor = 'var(--coef-average-border)';

  if (coefficient >= 10) { // Excellent (10-13)
    backgroundColor = 'var(--coef-excellent-bg)';
    borderLeftColor = 'var(--coef-excellent-border)';
  } else if (coefficient >= 7) { // Bon (7-9)
    backgroundColor = 'var(--coef-good-bg)';
    borderLeftColor = 'var(--coef-good-border)';
  } else if (coefficient >= 4) { // Moyen (4-6)
    backgroundColor = 'var(--coef-average-bg)';
    borderLeftColor = 'var(--coef-average-border)';
  } else { // Faible (1-3)
    backgroundColor = 'var(--coef-low-bg)';
    borderLeftColor = 'var(--coef-low-border)';
  }

  return { 
    backgroundColor, 
    borderLeft: `4px solid ${borderLeftColor}` 
  };
};

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: () => void;
  showEdit?: boolean;
  showComplete?: boolean;
  showDelete?: boolean;
  showReopen?: boolean;
  onReopen?: (taskId: string) => void;
}

export function TaskList({ 
  tasks, 
  onTaskUpdate, 
  showEdit = false,
  showComplete = false,
  showDelete = false,
  showReopen = false,
  onReopen
}: TaskListProps) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    taskId: string | null;
    hasChildren: boolean;
  }>({
    isOpen: false,
    taskId: null,
    hasChildren: false
  });

  const handleComplete = async (taskId: string, hasChildren: boolean) => {
    if (hasChildren) {
      setConfirmDialog({ isOpen: true, taskId, hasChildren });
      return;
    }
    await completeTask(taskId);
  };

  const completeTask = async (taskId: string | null) => {
    if (!taskId) return;
    
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ completed: true }),
    });

    if (response.ok) {
      onTaskUpdate();
    } else {
      console.error('Erreur lors de la complétion de la tâche:', await response.text());
    }
    setConfirmDialog({ isOpen: false, taskId: null, hasChildren: false });
  };

  const handleDelete = async (taskId: string) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      onTaskUpdate();
    }
  };

  const organizeTasksByParent = (tasksList: Task[]) => {
    const parentTasks = tasksList.filter(task => !task.parentId);
    const childTasks = tasksList.filter(task => task.parentId);
    
    const organizedTasks: Task[] = [];
    
    parentTasks.forEach(parent => {
      organizedTasks.push(parent);
      const children = childTasks.filter(child => child.parentId === parent.id);
      organizedTasks.push(...children);
    });
    
    return organizedTasks;
  };

  const organizedTasks = organizeTasksByParent(tasks);

  return (
    <>
      <div id="task-list-container" className="task-list-container space-y-4">
        {organizedTasks.map((task) => {
          const cardStyles = getTaskCardStyles(task.coefficient);
          return (
            <Card
              key={task.id}
              id={`tasklist-card-${task.id}`}
              className={`task-card p-4 transition-shadow duration-200 ease-in-out hover:shadow-lg ${task.parentId ? 'ml-4 md:ml-8' : ''}`}
              style={cardStyles}
            >
              <div id={`tasklist-content-${task.id}`} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div id={`tasklist-main-info-${task.id}`} className="flex-grow flex items-start gap-3">
                  {showComplete && (
                    <Checkbox
                      id={`tasklist-checkbox-${task.id}`}
                      checked={task.completed}
                      onCheckedChange={() => handleComplete(task.id.toString(), task.children?.length > 0)}
                      className="mt-1"
                    />
                  )}
                  <div id={`tasklist-details-${task.id}`} className="flex-grow">
                    <Link id={`tasklist-title-link-${task.id}`} href={`/tasks/edit/${task.id}`} className="hover:underline">
                      <h3 id={`tasklist-name-${task.id}`} className="font-semibold text-base">
                        {task.name}
                      </h3>
                    </Link>
                    <p id={`tasklist-category-${task.id}`} className="text-sm text-muted-foreground">
                      {task.category?.name}
                      {task.parent && ` | Parent: ${task.parent.name}`}
                    </p>
                    {task.dueDate && (
                      <p id={`tasklist-due-date-${task.id}`} className="text-sm text-muted-foreground">
                        Échéance: {format(new Date(task.dueDate), "PPP")}
                      </p>
                    )}
                    <div id={`tasklist-metrics-${task.id}`} className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                      <span id={`tasklist-complexity-${task.id}`}>Complexité: {task.complexity}</span>
                      <span id={`tasklist-priority-${task.id}`}>Priorité: {task.priority}</span>
                      <span id={`tasklist-length-${task.id}`}>Durée: {task.length}</span>
                    </div>
                    {task.notes && (
                      <p id={`tasklist-notes-${task.id}`} className="text-sm text-muted-foreground mt-2 italic">
                        &quot;{task.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between self-stretch min-w-[70px]">
                  <div
                    id={`tasklist-coefficient-${task.id}`}
                    className="font-bold text-xl"
                  >
                    {task.coefficient}
                  </div>
                  <div id={`tasklist-actions-${task.id}`} className="flex gap-1 mt-2">
                    {showEdit && (
                      <Button
                        id={`tasklist-edit-btn-${task.id}`}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => router.push(`/tasks/edit/${task.id.toString()}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {showDelete && (
                      <Button
                        id={`tasklist-delete-btn-${task.id}`}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(task.id.toString())}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    {showReopen && onReopen && (
                      <Button
                        id={`tasklist-reopen-btn-${task.id}`}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onReopen(task.id.toString())}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(isOpen) => 
          setConfirmDialog(prev => ({ ...prev, isOpen }))
        }
      >
        <AlertDialogContent id="task-confirm-dialog" className="task-confirm-dialog">
          <AlertDialogHeader id="task-confirm-header">
            <AlertDialogTitle id="task-confirm-title">Confirmation requise</AlertDialogTitle>
            <AlertDialogDescription id="task-confirm-description">
              Il y a des tâches enfants à cette tâche, êtes-vous sûr de vouloir la compléter ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter id="task-confirm-footer">
            <AlertDialogCancel id="task-dialog-cancel" className="task-dialog-cancel">Annuler</AlertDialogCancel>
            <AlertDialogAction id="task-dialog-confirm" className="task-dialog-confirm" onClick={() => completeTask(confirmDialog.taskId)}>
              Je confirme
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}