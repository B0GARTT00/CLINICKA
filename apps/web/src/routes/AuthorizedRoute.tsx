import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { canAccessPath } from '../auth/authorization';
import { useAuth } from '../hooks/useAuth';

export function AuthorizedRoute() {
  const auth = useAuth();
  const location = useLocation();
  return auth.user && canAccessPath(location.pathname, auth.user.roles) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
