import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShieldX, Home } from 'lucide-react';
import { useRouter } from 'next/router';
import { Logo } from '@/components/Logo';

export default function Forbidden() {
  const router = useRouter();

  const goHome = () => {
    router.push('/');
  };

  const goBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Logo />
        </div>

        {/* Error Card */}
        <Card className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <ShieldX className="h-12 w-12 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Accès non autorisé
            </h1>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={goHome} 
              className="w-full"
              size="lg"
            >
              <Home className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
            
            <Button 
              onClick={goBack} 
              variant="outline" 
              className="w-full"
              size="lg"
            >
              Retour à la page précédente
            </Button>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Si vous pensez qu'il s'agit d'une erreur, veuillez contacter votre administrateur.
          </p>
        </div>
      </div>
    </div>
  );
}