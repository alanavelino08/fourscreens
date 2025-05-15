

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Box, Typography, Container, Alert } from '@mui/material';
import { login, getCurrentUser } from '../services/auth';
import logo from '../assets/logo-connectgroup-blue.svg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const tokens = await login(email, password);
      console.log('Tokens received:', tokens);
      
      const user = getCurrentUser();
      console.log('User decoded:', user);
      
      if (!user) {
        throw new Error('Error al decodificar el token');
      }

      // if (user.role === 'ADMIN') {
      //   navigate('/admin/requests');
      // } else {
      //   navigate('/planner/requests');
      // }
      // Redirección basada en el rol
      switch(user.role) {
        case 'ADMIN':
          navigate('/admin/requests');
          break;
        case 'PLANNER':
          navigate('/planner/requests');
          break;
        case 'WAREHOUSE':
          navigate('/warehouse/requests');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">

    <header>
      <img src={logo} alt="Logo de la empresa" style={{ width: '150px', position: 'absolute', top: 8, left:12 }} />
    </header>

      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Iniciar Sesión
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Cargando...' : 'Ingresar'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;