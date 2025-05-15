import axios from 'axios'

// Vite usa import.meta.env en lugar de process.env
const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
});

// Nuevo: Interceptor de respuestas para manejar tokens expirados
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 y no es una solicitud de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Evitar bucle infinito

      try {
        // Intentar renovar el token con el refresh_token
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        // Guardar el nuevo access_token
        localStorage.setItem('access_token', response.data.access);
        
        // Reintentar la solicitud original con el nuevo token
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
        return api(originalRequest);

      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        // Si el refresh falla, limpiar tokens y redirigir a login
        logout();
        window.location.href = '/login'; // Usamos window.location para asegurar recarga
      }
    }

    return Promise.reject(error);
  }
);

export default api