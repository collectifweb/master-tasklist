import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Category {
  id: string;
  name: string;
  taskCount?: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    const response = await fetch('/api/categories');
    const data = await response.json();
    setCategories(data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newCategory }),
    });

    if (response.ok) {
      setNewCategory('');
      fetchCategories();
    } else {
      setError('Erreur lors de l\'ajout de la catégorie');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    const response = await fetch(`/api/categories/${editingCategory.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: editingCategory.name }),
    });

    if (response.ok) {
      setEditingCategory(null);
      fetchCategories();
    } else {
      setError('Erreur lors de la modification de la catégorie');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const response = await fetch(`/api/categories/${categoryId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setDeleteConfirm(null);
      fetchCategories();
    } else {
      const data = await response.json();
      setError(data.error || 'Erreur lors de la suppression de la catégorie');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Gérer les catégories</h1>

      <div className="flex gap-4 mb-8">
        <Input
          placeholder="Nouvelle catégorie"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />
        <Button onClick={handleAddCategory}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      <div className="space-y-4">
        {categories.map((category) => (
          <Card key={category.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{category.name}</h3>
                {category.taskCount !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    {category.taskCount} tâche(s)
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Modifier la catégorie</DialogTitle>
                    </DialogHeader>
                    <Input
                      value={editingCategory?.name || category.name}
                      onChange={(e) => setEditingCategory({
                        ...category,
                        name: e.target.value
                      })}
                    />
                    <Button onClick={handleUpdateCategory}>
                      Sauvegarder
                    </Button>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-700"
                  onClick={() => setDeleteConfirm(category.id)}
                  disabled={category.taskCount ? category.taskCount > 0 : false}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog 
        open={!!deleteConfirm} 
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette catégorie ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDeleteCategory(deleteConfirm)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}