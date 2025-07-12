import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

export function FeedbackNotification() {
  const { token } = useAuth();
  const { isAdmin } = useRole();
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNewFeedbackCount = async () => {
    if (!token || !isAdmin()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/feedback/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNewFeedbackCount(data.count);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du nombre de nouveaux feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewFeedbackCount();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchNewFeedbackCount, 30000);
    
    return () => clearInterval(interval);
  }, [token, isAdmin]);

  // Ne pas afficher le composant si l'utilisateur n'est pas admin
  if (!isAdmin() || loading) {
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