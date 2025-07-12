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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initializing: boolean;
  getAuthHeaders: () => HeadersInit;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  initializing: true,
  getAuthHeaders: () => ({})
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

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
      const token = localStorage.getItem('token');
      if (!token) {
        setInitializing(false);
        if (!publicRoutes.includes(router.pathname)) {
          router.push('/login');
        }
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser({ ...userData, token });
      } else {
        console.error('Auth check failed:', await response.text());
        localStorage.removeItem('token');
        setUser(null);
        if (!publicRoutes.includes(router.pathname)) {
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('token');
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
      setUser({ ...data.user, token: data.token });
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