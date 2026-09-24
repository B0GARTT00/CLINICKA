import { Outlet, useLocation } from 'react-router-dom';
import { canAccessPath } from '../auth/authorization';
import { useAuth } from '../hooks/useAuth';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';

export function AuthorizedRoute() {
  const auth = useAuth();
  const location = useLocation();
  return auth.user && canAccessPath(location.pathname, auth.user.roles) ? <Outlet /> : <UnauthorizedPage />;
}
