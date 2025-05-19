//ACTUAL
import React, { useState, useEffect, useDebugValue } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Button, 
  Typography, Box, Tabs, Tab, Chip,
  Pagination, Stack, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Menu, MenuItem, Select, FormControl, InputLabel, TextField,
  InputAdornment, IconButton
} from '@mui/material';
import api from '../../services/api';
import { getCurrentUser } from '../../services/auth';
import { makeStyles } from '@mui/styles';

import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

//Negritas (Bold)
const useStyles = makeStyles({
  boldHeader: {
    '& .MuiTableCell-head': {
      fontWeight: 'bold',
    },
  },
});

// Codigo timer descendente - hora actual - requerimiento
const CountdownTimer = ({ requirementDate }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(requirementDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(requirementDate);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.total <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [requirementDate]);

  function calculateTimeLeft(dateString) {
    const now = new Date();
    
    // Parsear correctamente la fecha tipo "5/14/2025, 2:30:00 AM"
    const parsedDate = new Date(Date.parse(dateString));

    const difference = parsedDate - now;

    if (difference <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    return {
      hours: Math.floor((difference / (1000 * 60 * 60))),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      total: difference
    };
  }

  const { hours, minutes, seconds } = timeLeft;

  return (
    <span>
      {`${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
    </span>
  );
};

// Estatus
const STATUS_OPTIONS = [
  { value: 'EN PREPARACION', label: 'En Preparacion' },
  { value: 'TERMINADO', label: 'Terminado' },
  { value: 'VALIDACION CALIDAD', label: 'Validacion Calidad' },
  { value: 'ESPERA CAMION', label: 'Espera Camion' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'EN ESPERA', label: 'En Espera' },
  { value: 'CANCELADO', label: 'Cancelado' },
  { value: 'PENDIENTE', label: 'Pendiente'}
];

const ShipmentsList = ({ showAll }) => {
  const classes = useStyles();
  const [shipments, setShipments] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [pagination, setPagination] = useState({
    count: 0,
    currentPage: 1,
    totalPages: 1
  });
  const [loading, setLoading] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const user = getCurrentUser();

  const isWarehouseUser = user?.role === 'WAREHOUSE';
  const isAdminUser = user?.role === 'ADMIN';

  const fetchShipments = async (page = 1) => {
    try {
      setLoading(true);
      // const endpoint = isWarehouseUser 
      //   ? '/shipments/list/?status=CONFIRMED' 
      //   : '/shipments/list/';
      const endpoint = isWarehouseUser 
      ? '/shipments/list/?status=EN PREPARACION,TERMINADO,VALIDACION CALIDAD,ESPERA CAMION,ENVIADO,EN ESPERA,CANCELADO' 
      : '/shipments/list/';
      const response = await api.get(`${endpoint}?page=${page}`);
      setShipments(response.data.results);
      setPagination({
        count: response.data.count,
        currentPage: page,
        totalPages: Math.ceil(response.data.count / 10)
      });
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [tabValue]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  },[]);

  //Admin aprueba - confirma Shipment
  // const handleApprove = async (id) => {
  //   try {
  //     await api.patch(`/shipments/${id}/approve/`, { status: 'EN PREPARACION' });
  //     fetchShipments(pagination.currentPage);
  //   } catch (error) {
  //     console.error('Error approving shipment:', error);
  //   }
  // };

  //Cambiar estatus - WH
  const handleStatusChange = async (shipmentId, newStatus) => {
    try {
      //await api.patch(`/shipments/${shipmentId}/`, { status: newStatus });
      await api.patch(`/shipments/${shipmentId}/update_status/`, { status: newStatus });
      fetchShipments(pagination.currentPage);
    } catch (error) {
      console.error('Error updating shipment status:', error);
    } finally {
      setAnchorEl(null);
    }
  };


  //Calculo de fechas
  const getUrgencyBackground = (requirementDate) => {
    const hours = getHoursDifference(requirementDate);
    
    if (hours >= 24) return 'success.light';
    if (hours >= 9) return 'warning.light';
    if (hours >= 0) return 'error.light';
    return 'grey.200';
  };
  
  const getUrgencyTextColor = (requirementDate) => {
    const hours = getHoursDifference(requirementDate);
    
    //if (hours >= 24) return 'success.dark';
    if (hours >= 24) return { bgcolor: 'success.dark', color: 'white' };
    if (hours >= 9) return { bgcolor: 'warning.dark', color: 'white'};
    if (hours >= 0) return { bgcolor: 'error.dark', color: 'white'};
    return 'grey.700';
  };
  
  const isUrgent = (requirementDate) => {
    return getHoursDifference(requirementDate) < 9 && getHoursDifference(requirementDate) >= 0;
  };
  
  const getHoursDifference = (requirementDate) => {
    const now = new Date();
    const requirement = new Date(requirementDate);
    return (requirement - now) / (1000 * 60 * 60);
  };

  const handleStatusClick = (event, shipment) => {
    setAnchorEl(event.currentTarget);
    setSelectedShipment(shipment);
    setSelectedStatus(shipment.status);
  };

  const handleStatusClose = () => {
    setAnchorEl(null);
  };

  const handlePageChange = (event, page) => {
    fetchShipments(page);
  };

  const handleViewDetails = (shipment) => {
    setSelectedShipment(shipment);
    setOpenDetails(true);
  };

  const handleCloseDetails = () => {
    setOpenDetails(false);
  };

  // Filtrar embarques según el rol
  const filteredShipments = showAll 
    ? shipments 
    : shipments.filter(shipment => shipment.created_by === user?.id);

  const pendingShipments = isWarehouseUser ? [] : filteredShipments.filter(shipment => shipment.status === 'PENDIENTE');

  // excluir los shipments terminados y cancelados
  const processedShipments = filteredShipments.filter(shipment => 
    isWarehouseUser
      ? shipment.status !== 'ENVIADO' && shipment.status !== 'CANCELADO'
      : shipment.status !== 'PENDIENTE'
  );

  //Input busqueda
  const [searchTerm, setSearchTerm] = useState('');
  

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {isWarehouseUser ? 'Embarques para Preparación' : (showAll ? 'Todos los Embarques' : 'Mis Embarques')}
      </Typography>

      {/* Input busqueda */}
      <TextField
        label="Buscar por código"
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2, width: '100%', maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton onClick={() => setSearchTerm('')} size="small">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      {/* Mostrar pestañas solo si no es warehouse */}
      {!isWarehouseUser && (
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab label="Pendientes" />
          <Tab label="Procesados" />
        </Tabs>
      )}
      
      <TableContainer component={Paper} 
      sx={{ mb: 2, maxHeight: 'calc(100vh - 200ppx)',
        overflow: 'auto', '& .MuiTableCell-head': {
          backgroundColor: 'background.paper',
          position: 'sticky',
          top: 0, zIndex: 1
        }
       }}>
        <Table>
          <TableHead className={classes.boldHeader}>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Proyecto</TableCell>
              <TableCell>Fecha Requerida</TableCell>
              {/* <TableCell>Comentario</TableCell> */}
              <TableCell>N° de Pedidos</TableCell>
              {/* {showAll && !isWarehouseUser && <TableCell>Creado por</TableCell>} */}
              {isAdminUser && <TableCell>Creado por</TableCell>}
              <TableCell>Fecha creación</TableCell>
              <TableCell>Fecha preparacion</TableCell>
              <TableCell>Tomado por</TableCell>
              <TableCell>Seguimiento por</TableCell>
              <TableCell>Fecha envio</TableCell>
              {/* {isWarehouseUser && <TableCell>Aprobado Por</TableCell>} */}
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* {(isWarehouseUser ? processedShipments : (tabValue === 0 ? pendingShipments : processedShipments))
            .sort((a, b) => new Date(a.requirement_date) - new Date(b.requirement_date))
            .map((shipment) => ( */}
            {/* {(isWarehouseUser ? processedShipments : (tabValue === 0 ? pendingShipments : processedShipments))
              .filter(shipment => 
                searchTerm === '' || 
                shipment.shipment_code.toLowerCase().includes(searchTerm.toLowerCase()))
              .sort((a, b) => new Date(a.requirement_date) - new Date(b.requirement_date))
              .map((shipment) => ( */}
              {(isWarehouseUser ? processedShipments : (tabValue === 0 ? pendingShipments : processedShipments))
                .filter(shipment => 
                  searchTerm === '' || 
                  shipment.shipment_code.toLowerCase().includes(searchTerm.toLowerCase()))
                .sort((a, b) => new Date(a.requirement_date) - new Date(b.requirement_date))
                .map((shipment) => (
              <TableRow key={shipment.id}>
                <TableCell>{shipment.shipment_code}</TableCell>
                <TableCell>
                  <Typography fontWeight="bold">
                  {shipment.requests[0].project}</Typography></TableCell>
                {/* <TableCell>
                  {new Date(shipment.requirement_date).toLocaleString()}
                </TableCell> */}
                <TableCell>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: getUrgencyBackground(shipment.requirement_date),
                      color: getUrgencyTextColor(shipment.requirement_date),
                      fontWeight: isUrgent(shipment.requirement_date) ? 'bold' : 'normal',
                      display: 'inline-block'
                    }}
                  >
                    {new Date(shipment.requirement_date).toLocaleString()}
                    
                    {shipment.status !== 'ENVIADO' && (
                      <p>
                        Faltan <CountdownTimer requirementDate={shipment.requirement_date} /> hrs
                      </p>
                    )}
                    {/* <p>Faltan <CountdownTimer requirementDate={shipment.requirement_date} /> hrs</p> */}
                    {isUrgent(shipment.requirement_date) && shipment.status !== 'ENVIADO' && (
                      <Chip 
                        label="URGENTE" 
                        size="small" 
                        sx={{ 
                          ml: 1,
                          backgroundColor: 'error.main',
                          color: 'white'
                        }} 
                      />
                    )}
                  </Box>
                </TableCell>
                {/* <TableCell>{shipment.comment || '-'}</TableCell> */}
                <TableCell>{shipment.requests?.length || 0}</TableCell>
                {/* {showAll && !isWarehouseUser && ( */}
                {isAdminUser && (
                  <TableCell>
                    {shipment.created_by === user?.id ? 'Tú' : `${shipment.created_by}`}
                  </TableCell>
                )}
                {/*Fecha de creacion */}
                <TableCell>
                  {new Date(shipment.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  {shipment?.preparation_at 
                    ? new Date(shipment.preparation_at).toLocaleString() 
                    : 'Pendiente'}
                </TableCell>
                <TableCell>
                  {shipment?.taked_by?.id 
                    ? `${shipment.taked_by.first_name} ${shipment.taked_by.last_name}` 
                    : 'No asignado'}
                </TableCell>
                <TableCell>
                  {shipment?.give_progress_by?.id 
                    ? `${shipment.give_progress_by.first_name} ${shipment.give_progress_by.last_name}` 
                    : 'No asignado'}
                </TableCell>
                <TableCell>
                  {
                    shipment?.delivered_at
                    ? new Date(shipment.delivered_at).toLocaleString()
                    : 'pendiente'}
                </TableCell>
                {/* {isWarehouseUser && (<TableCell>
                  {shipment.confirmed_by.first_name} {shipment.confirmed_by.last_name}
                </TableCell>
                )} */}
                {/* <TableCell>
                  <Chip 
                    label={shipment.status} 
                    color={
                      shipment.status === 'TERMINADO' ? 'info' :
                      shipment.status === 'VALIDACION CALIDAD' ? 'info' : 
                      shipment.status === 'PENDIENTE' ? 'warning' :
                      shipment.status === 'CANCELADO' ? 'error' :
                      shipment.status === 'EN PREPARACION' ? 'secondary' :
                      shipment.status === 'ESPERA CAMION' ? 'warning' :
                      shipment.status === 'EN ESPERA' ? 'warning' :
                      shipment.status === 'ENVIADO' ? 'success' : 'error'
                    } 
                  />
                </TableCell> */}
                <TableCell>
                  <Stack direction="column" spacing={1}>
                    {/* Chip de estado (como ya lo tienes) */}
                    <Chip 
                      label={shipment.status} 
                      color={
                        shipment.status === 'TERMINADO' ? 'info' :
                        shipment.status === 'VALIDACION CALIDAD' ? 'info' : 
                        shipment.status === 'PENDIENTE' ? 'warning' :
                        shipment.status === 'CANCELADO' ? 'error' :
                        shipment.status === 'EN PREPARACION' ? 'secondary' :
                        shipment.status === 'ESPERA CAMION' ? 'warning' :
                        shipment.status === 'EN ESPERA' ? 'warning' :
                        shipment.status === 'ENVIADO' ? 'success' : 'error'
                      } 
                    />
                    
                    {/* Nuevo Chip para el tiempo de envío (solo si está ENVIADO) */}
                    {shipment.status === 'ENVIADO' && shipment.requirement_date && shipment.delivered_at && (
                      <Chip
                        label={
                          new Date(shipment.delivered_at) < new Date(shipment.requirement_date) 
                            ? "Enviado en tiempo" 
                            : "Enviado fuera de tiempo"
                        }
                        sx={{
                          backgroundColor: 
                            new Date(shipment.delivered_at) < new Date(shipment.requirement_date) 
                              ? '#4caf50' // Verde
                              : '#f44336', // Rojo
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                        size="small"
                      />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outlined" 
                    color="info"
                    onClick={() => handleViewDetails(shipment)}
                    sx={{ mr: 1 }}
                  >
                    Detalles
                  </Button>
                  
                  {/* Botón para ADMIN aprobar */}
                  {/* {showAll && shipment.status === 'PENDING' && (
                    <Button 
                      variant="contained" 
                      color="success"
                      onClick={() => handleApprove(shipment.id)}
                    >
                      Confirmar
                    </Button>
                  )} */}
                  
                  {/* Selector de estado para WAREHOUSE */}
                  {isWarehouseUser && shipment.status !== 'ENVIADO' && (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        // value={shipment.status}
                        value={STATUS_OPTIONS.some(opt => opt.value === shipment.status) 
                        ? shipment.status 
                        : ''}
                        onChange={(e) => handleStatusChange(shipment.id, e.target.value)}
                        displayEmpty
                      >
                        {/* {STATUS_OPTIONS.map((option) => (
                          <MenuItem 
                            key={option.value} 
                            value={option.value}
                          >
                            {option.label}
                          </MenuItem> */}
                          <MenuItem value="" disabled>
                            Seleccionar estado
                          </MenuItem>
                          {/* {STATUS_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                        ))} */}
                        {STATUS_OPTIONS.filter(option => {
                          // Si es PENDIENTE, mostrar todas las opciones
                          if (shipment.status === 'PENDIENTE') return true;
                          // Si no es PENDIENTE, excluir PENDIENTE
                          return option.value !== 'PENDIENTE';
                          
                        }).map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {/* <Select
                        value={shipment.status}
                        onChange={(e) => {
                          // Primero maneja el cambio de estado
                          handleStatusChange(shipment.id, e.target.value);
                          
                          // Si el nuevo estado es "EN PREPARACION", ejecuta handleApprove
                          if (e.target.value === 'EN PREPARACION') {
                            handleApprove(shipment.id);
                          }
                        }}
                        displayEmpty
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select> */}
                    </FormControl>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo de detalles */}
      <Dialog open={openDetails} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        <DialogTitle>Detalles del Embarque {selectedShipment?.shipment_code}</DialogTitle>
        <DialogContent>
          {selectedShipment && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Fecha requerida:</strong> {new Date(selectedShipment.requirement_date).toLocaleString('en-US', { timeZone: 'UTC'})}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Comentario:</strong> {selectedShipment.comment || 'Ninguno'}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Estado:</strong> <Chip 
                  label={selectedShipment.status} 
                  color={
                    selectedShipment.status === 'TERMINADO' ? 'info' :
                    selectedShipment.status === 'VALIDACION CALIDAD' ? 'info' : 
                    selectedShipment.status === 'PENDIENTE' ? 'warning' :
                    selectedShipment.status === 'CANCELADO' ? 'error' :
                    selectedShipment.status === 'EN PREPARACION' ? 'secondary' :
                    selectedShipment.status === 'ESPERA CAMION' ? 'warning' :
                    selectedShipment.status === 'EN ESPERA' ? 'warning' :
                    selectedShipment.status === 'ENVIADO' ? 'success' : 'error'
                  } 
                />
              </Typography>
              
              <Typography variant="h6" sx={{ mt: 2 }}>Requests asociados</Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead className={classes.boldHeader}>
                    <TableRow>
                      <TableCell>CG P/N</TableCell>
                      <TableCell>Cliente P/N</TableCell>
                      <TableCell>Nickname</TableCell>
                      <TableCell>Proyecto</TableCell>
                      <TableCell>Cantidad</TableCell>
                      <TableCell>Orden</TableCell>
                      <TableCell>Línea</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedShipment.requests?.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.ikor_number}</TableCell>
                        <TableCell>{request.customer_pn}</TableCell>
                        <TableCell>{request.nickname}</TableCell>
                        <TableCell>{request.project}</TableCell>
                        <TableCell>{request.qty}</TableCell>
                        <TableCell>{request.order}</TableCell>
                        <TableCell>{request.line}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Paginación */}
      <Stack spacing={2} alignItems="center">
        <Pagination
          count={pagination.totalPages}
          page={pagination.currentPage}
          onChange={handlePageChange}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Stack>
    </Box>
  );
};

export default ShipmentsList;