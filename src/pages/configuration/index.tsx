import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { useState } from "react"

export default function ConfigurationPage() {
  const [isLoading, setIsLoading] = useState(false)

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
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Configuration</h1>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Gestion des coefficients</h2>
        <Button 
          onClick={handleRecalculateCoefficients}
          disabled={isLoading}
        >
          Recalculer les coefficients des tâches actives
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Suppression des tâches terminées</h2>
        <div className="grid gap-4">
          <Button 
            variant="outline"
            onClick={() => handleDeleteCompleted('all')}
            disabled={isLoading}
          >
            Supprimer toutes les tâches terminées
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleDeleteCompleted('30days')}
            disabled={isLoading}
          >
            Supprimer les tâches terminées de plus de 30 jours
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleDeleteCompleted('6months')}
            disabled={isLoading}
          >
            Supprimer les tâches terminées de plus de 6 mois
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleDeleteCompleted('1year')}
            disabled={isLoading}
          >
            Supprimer les tâches terminées de plus d&apos;un an
          </Button>
        </div>
      </Card>
    </div>
  )
}