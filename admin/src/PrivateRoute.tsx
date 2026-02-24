import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const ALLOWED_ADMIN_PORTAL_ROLES = new Set(['admin', 'merchant']);

export function PrivateRoute({ children }: PrivateRouteProps) {
  const token = localStorage.getItem('token');
  const rawUser = localStorage.getItem('user');

  if (!token || !rawUser) {
    return <Navigate to='/login' replace />;
  }

  try {
    const user = JSON.parse(rawUser);
    if (!ALLOWED_ADMIN_PORTAL_ROLES.has(user?.role)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return <Navigate to='/login' replace />;
    }
  } catch (_error) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to='/login' replace />;
  }

  return <>{children}</>;
}

export default PrivateRoute;
