import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { RefreshCw, Database, Clock } from 'lucide-react'

type KeepAliveStats = {
  success: boolean
  timestamp: string
  stats: {
    users: number
    tasks: number
    categories: number
  }
  message: string
}

export default function KeepAlivePage() {
  const [loading, setLoading] = useState(false)
  const [lastPing, setLastPing] = useState<KeepAliveStats | null>(null)
  const { toast } = useToast()

  const testKeepAlive = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/keep-alive', {
        method: 'GET',
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setLastPing(data)
      
      toast({
        title: "Succès",
        description: "Base de données maintenue active avec succès",
      })
    } catch (error) {
      console.error('Erreur keep-alive:', error)
      toast({
        title: "Erreur",
        description: "Impossible de maintenir la base de données active",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Keep-Alive Administration</h1>
          <p className="text-muted-foreground">
            Système de maintien de la base de données Supabase active
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Test Manuel</h2>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Testez manuellement le système keep-alive pour vérifier qu'il fonctionne correctement.
            </p>
            
            <Button 
              onClick={testKeepAlive} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Test en cours...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Tester Keep-Alive
                </>
              )}
            </Button>
          </div>
        </Card>

        {lastPing && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Dernier Ping</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {lastPing.stats.users}
                  </div>
                  <div className="text-sm text-muted-foreground">Utilisateurs</div>
                </div>
                
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {lastPing.stats.tasks}
                  </div>
                  <div className="text-sm text-muted-foreground">Tâches</div>
                </div>
                
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {lastPing.stats.categories}
                  </div>
                  <div className="text-sm text-muted-foreground">Catégories</div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <strong>Timestamp:</strong> {new Date(lastPing.timestamp).toLocaleString('fr-FR')}
              </div>
              
              <div className="text-sm">
                <strong>Message:</strong> {lastPing.message}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Configuration Automatique</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Fréquence:</span>
                <span className="text-sm text-muted-foreground">Tous les jours à 8h00 UTC</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Endpoint:</span>
                <span className="text-sm text-muted-foreground">/api/keep-alive</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Statut:</span>
                <span className="text-sm text-green-600">✓ Configuré</span>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Le système Vercel Cron Jobs appellera automatiquement l'endpoint keep-alive 
              tous les jours pour maintenir votre base de données Supabase active et éviter 
              qu'elle se mette en pause.
            </div>
          </div>
        </Card>

        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  )
}