import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Undo2, BrainCircuit, Zap, Timer } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from "@/components/ui/use-toast"

import { cn } from '@/lib/utils';

type Task = {
  id: number
  name: string
  dueDate: string
  completedAt: string | null
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

const getTaskCardStyles = (coefficient: number | null) => {
  if (coefficient === null) {
    return 'bg-card border-l-4 border-border';
  }
  if (coefficient >= 10) return 'bg-[var(--coef-low-bg)] border-l-4 border-[var(--coef-low-border)]';
  if (coefficient >= 7) return 'bg-[var(--coef-good-bg)] border-l-4 border-[var(--coef-good-border)]';
  if (coefficient >= 4) return 'bg-[var(--coef-excellent-bg)] border-l-4 border-[var(--coef-excellent-border)]';
  return 'bg-[var(--coef-average-bg)] border-l-4 border-[var(--coef-average-border)]';
};

const MetricIndicator = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) => (
  <div className="metric-item" aria-label={`${label}: ${value} sur 5`}>
    <div className="flex items-center gap-2" title={label}>
      {icon}
      <span className="sr-only">{label}</span>
    </div>
    <div className="metric-dots">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn("dot", i < value ? "dot-filled" : "dot-empty")}
          title={`${i + 1}`}
        />
      ))}
    </div>
  </div>
);

export default function CompletedTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [sortBy, setSortBy] = useState('completionDateDesc')
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

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'completionDateDesc') {
      return (b.completedAt ? new Date(b.completedAt).getTime() : 0) - (a.completedAt ? new Date(a.completedAt).getTime() : 0);
    }
    if (sortBy === 'completionDateAsc') {
      return (a.completedAt ? new Date(a.completedAt).getTime() : 0) - (b.completedAt ? new Date(b.completedAt).getTime() : 0);
    }
    if (sortBy === 'coefficientDesc') {
      return (b.coefficient ?? 0) - (a.coefficient ?? 0);
    }
    if (sortBy === 'coefficientAsc') {
      return (a.coefficient ?? 0) - (b.coefficient ?? 0);
    }
    return 0;
  });

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Tâches complétées</h1>
        <div className="flex items-center gap-4">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Trier par..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completionDateDesc">Plus récentes d'abord</SelectItem>
              <SelectItem value="completionDateAsc">Plus anciennes d'abord</SelectItem>
              <SelectItem value="coefficientDesc">Coefficient (décroissant)</SelectItem>
              <SelectItem value="coefficientAsc">Coefficient (croissant)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.location.href = '/tasks'}>
            Retour aux tâches actives
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {sortedTasks.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <p>Aucune tâche complétée pour le moment.</p>
          </Card>
        ) : (
          sortedTasks.map((task) => (
            <Card 
              key={task.id} 
              className={cn(
                "p-4 opacity-70 hover:opacity-100 transition-opacity",
                getTaskCardStyles(task.coefficient)
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-grow">
                  <h3 className="font-medium line-through">
                    {task.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Catégorie: {task.category.name}
                  </p>
                  {task.completedAt && (
                    <p className="text-sm text-muted-foreground">
                      Terminée le {format(new Date(task.completedAt), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  )}
                  <div className="task-metrics-container">
                    <MetricIndicator icon={<BrainCircuit size={16} />} label="Complexité" value={task.complexity} />
                    <MetricIndicator icon={<Zap size={16} />} label="Priorité" value={task.priority} />
                    <MetricIndicator icon={<Timer size={16} />} label="Durée" value={task.length} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-bold text-xl">{task.coefficient}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => reopenTask(task.id)}
                    title="Réouvrir la tâche"
                  >
                    <Undo2 className="h-5 w-5" />
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