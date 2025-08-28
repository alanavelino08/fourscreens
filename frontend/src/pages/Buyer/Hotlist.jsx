import React, { useState } from "react";
import {
  TextField,
  Button,
  Grid,
  Typography,
  Box,
  Paper,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import DeleteIcon from "@mui/icons-material/Delete";

const BuyerMaterialForm = () => {
  const [formData, setFormData] = useState({
    cod_art: "",
    descrip: "",
    quantity: "",
    supplier_company: "",
    order: "",
    request_guide: "",
    parcel_service: "",
    is_urgent: true,
    invoice_number: "",
    arrived_date: "",
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const handleClose = () => setFeedback({ ...feedback, open: false });

  // Maneja cambios en inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Validar parte y obtener descripción
  const handleValidatePart = async () => {
    if (!formData.cod_art.trim()) return;
    try {
      const res = await api.get(`/buyer-validate-part/${formData.cod_art}/`);
      setFormData((prev) => ({ ...prev, descrip: res.data.descrip }));
    } catch (error) {
      console.error("Error al validar código:", error);
      setFeedback({
        open: true,
        message: "N° parte no encontrado",
        severity: "error",
      });
    }
  };

  // Agregar línea a la tabla temporal
  const handleAddRow = () => {
    if (!formData.cod_art || !formData.quantity) {
      setFeedback({
        open: true,
        message: "Debes ingresar código y cantidad",
        severity: "error",
      });
      return;
    }

    const newRow = {
      id: rows.length + 1,
      ...formData,
    };
    console.log(newRow);
    setRows((prev) => [...prev, newRow]);

    // Reset form
    setFormData({
      cod_art: "",
      descrip: "",
      quantity: "",
      supplier_company: "",
      order: "",
      request_guide: "",
      parcel_service: "",
      is_urgent: false,
      invoice_number: "",
      arrived_date: "",
    });
  };

  // Enviar a la BD
  const handleSubmit = async () => {
    if (rows.length === 0) {
      setFeedback({
        open: true,
        message: "No hay líneas para guardar",
        severity: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/buyer-material-request/", {
        entries: rows,
      });
      console.log("Guardado exitoso:", response.data);
      setFeedback({
        open: true,
        message: "Líneas guardadas correctamente",
        severity: "success",
      });

      // Reset tabla
      setRows([]);
    } catch (error) {
      console.error("Error al guardar:", error);
      setFeedback({
        open: true,
        message: "Error al guardar",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  //   //Remove line
  const handleDeleteRow = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Fecha de mañana
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const ddTomorrow = String(tomorrow.getDate()).padStart(2, "0");
  const tomorrowStr = `${yyyy}-${mm}-${ddTomorrow}`;

  // Definición de columnas DataGrid
  const columns = [
    {
      field: "cod_art",
      headerName: "Código",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "descrip",
      headerName: "Descripción",
      flex: 2,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "quantity",
      headerName: "Cantidad",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "order",
      headerName: "PO",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "supplier_company",
      headerName: "Proveedor",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "parcel_service",
      headerName: "Paquetería",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "request_guide",
      headerName: "Guía",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "invoice_number",
      headerName: "N° Factura",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    // {
    //   field: "is_urgent",
    //   headerName: "Urgente",
    //   flex: 1,
    //   renderCell: (params) => (params.value ? "Sí" : "No"),
    // },
    {
      field: "actions",
      headerName: "Acciones",
      sortable: false,
      flex: 0.5,
      renderCell: (params) => (
        <IconButton
          color="error"
          onClick={() => handleDeleteRow(params.row.id)}
        >
          <DeleteIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <Box p={2}>
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Crear Hotlist Request
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <TextField
              label="N° de parte"
              name="cod_art"
              value={formData.cod_art}
              onChange={handleChange}
              fullWidth
              onBlur={handleValidatePart}
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              label="Descripción"
              name="descrip"
              value={formData.descrip}
              fullWidth
              disabled
            />
          </Grid>
          <Grid item xs={2}>
            <TextField
              label="PO"
              name="order"
              value={formData.order}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={2}>
            <TextField
              label="Cantidad"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              type="number"
              fullWidth
            />
          </Grid>
          <Grid item xs={2}>
            <TextField
              label="Proveedor"
              name="supplier_company"
              value={formData.supplier_company}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={2}>
            <TextField
              label="Guía"
              name="request_guide"
              value={formData.request_guide}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={2}>
            <TextField
              label="Paquetería"
              name="parcel_service"
              value={formData.parcel_service}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={2}>
            <TextField
              label="Factura"
              name="invoice_number"
              value={formData.invoice_number}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              name="arrived_date"
              type="date"
              label="Fecha *"
              value={formData.arrived_date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: todayStr,
                max: tomorrowStr,
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={handleAddRow}>
              Agregar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla temporal */}
      <Paper elevation={3} sx={{ height: 400, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Material por agregar
        </Typography>
        <DataGrid rows={rows} columns={columns} pageSize={5} />

        <Box textAlign="right" mt={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={loading || rows.length === 0}
          >
            {loading ? "Guardando..." : "Crear Request"}
          </Button>
        </Box>
      </Paper>

      {/* Snackbar para alertas */}
      <Snackbar
        open={feedback.open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleClose}
          severity={feedback.severity}
          sx={{ width: "100%" }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BuyerMaterialForm;
