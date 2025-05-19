import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip, CircularProgress, Grid, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getCurrentUser } from '../../services/auth';

const ShipmentsDashboard = () => {
  const [data, setData] = useState({ shipments: [], stats: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  //const user = getCurrentUser();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        // if (!user) {
        //   navigate('/login');
        //   return;
        // }

        const response = await api.get('/shipments/dashboard/');
        setData(response.data);
        setError(null);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          // Token inválido o expirado
          navigate('/login');
        } else {
          setError('Error al cargar los datos');
          console.error('Error fetching data:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [user, navigate]);

  const getUrgencyStyle = (hoursLeft) => {
    if (hoursLeft >= 24) return { bgcolor: 'success.light', color: 'white' };
    if (hoursLeft >= 9) return { bgcolor: 'warning.light', color: 'white' };
    if (hoursLeft >= 0) return { bgcolor: 'error.light', color: 'white' };
    return { bgcolor: 'grey.200', color: 'grey.700' };
  };

  const formatTimeLeft = (hoursLeft) => {
    if (hoursLeft < 0) return 'Expirado';
    
    const hours = Math.floor(hoursLeft);
    const minutes = Math.floor((hoursLeft - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

//   console.log("Que es esto?", data?.shipments || [])
    // console.log("Datos de shipments:", {
    // //firstShipment: data.shipments?.[0],
    // takedBySample: data?.shipments
    // //firstProject: data.shipments?.[0]?.requests?.[0]?.project
    // });

  const columns = [
    { field: 'shipment_code', headerName: 'Código', width: 150,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      )
    },
    {
      field: 'requests',
      headerName: 'Proyecto',
      width: 100,
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
    { field: 'status', headerName: 'Estado', width: 150,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      )
     },
    { 
      field: 'requirement_date', 
      headerName: 'Fecha Requerida', 
      width: 200,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      ),
      renderCell: (params) => new Date(params.value).toLocaleString() 
    },
    {
      field: 'responsable',
      headerName: 'Responsable',
      width: 180,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      ),
      renderCell: (params) => {
          const takedBy = params.row?.taked_by;
          const fullName = takedBy ? `${takedBy.first_name} ${takedBy.last_name}` : 'Sin asignar';
          fullName
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
      width: 200,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      ),
      renderCell: (params) => 
        params.value
        ? new Date(params.value).toLocaleString()
        : "Pendiente" 
    },
    {
      field: 'hours_left',
      headerName: 'Tiempo Restante',
      width: 150,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      ),
      renderCell: (params) => {
        const style = getUrgencyStyle(params.value);
        return (
          <Chip 
            label={formatTimeLeft(params.value)} 
            sx={{ 
              backgroundColor: style.bgcolor,
              color: style.color,
              fontWeight: params.value < 9 && params.value >= 0 ? 'bold' : 'normal'
            }} 
          />
        );
      }
    },
    {
      field: 'tiempo_toma',
      headerName: 'Tiempo en tomarlo',
      width: 150,
      renderHeader: (params) => (
        <strong>{params.colDef.headerName}</strong>
      ),
      renderCell: (params) => {
      const createdAt = new Date(params.row?.created_at);
      const preparationAt = new Date(params.row?.preparation_at);

      if (!params.row?.preparation_at) return 'No tomado';

      const diffMs = preparationAt - createdAt;
      const diffHours = diffMs / (1000 * 60 * 60); // convierte a horas

      const formatHours = (hours) => {
        const fullHours = Math.floor(hours);
        const minutes = Math.round((hours - fullHours) * 60);

        if (minutes === 0) return `${fullHours} hrs`;

        if (fullHours === 0) return `${minutes} min`;

        return `${fullHours} hrs ${minutes} min`;
      };

      return (
       <Typography variant="subtitle">
        {/* {diffHours.toFixed(2)} h */}
        {formatHours(diffHours)}
      </Typography>
       );
      }
    },
    //{ field: 'comment', headerName: 'Comentario', width: 250 },
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
        Embarques Pendientes
        {/* {user && (
          <Typography variant="subtitle1">
            Usuario: {user.fullName} ({user.role})
          </Typography>
        )} */}
      </Typography>
      
      {/* Estadísticas */}
      {/* Total pendientes */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Total Pendientes</Typography>
            <Typography variant="h3">{data.stats?.total_pending || 0}</Typography>
          </Paper>
        </Grid>
        
        {/* Total Urgentes */}
        <Grid item xs={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Urgentes</Typography>
            <Typography variant="h3" color="error.main">
              {data.stats?.urgent_count || 0}
            </Typography>
          </Paper>
        </Grid>

        {/* Total Urgentes */}
        <Grid item xs={4}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center',
            backgroundColor: 'grey.800',  // Fondo oscuro
            color: 'white'  // Texto blanco
          }}>
            <Typography variant="h6">Expirados</Typography>
            <Typography variant="h3">
              {data.stats?.expired_count || 0}
            </Typography>
          </Paper>
        </Grid>
        
        {/* <Grid item xs={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Por Estado</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
              {data.stats?.by_status?.map((item) => (
                <Chip 
                  key={item.status} 
                  label={`${item.status}: ${item.count}`} 
                />
              ))}
            </Box>
          </Paper>
        </Grid> */}
      </Grid>
      
      {/* Tabla de shipments */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
        //   rows={data.shipments}
        //   columns={columns}
          rows={data?.shipments || []}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          getRowId={(row) => row.id}
        />
      </Paper>
    </Box>
  );

};

export default ShipmentsDashboard;