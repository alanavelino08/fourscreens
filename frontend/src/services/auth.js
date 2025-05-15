import api from './api';

export const login = async (email, password) => {
  try {
    const response = await api.post('/token/', { email, password });

    if (response.status === 200 && response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      return response.data;
    }
    throw new Error('Credenciales incorrectas');
  } catch (error) {
    console.error('Error details:', error.response?.data);
    throw new Error(error.response?.data?.detail || 'Error de autenticación');
  }
};

export const getCurrentUser = () => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  
  try {
    // Decodificar el token para obtener la información del usuario
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    
    return {
      id: payload.user_id,
      email: payload.email,
      role: payload.role,
      fullName: payload.full_name,
      employeeNumber: payload.employee_number
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');

  window.location.href = '/login';
};