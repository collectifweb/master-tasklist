import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { ListTodo, CheckSquare, PlusSquare } from 'lucide-react'

export function Navigation() {
  const router = useRouter()
  const currentPath = router.pathname

  return (
    <nav className="border-b mb-4">
      <div className="container mx-auto px-4 py-2">
        <div className="flex gap-4">
          <Button
            variant={currentPath === '/' ? 'default' : 'ghost'}
            onClick={() => router.push('/')}
            className="flex items-center gap-2"
          >
            <ListTodo className="h-4 w-4" />
            Tâches actives
          </Button>
          <Button
            variant={currentPath === '/tasks/completed' ? 'default' : 'ghost'}
            onClick={() => router.push('/tasks/completed')}
            className="flex items-center gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            Tâches complétées
          </Button>
          <Button
            variant={currentPath === '/tasks/add' ? 'default' : 'ghost'}
            onClick={() => router.push('/tasks/add')}
            className="flex items-center gap-2"
          >
            <PlusSquare className="h-4 w-4" />
            Nouvelle tâche
          </Button>
        </div>
      </div>
    </nav>
  )
}