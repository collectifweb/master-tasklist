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

const getTaskLevel = (task: Task): number => {
  return task.parentId ? 1 : 0;
}

export default function Home() {
  const { toast } = useToast()
  const { getAuthHeaders } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('none')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks', {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Erreur lors du chargement des tâches');
        const data = await response.json();
        setTasks(data);
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les tâches",
          variant: "destructive",
        });
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories', {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Erreur lors du chargement des catégories');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les catégories",
          variant: "destructive",
        });
      }
    };

    fetchTasks();
    fetchCategories();
  }, []);

  const toggleTaskCompletion = async (taskId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT', // Changé de PATCH à PUT
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !currentStatus }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur lors de la mise à jour de la tâche:', errorText);
        throw new Error('Erreur lors de la mise à jour de la tâche');
      }

      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, completed: !currentStatus }
          : task
      ));

      toast({
        title: "Succès",
        description: "Statut de la tâche mis à jour",
      });
    } catch (error) {
      console.error('Exception:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de la tâche",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression de la tâche');

      setTasks(tasks.filter(task => task.id !== taskId));

      toast({
        title: "Succès",
        description: "Tâche supprimée avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la tâche",
        variant: "destructive",
      });
    }
  };

  const filteredAndSortedTasks = tasks
    .filter((task) => {
      // Filter by completion status (only show active tasks)
      if (task.completed) return false;

      // Filter by category
      if (selectedCategory !== 'all' && task.categoryId.toString() !== selectedCategory) {
        return false;
      }

      // Filter by search query
      if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by date range
      if (dateRange?.from && dateRange?.to) {
        const taskDate = new Date(task.dueDate);
        const from = new Date(dateRange.from);
        const to = new Date(dateRange.to);
        if (taskDate < from || taskDate > to) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'coefficient':
          return b.coefficient - a.coefficient;
        default:
          return 0;
      }
    });

  // ... (rest of the functions remain the same)

  return (
    <div id="home-page" className="home-container container mx-auto p-4">
      <div id="home-header" className="home-header flex flex-col gap-4 mb-8">
        <div id="page-title-container" className="page-title-container flex justify-between items-center">
          <h1 id="page-title" className="page-title text-4xl font-bold">Tâches actives</h1>
        </div>
        
        <div id="filters-container" className="filters-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div id="search-container" className="search-container flex items-center gap-2 w-full">
            <Search id="search-icon" className="search-icon h-4 w-4 flex-shrink-0" />
            <Input
              id="search-input"
              placeholder="Rechercher une tâche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input w-full"
            />
          </div>

          <div id="category-filter-container" className="category-filter-container flex items-center gap-2 w-full">
            <Filter id="filter-icon" className="filter-icon h-4 w-4 flex-shrink-0" />
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger id="category-select" className="category-select w-full">
                <SelectValue placeholder="Filtrer par catégorie" />
              </SelectTrigger>
              <SelectContent id="category-select-content">
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div id="sort-container" className="sort-container flex items-center gap-2 w-full">
            <ArrowUpDown id="sort-icon" className="sort-icon h-4 w-4 flex-shrink-0" />
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger id="sort-select" className="sort-select w-full">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent id="sort-select-content">
                <SelectItem value="none">Sans tri</SelectItem>
                <SelectItem value="date">Date d'échéance</SelectItem>
                <SelectItem value="coefficient">Coefficient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button id="date-range-button" variant="outline" className="date-range-button w-full">
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
            <PopoverContent id="date-range-popup" className="date-range-popup w-auto p-0" align="start">
              <Calendar
                id="date-range-calendar"
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

      <div id="tasks-list" className="tasks-list space-y-4">
        {filteredAndSortedTasks.length === 0 ? (
          <Card id="empty-state" className="empty-state p-6 text-center text-muted-foreground">
            Aucune tâche active ne correspond aux critères
          </Card>
        ) : (
          filteredAndSortedTasks.map((task) => (
            <Card 
              key={task.id}
              id={`task-card-${task.id}`}
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
              <div id={`task-content-${task.id}`} className="task-content flex items-center justify-between">
                <div id={`task-main-${task.id}`} className="task-main flex items-center gap-4">
                  <Checkbox
                    id={`task-checkbox-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={() => toggleTaskCompletion(task.id, task.completed)}
                    className="task-checkbox"
                  />
                  <div id={`task-details-${task.id}`} className="task-details flex-1">
                    <div id={`task-header-${task.id}`} className="task-header flex items-center gap-3">
                      <h3 id={`task-name-${task.id}`} className={cn("task-name font-medium text-gray-900", task.completed && "line-through")}>
                        {task.name}
                      </h3>
                      <div 
                        id={`task-coefficient-${task.id}`} 
                        className={cn(
                          "task-coefficient px-3 py-1 rounded-full font-semibold text-sm",
                          task.coefficient > 4 ? "coefficient-excellent" : 
                          task.coefficient >= 3 ? "coefficient-good" : 
                          "coefficient-medium"
                        )}
                      >
                        Coef. {task.coefficient}
                      </div>
                    </div>
                    <p id={`task-category-${task.id}`} className="task-category text-sm text-gray-600">
                      Catégorie: {task.category.name}
                      {task.parent && ` | Parent: ${task.parent.name}`}
                    </p>
                    {task.dueDate && (
                      <p id={`task-due-date-${task.id}`} className="task-due-date text-sm text-gray-600">
                        Échéance: {format(new Date(task.dueDate), "PPP", { locale: fr })}
                      </p>
                    )}
                    <p id={`task-metrics-${task.id}`} className="task-metrics text-sm text-gray-600">
                      Complexité: {task.complexity} | Priorité: {task.priority} | 
                      Durée: {task.length}
                    </p>
                    {task.children && task.children.length > 0 && (
                      <p id={`task-children-${task.id}`} className="task-children text-sm text-gray-600">
                        Sous-tâches: {task.children.filter(c => !c.completed).length} actives / {task.children.length} total
                      </p>
                    )}
                  </div>
                </div>
                <div id={`task-actions-${task.id}`} className="task-actions flex gap-2">
                  <Button
                    id={`task-edit-btn-${task.id}`}
                    variant="ghost"
                    size="icon"
                    className="task-edit-btn"
                    onClick={() => window.location.href = `/tasks/edit/${task.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    id={`task-delete-btn-${task.id}`}
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