import { useEffect, useState } from 'react';
import { Task } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { TaskList } from '@/components/TaskList';

export default function CompletedTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const fetchTasks = async () => {
    const response = await fetch('/api/tasks?completed=true');
    if (response.ok) {
      const data = await response.json();
      setTasks(data);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleReopen = async (taskId: string) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ completed: false }),
    });

    if (response.ok) {
      fetchTasks();
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tâches terminées</h1>
      <TaskList 
        tasks={tasks} 
        onTaskUpdate={fetchTasks}
        showReopen={true}
        onReopen={handleReopen}
      />
    </div>
  );
}