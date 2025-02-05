import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';

export function Navigation() {
  const router = useRouter();

  return (
    <nav className="bg-white shadow-sm mb-6">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap gap-2 justify-start items-center">
          <Button
            variant={router.pathname === '/' ? 'default' : 'outline'}
            onClick={() => router.push('/')}
          >
            Tâches actives
          </Button>
          <Button
            variant={router.pathname === '/tasks/completed' ? 'default' : 'outline'}
            onClick={() => router.push('/tasks/completed')}
          >
            Tâches terminées
          </Button>
          <Button
            variant={router.pathname === '/tasks/add' ? 'default' : 'outline'}
            onClick={() => router.push('/tasks/add')}
          >
            Ajouter une tâche
          </Button>
        </div>
      </div>
    </nav>
  );
}