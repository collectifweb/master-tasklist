import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, isBefore, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const getPriorityTaskStyles = (coefficient: number) => {
  if (coefficient >= 10) return 'bg-[var(--coef-low-bg)] border-l-4 border-[var(--coef-low-border)]';
  if (coefficient >= 7) return 'bg-[var(--coef-good-bg)] border-l-4 border-[var(--coef-good-border)]';
  if (coefficient >= 4) return 'bg-[var(--coef-excellent-bg)] border-l-4 border-[var(--coef-excellent-border)]';
  return 'bg-[var(--coef-average-bg)] border-l-4 border-[var(--coef-average-border)]';
};

type Task = {
  id: number;
  name: string;
  dueDate: string | null;
  coefficient: number;
  completed: boolean;
  completedAt: string | null;
  categoryId: number;
  category: { id: number; name: string };
};

type Category = {
  id: number;
  name: string;
  _count: {
    tasks: number;
  };
};

type DashboardStats = {
  activeTasks: number;
  overdueTasks: number;
  completedThisWeek: number;
  topPriorityTasks: Task[];
  categoryDistribution: Category[];
};

export default function DashboardPage() {
  const { user, getAuthHeaders } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const headers = getAuthHeaders();
        const response = await fetch('/api/dashboard', { headers });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        setUsername(data.username);
        setStats(data.stats);
        
        // Keep localStorage in sync for other parts of the app that might use it
        if (data.username) {
          localStorage.setItem("username", data.username);
        } else {
          localStorage.removeItem("username");
        }

      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Chargement du tableau de bord...</div>;
  }

  if (!stats) {
    return <div className="flex justify-center items-center h-screen">Impossible de charger les données.</div>;
  }

  const totalTasksInCategoryDistribution = stats.categoryDistribution.reduce((acc, cat) => acc + cat._count.tasks, 0);

  return (
    <div id="dashboard-page" className="mobile-container mx-auto mobile-spacing-y pb-20 md:pb-8">
      <header id="dashboard-header" className="dashboard-header mobile-spacing-y">
        <h1 className="text-2xl md:text-4xl font-bold">Tableau de bord</h1>
        <p id="welcome-message" className="text-lg md:text-2xl text-muted-foreground leading-relaxed">
          Bonjour{username ? ` ${username}` : ''}, voici un aperçu de vos tâches.
        </p>
      </header>

      <section id="quick-actions" className="quick-actions">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="mobile-btn-primary">
            <Link href="/tasks/add">Nouvelle Tâche</Link>
          </Button>
          <Button asChild variant="secondary" className="mobile-btn-secondary">
            <Link href="/tasks">Voir les tâches actives</Link>
          </Button>
          <Button asChild variant="outline" className="mobile-btn-secondary">
            <Link href="/tasks/completed">Voir les tâches terminées</Link>
          </Button>
        </div>
      </section>

      <section id="metrics-grid" className="metrics-grid grid gap-4 mobile-grid-1 md:grid-cols-3">
        <Card id="active-tasks-card" className="mobile-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Tâches Actives</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl md:text-4xl font-bold">{stats.activeTasks}</p>
          </CardContent>
        </Card>
        <Card id="overdue-tasks-card" className="mobile-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Tâches en Retard</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl md:text-4xl font-bold text-destructive">{stats.overdueTasks}</p>
          </CardContent>
        </Card>
        <Card id="completed-week-card" className="mobile-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Terminées cette semaine</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl md:text-4xl font-bold text-green-600">{stats.completedThisWeek}</p>
          </CardContent>
        </Card>
      </section>

      <section id="priority-tasks-section" className="grid gap-6 mobile-grid-1 md:grid-cols-2">
        <Card id="priority-tasks-card" className="mobile-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Tâches Prioritaires</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              {stats.topPriorityTasks.map(task => (
                <li 
                  key={task.id} 
                  className={cn(
                    "mobile-list-item flex items-center justify-between rounded-lg transition-colors",
                    getPriorityTaskStyles(task.coefficient)
                  )}
                >
                  <Link 
                    href={`/tasks/edit/${task.id}`} 
                    className="font-medium hover:underline text-base leading-6 flex-1 mobile-swipe-area"
                  >
                    {task.name}
                  </Link>
                  <span className="font-bold text-xl md:text-2xl ml-3">{task.coefficient}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card id="category-distribution-card" className="mobile-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Répartition par Catégorie</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-4">
              {stats.categoryDistribution.map(cat => (
                <li key={cat.id}>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-base">{cat.name}</span>
                    <span className="text-muted-foreground text-base">{cat._count.tasks} tâches</span>
                  </div>
                  <Progress 
                    value={(cat._count.tasks / totalTasksInCategoryDistribution) * 100} 
                    className="h-3"
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}