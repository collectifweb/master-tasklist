import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { RoleProtection } from "@/components/RoleProtection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, Edit, Trash2, CheckCircle, RotateCcw, ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case "Bug":
      return "🐛";
    case "Suggestion":
      return "💡";
    case "Autre":
      return "📝";
    default:
      return "💬";
  }
};

const getStatusBadge = (status: string) => {
  if (status === "Nouveau") {
    return <Badge variant="destructive">Nouveau</Badge>;
  }
  return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Résolu</Badge>;
};

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();

  const fetchFeedbacks = async (
    page = 1,
    status = selectedStatus,
    type = selectedType,
    searchValue = search
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(status !== "all" && { status }),
        ...(type !== "all" && { type }),
        ...(searchValue && { search: searchValue }),
      });

      const response = await fetch(`/api/feedback?${params}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data.feedbacks || []);
        setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      } else {
        throw new Error("Erreur lors du chargement des feedbacks");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les feedbacks",
      });
      setFeedbacks([]);
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (feedback: Feedback, newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/feedback/${feedback.id}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Statut mis à jour",
        });
        fetchFeedbacks(pagination.page);
        setIsDialogOpen(false);
      } else {
        throw new Error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (feedback: Feedback) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/feedback/${feedback.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Feedback supprimé",
        });
        fetchFeedbacks(pagination.page);
        setIsDialogOpen(false);
      } else {
        throw new Error("Erreur lors de la suppression");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le feedback",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchFeedbacks(newPage);
  };

  const handleOpenDialog = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setIsDialogOpen(true);
  };

  const handleStatusFilterChange = (status: string) => {
    setSelectedStatus(status);
    fetchFeedbacks(1, status, selectedType, search);
  };

  const handleTypeFilterChange = (type: string) => {
    setSelectedType(type);
    fetchFeedbacks(1, selectedStatus, type, search);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    fetchFeedbacks(1, selectedStatus, selectedType, e.target.value);
  };

  useEffect(() => {
    fetchFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RoleProtection requiredRole="admin">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Gestion des feedbacks</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={selectedStatus} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="Nouveau">Nouveau</SelectItem>
                <SelectItem value="Résolu">Résolu</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={handleTypeFilterChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="Bug">🐛 Bug</SelectItem>
                <SelectItem value="Suggestion">💡 Suggestion</SelectItem>
                <SelectItem value="Autre">📝 Autre</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Input
                placeholder="Recherche (email, sujet, message...)"
                value={search}
                onChange={handleSearchChange}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Chargement des feedbacks...</p>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucun feedback trouvé.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {feedbacks.map((feedback) => (
                <Card key={feedback.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getTypeIcon(feedback.type)}</span>
                          <Badge variant="secondary">{feedback.type}</Badge>
                          {getStatusBadge(feedback.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <span>{feedback.userEmail}</span>
                          <span>•</span>
                          <span>
                            Créé {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true, locale: fr })}
                          </span>
                          {feedback.resolvedAt && (
                            <>
                              <span>•</span>
                              <span>
                                Résolu le {format(new Date(feedback.resolvedAt), "dd/MM/yyyy à HH:mm")}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="font-semibold mb-1">{feedback.subject || "Sans sujet"}</div>
                        <div className="text-muted-foreground line-clamp-2">{feedback.message}</div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(feedback)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {feedback.status === "Nouveau" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(feedback, "Résolu")}
                            disabled={isUpdating}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(feedback, "Nouveau")}
                            disabled={isUpdating}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer le feedback</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer ce feedback ? Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(feedback)}>
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
                  Page {pagination.page} sur {pagination.totalPages} ({pagination.total} feedbacks)
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

        {/* Dialog for feedback details */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Détails du feedback</DialogTitle>
            </DialogHeader>
            {selectedFeedback && (
              <div className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg">{getTypeIcon(selectedFeedback.type)}</span>
                    <span>{selectedFeedback.type}</span>
                  </div>
                </div>
                <div>
                  <Label>Statut</Label>
                  <div className="mt-1">{getStatusBadge(selectedFeedback.status)}</div>
                </div>
                <div>
                  <Label>Email</Label>
                  <div className="mt-1">{selectedFeedback.userEmail}</div>
                </div>
                <div>
                  <Label>Sujet</Label>
                  <div className="mt-1">{selectedFeedback.subject || "Sans sujet"}</div>
                </div>
                <div>
                  <Label>Message</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {selectedFeedback.message}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date de création</Label>
                    <div className="mt-1">
                      {selectedFeedback.createdAt
                        ? format(new Date(selectedFeedback.createdAt), "dd/MM/yyyy à HH:mm", { locale: fr })
                        : ""}
                    </div>
                  </div>
                  {selectedFeedback.resolvedAt && (
                    <div>
                      <Label>Date de résolution</Label>
                      <div className="mt-1">
                        {selectedFeedback.resolvedAt
                          ? format(new Date(selectedFeedback.resolvedAt), "dd/MM/yyyy à HH:mm", { locale: fr })
                          : ""}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-4">
                  {selectedFeedback.status === "Nouveau" ? (
                    <Button
                      onClick={() => handleStatusChange(selectedFeedback, "Résolu")}
                      disabled={isUpdating}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Marquer comme résolu
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange(selectedFeedback, "Nouveau")}
                      disabled={isUpdating}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Rouvrir
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selectedFeedback)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleProtection>
  );
}