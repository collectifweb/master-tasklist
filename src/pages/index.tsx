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
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const headers = getAuthHeaders();
        const [tasksResponse, categoriesResponse] = await Promise.all([
          fetch('/api/tasks', { headers }),
          fetch('/api/categories?includeTaskCount=true', { headers }),
        ]);

        if (!tasksResponse.ok || !categoriesResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const tasks: Task[] = await tasksResponse.json();
        const categories: Category[] = await categoriesResponse.json();

        const now = new Date();
        const weekStart = startOfWeek(now, { locale: fr });
        const weekEnd = endOfWeek(now, { locale: fr });

        const activeTasks = tasks.filter(t => !t.completed);
        const overdueTasks = activeTasks.filter(t => t.dueDate && isBefore(parseISO(t.dueDate), now));
        const completedThisWeek = tasks.filter(t => {
          if (!t.completed || !t.completedAt) return false;
          const completedDate = parseISO(t.completedAt);
          return completedDate >= weekStart && completedDate <= weekEnd;
        });

        const topPriorityTasks = [...activeTasks]
          .sort((a, b) => b.coefficient - a.coefficient)
          .slice(0, 5);

        const categoryDistribution = categories.map(cat => ({
          ...cat,
          _count: {
            tasks: activeTasks.filter(t => t.categoryId === cat.id).length,
          },
        })).filter(cat => cat._count.tasks > 0);

        setStats({
          activeTasks: activeTasks.length,
          overdueTasks: overdueTasks.length,
          completedThisWeek: completedThisWeek.length,
          topPriorityTasks,
          categoryDistribution,
        });
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Chargement du tableau de bord...</div>;
  }

  if (!stats) {
    return <div className="flex justify-center items-center h-screen">Impossible de charger les données.</div>;
  }

  const totalTasksInCategoryDistribution = stats.categoryDistribution.reduce((acc, cat) => acc + cat._count.tasks, 0);

  return (
    <div id="dashboard-page" className="container mx-auto p-4 space-y-8">
      <header id="dashboard-header" className="dashboard-header space-y-2">
        <h1 className="text-4xl font-bold">Tableau de bord</h1>
        <p id="welcome-message" className="text-2xl text-muted-foreground">
          Bonjour{username ? ` ${username}` : ''}, voici un aperçu de vos tâches.
        </p>
      </header>

      <section id="quick-actions" className="quick-actions">
        <div className="flex gap-4">
          <Button asChild><Link href="/tasks/add">Nouvelle Tâche</Link></Button>
          <Button asChild variant="secondary"><Link href="/tasks">Voir les tâches actives</Link></Button>
          <Button asChild variant="outline"><Link href="/tasks/completed">Voir les tâches terminées</Link></Button>
        </div>
      </section>

      <section id="metrics-grid" className="metrics-grid grid gap-4 md:grid-cols-3">
        <Card id="active-tasks-card">
          <CardHeader>
            <CardTitle>Tâches Actives</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.activeTasks}</p>
          </CardContent>
        </Card>
        <Card id="overdue-tasks-card">
          <CardHeader>
            <CardTitle>Tâches en Retard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-destructive">{stats.overdueTasks}</p>
          </CardContent>
        </Card>
        <Card id="completed-week-card">
          <CardHeader>
            <CardTitle>Terminées cette semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">{stats.completedThisWeek}</p>
          </CardContent>
        </Card>
      </section>

      <section id="priority-tasks-section" className="grid gap-8 md:grid-cols-2">
        <Card id="priority-tasks-card">
          <CardHeader>
            <CardTitle>Tâches Prioritaires</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {stats.topPriorityTasks.map(task => (
                <li 
                  key={task.id} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    getPriorityTaskStyles(task.coefficient)
                  )}
                >
                  <Link href={`/tasks/edit/${task.id}`} className="font-medium hover:underline">
                    {task.name}
                  </Link>
                  <span className="font-bold text-lg">{task.coefficient}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card id="category-distribution-card">
          <CardHeader>
            <CardTitle>Répartition par Catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {stats.categoryDistribution.map(cat => (
                <li key={cat.id}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-muted-foreground">{cat._count.tasks} tâches</span>
                  </div>
                  <Progress value={(cat._count.tasks / totalTasksInCategoryDistribution) * 100} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}