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
import { Filter, Trash2, Edit, Search, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { DateRange } from 'react-day-picker'

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

type SortOption = 'date' | 'coefficient' | 'none'

export default function Home() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('none')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

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

  const getTaskLevel = (task: Task): number => {
    let level = 0
    let currentTask = task
    while (currentTask.parent) {
      level++
      currentTask = tasks.find(t => t.id === currentTask.parent?.id) as Task
    }
    return level
  }

  // Fonction pour organiser les tâches hiérarchiquement
  const organizeTasksHierarchically = (tasks: Task[]): Task[] => {
    const taskMap = new Map(tasks.map(task => [task.id, { ...task, children: [] }]));
    const rootTasks: Task[] = [];

    tasks.forEach(task => {
      if (task.parentId === null) {
        rootTasks.push(taskMap.get(task.id)!);
      } else {
        const parent = taskMap.get(task.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(taskMap.get(task.id)!);
        }
      }
    });

    const flattenHierarchy = (tasks: Task[]): Task[] => {
      return tasks.reduce((acc: Task[], task) => {
        acc.push(task);
        if (task.children && task.children.length > 0) {
          acc.push(...flattenHierarchy(task.children as Task[]));
        }
        return acc;
      }, []);
    };

    return flattenHierarchy(rootTasks);
  };

  const filteredAndSortedTasks = (sortBy === 'none' 
    ? organizeTasksHierarchically(tasks)
    : tasks)
    .filter(task => {
      // Filter by completion
      if (task.completed) return false
      
      // Filter by category
      if (selectedCategory !== 'all' && task.category.id !== parseInt(selectedCategory)) return false
      
      // Filter by search query
      if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      
      // Filter by date range
      if (dateRange?.from && dateRange?.to) {
        const taskDate = new Date(task.dueDate)
        if (taskDate < dateRange.from || taskDate > dateRange.to) return false
      }
      
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      if (sortBy === 'coefficient') {
        return b.coefficient - a.coefficient
      }
      return 0
    })

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Tâches actives</h1>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Rechercher une tâche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>

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

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sans tri</SelectItem>
                <SelectItem value="date">Date d'échéance</SelectItem>
                <SelectItem value="coefficient">Coefficient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px]">
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "P", { locale: fr })} -{" "}
                      {format(dateRange.to, "P", { locale: fr })}
                    </>
                  ) : (
                    format(dateRange.from, "P", { locale: fr })
                  )
                ) : (
                  "Filtrer par date"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-4">
        {filteredAndSortedTasks.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Aucune tâche active ne correspond aux critères
          </Card>
        ) : (
          filteredAndSortedTasks.map((task) => (
            <Card 
              key={task.id} 
              className="p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ marginLeft: `${getTaskLevel(task) * 20}px` }}
              onClick={(e) => {
                // Prevent navigation if clicking on buttons or checkbox
                if (
                  (e.target as HTMLElement).closest('button') ||
                  (e.target as HTMLElement).closest('[role="checkbox"]')
                ) {
                  return;
                }
                window.location.href = `/tasks/edit/${task.id}`;
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTaskCompletion(task.id, task.completed)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className={cn("font-medium text-gray-900", task.completed && "line-through")}>
                        {task.name}
                      </h3>
                      <div className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm">
                        Coef. {task.coefficient}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Catégorie: {task.category.name}
                      {task.parent && ` | Parent: ${task.parent.name}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      Échéance: {format(new Date(task.dueDate), "PPP", { locale: fr })}
                    </p>
                    <p className="text-sm text-gray-600">
                      Complexité: {task.complexity} | Priorité: {task.priority} | 
                      Durée: {task.length}
                    </p>
                    {task.children && task.children.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Sous-tâches: {task.children.filter(c => !c.completed).length} actives / {task.children.length} total
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.location.href = `/tasks/edit/${task.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}