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
import { useAuth } from '@/contexts/AuthContext'

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
  const { getAuthHeaders } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('none')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  // ... (rest of the functions remain the same)

  return (
    <div id="home-page" className="home-container container mx-auto p-4">
      <div className="home-header flex flex-col gap-4 mb-8">
        <div className="page-title-container flex justify-between items-center">
          <h1 className="page-title text-4xl font-bold">Tâches actives</h1>
        </div>
        
        <div className="filters-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="search-container flex items-center gap-2 w-full">
            <Search className="search-icon h-4 w-4 flex-shrink-0" />
            <Input
              placeholder="Rechercher une tâche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input w-full"
            />
          </div>

          <div className="category-filter-container flex items-center gap-2 w-full">
            <Filter className="filter-icon h-4 w-4 flex-shrink-0" />
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="category-select w-full">
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

          <div className="sort-container flex items-center gap-2 w-full">
            <ArrowUpDown className="sort-icon h-4 w-4 flex-shrink-0" />
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="sort-select w-full">
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
              <Button variant="outline" className="date-range-button w-full">
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
            <PopoverContent className="date-range-popup w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
                className="date-range-calendar"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="tasks-list space-y-4">
        {filteredAndSortedTasks.length === 0 ? (
          <Card className="empty-state p-6 text-center text-muted-foreground">
            Aucune tâche active ne correspond aux critères
          </Card>
        ) : (
          filteredAndSortedTasks.map((task) => (
            <Card 
              key={task.id} 
              className={`task-card p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors ${task.parentId ? 'subtask' : 'parent-task'}`}
              style={{ marginLeft: `${getTaskLevel(task) * 20}px` }}
              onClick={(e) => {
                if (
                  (e.target as HTMLElement).closest('button') ||
                  (e.target as HTMLElement).closest('[role="checkbox"]')
                ) {
                  return;
                }
                window.location.href = `/tasks/edit/${task.id}`;
              }}
            >
              <div className="task-content flex items-center justify-between">
                <div className="task-main flex items-center gap-4">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTaskCompletion(task.id, task.completed)}
                    className="task-checkbox"
                  />
                  <div className="task-details flex-1">
                    <div className="task-header flex items-center gap-3">
                      <h3 className={cn("task-name font-medium text-gray-900", task.completed && "line-through")}>
                        {task.name}
                      </h3>
                      <div className="task-coefficient px-2 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm">
                        Coef. {task.coefficient}
                      </div>
                    </div>
                    <p className="task-category text-sm text-gray-600">
                      Catégorie: {task.category.name}
                      {task.parent && ` | Parent: ${task.parent.name}`}
                    </p>
                    {task.dueDate && (
                      <p className="task-due-date text-sm text-gray-600">
                        Échéance: {format(new Date(task.dueDate), "PPP", { locale: fr })}
                      </p>
                    )}
                    <p className="task-metrics text-sm text-gray-600">
                      Complexité: {task.complexity} | Priorité: {task.priority} | 
                      Durée: {task.length}
                    </p>
                    {task.children && task.children.length > 0 && (
                      <p className="task-children text-sm text-gray-600">
                        Sous-tâches: {task.children.filter(c => !c.completed).length} actives / {task.children.length} total
                      </p>
                    )}
                  </div>
                </div>
                <div className="task-actions flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="task-edit-btn"
                    onClick={() => window.location.href = `/tasks/edit/${task.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="task-delete-btn"
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