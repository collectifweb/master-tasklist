import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from "@/components/ui/use-toast";

const publicRoutes = ['/login', '/signup', '/error', '/403'];

interface User {
  id: string;
  email: string;
  name?: string;
  displaymode?: string;
  role?: string;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initializing: boolean;
  getAuthHeaders: () => HeadersInit;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  initializing: true,
  getAuthHeaders: () => ({})
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Attendre que le router soit prêt avant de vérifier l'auth
    if (router.isReady) {
      checkAuth();
    }
  }, [router.isReady]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    }
    return {
      'Content-Type': 'application/json'
    };
  };

  const checkAuth = async () => {
    try {
      // Sur les routes publiques, ne pas faire d'appel API du tout
      if (publicRoutes.includes(router.pathname)) {
        const storedToken = localStorage.getItem('token');
        setToken(storedToken);
        setInitializing(false);
        return;
      }

      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setToken(null);
        setUser(null);
        setInitializing(false);
        router.push('/login');
        return;
      }

      setToken(storedToken);

      // Si l'utilisateur est déjà défini, pas besoin de refaire l'appel API
      if (user && user.token === storedToken) {
        setInitializing(false);
        return;
      }

      // Faire l'appel API seulement sur les routes protégées
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser({ ...userData, token: storedToken });
      } else {
        console.error('Auth check failed:', response.status);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      if (!publicRoutes.includes(router.pathname)) {
        router.push('/login');
      }
    } finally {
      setInitializing(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser({ ...data.user, token: data.token });
      setInitializing(false); // Marquer l'initialisation comme terminée
      router.push('/');
      toast({
        title: "Succès",
        description: "Vous êtes connecté avec succès",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Erreur lors de la connexion",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast({
        title: "Succès",
        description: "Compte créé avec succès! Veuillez vous connecter.",
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Erreur lors de l'inscription",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // First clear the local state
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      
      // Then try to call the logout endpoint
      try {
        await fetch('/api/auth/logout', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        // Ignore any errors from the logout endpoint
        console.log('Logout endpoint error (ignored):', error);
      }

      // Always redirect to login
      router.push('/login');
      toast({
        title: "Succès",
        description: "Vous êtes déconnecté avec succès",
      });
    } catch (error: any) {
      console.error('Signout error:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la déconnexion",
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      signIn,
      signUp,
      signOut,
      initializing,
      getAuthHeaders
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);