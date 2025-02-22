import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { calculateCoefficient } from '@/util/coefficient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TaskFormProps {
  taskId?: string;
  onSuccess: () => void;
}

export function TaskForm({ taskId, onSuccess }: TaskFormProps) {
  const { getAuthHeaders } = useContext(AuthContext);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
    categoryId: '',
    dueDate: null as Date | null,
    complexity: 1,
    priority: 1,
    length: 1,
    notes: '',
    coefficient: 0,
  });

  useEffect(() => {
    fetchCategories();
    fetchTasks();
    if (taskId) {
      fetchTaskDetails();
    }
  }, [taskId]);

  const fetchCategories = async () => {
    const response = await fetch('/api/categories', {
      headers: getAuthHeaders()
    });
    if (response.ok) {
      const data = await response.json();
      setCategories(data);
    }
  };

  const fetchTasks = async () => {
    const response = await fetch('/api/tasks', {
      headers: getAuthHeaders()
    });
    if (response.ok) {
      const data = await response.json();
      setTasks(data);
    }
  };

  const fetchTaskDetails = async () => {
    if (!taskId) return;
    const response = await fetch(`/api/tasks/${taskId}`, {
      headers: getAuthHeaders()
    });
    if (response.ok) {
      const task = await response.json();
      setFormData({
        name: task.name,
        parentId: task.parentId?.toString() || '',
        categoryId: task.categoryId.toString(),
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        complexity: task.complexity,
        priority: task.priority,
        length: task.length,
        notes: task.notes || '',
        coefficient: task.coefficient || 0,
      });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: newCategory }),
    });
    if (response.ok) {
      const newCat = await response.json();
      setNewCategory('');
      setShowCategoryInput(false);
      fetchCategories();
      setFormData({ ...formData, categoryId: newCat.id.toString() });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const coefficient = parseFloat(calculateCoefficient(formData.complexity, formData.length, formData.priority));
    
    const taskData = {
      ...formData,
      parentId: formData.parentId ? parseInt(formData.parentId) : null,
      categoryId: parseInt(formData.categoryId),
      coefficient,
    };

    const url = taskId ? `/api/tasks/${taskId}` : '/api/tasks';
    const method = taskId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData),
    });

    if (response.ok) {
      onSuccess();
    }
  };

  return (
    <div id="task-form-container" className="task-form-wrapper rounded-[calc(var(--radius))] border-border border bg-card text-card-foreground shadow max-w-2xl mx-auto p-6">
      <h2 className="task-form-title text-2xl font-semibold mb-4">{taskId ? 'Modifier la tâche' : 'Nouvelle Tâche'}</h2>
      <form onSubmit={handleSubmit} className="task-form space-y-4">
        <div className="task-name-field">
          <Label htmlFor="name">Nom de la tâche</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="task-name-input"
          />
        </div>

        <div className="task-category-field">
          <Label htmlFor="category">Catégorie</Label>
          <div className="category-select-container flex gap-2">
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
            >
              <SelectTrigger className="w-full category-select">
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
              size="icon"
              className="add-category-btn"
              onClick={() => setShowCategoryInput(!showCategoryInput)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {showCategoryInput && (
            <div className="new-category-input-container flex gap-2 mt-2">
              <Input
                placeholder="Nouvelle catégorie"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="new-category-input"
              />
              <Button type="button" onClick={handleAddCategory} className="confirm-new-category-btn">
                Ajouter
              </Button>
            </div>
          )}
        </div>

        <div className="task-parent-field">
          <Label htmlFor="parent">Tâche parente (Optionnel)</Label>
          <Select
            value={formData.parentId}
            onValueChange={(value) => setFormData({ ...formData, parentId: value })}
          >
            <SelectTrigger className="parent-task-select">
              <SelectValue placeholder="Sélectionner une tâche parente" />
            </SelectTrigger>
            <SelectContent>
              {tasks
                .filter(task => task.id.toString() !== taskId)
                .map((task) => (
                  <SelectItem key={task.id} value={task.id.toString()}>
                    {task.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="task-due-date-field">
          <Label>Date d'échéance (Optionnel)</Label>
          <div className="due-date-container flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "due-date-select w-full justify-start text-left font-normal",
                    !formData.dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dueDate ? format(formData.dueDate, "PPP") : <span>Choisir une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.dueDate || undefined}
                  onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                  initialFocus
                  className="task-calendar"
                />
              </PopoverContent>
            </Popover>
            {formData.dueDate && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setFormData({ ...formData, dueDate: null })}
                className="clear-date-btn"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="task-complexity-field">
          <Label>Complexité (1-5)</Label>
          <Slider
            value={[formData.complexity]}
            onValueChange={(value) => setFormData({ ...formData, complexity: value[0] })}
            min={1}
            max={5}
            step={1}
            className="complexity-slider my-2"
          />
          <div className="complexity-label text-sm text-muted-foreground">
            {formData.complexity === 1 ? "Très simple" :
             formData.complexity === 2 ? "Simple" :
             formData.complexity === 3 ? "Moyen" :
             formData.complexity === 4 ? "Complexe" :
             "Très complexe"}
          </div>
        </div>

        <div className="task-priority-field">
          <Label>Priorité (1-5)</Label>
          <Slider
            value={[formData.priority]}
            onValueChange={(value) => setFormData({ ...formData, priority: value[0] })}
            min={1}
            max={5}
            step={1}
            className="priority-slider my-2"
          />
          <div className="priority-label text-sm text-muted-foreground">
            {formData.priority === 1 ? "Très basse" :
             formData.priority === 2 ? "Basse" :
             formData.priority === 3 ? "Moyenne" :
             formData.priority === 4 ? "Haute" :
             "Très haute"}
          </div>
        </div>

        <div className="task-length-field">
          <Label>Durée (1-5)</Label>
          <Slider
            value={[formData.length]}
            onValueChange={(value) => setFormData({ ...formData, length: value[0] })}
            min={1}
            max={5}
            step={1}
            className="length-slider my-2"
          />
          <div className="length-label text-sm text-muted-foreground">
            {formData.length === 1 ? "Très courte" :
             formData.length === 2 ? "Courte" :
             formData.length === 3 ? "Moyenne" :
             formData.length === 4 ? "Longue" :
             "Très longue"}
          </div>
        </div>

        <div className="task-notes-field">
          <Label htmlFor="notes">Notes (Optionnel)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Ajouter des notes pour cette tâche..."
            className="task-notes-input min-h-[80px]"
          />
        </div>

        <div className="task-coefficient-display bg-muted p-4 rounded-lg mb-4">
          <Label className="mb-2 block">Coefficient calculé</Label>
          <div className="coefficient-value text-2xl font-semibold">
            {taskId ? formData.coefficient : calculateCoefficient(formData.complexity, formData.length, formData.priority)}
          </div>
          <div className="coefficient-explanation text-sm text-muted-foreground mt-1">
            Basé sur la complexité, la priorité et la durée
          </div>
        </div>

        <div className="task-form-actions flex flex-col sm:flex-row gap-4">
          <Button type="submit" className="submit-task-btn w-full sm:flex-1">
            {taskId ? 'Mettre à jour' : 'Ajouter'} la tâche
          </Button>
          <Button type="button" variant="outline" className="cancel-task-btn w-full sm:w-auto" onClick={() => window.history.back()}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}