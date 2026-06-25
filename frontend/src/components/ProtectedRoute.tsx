import React, { useEffect, useState, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export const ProtectedRoute: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, fetchMe } = useAuthStore();
  const [isHydrating, setIsHydrating] = useState(false);
  const hasFetched = useRef(false);

  const hasToken = !!localStorage.getItem('accessToken');

  useEffect(() => {
    if (hasToken && !user && !hasFetched.current) {
      hasFetched.current = true;
      setIsHydrating(true);
      fetchMe().finally(() => {
        setIsHydrating(false);
      });
    }
  }, [hasToken, user, fetchMe]);

  if (hasToken && (!user || isHydrating)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
