import { useRouter } from 'next/router';
import { TaskForm } from '@/components/TaskForm';

export default function AddTaskPage() {
  const router = useRouter();

  const onSuccess = () => {
    router.push('/'); // Redirection vers la liste des tâches non complétées
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Ajouter une tâche</h1>
      <TaskForm onSuccess={onSuccess} />
    </div>
  );
}