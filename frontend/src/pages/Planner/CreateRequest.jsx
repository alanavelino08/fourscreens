
import React, { useState, useEffect } from 'react';
import {
  Button, TextField, Box, Typography, Container,
  Grid, Paper, Divider, Snackbar, Alert, TableBody, TableContainer, Table,
  TableHead, TableRow, TableCell, IconButton, CircularProgress 
} from '@mui/material';
import api from '../../services/api';
import { makeStyles } from '@mui/styles';
import { Delete } from '@mui/icons-material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Timeline, TimelineItem, TimelineSeparator, TimelineDot, TimelineConnector, TimelineContent } from '@mui/lab';

const useStyles = makeStyles({
    boldHeader: {
      '& .MuiTableCell-head': {
        fontWeight: 'bold',
      },
    },
  });

const CreateRequest = () => {
  const [shipmentData, setShipmentData] = useState({
    requirement_date: '',
    comment: ''
  });

  const [requestData, setRequestData] = useState({
    ikor_number: '',
    customer_pn: '',
    qty: '',
    order: '',
    line: '',
    warehouse: '',
    nickname: '',
    project: '',
    ref_client: '',
    comment_per_line: '',
  });

  const [requests, setRequests] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const classes = useStyles();

  const handleShipmentChange = (e) => {
    setShipmentData({ ...shipmentData, [e.target.name]: e.target.value });
  };

  const handleRequestChange = (e) => {
    setRequestData({ ...requestData, [e.target.name]: e.target.value });
  };

  const handleIkorNumberChange = async (e) => {
    const value = e.target.value;
    setRequestData({ ...requestData, ikor_number: value });

    if(value.length < 4) {
      setRequestData(prev => ({
        ...prev,
        customer_pn: '',
        nickname: '',
        project: ''
      }));
      return;
    }

    if (value.length >= 4) {
      try {
        const response = await api.get(`/requests/autocomplete_part/?ikor_number=${value}`);
        if (response.data.exists) {
          setRequestData(prev => ({
            ...prev,
            customer_pn: response.data.customer_pn || '',
            nickname: response.data.nickname || '',
            project: response.data.project || '',
            part_number: response.data.id
          }));
        }
      } catch (error) {
        console.error("Autocomplete error", error);
      }
    }
  };

  const handleAddRequest = () => {
    if (!requestData.ikor_number || !requestData.qty) {
      setError('CG Number y Cantidad son requeridos');
      return;
    }

    // No mezclar proyectos
    if (requests.length > 0) {
      const firstproject = requests[0].project;
      if (requestData.project !== firstproject) {
        setError(`No puedes mezclar proyectos. Este embarque es para ${firstproject}`);
        return
      }
    }

    // Verificar si partnumber tiene informacion
    if (!requestData.customer_pn || !requestData.nickname || !requestData.project) {
      setError('La parte no existe o no tiene información completa (N° Parte Cliente, Nickname, Proyecto)');
      return;
    }
    
    // Si pasa validacion agregamos
    setRequests([...requests, requestData]);
    setRequestData({
      ikor_number: '',
      customer_pn: '',
      qty: '',
      order: '',
      line: '',
      warehouse: '',
      nickname: '',
      project: '',
      ref_client: '',
      comment_per_line: '',
    });
    setError('');
  };

  //Validar ultimo embarque para no agregar uno nuevo despues de 5 horas
  const checkLastShipmentTime = async (requirementDate) => {
    try {
      const response = await api.get('/shipments/last/');
      if (response.data && response.data.requirement_date) {
        const lastRequirementTime = new Date(response.data.requirement_date);
        const newRequirementTime = new Date(requirementDate);

        // Extraer solo la fecha (sin hora) para comparar días
        const lastDateOnly = new Date(
          lastRequirementTime.getFullYear(),
          lastRequirementTime.getMonth(),
          lastRequirementTime.getDate()
        );
        const newDateOnly = new Date(
          newRequirementTime.getFullYear(),
          newRequirementTime.getMonth(),
          newRequirementTime.getDate()
        );

        // Caso 1: Si la fecha del nuevo requirement_date es diferente al último → PERMITIR
        if (newDateOnly.getTime() !== lastDateOnly.getTime()) {
          return true;
        }

        // Caso 2: Si es el mismo día, verificar si pasaron 5 horas entre requirement_date
        const timeDiffHours = (newRequirementTime - lastRequirementTime) / (1000 * 60 * 60);
        return timeDiffHours >= 5;
      }

      // Si no hay último embarque, permitir creación
      return true;
    } catch (error) {
      console.error('Error al verificar último embarque', error);
      return true; // En caso de error, permitir creación
    }
  };


  const handleCreateShipment = async () => {
    if (!shipmentData.requirement_date || requests.length === 0) {
      setError('Debes agregar al menos un request y la fecha del embarque.');
      return;
    }

    const hasNonOnityProject = requests.some(r => r.project !== 'ONITY');

    if (hasNonOnityProject) {
      const canCreate = await checkLastShipmentTime(shipmentData.requirement_date);
      if (!canCreate) {
        setError('No puedes crear un nuevo embarque antes de 5 horas desde el último embarque (EXCEPTO PARA PROYECTO ONITY)');
        return;
      }
    }

    try {
      const response = await api.post('/shipments/', {
        ...shipmentData,
        requests: requests.map(r => ({
          order: r.order,
          qty: r.qty,
          ref_client: r.ref_client,
          line: r.line,
          warehouse: r.warehouse,
          part_number: r.part_number,
          comment_per_line: r.comment_per_line,
        }))
      });
      
      const shipmentCode = response.data.shipment.shipment_code;
      const newShipment = response.data.shipment;
      setSuccessMessage(`Embarque creado correctamente: ${shipmentCode}`);
      //setSuccessMessage(`Embarque ${shipmentData.shipment_code} creado correctamente.`)
      setRequests([]);
      setShipmentData({ requirement_date: '', comment: '' });

      setLastShipments(prev => {
        // Asegurarnos que prev es un array
        const previousShipments = Array.isArray(prev) ? prev : [];
        // Agregar el nuevo embarque al inicio del array
        return [newShipment, ...previousShipments].slice(0, 10); // Mantener solo los 5 más recientes
      });
    } catch (err) {
      console.error('Error al crear embarque', err);
      setError('Hubo un error al crear el embarque.');
    }
  };

  //Identificar el indicé del array, llama a la funcion, filtra el array para eliminar
  //de acuerdo al indice, se actualiza el estado del array - se elimina el dato
  const handleDeleteRequest = (indexToDelete) => {
    setRequests(prevRequests => prevRequests.filter((_, index) => index !== indexToDelete));
  };

  // Este input oculto puede estar definido así
  const VisuallyHiddenInput = ({ ...props }) => (
    <input
      style={{ display: 'none' }}
      {...props}
    />
  );

  // habilitar boton files cuando sean lock y wall
  const nickname = requestData.nickname?.toLowerCase() || '';
  const isNicknameLock = nickname.includes('lock');
  const isNicknameWall = nickname.includes('wall');

  const isNpi = nickname.includes('npi');
  const isMuestraIngenieria = nickname.includes('muestras');

  // Timeline embarques disponibles
  // ... (tus estados existentes)
  const [lastShipments, setLastShipments] = useState([]);
  const [isLoadingShipments, setIsLoadingShipments] = useState(true);

  // Función para obtener los últimos embarques (modificada para asegurar array)
  const fetchLastShipments = async () => {
    setIsLoadingShipments(true);
    try {
    const response = await api.get('/shipments/get_shipments_today_and_tomorrow/');
    const data = response.data;

    if (!data) {
      setLastShipments([]);
    } else if (Array.isArray(data)) {
      setLastShipments(data);
    } else {
      setLastShipments([data]); // <- Aquí se arregla
    }
  } catch (err) {
    console.error('Error al obtener últimos embarques', err);
    setLastShipments([]);
  } finally {
    setIsLoadingShipments(false);
  }
  };

  // Cargar últimos embarques al montar el componente
  useEffect(() => {
    fetchLastShipments();
  }, []);

  // Componente Timeline interno mejorado
  const ShipmentTimeline = () => {
    const [availableSlots, setAvailableSlots] = useState([]);

     useEffect(() => {
    const calculateSlots = () => {
      const slots = [];
      const now = new Date();
      
      // Si no hay embarques o no es un array, cualquier horario está disponible
      if (!Array.isArray(lastShipments)) {
        return [{
          start: now,
          end: null,
          type: 'available'
        }];
      }

      if (lastShipments.length === 0) {
        return [{
          start: now,
          end: null,
          type: 'available'
        }];
      }

      // Filtrar y ordenar embarques
      const validShipments = lastShipments
        .filter(s => s?.requirement_date)
        .sort((a, b) => new Date(b.requirement_date) - new Date(a.requirement_date));
      
      if (validShipments.length === 0) {
        return [{
          start: now,
          end: null,
          type: 'available'
        }];
      }

      const lastShipmentTime = new Date(validShipments[0].requirement_date);
      const fiveHoursAfterLast = new Date(lastShipmentTime.getTime() + 5 * 60 * 60 * 1000);
      
      if (now > fiveHoursAfterLast) {
        slots.push({
          start: now,
          end: null,
          type: 'available'
        });
      } else {
        slots.push({
          start: fiveHoursAfterLast,
          end: null,
          type: 'available'
        });
      }
      
      return slots;
    };

    setAvailableSlots(calculateSlots());
  }, [lastShipments]); // Se ejecuta cada vez que lastShipments cambia

    const handleSelectTime = (dateTime) => {
      setShipmentData(prev => ({
        ...prev,
        requirement_date: dateTime.toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16)
      }));
    };

    const sortedShipments = [...lastShipments].sort(
      (a, b) => new Date(a.requirement_date) - new Date(b.requirement_date)
  );

    // Verificar y asegurar que lastShipments es un array antes de usarlo
    const safeLastShipments = Array.isArray(lastShipments) ? lastShipments : [];

    return (
      <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Horarios disponibles para embarque
        </Typography>
        
        {isLoadingShipments ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        ) : safeLastShipments.length === 0 ? (
          <Typography variant="body2" sx={{ p: 2 }}>
            No hay embarques recientes. Puedes crear uno en cualquier momento.
          </Typography>
        ) : (
          <Timeline position="alternate">
            {/* Mostrar máximo 3 embarques recientes */}
            {sortedShipments.slice(0, 10).map((shipment, index) => (
              <TimelineItem key={`shipment-${index}`}>
                <TimelineSeparator>
                  <TimelineDot color={shipment.project === 'ONITY' ? 'secondary' : 'primary'} />
                  {index < safeLastShipments.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Paper elevation={3} sx={{ p: 1 }}>
                    <Typography variant="subtitle2">Embarque {shipment.shipment_code || 'N/A'}</Typography>
                    <Typography variant="caption" display="block">
                      Fecha requerimiento: {shipment.requirement_date ? new Date(shipment.requirement_date).toLocaleString() : 'Fecha no disponible'}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Proyecto: {shipment.requests[0].project}
                    </Typography>
                  </Paper>
                </TimelineContent>
              </TimelineItem>
            ))}
            
            {availableSlots.map((slot, index) => (
              <TimelineItem key={`slot-${index}`}>
                <TimelineSeparator>
                  <TimelineDot color="success" />
                </TimelineSeparator>
                <TimelineContent>
                  <Paper elevation={3} sx={{ p: 1, bgcolor: 'success.light' }}>
                    <Typography variant="subtitle2">Disponible a partir de:</Typography>
                    <Typography variant="caption" display="block">
                      {slot.start.toLocaleString()}
                    </Typography>
                    <Box mt={1}>
                      <Button 
                        variant="contained" 
                        size="small"
                        onClick={() => handleSelectTime(slot.start)}
                      >
                        Seleccionar este horario
                      </Button>
                    </Box>
                  </Paper>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </Paper>
    );
  };
  
  return (    
    <Container maxWidth="md">
      <Box sx={{ p: 4 }}>
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6">Crear embarque</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="requirement_date"
                type="datetime-local"
                label="Fecha y hora *"
                value={shipmentData.requirement_date}
                onChange={handleShipmentChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="comment"
                label="Comentario"
                multiline
                rows={1}
                value={shipmentData.comment}
                onChange={handleShipmentChange}
              />
            </Grid>
          </Grid>

          <ShipmentTimeline />
        </Paper>

        <Divider sx={{ mb: 4 }} />

        <Typography variant="h5" gutterBottom>Agregar partes al embarque</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Orden" name="order" value={requestData.order} onChange={handleRequestChange} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Número CG" name="ikor_number" value={requestData.ikor_number} onChange={handleIkorNumberChange} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="N° Parte Cliente" name="customer_pn" value={requestData.customer_pn} disabled />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Nickname" name="nickname" value={requestData.nickname} disabled />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Proyecto" name="project" value={requestData.project} disabled />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Cantidad" type="number" name="qty" value={requestData.qty} onChange={handleRequestChange} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Linea" name="line" value={requestData.line} onChange={handleRequestChange} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Ref Cliente" name="ref_client" value={requestData.ref_client} onChange={handleRequestChange} disabled={requestData.project !== 'ONITY'}/>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Almacén" name="warehouse" value={requestData.warehouse} onChange={handleRequestChange} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Comentario" name="comment_per_line" value={requestData.comment_per_line} onChange={handleRequestChange} />
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined" onClick={handleAddRequest}>Agregar Request</Button>
          </Grid>
          <Button
            component="label"
            variant="contained"
            tabIndex={-1}
            startIcon={<CloudUploadIcon />}
            disabled={!isNicknameLock && !isNicknameWall}
          >
            Upload files
            <VisuallyHiddenInput
              type="file"
              onChange={(event) => console.log(event.target.files)}
              multiple
            />
          </Button>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Typography variant="body1">Requests agregados: {requests.length}</Typography>
        {/* <ul>
          {requests.map((r, index) => (
            <li key={index}>{r.order} - {r.ikor_number} - {r.customer_pn} - {r.nickname} - {r.project} -{r.qty} - {r.line} - {r.ref_client} - {r.warehouse}</li>
          ))}
        </ul> */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <TableContainer>
            <Table sx={{ minWidth: 700 }}>
              <TableHead className={classes.boldHeader}>
                <TableRow>
                  <TableCell>Orden</TableCell>
                  <TableCell>Connect Group N°</TableCell>
                  <TableCell>N° Parte Cliente</TableCell>
                  <TableCell>Nickname</TableCell>
                  <TableCell>Proyecto</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Linea</TableCell>
                  <TableCell>Ref Cliente</TableCell>
                  <TableCell>Almacén</TableCell>
                  <TableCell>Comentario</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((r, index) => (
                  <TableRow key={index}>
                    <TableCell>{r.order}</TableCell>
                    <TableCell>{r.ikor_number}</TableCell>
                    <TableCell>{r.customer_pn}</TableCell>
                    <TableCell>{r.nickname}</TableCell>
                    <TableCell>{r.project}</TableCell>
                    <TableCell>{r.qty}</TableCell>
                    <TableCell>{r.line}</TableCell>
                    <TableCell>{r.ref_client}</TableCell>
                    <TableCell>{r.warehouse}</TableCell>
                    <TableCell>{r.comment_per_line}</TableCell>
                    <TableCell>
                      <IconButton color="error" onClick={() => handleDeleteRequest(index)}>
                          <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Button variant="contained" color="primary" onClick={handleCreateShipment} sx={{ mt: 3 }}>
          Crear Embarque
        </Button>

        {/* Mensajes */}
        <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')}>
          <Alert severity="error">{error}</Alert>
        </Snackbar>
        <Snackbar open={!!successMessage} autoHideDuration={4000} onClose={() => setSuccessMessage('')}>
          <Alert severity="success">{successMessage}</Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default CreateRequest;
