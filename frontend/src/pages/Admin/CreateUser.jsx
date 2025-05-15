import { useState, useEffect } from 'react';
import { 
  Button, 
  TextField, 
  Box, 
  Typography, 
  Container,
  Grid, 
  Paper, 
  Divider, 
  Snackbar, 
  Alert, 
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import api from '../../services/api';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles({
  boldHeader: {
    '& .MuiTableCell-head': {
      fontWeight: 'bold',
    },
  },
});

const CreateUser = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    employee_number: '',
    role: ''
  });

  // Estados para la tabla de usuarios
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    count: 0,
    currentPage: 0,
    totalPages: 1,
    rowsPerPage: 10
  });
  const classes = useStyles();
  
  // Estados para edición
  const [editMode, setEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  
  // Estados para notificaciones
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData };
      if (editMode) {
        if (dataToSend.password === "") {
          delete dataToSend.password;
        }
        await api.patch(`/users/${currentUserId}/`, dataToSend);
        setSnackbar({
          open: true,
          message: 'Usuario actualizado exitosamente',
          severity: 'success'
        });
      } else {
        await api.post('/users/', dataToSend);
        setSnackbar({
          open: true,
          message: 'Usuario creado exitosamente',
          severity: 'success'
        });
      }
      
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Error al procesar la solicitud',
        severity: 'error'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      employee_number: '',
      role: ''
    });
    setEditMode(false);
    setCurrentUserId(null);
  };

  const fetchUsers = async (page = 0) => {
    try {
      setLoading(true);
      const response = await api.get(`/users/?page=${page + 1}&page_size=${pagination.rowsPerPage}`);
      setUsers(response.data.results);
      setPagination(prev => ({
        ...prev,
        count: response.data.count,
        currentPage: page,
        totalPages: Math.ceil(response.data.count / pagination.rowsPerPage)
      }));
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar usuarios',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      first_name: user.first_name,
      last_name: user.last_name,
      employee_number: user.employee_number,
      role: user.role
    });
    setCurrentUserId(user.id);
    setEditMode(true);
    window.scrollTo(0, 0);
  };

  const handleDeleteClick = (userId) => {
    setCurrentUserId(userId);
    setOpenDialog(true);
  };

  const handleDeleteUser = async () => {
    try {
      await api.delete(`/users/${currentUserId}/`);
      setSnackbar({
        open: true,
        message: 'Usuario eliminado exitosamente',
        severity: 'success'
      });
      fetchUsers(pagination.currentPage);
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Error al eliminar usuario',
        severity: 'error'
      });
    } finally {
      setOpenDialog(false);
      setCurrentUserId(null);
    }
  };

  const handlePageChange = (event, newPage) => {
    fetchUsers(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setPagination(prev => ({
      ...prev,
      rowsPerPage: parseInt(event.target.value, 10),
      currentPage: 0
    }));
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.rowsPerPage]);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentUserId(null);
  };

  return (
    <Container maxWidth="md">
      <Box component="form" onSubmit={handleSubmit}>
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {editMode ? 'Editar usuario' : 'Crear usuario'}
          </Typography>
          <Grid container spacing={2}>
            <Grid item size={4}>
              <TextField fullWidth label="Usuario" name="username" value={formData.username} onChange={handleChange} required/>
            </Grid>

            <Grid item size={8}>
              <TextField fullWidth label="Email" name="email" value={formData.email} onChange={handleChange} required/>
            </Grid>

            <Grid item size={12}>
              <TextField fullWidth label="Contraseña" name="password" type='password' value={formData.password} onChange={handleChange} required={!editMode} helperText={editMode ? "Dejar en blanco para mantener contraseña actual" : ""}/>
            </Grid>

            <Grid item size={6}>
              <TextField fullWidth label="Nombres" name="first_name" value={formData.first_name} onChange={handleChange} required/>
            </Grid>

            <Grid item size={6}>
              <TextField fullWidth label="Apellidos" name="last_name" value={formData.last_name} onChange={handleChange} required/>
            </Grid>

            <Grid item size={6}>
              <TextField fullWidth label="Número de empleado" name="employee_number" value={formData.employee_number} onChange={handleChange} required/>
            </Grid>
            <Grid item size={6}>
              <TextField
                fullWidth
                select
                label="Rol"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <MenuItem value="PLANNER">Planner</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="WAREHOUSE">Warehouse</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Button type="submit" variant="contained" sx={{ mt: 2, mr: 2 }}>
            {editMode ? 'Actualizar Usuario' : 'Crear Usuario'}
          </Button>
         {editMode && (
          <Button variant='outline' sx={{ mt: 2}} onClick={resetForm}>
            Cancelar
          </Button>
         )}
        </Paper>
        
        <Divider sx={{ mb: 4 }} />

        {/* Tabla de usuarios */}
        <Paper elevation={2} sx={{ p: 3 }}>
         <Typography variant='6' gutterBottom>Usuarios Registrados</Typography>
         <TableContainer>
          <Table>
            <TableHead className={classes.boldHeader}>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>N° Empleado</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">Cargando...</TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">No hay usuarios registrados</TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{`${user.first_name} ${user.last_name}`}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.employee_number}</TableCell>
                      <TableCell>
                        {user.role === 'PLANNER' && 'Planner'}
                        {user.role === 'ADMIN' && 'Admin'}
                        {user.role === 'WAREHOUSE' && 'Warehouse'}
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleEditUser(user)} color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteClick(user.id)} color="error">
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
          </Table>
         </TableContainer>

         <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={pagination.count}
            rowsPerPage={pagination.rowsPerPage}
            page={pagination.currentPage}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            labelRowsPerPage="Filas por página:"
          />
        </Paper>
      </Box>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro que deseas eliminar este usuario?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleDeleteUser} color="error">Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CreateUser;