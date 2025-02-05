import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

type Category = {
  id: number
  name: string
}

type Task = {
  id: number
  name: string
  completed: boolean
}

export default function AddTask() {
  const router = useRouter()
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newTask, setNewTask] = useState({
    name: '',
    parentId: '',
    categoryId: '',
    dueDate: null as Date | null,
    complexity: 1,
    priority: 1,
    length: 1,
  })

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      setTasks(data.filter((task: Task) => !task.completed))
    } catch (error) {
      console.error('Erreur lors de la récupération des tâches:', error)
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchTasks()
  }, [])

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory }),
      })
      if (response.ok) {
        setNewCategory('')
        fetchCategories()
        toast({
          title: "Catégorie ajoutée",
          description: "La nouvelle catégorie a été créée avec succès.",
        })
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la catégorie:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter la catégorie.",
      })
    }
  }

  const calculateCoefficient = (complexity: number, priority: number, length: number) => {
    // Conversion de la priorité selon la formule
    const priorityValue = 6 - priority; // 5->1, 4->2, 3->3, 2->4, 1->5
    return 15 - (complexity + length + priorityValue);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.categoryId) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner une catégorie.",
      })
      return
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          parentId: newTask.parentId ? parseInt(newTask.parentId) : null,
          categoryId: parseInt(newTask.categoryId),
        }),
      })
      if (response.ok) {
        toast({
          title: "Tâche ajoutée",
          description: "La nouvelle tâche a été créée avec succès.",
        })
        router.push('/')
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la tâche:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter la tâche.",
      })
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-4">Nouvelle Tâche</h2>
        <form onSubmit={handleAddTask} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom de la tâche</Label>
            <Input
              id="name"
              value={newTask.name}
              onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Catégorie</Label>
            <div className="flex gap-2">
              <Select
                value={newTask.categoryId}
                onValueChange={(value) => setNewTask({ ...newTask, categoryId: value })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowNewCategory(!showNewCategory)}
                className="px-3"
              >
                {showNewCategory ? "−" : "+"}
              </Button>
            </div>
            {showNewCategory && (
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Nouvelle catégorie"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" onClick={() => {
                  handleAddCategory();
                  setShowNewCategory(false);
                }}>
                  Ajouter
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="parent">Tâche parente (Optionnel)</Label>
            <Select
              value={newTask.parentId}
              onValueChange={(value) => setNewTask({ ...newTask, parentId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une tâche parente" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id.toString()}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Date d'échéance</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newTask.dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newTask.dueDate ? format(newTask.dueDate, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={newTask.dueDate}
                  onSelect={(date) => setNewTask({ ...newTask, dueDate: date || new Date() })}
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Complexité (1-5)</Label>
            <Slider
              value={[newTask.complexity]}
              onValueChange={(value) => setNewTask({ ...newTask, complexity: value[0] })}
              min={1}
              max={5}
              step={1}
              className="my-2"
            />
            <div className="text-sm text-muted-foreground">
              {['Très simple', 'Simple', 'Moyenne', 'Complexe', 'Très complexe'][newTask.complexity - 1]}
            </div>
          </div>

          <div>
            <Label>Priorité (1-5)</Label>
            <Slider
              value={[newTask.priority]}
              onValueChange={(value) => setNewTask({ ...newTask, priority: value[0] })}
              min={1}
              max={5}
              step={1}
              className="my-2"
            />
            <div className="text-sm text-muted-foreground">
              {['Très basse', 'Basse', 'Moyenne', 'Haute', 'Très haute'][newTask.priority - 1]}
            </div>
          </div>

          <div>
            <Label>Durée (1-5)</Label>
            <Slider
              value={[newTask.length]}
              onValueChange={(value) => setNewTask({ ...newTask, length: value[0] })}
              min={1}
              max={5}
              step={1}
              className="my-2"
            />
            <div className="text-sm text-muted-foreground">
              {['Très courte', 'Courte', 'Moyenne', 'Longue', 'Très longue'][newTask.length - 1]}
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg mb-4">
            <Label className="mb-2 block">Coefficient calculé</Label>
            <div className="text-2xl font-semibold">
              {calculateCoefficient(newTask.complexity, newTask.priority, newTask.length)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Basé sur la complexité, la priorité et la durée
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1">Ajouter la tâche</Button>
            <Button type="button" variant="outline" onClick={() => router.push('/')}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}