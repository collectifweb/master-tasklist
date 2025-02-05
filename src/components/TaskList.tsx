import { useState } from 'react';
import { Task } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
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
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ completed: true }),
    });

    if (response.ok) {
      onTaskUpdate();
    }
    setConfirmDialog({ isOpen: false, taskId: null, hasChildren: false });
  };

  const handleDelete = async (taskId: string) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      onTaskUpdate();
    }
  };

  const handleEdit = (taskId: string) => {
    router.push(`/tasks/edit/${taskId}`);
  };

  return (
    <>
      <div className="space-y-4">
        {tasks.map((task) => (
          <Card key={task.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {showComplete && (
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleComplete(task.id.toString(), task.children?.length > 0)}
                  />
                )}
                <div>
                  <h3 className="font-medium">
                    {task.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {task.category?.name}
                    {task.parent && ` | Parent: ${task.parent.name}`}
                  </p>
                  {task.dueDate && (
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(task.dueDate), "PPP")}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Complexité: {task.complexity} | Priorité: {task.priority} | 
                    Longueur: {task.length} | Coefficient: {task.coefficient}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {showEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(task.id.toString())}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {showDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(task.id.toString())}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {showReopen && onReopen && (
                  <Button
                    variant="ghost"
                    size="icon"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation requise</AlertDialogTitle>
            <AlertDialogDescription>
              Il y a des tâches enfants à cette tâche, êtes-vous sûr de vouloir la compléter ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => completeTask(confirmDialog.taskId)}>
              Je confirme
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}