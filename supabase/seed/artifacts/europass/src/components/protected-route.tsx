import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';

export function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode, allowedRole?: 'admin' | 'student' }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user.role) {
    return <Redirect to="/login" />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
