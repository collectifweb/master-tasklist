import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';

export default function FeedbackPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    userEmail: '',
    type: '',
    subject: '',
    message: ''
  });

  // Pré-remplir l'email si l'utilisateur est connecté
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, userEmail: user.email }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi du feedback');
      }

      setShowSuccess(true);
      setFormData({
        userEmail: user?.email || '',
        type: '',
        subject: '',
        message: ''
      });

      // Rediriger vers la page d'accueil après 3 secondes
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
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

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">Merci !</h2>
              <p className="text-muted-foreground">
                Votre feedback a été envoyé avec succès. Nous vous remercions pour votre contribution à l'amélioration de Master Tasklist.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirection automatique dans quelques secondes...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Donner une rétroaction
            </h1>
            <p className="text-muted-foreground">
              Votre avis nous aide à améliorer Master Tasklist. Partagez vos suggestions, signalez des bugs ou donnez-nous votre feedback.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Formulaire de rétroaction</CardTitle>
              <CardDescription>
                Tous les champs marqués d'un astérisque (*) sont obligatoires.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email *</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={formData.userEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, userEmail: e.target.value }))}
                    placeholder="votre@email.com"
                    required
                    disabled={!!user?.email}
                  />
                  {user?.email && (
                    <p className="text-sm text-muted-foreground">
                      Email pré-rempli depuis votre compte
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type de rétroaction *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le type de rétroaction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bug">
                        <span className="flex items-center gap-2">
                          🐛 Bug - Signaler un problème
                        </span>
                      </SelectItem>
                      <SelectItem value="Suggestion">
                        <span className="flex items-center gap-2">
                          💡 Suggestion de fonctionnalité
                        </span>
                      </SelectItem>
                      <SelectItem value="Autre">
                        <span className="flex items-center gap-2">
                          📝 Autre - Commentaire général
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Sujet (optionnel)</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Résumé court de votre rétroaction"
                    maxLength={200}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.subject.length}/200 caractères
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Décrivez votre rétroaction en détail..."
                    required
                    rows={6}
                    maxLength={2000}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.message.length}/2000 caractères
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.userEmail || !formData.type || !formData.message}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Envoi en cours...' : 'Envoyer la rétroaction'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Votre rétroaction sera examinée par notre équipe. Nous vous remercions de contribuer à l'amélioration de Master Tasklist !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}