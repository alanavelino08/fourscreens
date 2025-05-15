
import { useState } from 'react';
import {
  Button, TextField, Box, Typography, Container,
  Grid, Paper, Divider, Snackbar, Alert, TableBody, TableContainer, Table,
  TableHead, TableRow, TableCell, IconButton, 
} from '@mui/material';
import api from '../../services/api';
import { makeStyles } from '@mui/styles';
import { Delete } from '@mui/icons-material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

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

    if (requests.length > 0) {
      const firstproject = requests[0].project;
      if (requestData.project !== firstproject) {
        setError(`No puedes mezclar proyectos. Este embarque es para ${firstproject}`);
        return
      }
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
    });
    setError('');
  };

  const handleCreateShipment = async () => {
    if (!shipmentData.requirement_date || requests.length === 0) {
      setError('Debes agregar al menos un request y la fecha del embarque.');
      return;
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
          part_number: r.part_number
        }))
      });
  
      setSuccessMessage('Embarque creado correctamente.');
      //setSuccessMessage(`Embarque ${shipmentData.shipment_code} creado correctamente.`)
      setRequests([]);
      setShipmentData({ requirement_date: '', comment: '' });
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
            <TextField fullWidth label="Ref Cliente" name="ref_client" value={requestData.ref_client} onChange={handleRequestChange} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Almacén" name="warehouse" value={requestData.warehouse} onChange={handleRequestChange} />
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
