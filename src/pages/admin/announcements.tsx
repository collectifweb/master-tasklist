import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RoleProtection } from '@/components/RoleProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Edit, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  publishedAt: string | null;
  stats: {
    readCount: number;
    totalUsers: number;
    readPercentage: number;
  };
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

const getStatusBadge = (announcement: Announcement) => {
  if (!announcement.isActive) {
    return <Badge variant="secondary">Inactif</Badge>;
  }
  
  if (!announcement.publishedAt) {
    return <Badge variant="outline">Brouillon</Badge>;
  }
  
  const publishDate = new Date(announcement.publishedAt);
  const now = new Date();
  
  if (publishDate > now) {
    return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Programmé</Badge>;
  }
  
  return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Publié</Badge>;
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Nouveautés',
    publishedAt: '',
    isActive: true
  });

  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();

  const fetchAnnouncements = async (page = 1, category = selectedCategory, status = selectedStatus) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(category !== 'all' && { category }),
        ...(status !== 'all' && { status })
      });

      const response = await fetch(`/api/admin/announcements?${params}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les annonces"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingAnnouncement 
        ? `/api/announcements/${editingAnnouncement.id}`
        : '/api/announcements';
      
      const method = editingAnnouncement ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          publishedAt: formData.publishedAt || null
        })
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: editingAnnouncement 
            ? "Annonce mise à jour avec succès"
            : "Annonce créée avec succès"
        });
        
        setIsDialogOpen(false);
        resetForm();
        fetchAnnouncements();
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder l'annonce"
      });
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      publishedAt: announcement.publishedAt 
        ? format(new Date(announcement.publishedAt), "yyyy-MM-dd'T'HH:mm")
        : '',
      isActive: announcement.isActive
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Annonce supprimée avec succès"
        });
        fetchAnnouncements();
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer l'annonce"
      });
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      const response = await fetch(`/api/announcements/${announcement.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isActive: !announcement.isActive
        })
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: `Annonce ${!announcement.isActive ? 'activée' : 'désactivée'} avec succès`
        });
        fetchAnnouncements();
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le statut de l'annonce"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'Nouveautés',
      publishedAt: '',
      isActive: true
    });
    setEditingAnnouncement(null);
  };

  const handleNewAnnouncement = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    fetchAnnouncements(1, category, selectedStatus);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    fetchAnnouncements(1, selectedCategory, status);
  };

  const handlePageChange = (newPage: number) => {
    fetchAnnouncements(newPage);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return (
    <RoleProtection requiredRole="admin">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Gestion des annonces</h1>
            <Button onClick={handleNewAnnouncement}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle annonce
            </Button>
          </div>
          
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

            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
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
                <Card key={announcement.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{announcement.title}</h3>
                          <Badge className={getCategoryColor(announcement.category)}>
                            {getCategoryIcon(announcement.category)} {announcement.category}
                          </Badge>
                          {getStatusBadge(announcement)}
                        </div>
                        
                        <p className="text-muted-foreground mb-2 line-clamp-2">
                          {announcement.content.length > 150 
                            ? announcement.content.substring(0, 150) + '...'
                            : announcement.content
                          }
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            Créé {formatDistanceToNow(new Date(announcement.createdAt), {
                              addSuffix: true,
                              locale: fr
                            })}
                          </span>
                          {announcement.publishedAt && (
                            <span>
                              Publié le {format(new Date(announcement.publishedAt), 'dd/MM/yyyy à HH:mm')}
                            </span>
                          )}
                          <span>
                            Lu par {announcement.stats.readCount}/{announcement.stats.totalUsers} utilisateurs 
                            ({announcement.stats.readPercentage}%)
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(announcement)}
                        >
                          {announcement.isActive ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(announcement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer l'annonce</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(announcement.id)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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

        {/* Dialog for creating/editing announcements */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nouveautés">🆕 Nouveautés</SelectItem>
                    <SelectItem value="Corrections">⚠️ Corrections</SelectItem>
                    <SelectItem value="Maintenance">🔧 Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content">Contenu</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  required
                />
              </div>

              <div>
                <Label htmlFor="publishedAt">Date de publication (optionnel)</Label>
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  value={formData.publishedAt}
                  onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Laissez vide pour publier immédiatement, ou choisissez une date future pour programmer la publication.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <Label htmlFor="isActive">Annonce active</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingAnnouncement ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RoleProtection>
  );
}