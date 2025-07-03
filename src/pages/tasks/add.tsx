import { useRouter } from 'next/router';
import { TaskForm } from '@/components/TaskForm';
import { useToast } from '@/components/ui/use-toast';

export default function AddTaskPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: 'Tâche ajoutée',
      description: 'La nouvelle tâche a été créée avec succès.',
    });
    router.push('/tasks');
  };

  return (
    <div className="container mx-auto p-4">
      <TaskForm onSuccess={handleSuccess} />
    </div>
  );
}