import { useState, useEffect, useCallback } from 'react';

type UserRole = 'admin' | 'student' | null;

interface AuthUser {
  role: UserRole;
  token: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser>({ role: null, token: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const adminToken = localStorage.getItem('admin-token');
      const studentToken = localStorage.getItem('student-token');

      if (adminToken === 'admin') {
        setUser({ role: 'admin', token: adminToken });
      } else if (studentToken === 'student') {
        setUser({ role: 'student', token: studentToken });
      } else {
        setUser({ role: null, token: null });
      }
      setIsLoading(false);
    };

    checkAuth();
    
    // Setup event listener to catch cross-tab login/logout
    window.addEventListener('storage', checkAuth);
    // Custom event for same-tab updates
    window.addEventListener('auth-change', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-change', checkAuth);
    };
  }, []);

  const login = useCallback((role: 'admin' | 'student') => {
    const token = role === 'admin' ? 'admin' : 'student';
    const key = role === 'admin' ? 'admin-token' : 'student-token';
    
    localStorage.setItem(key, token);
    setUser({ role, token });
    window.dispatchEvent(new Event('auth-change'));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('student-token');
    setUser({ role: null, token: null });
    window.dispatchEvent(new Event('auth-change'));
  }, []);

  return { user, isLoading, login, logout, isAdmin: user.role === 'admin', isStudent: user.role === 'student' };
}
