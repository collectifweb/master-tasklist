import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

export function FeedbackNotification() {
  const { token, user, initializing } = useAuth();
  const { isAdmin } = useRole();
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNewFeedbackCount = async () => {
    // Ne pas faire d'appel si l'auth est en cours d'initialisation
    if (initializing || !user || !isAdmin()) {
      setLoading(false);
      return;
    }

    // Utiliser le token depuis localStorage si celui du contexte n'est pas encore disponible
    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/feedback/unread-count', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNewFeedbackCount(data.count);
      } else {
        console.error('Erreur API feedback count:', response.status);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du nombre de nouveaux feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Ne faire l'appel que si l'auth est complètement initialisée
    if (!initializing && user) {
      fetchNewFeedbackCount();
      
      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(fetchNewFeedbackCount, 30000);
      
      return () => clearInterval(interval);
    }
  }, [token, user, initializing, isAdmin]);

  // Ne pas afficher le composant si l'utilisateur n'est pas admin ou si en cours de chargement
  if (initializing || !user || !isAdmin() || loading) {
    return null;
  }

  return (
    <div className="relative">
      <MessageSquare className="h-6 w-6 text-muted-foreground" />
      {newFeedbackCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {newFeedbackCount > 99 ? '99+' : newFeedbackCount}
        </Badge>
      )}
    </div>
  );
}