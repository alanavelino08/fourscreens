

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Box, Typography, Container, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Grid, MenuItem, Snackbar 
 } from '@mui/material';
import { login, getCurrentUser } from '../services/auth';
import logo from '../assets/logo-connectgroup-blue.svg';
import api from '../services/api';

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

  //pop up registro usuario
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    employee_number: '',
    role: ''
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      confirm_password: '',
      first_name: '',
      last_name: '',
      employee_number: '',
      role: ''
    });
  };

    const handleSubmitUser = async (e) => {
      e.preventDefault();
      try {

        formData.username = formData.username.trim().replace(/\s/g, '').toLowerCase();
        formData.email = formData.email.trim().toLowerCase();


        if (formData.password.length < 8) {
          throw new Error('La contraseña debe tener al menos 8 caracteres');
        }

        if (formData.password !== formData.confirm_password) {
          throw new Error('Las contraseñas no coinciden');
        }

        if (!formData.email.endsWith("@connectgroup.com")) {
          setSnackbar({
            open: true,
            message: 'El correo debe terminar en @connectgroup.com',
          });
      return;
        }

        if (formData.username.includes(' ')) {
        setSnackbar({
            open: true,
            message: "El nombre de usuario no puede contener espacios",
        });
        return; // Detener el envío si hay espacios
        }
        
        // Eliminar confirm_password antes de enviar
        const {confirm_password, ...dataToSend} = formData;
        
        await api.post('/users/', dataToSend);
        setSnackbar({
          open: true,
          message: 'Usuario creado exitosamente',
          severity: 'success',
        });
        resetForm();
        handleClose();
      } catch (error) {
        console.error('Error:', error);
        setSnackbar({
          open: true,
          message: error.response?.data?.detail || error.message || 'Error al procesar la solicitud',
          severity: 'error'
        });
      }
   };


  const [open, setOpen] = useState('');

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // Resetear password directamente en la BD
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleResetPassword = async () => {
    if (!resetEmail || !newPassword || !confirmPassword) {
      setSnackbar({ open: true, message: 'Todos los campos son requeridos', severity: 'warning' });
      return;
    }

    try {
      const response = await api.post('/auth/reset-password/', {
        email: resetEmail.trim().toLowerCase(),
        password: newPassword,
        confirm_password: confirmPassword
      });

      setSnackbar({ open: true, message: response.data.detail, severity: 'success' });
      setResetDialogOpen(false);
      setResetEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Error al actualizar contraseña',
        severity: 'error'
      });
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

        <Button variant="outlined" onClick={handleClickOpen}>
          Registrate
        </Button>

        <Button
          variant="text"
          onClick={() => setResetDialogOpen(true)}
          sx={{ mt: 1 }}
        >
          ¿Olvidaste tu contraseña?
        </Button>

        <Dialog
          open={open}
          onClose={handleClose}
          component="form" 
          onSubmit={handleSubmitUser}
          >

          <DialogTitle>Registro usuario</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Para registrate al portal es necesario que ingreses todos tus datos, 
              ya que son mandatorios para su alta al sistema.
            </DialogContentText>
            <Grid container spacing={2}>
            <Grid item size={4}>
              <TextField fullWidth label="Usuario" name="username" margin="dense" variant="standard" required value={formData.username} onChange={handleChange}/>
            </Grid>

            <Grid item size={8}>
              <TextField fullWidth label="Email" name="email" margin="dense" variant="standard" required value={formData.email} onChange={handleChange}/>
            </Grid>

            <Grid item size={6}>
              <TextField fullWidth label="Contraseña" name="password" type='password' margin='dense' variant='standard' required value={formData.password} onChange={handleChange}/>
            </Grid>

            <Grid item size={6}>
              <TextField fullWidth label="Confirma contraseña" name="confirm_password" type='password' margin='dense' variant='standard' required value={formData.confirm_password} onChange={handleChange}/>
            </Grid>

            <Grid item size={6}>
              <TextField fullWidth label="Nombres" name="first_name" margin='dense' variant='standard' required value={formData.first_name} onChange={handleChange}/>
            </Grid>

            <Grid item size={6}>
              <TextField fullWidth label="Apellidos" name="last_name" margin='dense' variant='standard' required value={formData.last_name} onChange={handleChange}/>
            </Grid>

            <Grid item size={6}>
              <TextField fullWidth label="Número de empleado" name="employee_number" margin='dense' variant='standard' required value={formData.employee_number} onChange={handleChange}/>
            </Grid>
            <Grid item size={6}>
              <TextField
                margin='dense' 
                variant='standard'
                select
                label="Rol"
                name="role"
                required
                value={formData.role}
                onChange={handleChange}
              >
                <MenuItem value="PLANNER">Planner</MenuItem>
                <MenuItem value="WAREHOUSE">Warehouse</MenuItem>
              </TextField>
            </Grid>


            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit">Enviar</Button>
          </DialogActions>
        </Dialog>


        <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Ingresa tu correo registrado y nueva contraseña.
            </DialogContentText>
            <TextField
              label="Correo"
              type="email"
              fullWidth
              variant="standard"
              margin="dense"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value.toLowerCase())}
            />
            <TextField
              label="Nueva contraseña"
              type="password"
              fullWidth
              variant="standard"
              margin="dense"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <TextField
              label="Confirmar contraseña"
              type="password"
              fullWidth
              variant="standard"
              margin="dense"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleResetPassword}>Actualizar</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
      />

      </Box>
    </Container>
  );
};

export default Login;