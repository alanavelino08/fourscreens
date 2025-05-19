import React, { useState, useEffect } from 'react';
import {
//   Box, Typography, TextField, Paper, Chip, CircularProgress, Grid, Button
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  TextField
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getCurrentUser } from '../../services/auth';
import CircularProgress from '@mui/material/CircularProgress';

import { makeStyles } from '@mui/styles';

// Estilos para las cabeceras de la tabla
const useStyles = makeStyles({
  boldHeader: {
    '& th': {
      fontWeight: 'bold',
      backgroundColor: '#f5f5f5'
    }
  }
});

export default function ShipmentsDashboard() {
  const [data, setData] = useState({ shipments: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  //const user = getCurrentUser();
  const [user, setUser] = useState(null);

  useEffect(() => {
      setUser(getCurrentUser());
    }, []);

  const fetchShipments = async () => {
    try {
    //   if (!user) {
    //     navigate('/login');
    //     return;
    //   }

      const response = await api.get(`/allshipments/dashboard/?search=${search}`);
      setData({
        shipments: response.data.shipments,
        stats: response.data.stats
      });
      setError(null);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        navigate('/login');
      } else {
        setError('Error al cargar los datos');
        console.error('Error fetching data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(fetchShipments, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, [search, user, navigate]);

  const classes = useStyles();
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);

  // Función para manejar el clic en el botón de detalles
  const handleViewDetails = (shipment) => {
    setSelectedShipment(shipment);
    setOpenDetails(true);
  };

  const handleCloseDetails = () => {
    setOpenDetails(false);
  };

  const columns = [
    { 
      field: 'shipment_code', 
      headerName: 'Código', 
      width: 150,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      )
    },
    {
      field: 'requests',
      headerName: 'Proyecto',
      width: 120,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      ),
      renderCell: (params) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {params.value && params.value.length > 0 ? (
            [...new Set(params.value.map(req => req.project))].map(project => (
              <Chip 
                key={project} 
                label={project} 
                color="primary" 
                size="small" 
              />
            ))
          ) : (
            <Chip label="Sin proyecto" size="small" />
          )}
        </Box>
      )
    },
    { 
      field: 'requirement_date', 
      headerName: 'Fecha Requerida', 
      width: 180,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      ),
      renderCell: (params) => new Date(params.value).toLocaleString() 
    },
    {
      field: 'taked_by',
      headerName: 'Responsable',
      width: 150,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      ),
      renderCell: (params) => {
        const takedBy = params.row?.taked_by;
        const fullName = takedBy ? `${takedBy.first_name} ${takedBy.last_name}` : 'Sin asignar';
        return (
          <Typography variant="subtitle">
            {fullName}
          </Typography>
        );
      }
    },
    {
      field: "preparation_at",
      headerName: "Fecha preparación",
      width: 185,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      ),
      renderCell: (params) => 
        params.value
          ? new Date(params.value).toLocaleString()
          : "Pendiente" 
    },
    {
      field: "delivered_at",
      headerName: "Fecha envio",
      width: 185,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      ),
      renderCell: (params) => 
        params.value
          ? new Date(params.value).toLocaleString()
          : "No enviado" 
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 150,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      ),
      renderCell: (params) => {
        const { status, requirement_date, delivered_at } = params.row;
        
        return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Chip de estado principal */}
            <Chip 
            label={status} 
            color={
                status === 'TERMINADO' ? 'info' :
                status === 'VALIDACION CALIDAD' ? 'info' : 
                status === 'PENDIENTE' ? 'warning' :
                status === 'CANCELADO' ? 'error' :
                status === 'EN PREPARACION' ? 'secondary' :
                status === 'ESPERA CAMION' ? 'warning' :
                status === 'EN ESPERA' ? 'warning' :
                status === 'ENVIADO' ? 'success' : 'default'
            }
            size="small"
            sx={{ 
                fontWeight: 'bold',
                alignSelf: 'flex-start' 
            }}
            />
        </Box>
        );
      }
    },
    {
        headerName: "Envio",
        width: 180,
        renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
        ),
        renderCell: (params) => {
        const { status, requirement_date, delivered_at } = params.row;
        
        return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>            
            {/* Chip de tiempo de envío solo para estado ENVIADO */}
            {status === 'ENVIADO' && requirement_date && delivered_at && (
            <Chip
                label={
                new Date(delivered_at) < new Date(requirement_date) 
                    ? "Enviado en tiempo" 
                    : "Enviado fuera de tiempo"
                }
                sx={{
                backgroundColor: 
                    new Date(delivered_at) < new Date(requirement_date) 
                    ? '#4caf50' // Verde
                    : '#f44336', // Rojo
                color: 'white',
                fontWeight: 'bold',
                alignSelf: 'flex-start'
                }}
                size="small"
            />
            )}
        </Box>
        );
    }
    },
    {
        field: 'actions',
        headerName: 'Detalles',
        width: 120,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
        ),
        renderCell: (params) => (
            <Button 
            variant="outlined" 
            color="info"
            onClick={() => handleViewDetails(params.row)}
            sx={{ mr: 1 }}
            >
            Detalles
            </Button>
        )
    }
  ];

  if (loading) return <CircularProgress />;
  
  if (error) return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography color="error">{error}</Typography>
      <Button 
        variant="contained" 
        onClick={() => window.location.reload()}
        sx={{ mt: 2 }}
      >
        Reintentar
      </Button>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard de Embarques
      </Typography>

      {/* Search field */}
      <TextField
        fullWidth
        label="Buscar codigo de embarque"
        variant="outlined"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
      />
      {/* Data table */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={data.shipments}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          getRowId={(row) => row.id}
          disableSelectionOnClick
        />
      </Paper>

      <Dialog 
        open={openDetails} 
        onClose={handleCloseDetails} 
        maxWidth="md" 
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          Detalles del Embarque {selectedShipment?.shipment_code}
        </DialogTitle>
        <DialogContent dividers>
          {selectedShipment && (
            <Box>
              {/* Información general del shipment */}
              <Box sx={{ mb: 3 }}>
                {/* <Typography variant="subtitle1" gutterBottom>
                  <strong>Fecha requerida:</strong> {new Date(selectedShipment.requirement_date).toLocaleString()}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Fecha de creación:</strong> {new Date(selectedShipment.created_at).toLocaleString()}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Responsable:</strong> {selectedShipment.taked_by ? 
                    `${selectedShipment.taked_by.first_name} ${selectedShipment.taked_by.last_name}` : 
                    'No asignado'}
                </Typography> */}
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Estado:</strong> {' '}
                  <Chip 
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
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Comentario:</strong> {selectedShipment.comment || 'Ninguno'}
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                    <strong>Tiempo en tomarlo:</strong> {' '}
                    {(() => {
                        const createdAt = new Date(selectedShipment.created_at);
                        const preparationAt = new Date(selectedShipment.preparation_at);

                        if (!selectedShipment.preparation_at) return 'No tomado';

                        const diffMs = preparationAt - createdAt;
                        const diffHours = diffMs / (1000 * 60 * 60);

                        const formatHours = (hours) => {
                        const fullHours = Math.floor(hours);
                        const remainingMinutes = (hours - fullHours) * 60;
                        const fullMinutes = Math.floor(remainingMinutes);
                        const fullSeconds = Math.round((remainingMinutes - fullMinutes) * 60);
                        
                        const parts = [];
                        if (fullHours > 0) parts.push(`${fullHours} hrs`);
                        if (fullMinutes > 0) parts.push(`${fullMinutes} min`);
                        if (fullSeconds > 0) parts.push(`${fullSeconds} secs`);
                        
                        return parts.join(' ') || '0 secs';
                        // const fullHours = Math.floor(hours);
                        // const minutes = Math.round((hours - fullHours) * 60);

                        // if (minutes === 0) return `${fullHours} hrs`;
                        // if (fullHours === 0) return `${minutes} min`;
                        // return `${fullHours} hrs ${minutes} min`;
                        };

                        return formatHours(diffHours);
                    })()}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                    <strong>Tiempo / preparación & envio: </strong> {' '}
                    {(() => {
                        
                        const preparationAt = new Date(selectedShipment.preparation_at);
                        const deliveredAt = new Date(selectedShipment.delivered_at);

                        if (!selectedShipment.delivered_at) return 'No es posible determinar el tiempo hasta el envio del embarque';

                        const diffMs = deliveredAt - preparationAt;
                        const diffHours = diffMs / (1000 * 60 * 60);

                        const formatHours = (hours) => {
                          const fullHours = Math.floor(hours);
                          const remainingMinutes = (hours - fullHours) * 60;
                          const fullMinutes = Math.floor(remainingMinutes);
                          const fullSeconds = Math.round((remainingMinutes - fullMinutes) * 60);
                        
                          const parts = [];
                          if (fullHours > 0) parts.push(`${fullHours} hrs`);
                          if (fullMinutes > 0) parts.push(`${fullMinutes} min`);
                          if (fullSeconds > 0) parts.push(`${fullSeconds} secs`);
                        
                          return parts.join(' ') || '0 secs';
                        // const fullHours = Math.floor(hours);
                        // const minutes = Math.round((hours - fullHours) * 60);

                        // if (minutes === 0) return `${fullHours} hrs`;
                        // if (fullHours === 0) return `${minutes} min`;
                        // return `${fullHours} hrs ${minutes} min`;
                        };

                        return formatHours(diffHours);
                    })()}
                </Typography>
              </Box>

              {/* Tabla de requests */}
              <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
                Materiales incluidos ({selectedShipment.requests?.length || 0})
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead className={classes.boldHeader}>
                    <TableRow>
                      <TableCell><strong>CG P/N</strong></TableCell>
                      <TableCell><strong>Cliente P/N</strong></TableCell>
                      <TableCell><strong>Nickname</strong></TableCell>
                      <TableCell><strong>Proyecto</strong></TableCell>
                      <TableCell><strong>Cantidad</strong></TableCell>
                      <TableCell><strong>Orden</strong></TableCell>
                      <TableCell><strong>Línea</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedShipment.requests?.map((request) => (
                      <TableRow key={request.id} hover>
                        <TableCell>{request.ikor_number || '-'}</TableCell>
                        <TableCell>{request.customer_pn || '-'}</TableCell>
                        <TableCell>{request.nickname || '-'}</TableCell>
                        <TableCell>{request.project || '-'}</TableCell>
                        <TableCell>{request.qty || '-'}</TableCell>
                        <TableCell>{request.order || '-'}</TableCell>
                        <TableCell>{request.line || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseDetails} 
            color="primary"
            variant="contained"
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    
  );
  
}