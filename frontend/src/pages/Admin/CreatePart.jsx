import { useEffect, useState } from 'react';
import { Button, 
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
    DialogActions } from '@mui/material';
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

const CreatePart = () => {
    const [formData, setFormData] = useState({
        ikor_number: '',
        customer_pn: '',
        nickname: '',
        project: '',
    });

    // Estados para la tabla de usuarios
    const [parts, setParts] = useState([]);
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
    const [currentPartId, setCurrentPartId] = useState(null);
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

            if (editMode) {
                await api.put(`/partnumbers/${currentPartId}/`);
              setSnackbar({
                open: true,
                message: 'Usuario actualizado exitosamente',
                severity: 'success'
               });
            } else {
                await api.post('/partnumbers/', formData);
                setSnackbar({
                    open: true,
                    message: 'Parte creada exitosamente',
                    severity: 'success'
                });
            }

            resetForm();
            fetchParts();
        } catch (error) {
            alert('Error:', error.response.data.detail || 'Error al crear usuario');
            console.error('Error creating part:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            ikor_number: '',
            customer_pn: '',
            nickname: '',
            project: '',
        });
        setEditMode(false);
        setCurrentPartId(null);
    };

    const fetchParts = async (page = 0) => {
        try {
            setLoading(true);
            const response = await api.get(`/partnumbers/?page=${page + 1}&page_size=${pagination.rowsPerPage}`);
            setParts(response.data.results);
            setPagination(prev => ({
                ...prev,
                count: response.data.count,
                currentPage: page,
                totalPages: Math.ceil(response.data.count / pagination.rowsPerPage)
            }));
        } catch (error) {
            console.error('Error al cargar partes:', error);
            setSnackbar({
                open: true,
                message: 'Error al cargar Partes',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEditPart = (part) => {
        setFormData({
            ikor_number: part.ikor_number,
            customer_pn: part.customer_pn,
            nickname: part.nickname,
            project: part.project
        });
        setCurrentPartId(part.id);
        setEditMode(true);
        window.scrollTo(0,0);
    };

    const handleDeleteClick = (partId) => {
        setCurrentPartId(partId);
        setOpenDialog(true);
    };

    const handleDeletePart = async () => {
        try {
            await api.delete(`partnumbers/${currentPartId}/`);
            setSnackbar({
                open: true,
                message: 'Parte eliminada exitosamente',
                severity: 'success'
            });
            fetchParts(pagination.currentPage);
        } catch (error) {
            console.error('Error al eliminar parte', error);
            setSnackbar({
                open: true,
                message: error.response?.data?.detail || 'Error al eliminar parte',
                severity: 'error'
            });
        } finally {
            setOpenDialog(false);
            setCurrentPartId(null);
        }
    };

    const handlePageChange = (event, newPage) => {
        fetchParts(newPage);
    };

    const handleRowsPerPageChange = (event) => {
        setPagination(prev => ({
            ...prev,
            rowsPerPage: parseInt(event.target.value, 10),
            currentPage: 0
        }));
    };

    useEffect(() => {
        fetchParts();
    }, [pagination.rowsPerPage]);

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open:false}));
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setCurrentPartId(null);
    };

    return (
        <Container maxWidth="md">
            <Box component="form" onSubmit={handleSubmit}>
                <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        {editMode ? 'Editar Parte' : 'Crear Parte'}
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item size={12}>
                            <TextField fullWidth label="Número Connect Group" name="ikor_number" value={formData.ikor_number} onChange={handleChange} required />
                        </Grid>
                        <Grid item size={12}>
                            <TextField fullWidth label="Customer PN" name="customer_pn" value={formData.customer_pn} onChange={handleChange} required />
                        </Grid>
                        <Grid item size={12}>
                            <TextField fullWidth label="Nickname" name="nickname" value={formData.nickname} onChange={handleChange} required />
                        </Grid>
                        <Grid item size={12}>
                            <TextField fullWidth select label="Proyecto" name="project" value={formData.project} onChange={handleChange} required >
                                <MenuItem value="DRAEXLMIER">DRAEXLMIER</MenuItem>
                                <MenuItem value="EISSMAN">EISSMAN</MenuItem>
                                <MenuItem value="HELLA">HELLA</MenuItem>
                                <MenuItem value="NXSTAGE">NXSTAGE</MenuItem>
                                <MenuItem value="ONITY">ONITY</MenuItem>
                                <MenuItem value="SEAMETRICS">SEAMETRICS</MenuItem>
                                <MenuItem value="ZKW">ZKW</MenuItem>
                                <MenuItem value="ACT">ACT</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>

                    <Button type="submit" variant="contained" sx={{ mt: 2, mr: 2 }} >
                    {editMode ? 'Actualizar Parte' : 'Crear Parte'}
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
                    <Typography variant='6' gutterBottom>Numeros de Parte Registrados</Typography>
                    <TableContainer>
                    <Table>
                    <TableHead className={classes.boldHeader}>
                        <TableRow>
                        <TableCell>Connect Group N°</TableCell>
                        <TableCell>N° Cliente</TableCell>
                        <TableCell>Nickname</TableCell>
                        <TableCell>Proyecto</TableCell>
                        <TableCell>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
        
                    <TableBody>
                        {loading ? (
                            <TableRow>
                            <TableCell colSpan={6} align="center">Cargando...</TableCell>
                            </TableRow>
                        ) : parts.length === 0 ? (
                            <TableRow>
                            <TableCell colSpan={6} align="center">No hay usuarios registrados</TableCell>
                            </TableRow>
                        ) : (
                            parts.map((part) => (
                            <TableRow key={part.id}>
                                <TableCell>{part.ikor_number}</TableCell>
                                <TableCell>{part.customer_pn}</TableCell>
                                <TableCell>{part.nickname}</TableCell>
                                <TableCell>{part.project}</TableCell>
                                <TableCell>
                                <IconButton onClick={() => handleEditPart(user)} color="primary">
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
                <Typography>¿Estás seguro que deseas eliminar esta parte?</Typography>
                </DialogContent>
                <DialogActions>
                <Button onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleDeletePart} color="error">Eliminar</Button>
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

export default CreatePart;