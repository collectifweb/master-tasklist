import { useEffect, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [newTask, setNewTask] = useState({
    name: '',
    parentId: '',
    categoryId: '',
    dueDate: new Date(),
    complexity: 1,
    priority: 1,
    length: 1,
  })

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchCategories()
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
      }
    } catch (error) {
      console.error('Error adding category:', error)
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
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
        setNewTask({
          name: '',
          parentId: '',
          categoryId: '',
          dueDate: new Date(),
          complexity: 1,
          priority: 1,
          length: 1,
        })
        fetchTasks()
      }
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const toggleTaskCompletion = async (taskId: number, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      })
      if (response.ok) {
        fetchTasks()
      } else {
        const error = await response.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Error toggling task completion:', error)
    }
  }

  const deleteTask = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchTasks()
      } else {
        const error = await response.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8">Task Manager</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Add New Task</h2>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
              <Label htmlFor="name">Task Name</Label>
              <Input
                id="name"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <div className="flex gap-2">
                <Select
                  value={newTask.categoryId}
                  onValueChange={(value) => setNewTask({ ...newTask, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="New category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <Button type="button" onClick={handleAddCategory}>
                  Add
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="parent">Parent Task (Optional)</Label>
              <Select
                value={newTask.parentId}
                onValueChange={(value) => setNewTask({ ...newTask, parentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent task" />
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
              <Label>Due Date</Label>
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
                    {newTask.dueDate ? format(newTask.dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newTask.dueDate}
                    onSelect={(date) => setNewTask({ ...newTask, dueDate: date || new Date() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Complexity (1-5)</Label>
              <Slider
                value={[newTask.complexity]}
                onValueChange={(value) => setNewTask({ ...newTask, complexity: value[0] })}
                min={1}
                max={5}
                step={1}
                className="my-2"
              />
            </div>

            <div>
              <Label>Priority (1-5)</Label>
              <Slider
                value={[newTask.priority]}
                onValueChange={(value) => setNewTask({ ...newTask, priority: value[0] })}
                min={1}
                max={5}
                step={1}
                className="my-2"
              />
            </div>

            <div>
              <Label>Length (1-5)</Label>
              <Slider
                value={[newTask.length]}
                onValueChange={(value) => setNewTask({ ...newTask, length: value[0] })}
                min={1}
                max={5}
                step={1}
                className="my-2"
              />
            </div>

            <Button type="submit" className="w-full">Add Task</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Tasks</h2>
          <div className="space-y-4">
            {tasks.map((task) => (
              <Card key={task.id} className="p-4">
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
                        Category: {task.category.name}
                        {task.parent && ` | Parent: ${task.parent.name}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Due: {format(new Date(task.dueDate), "PPP")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Complexity: {task.complexity} | Priority: {task.priority} | 
                        Length: {task.length} | Coefficient: {task.coefficient}
                      </p>
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
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}