import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleProtection from '@/components/RoleProtection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Eye, CheckCircle, RotateCcw, Trash2, MessageSquare, AlertCircle, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Feedback {
  id: number;
  userEmail: string;
  type: string;
  subject: string | null;
  message: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminFeedbackPage() {
  const { user, token } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Filtres
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: ''
  });

  const fetchFeedbacks = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);

      if (!token) {
        setError("Token d'authentification manquant.");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/feedback?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des feedback');
      }

      const data = await response.json();
      if (!data.feedbacks || !data.pagination) {
        setError("La structure de la réponse du serveur est invalide.");
        setFeedbacks([]);
        setPagination({
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        });
        setLoading(false);
        return;
      }
      setFeedbacks(Array.isArray(data.feedbacks) ? data.feedbacks : []);
      setPagination({
        page: typeof data.pagination.page === "number" ? data.pagination.page : 1,
        limit: typeof data.pagination.limit === "number" ? data.pagination.limit : 10,
        total: typeof data.pagination.total === "number" ? data.pagination.total : 0,
        totalPages: typeof data.pagination.totalPages === "number" ? data.pagination.totalPages : 0,
      });
    } catch (err: any) {
      setError(err.message || "Erreur inconnue lors du chargement des feedback");
      setFeedbacks([]);
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchFeedbacks();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filters.status, filters.type]);

  const handleStatusChange = async (feedbackId: number, newStatus: string) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut');
      }

      // Rafraîchir la liste
      await fetchFeedbacks(pagination.page);
      
      // Mettre à jour le feedback sélectionné si c'est celui qui a été modifié
      if (selectedFeedback && selectedFeedback.id === feedbackId) {
        const updatedFeedback = { ...selectedFeedback, status: newStatus };
        if (newStatus === 'Résolu') {
          updatedFeedback.resolvedAt = new Date().toISOString();
        } else {
          updatedFeedback.resolvedAt = null;
        }
        setSelectedFeedback(updatedFeedback);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (feedbackId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce feedback ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      // Rafraîchir la liste
      await fetchFeedbacks(pagination.page);
      setIsDetailOpen(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Bug':
        return '🐛';
      case 'Suggestion':
        return '💡';
      case 'Autre':
        return '📝';
      default:
        return '';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Nouveau') {
      return <Badge variant="destructive">Nouveau</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Résolu</Badge>;
  };

  const filteredFeedbacks = Array.isArray(feedbacks)
    ? feedbacks.filter(feedback => {
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          return (
            feedback.userEmail.toLowerCase().includes(searchLower) ||
            (feedback.subject?.toLowerCase() ?? '').includes(searchLower) ||
            feedback.message.toLowerCase().includes(searchLower)
          );
        }
        return true;
      })
    : [];

  return (
    <RoleProtection requiredRole="admin">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                Gestion des retours
              </h1>
            </div>
            <p className="text-muted-foreground">
              Gérez les feedback et rétroactions des utilisateurs de Master Tasklist.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Filtres */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Recherche</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Email, sujet, message..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Statut</label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les statuts</SelectItem>
                      <SelectItem value="Nouveau">Nouveau</SelectItem>
                      <SelectItem value="Résolu">Résolu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les types</SelectItem>
                      <SelectItem value="Bug">🐛 Bug</SelectItem>
                      <SelectItem value="Suggestion">💡 Suggestion</SelectItem>
                      <SelectItem value="Autre">📝 Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setFilters({ status: '', type: '', search: '' })}
                    className="w-full"
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {feedbacks.filter(f => f.status === 'Nouveau').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Nouveaux</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {feedbacks.filter(f => f.status === 'Résolu').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Résolus</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {pagination.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Chargement...</div>
                </div>
              ) : filteredFeedbacks.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="text-muted-foreground">Aucun feedback trouvé</div>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Sujet</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFeedbacks.map((feedback) => (
                        <TableRow key={feedback.id}>
                          <TableCell>
                            <span className="flex items-center gap-2">
                              {getTypeIcon(feedback.type)} {feedback.type}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">
                              {feedback.subject || 'Sans sujet'}
                            </div>
                          </TableCell>
                          <TableCell>{feedback.userEmail}</TableCell>
                          <TableCell>
                            {format(new Date(feedback.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(feedback.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedFeedback(feedback);
                                  setIsDetailOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {feedback.status === 'Nouveau' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(feedback.id, 'Résolu')}
                                  disabled={isUpdating}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(feedback.id, 'Nouveau')}
                                  disabled={isUpdating}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {typeof pagination.totalPages === "number" && pagination.totalPages > 1 && (
                    <div className="mt-6">
                      <Pagination>
                        <PaginationContent>
                          {pagination.page > 1 && (
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => fetchFeedbacks(pagination.page - 1)}
                                className="cursor-pointer"
                              />
                            </PaginationItem>
                          )}
                          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => fetchFeedbacks(page)}
                                isActive={page === pagination.page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          {pagination.page < pagination.totalPages && (
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => fetchFeedbacks(pagination.page + 1)}
                                className="cursor-pointer"
                              />
                            </PaginationItem>
                          )}
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Dialog pour les détails du feedback */}
          {isDetailOpen && selectedFeedback && (
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {typeof selectedFeedback.type === "string" ? getTypeIcon(selectedFeedback.type) : ""} 
                    Détails du feedback
                  </DialogTitle>
                  <DialogDescription>
                    Feedback #{selectedFeedback.id}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <div className="flex items-center gap-2 mt-1">
                        {typeof selectedFeedback.type === "string" ? getTypeIcon(selectedFeedback.type) : ""} {selectedFeedback.type}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Statut</label>
                      <div className="mt-1">
                        {getStatusBadge(selectedFeedback.status)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <div className="mt-1">{selectedFeedback.userEmail}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Sujet</label>
                    <div className="mt-1">{selectedFeedback.subject || 'Sans sujet'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Message</label>
                    <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                      {selectedFeedback.message}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Date de création</label>
                      <div className="mt-1">
                        {selectedFeedback.createdAt ? format(new Date(selectedFeedback.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr }) : ""}
                      </div>
                    </div>
                    {selectedFeedback.resolvedAt && (
                      <div>
                        <label className="text-sm font-medium">Date de résolution</label>
                        <div className="mt-1">
                          {selectedFeedback.resolvedAt ? format(new Date(selectedFeedback.resolvedAt), 'dd/MM/yyyy à HH:mm', { locale: fr }) : ""}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4">
                    {selectedFeedback.status === 'Nouveau' ? (
                      <Button
                        onClick={() => handleStatusChange(selectedFeedback.id, 'Résolu')}
                        disabled={isUpdating}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Marquer comme résolu
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange(selectedFeedback.id, 'Nouveau')}
                        disabled={isUpdating}
                        className="flex items-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Rouvrir
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(selectedFeedback.id)}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </RoleProtection>
  );
}