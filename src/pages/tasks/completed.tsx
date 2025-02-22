import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Undo2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from "@/components/ui/use-toast"

type Task = {
  id: number
  name: string
  dueDate: string
  complexity: number
  priority: number
  length: number
  coefficient: number
  completed: boolean
  parentId: number | null
  categoryId: number
  category: { id: number; name: string }
  parent?: { id: number; name: string } | null
  children?: { id: number; name: string; completed: boolean }[]
}

export default function CompletedTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const { getAuthHeaders } = useAuth()
  const { toast } = useToast()

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks', {
        headers: getAuthHeaders()
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setTasks(data.filter((task: Task) => task.completed))
    } catch (error) {
      console.error('Erreur lors de la récupération des tâches:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de récupérer les tâches complétées"
      })
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const reopenTask = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ completed: false }),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      await fetchTasks()
      toast({
        title: "Succès",
        description: "La tâche a été réouverte"
      })
    } catch (error) {
      console.error('Erreur lors de la réouverture de la tâche:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de réouvrir la tâche"
      })
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Tâches complétées</h1>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Retour aux tâches actives
        </Button>
      </div>

      <div className="space-y-4">
        {tasks.length === 0 ? (
          <Card className="p-4">
            <p className="text-center text-muted-foreground">Aucune tâche complétée</p>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-500">
                    {task.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Catégorie: {task.category.name}
                    {task.parent && ` | Parent: ${task.parent.name}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Terminée le: {format(new Date(task.dueDate), "PPP", { locale: fr })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Complexité: {task.complexity} | Priorité: {task.priority} | 
                    Durée: {task.length} | Coefficient: {task.coefficient}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => reopenTask(task.id)}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}