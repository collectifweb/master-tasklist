import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRole, UserRole } from '@/hooks/useRole';
import { useAuth } from '@/contexts/AuthContext';

interface RoleProtectionProps {
  children: React.ReactNode;
  requiredRole: UserRole;
  fallbackPath?: string;
}

export const RoleProtection: React.FC<RoleProtectionProps> = ({
  children,
  requiredRole,
  fallbackPath = '/403'
}) => {
  const { canAccess } = useRole();
  const { user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to initialize
    if (initializing) return;

    // If user is not authenticated, let the existing auth system handle it
    if (!user) return;

    // Check if user has required role
    if (!canAccess(requiredRole)) {
      router.push(fallbackPath);
    }
  }, [user, initializing, canAccess, requiredRole, fallbackPath, router]);

  // Show loading while checking auth
  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render if user doesn't have access
  if (user && !canAccess(requiredRole)) {
    return null;
  }

  return <>{children}</>;
};