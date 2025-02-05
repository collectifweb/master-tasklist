import { useRouter } from 'next/router';
import { TaskForm } from '@/components/TaskForm';
import { Navigation } from '@/components/Navigation';

export default function EditTaskPage() {
  const router = useRouter();
  const { id } = router.query;

  const onSuccess = () => {
    router.push('/');
  };

  return (
    <div>
      <Navigation />
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Modifier la tâche</h1>
        {id && <TaskForm taskId={id as string} onSuccess={onSuccess} />}
      </div>
    </div>
  );
}