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
        {organizedTasks.map((task) => (
          <Card key={task.id} id={`tasklist-card-${task.id}`} className={`task-card p-4 ${task.parentId ? 'task-child ml-4 md:ml-8' : 'task-parent'}`}>
            <div id={`tasklist-content-${task.id}`} className="task-content flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div id={`tasklist-main-info-${task.id}`} className="task-main-info flex items-start gap-2">
                {showComplete && (
                  <Checkbox
                    id={`tasklist-checkbox-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={() => handleComplete(task.id.toString(), task.children?.length > 0)}
                    className="task-checkbox text-gray-700 mt-1"
                  />
                )}
                <div id={`tasklist-details-${task.id}`} className="task-details flex-grow">
                  <div id={`tasklist-header-${task.id}`} className="task-header flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <Link id={`tasklist-title-link-${task.id}`} href={`/tasks/edit/${task.id}`} className="task-title hover:underline">
                      <h3 id={`tasklist-name-${task.id}`} className="font-medium">
                        {task.name}
                      </h3>
                    </Link>
                    <div id={`tasklist-coefficient-${task.id}`} className="task-coefficient font-semibold text-sm md:text-right whitespace-nowrap">
                      Coefficient: {task.coefficient}
                    </div>
                  </div>
                  <p id={`tasklist-category-${task.id}`} className="task-category text-sm text-muted-foreground">
                    {task.category?.name}
                    {task.parent && ` | Parent: ${task.parent.name}`}
                  </p>
                  {task.dueDate && (
                    <p id={`tasklist-due-date-${task.id}`} className="task-due-date text-sm text-muted-foreground">
                      Due: {format(new Date(task.dueDate), "PPP")}
                    </p>
                  )}
                  <div id={`tasklist-metrics-${task.id}`} className="task-metrics flex flex-col md:flex-row gap-2 text-sm text-muted-foreground mt-1">
                    <span id={`tasklist-complexity-${task.id}`} className="task-complexity">Complexité: {task.complexity}</span>
                    <span className="hidden md:inline">•</span>
                    <span id={`tasklist-priority-${task.id}`} className="task-priority">Priorité: {task.priority}</span>
                    <span className="hidden md:inline">•</span>
                    <span id={`tasklist-length-${task.id}`} className="task-length">Longueur: {task.length}</span>
                  </div>
                  {task.notes && (
                    <p id={`tasklist-notes-${task.id}`} className="task-notes text-sm text-muted-foreground mt-2">
                      Notes: {task.notes}
                    </p>
                  )}
                </div>
              </div>
              <div id={`tasklist-actions-${task.id}`} className="task-actions flex gap-2 justify-end">
                {showEdit && (
                  <Button
                    id={`tasklist-edit-btn-${task.id}`}
                    variant="ghost"
                    size="icon"
                    className="task-edit-btn text-gray-700 hover:text-gray-700 hover:bg-transparent"
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
                    className="task-delete-btn text-gray-700 hover:text-gray-700 hover:bg-transparent"
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
                    className="task-reopen-btn text-gray-700 hover:text-gray-700 hover:bg-transparent"
                    onClick={() => onReopen(task.id.toString())}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
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