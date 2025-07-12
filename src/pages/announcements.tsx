import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  publishedAt: string;
  isRead: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  
  const { getAuthHeaders } = useAuth();
  const router = useRouter();

  const fetchAnnouncements = async (page = 1, category = selectedCategory) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(category !== 'all' && { category })
      });

      const response = await fetch(`/api/announcements?${params}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (announcementId: number) => {
    try {
      await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      // Update local state
      setAnnouncements(prev => 
        prev.map(ann => 
          ann.id === announcementId ? { ...ann, isRead: true } : ann
        )
      );
      
      if (selectedAnnouncement && selectedAnnouncement.id === announcementId) {
        setSelectedAnnouncement(prev => prev ? { ...prev, isRead: true } : null);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleAnnouncementClick = (announcement: Announcement) => {
    if (!announcement.isRead) {
      markAsRead(announcement.id);
    }
    setSelectedAnnouncement(announcement);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    fetchAnnouncements(1, category);
  };

  const handlePageChange = (newPage: number) => {
    fetchAnnouncements(newPage);
  };

  useEffect(() => {
    fetchAnnouncements();
    
    // Check if there's a specific announcement to show from URL
    const { id } = router.query;
    if (id) {
      const announcementId = parseInt(id as string);
      if (!isNaN(announcementId)) {
        // Fetch specific announcement
        fetch(`/api/announcements/${announcementId}`, {
          headers: getAuthHeaders()
        })
        .then(response => response.ok ? response.json() : null)
        .then(announcement => {
          if (announcement) {
            setSelectedAnnouncement(announcement);
            if (!announcement.isRead) {
              markAsRead(announcement.id);
            }
          }
        })
        .catch(console.error);
      }
    }
  }, [router.query]);

  if (selectedAnnouncement) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedAnnouncement(null)}
            className="mb-4"
          >
            ← Retour aux annonces
          </Button>
          
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-2xl">{selectedAnnouncement.title}</CardTitle>
                <Badge className={getCategoryColor(selectedAnnouncement.category)}>
                  {getCategoryIcon(selectedAnnouncement.category)} {selectedAnnouncement.category}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Publié le {format(new Date(selectedAnnouncement.publishedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                {selectedAnnouncement.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Annonces</h1>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              <SelectItem value="Nouveautés">🆕 Nouveautés</SelectItem>
              <SelectItem value="Corrections">⚠️ Corrections</SelectItem>
              <SelectItem value="Maintenance">🔧 Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Chargement des annonces...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Aucune annonce trouvée.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {announcements.map((announcement) => (
              <Card
                key={announcement.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  !announcement.isRead ? 'border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => handleAnnouncementClick(announcement)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className={`font-semibold text-lg ${
                      !announcement.isRead ? 'font-bold' : ''
                    }`}>
                      {announcement.title}
                    </h3>
                    <Badge className={getCategoryColor(announcement.category)}>
                      {getCategoryIcon(announcement.category)} {announcement.category}
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground mb-3 line-clamp-3">
                    {announcement.content.length > 200 
                      ? announcement.content.substring(0, 200) + '...'
                      : announcement.content
                    }
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(announcement.publishedAt), {
                        addSuffix: true,
                        locale: fr
                      })}
                    </span>
                    {!announcement.isRead && (
                      <Badge variant="secondary" className="text-xs">
                        Non lu
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} annonces)
              </p>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}