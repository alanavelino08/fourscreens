import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = getCurrentUser();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export default ProtectedRoute;