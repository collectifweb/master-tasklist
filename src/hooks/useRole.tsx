import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'user' | 'admin';

export const useRole = () => {
  const { user } = useAuth();

  const getUserRole = (): UserRole => {
    return (user?.role as UserRole) || 'user';
  };

  const isAdmin = (): boolean => {
    return getUserRole() === 'admin';
  };

  const isUser = (): boolean => {
    return getUserRole() === 'user';
  };

  const hasRole = (role: UserRole): boolean => {
    return getUserRole() === role;
  };

  const canAccess = (requiredRole: UserRole): boolean => {
    const currentRole = getUserRole();
    
    // Admin can access everything
    if (currentRole === 'admin') {
      return true;
    }
    
    // User can only access user-level content
    if (currentRole === 'user' && requiredRole === 'user') {
      return true;
    }
    
    return false;
  };

  return {
    role: getUserRole(),
    isAdmin,
    isUser,
    hasRole,
    canAccess,
  };
};