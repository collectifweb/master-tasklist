import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  publishedAt: string;
  isRead: boolean;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Nouveautés':
      return '🆕';
    case 'Corrections':
      return '⚠️';
    case 'Maintenance':
      return '🔧';
    default:
      return '📢';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Nouveautés':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'Corrections':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'Maintenance':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

interface AnnouncementNotificationProps {
  iconSize?: string;
}

export function AnnouncementNotification({ iconSize = "h-6 w-6" }: AnnouncementNotificationProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { getAuthHeaders, user, initializing } = useAuth();
  const router = useRouter();

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/announcements/unread-count', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchRecentAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements?limit=5', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setRecentAnnouncements(data.announcements);
      }
    } catch (error) {
      console.error('Error fetching recent announcements:', error);
    }
  };

  const markAsRead = async (announcementId: number) => {
    try {
      await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      // Update local state
      setRecentAnnouncements(prev => 
        prev.map(ann => 
          ann.id === announcementId ? { ...ann, isRead: true } : ann
        )
      );
      
      // Refresh unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleAnnouncementClick = (announcement: Announcement) => {
    if (!announcement.isRead) {
      markAsRead(announcement.id);
    }
    setIsOpen(false);
    router.push(`/announcements?id=${announcement.id}`);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push('/announcements');
  };

  useEffect(() => {
    // Ne faire les appels que si l'auth est complètement initialisée
    if (!initializing && user) {
      fetchUnreadCount();
      fetchRecentAnnouncements();
      
      // Refresh every 5 minutes
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchRecentAnnouncements();
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [initializing, user]);

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          id="announcement-notification-btn"
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className={iconSize} />
          {unreadCount > 0 && (
            <Badge
              id="unread-count-badge"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        id="announcement-dropdown"
        className="w-80 p-0"
        align="end"
        sideOffset={5}
      >
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-3">Annonces</h3>
          
          {recentAnnouncements.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucune annonce récente
            </p>
          ) : (
            <div className="space-y-3">
              {recentAnnouncements.map((announcement) => (
                <Card
                  key={announcement.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    !announcement.isRead ? 'border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleAnnouncementClick(announcement)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className={`font-medium text-sm leading-tight ${
                        !announcement.isRead ? 'font-semibold' : ''
                      }`}>
                        {announcement.title}
                      </h4>
                      <Badge
                        className={`text-xs px-2 py-1 ${getCategoryColor(announcement.category)}`}
                      >
                        {getCategoryIcon(announcement.category)} {announcement.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {truncateContent(announcement.content)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(announcement.publishedAt), {
                        addSuffix: true,
                        locale: fr
                      })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {recentAnnouncements.length > 0 && (
            <>
              <Separator className="my-3" />
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={handleViewAll}
              >
                Voir toutes les annonces
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}