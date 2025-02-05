import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Filter, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

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

type Category = {
  id: number
  name: string
}

export default function Home() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Erreur lors de la récupération des tâches:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les tâches.",
      })
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchCategories()
  }, [])

  const toggleTaskCompletion = async (taskId: number, completed: boolean) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      if (task?.children?.some(child => !child.completed)) {
        const confirm = window.confirm(
          'Cette tâche a des sous-tâches non terminées. Voulez-vous vraiment la marquer comme terminée ?'
        )
        if (!confirm) return
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      })
      if (response.ok) {
        fetchTasks()
        toast({
          title: completed ? "Tâche rouverte" : "Tâche terminée",
          description: completed 
            ? "La tâche a été marquée comme non terminée."
            : "La tâche a été marquée comme terminée.",
        })
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Erreur",
          description: error.error,
        })
      }
    } catch (error) {
      console.error('Erreur lors du changement de statut de la tâche:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le statut de la tâche.",
      })
    }
  }

  const deleteTask = async (taskId: number) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      if (task?.children && task.children.length > 0) {
        const confirm = window.confirm(
          'Cette tâche a des sous-tâches. La suppression effacera également toutes les sous-tâches. Voulez-vous continuer ?'
        )
        if (!confirm) return
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchTasks()
        toast({
          title: "Tâche supprimée",
          description: "La tâche a été supprimée avec succès.",
        })
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Erreur",
          description: error.error,
        })
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la tâche:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer la tâche.",
      })
    }
  }

  const filteredTasks = selectedCategory === 'all' 
    ? tasks.filter(task => !task.completed)
    : tasks.filter(task => !task.completed && task.category.id === parseInt(selectedCategory))

  const getTaskLevel = (task: Task): number => {
    let level = 0
    let currentTask = task
    while (currentTask.parent) {
      level++
      currentTask = tasks.find(t => t.id === currentTask.parent?.id) as Task
    }
    return level
  }

  const calculatePriorityClass = (coefficient: number): string => {
    if (coefficient >= 4) return 'bg-red-100'
    if (coefficient >= 3) return 'bg-orange-100'
    if (coefficient >= 2) return 'bg-yellow-100'
    return 'bg-green-100'
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Tâches actives</h1>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Aucune tâche active dans cette catégorie
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card 
              key={task.id} 
              className={cn("p-4", calculatePriorityClass(task.coefficient))}
              style={{ marginLeft: `${getTaskLevel(task) * 20}px` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTaskCompletion(task.id, task.completed)}
                  />
                  <div>
                    <h3 className={cn("font-medium", task.completed && "line-through")}>
                      {task.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Catégorie: {task.category.name}
                      {task.parent && ` | Parent: ${task.parent.name}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Échéance: {format(new Date(task.dueDate), "PPP", { locale: fr })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Complexité: {task.complexity} | Priorité: {task.priority} | 
                      Durée: {task.length} | Coefficient: {task.coefficient}
                    </p>
                    {task.children && task.children.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Sous-tâches: {task.children.filter(c => !c.completed).length} actives / {task.children.length} total
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTask(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}