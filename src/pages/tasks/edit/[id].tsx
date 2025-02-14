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
    <main className="container mx-auto p-4 md:p-8 mb-20 md:mb-0 mt-16 md:mt-0">
      {id && <TaskForm taskId={id as string} onSuccess={onSuccess} />}
    </main>
  );
}