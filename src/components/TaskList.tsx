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
      method: 'PATCH',
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      onTaskUpdate();
    }
  };

  // Organiser les tâches pour que les enfants suivent leurs parents
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
      <div className="space-y-4">
        {organizedTasks.map((task) => (
          <Card key={task.id} className={`p-4 ${task.parentId ? 'ml-4 md:ml-8' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-2">
                {showComplete && (
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleComplete(task.id.toString(), task.children?.length > 0)}
                    className="text-gray-700 mt-1"
                  />
                )}
                <div className="flex-grow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <Link href={`/tasks/edit/${task.id}`} className="hover:underline">
                      <h3 className="font-medium">
                        {task.name}
                      </h3>
                    </Link>
                    <div className="font-semibold text-sm md:text-right whitespace-nowrap">
                      Coefficient: {task.coefficient}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {task.category?.name}
                    {task.parent && ` | Parent: ${task.parent.name}`}
                  </p>
                  {task.dueDate && (
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(task.dueDate), "PPP")}
                    </p>
                  )}
                  <div className="flex flex-col md:flex-row gap-2 text-sm text-muted-foreground mt-1">
                    <span>Complexité: {task.complexity}</span>
                    <span className="hidden md:inline">•</span>
                    <span>Priorité: {task.priority}</span>
                    <span className="hidden md:inline">•</span>
                    <span>Longueur: {task.length}</span>
                  </div>
                  {task.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Notes: {task.notes}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                {showEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-700 hover:text-gray-700 hover:bg-transparent"
                    onClick={() => router.push(`/tasks/edit/${task.id}`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {showDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-700 hover:text-gray-700 hover:bg-transparent"
                    onClick={() => handleDelete(task.id.toString())}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {showReopen && onReopen && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-700 hover:text-gray-700 hover:bg-transparent"
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