import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';
import { RoleProtection } from '@/components/RoleProtection';

export default function DebugUser() {
  const { user } = useAuth();
  const { role, isAdmin, isUser, canAccess } = useRole();
  const router = useRouter();

  const refreshUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('Fresh user data:', userData);
        // Force page reload to update context
        window.location.reload();
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  return (
    <RoleProtection requiredRole="admin">
      <div className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Debug Utilisateur</h1>
            <p className="text-muted-foreground">
              Informations de débogage pour le système de rôles
            </p>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Données Utilisateur (Context)</h2>
            <pre className="bg-muted p-4 rounded text-sm overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Hook useRole</h2>
            <div className="space-y-2">
              <p><strong>Role:</strong> {role}</p>
              <p><strong>Is Admin:</strong> {isAdmin() ? 'Oui' : 'Non'}</p>
              <p><strong>Is User:</strong> {isUser() ? 'Oui' : 'Non'}</p>
              <p><strong>Can Access Admin:</strong> {canAccess('admin') ? 'Oui' : 'Non'}</p>
              <p><strong>Can Access User:</strong> {canAccess('user') ? 'Oui' : 'Non'}</p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Token Info</h2>
            <div className="space-y-2">
              <p><strong>Token présent:</strong> {localStorage.getItem('token') ? 'Oui' : 'Non'}</p>
              <p><strong>Token (premiers 50 chars):</strong> {localStorage.getItem('token')?.substring(0, 50)}...</p>
            </div>
          </Card>

          <div className="space-y-3">
            <Button onClick={refreshUserData} className="w-full">
              Actualiser les données utilisateur
            </Button>
            
            <Button 
              onClick={() => router.push('/')} 
              variant="outline" 
              className="w-full"
            >
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    </RoleProtection>
  );
}