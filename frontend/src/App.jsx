
// export default App;

import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import CreateUser from './pages/Admin/CreateUser';
import RequestsList from './pages/Admin/RequestsList';
import CreateRequest from './pages/Planner/CreateRequest';
import CreatePart from './pages/Admin/CreatePart';
import ProtectedRoute from './components/ProtectedRoute';
import Datadashboard from './pages/Warehouse/Datadashboard';
import Alldatadashboard from './pages/Warehouse/Alldatadashboard';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />}/>
      
      <Route element={<Layout />}>
        {/* Admin Routes */}
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <CreateUser />
          </ProtectedRoute>
        } />
        
        <Route path="/admin/requests" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <RequestsList showAll={true} />
          </ProtectedRoute>
        } />

        <Route path="/admin/parts" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <CreatePart />
          </ProtectedRoute>
        } />

        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Datadashboard showAll={true} />
          </ProtectedRoute>
        } />

        {/* Planner Routes */}
        <Route path="/planner/requests" element={
          <ProtectedRoute allowedRoles={['PLANNER']}>
            <RequestsList showAll={false} />
          </ProtectedRoute>
        } />
        
        <Route path="/planner/request/new" element={
          <ProtectedRoute allowedRoles={['PLANNER']}>
            <CreateRequest />
          </ProtectedRoute>
        } />

        <Route path="/planner/parts" element={
          <ProtectedRoute allowedRoles={['PLANNER']}>
            <CreatePart />
          </ProtectedRoute>
        } />

        {/* Warehouse Routes */}
        <Route path="/warehouse/requests" element={
          <ProtectedRoute allowedRoles={['WAREHOUSE']}>
            <RequestsList showAll={true} warehouseView={true} />
          </ProtectedRoute>
        } />

        <Route path="/warehouse/dashboard" element={
          <ProtectedRoute allowedRoles={['WAREHOUSE']}>
            <Datadashboard showAll={true} warehouseView={true} />
          </ProtectedRoute>
        } />

        <Route path="/warehouse/allshipmentsdashboard" element={
          <ProtectedRoute allowedRoles={['WAREHOUSE']}>
            <Alldatadashboard showAll={true} warehouseView={true} />
          </ProtectedRoute>
        } />

        {/* Redirección automática según rol */}
        <Route index element={
          <ProtectedRoute allowedRoles={['ADMIN', 'PLANNER', 'WAREHOUSE']}>
            {(() => {
              const user = JSON.parse(localStorage.getItem('user'));
              if (!user) return <Navigate to="/login" replace />;
              
              switch(user.role) {
                case 'ADMIN':
                  return <Navigate to="/admin/requests" replace />;
                case 'PLANNER':
                  return <Navigate to="/planner/requests" replace />;
                case 'WAREHOUSE':
                  return <Navigate to="/warehouse/requests" replace />;
                default:
                  return <Navigate to="/login" replace />;
              }
            })()}
          </ProtectedRoute>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;