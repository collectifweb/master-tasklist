import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function ConfigurationPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [openDialog, setOpenDialog] = useState<string | null>(null)
  const [username, setUsername] = useState("")

  useEffect(() => {
    const storedUsername = localStorage.getItem("username")
    if (storedUsername) {
      setUsername(storedUsername)
    }
  }, [])

  const handleSaveUsername = () => {
    if (username.trim() === "") {
      toast({
        title: "Erreur",
        description: "Le nom d'utilisateur ne peut pas être vide.",
        variant: "destructive",
      })
      return
    }
    if (username.length > 50) {
      toast({
        title: "Erreur",
        description: "Le nom d'utilisateur ne peut pas dépasser 50 caractères.",
        variant: "destructive",
      })
      return
    }
    localStorage.setItem("username", username)
    toast({
      title: "Succès",
      description: "Nom d'utilisateur enregistré.",
    })
  }

  const handleRecalculateCoefficients = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/tasks/recalculate-coefficients', {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Erreur lors du recalcul')
      
      const data = await response.json()
      toast({
        title: "Succès",
        description: `Le coefficient de ${data.count} tâches a été recalculé avec succès`,
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du recalcul des coefficients",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setOpenDialog(null)
    }
  }

  const handleDeleteCompleted = async (period: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/tasks/delete-completed', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period }),
      })
      
      if (!response.ok) throw new Error('Erreur lors de la suppression')
      
      const data = await response.json()
      toast({
        title: "Succès",
        description: `${data.count} tâches terminées ont été supprimées avec succès`,
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression des tâches",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setOpenDialog(null)
    }
  }

  const getPeriodText = (period: string) => {
    switch (period) {
      case 'all': return 'toutes les tâches terminées'
      case '30days': return 'les tâches terminées de plus de 30 jours'
      case '6months': return 'les tâches terminées de plus de 6 mois'
      case '1year': return 'les tâches terminées de plus d\'un an'
      default: return ''
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Configuration</h1>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Nom d'utilisateur</h2>
        <div className="space-y-2">
          <Label htmlFor="username">Votre nom</Label>
          <div className="flex gap-2">
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre nom"
            />
            <Button onClick={handleSaveUsername}>Enregistrer</Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Gestion des coefficients</h2>
        <Dialog open={openDialog === 'recalculate'} onOpenChange={(open) => setOpenDialog(open ? 'recalculate' : null)}>
          <DialogTrigger asChild>
            <Button disabled={isLoading}>
              Recalculer les coefficients des tâches actives
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmation</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir recalculer les coefficients de toutes les tâches actives ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenDialog(null)}>
                Annuler
              </Button>
              <Button onClick={handleRecalculateCoefficients} disabled={isLoading}>
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Suppression des tâches terminées</h2>
        <div className="grid gap-4">
          {['all', '30days', '6months', '1year'].map((period) => (
            <Dialog 
              key={period}
              open={openDialog === `delete-${period}`} 
              onOpenChange={(open) => setOpenDialog(open ? `delete-${period}` : null)}
            >
              <DialogTrigger asChild>
                <Button variant="outline" disabled={isLoading}>
                  Supprimer {getPeriodText(period)}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmation de suppression</DialogTitle>
                  <DialogDescription>
                    Êtes-vous sûr de vouloir supprimer {getPeriodText(period)} ? Cette action est irréversible.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenDialog(null)}>
                    Annuler
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDeleteCompleted(period)}
                    disabled={isLoading}
                  >
                    Supprimer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </Card>
    </div>
  )
}