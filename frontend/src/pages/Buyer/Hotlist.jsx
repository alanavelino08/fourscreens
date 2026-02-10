import React, { useState, useEffect } from "react";
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
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import DeleteIcon from "@mui/icons-material/Delete";
import incomingFamily from "./incomingfamily";

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

  const [openDialog, setOpenDialog] = useState(false);
  const [newPartData, setNewPartData] = useState({
    cod_art: "",
    descrip: "",
  });

  const [familyinc, setFamilyInc] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);

  useEffect(() => {
    //console.log("Datos de familia:", incomingFamily);
    if (Array.isArray(incomingFamily)) {
      setFamilyInc(incomingFamily);
    } else {
      console.error("incomingfamily no es un array:", incomingFamily);
    }
  }, []);

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

      const status = error.response?.status;

      if (status === 404) {
        // setFeedback({
        //   open: true,
        //   message: "N° parte no encontrado",
        //   severity: "error",
        // });
        setNewPartData({
          cod_art: formData.cod_art,
          descrip: "",
        });
        setOpenDialog(true);
      } else {
        setFeedback({
          open: true,
          message: "Error al validar el N° de parte",
          severity: "error",
        });
      }
    }
  };

  //agregar numero de parte
  const handleCreateNewPart = async () => {
    try {
      const payload = {
        code: newPartData.cod_art,
        descrip: newPartData.descrip,
        fam: selectedFamily?.label,
        is_urgent: false,
      };

      await api.post("/buyer-create-part/", payload);

      setFormData((prev) => ({
        ...prev,
        cod_art: payload.code,
        descrip: payload.descrip,
      }));

      setOpenDialog(false);

      setFeedback({
        open: true,
        message: "N° de parte agregado correctamente",
        severity: "success",
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        open: true,
        message: "Error al registrar el N° de parte",
        severity: "error",
      });
    }
  };

  // Agregar línea a la tabla temporal
  const handleAddRow = () => {
    if (
      !formData.cod_art ||
      !formData.quantity ||
      !formData.order ||
      !formData.supplier_company ||
      !formData.request_guide ||
      !formData.parcel_service ||
      !formData.invoice_number ||
      !formData.arrived_date
    ) {
      setFeedback({
        open: true,
        message: "Por favor llena todos los campos",
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

  const handleReset = () => {
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
              required
            />
          </Grid>
          <Grid item xs={2}>
            <TextField
              label="Guía"
              name="request_guide"
              value={formData.request_guide}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={2}>
            <TextField
              label="Paquetería"
              name="parcel_service"
              value={formData.parcel_service}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={2}>
            <TextField
              label="Factura"
              name="invoice_number"
              value={formData.invoice_number}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              name="arrived_date"
              type="date"
              label="Fecha"
              value={formData.arrived_date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: todayStr,
                max: tomorrowStr,
              }}
              required
            />
          </Grid>
          <Stack spacing={2} direction="row" mt={2}>
            <Button variant="contained" onClick={handleAddRow}>
              Agregar
            </Button>
            <Button variant="outlined" onClick={handleReset}>
              Reset
            </Button>
          </Stack>
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

      {/* Dialog Registro numero de parte */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold" }} color="#F52727">
          N° de parte no encontrado
        </DialogTitle>

        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            El número de parte <strong>{newPartData.cod_art}</strong> no existe.
            <br />
            ¿Deseas agregarlo?
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Descripción"
              value={newPartData.descrip}
              onChange={(e) =>
                setNewPartData((prev) => ({
                  ...prev,
                  descrip: e.target.value,
                }))
              }
              fullWidth
              autoFocus
            />

            <Autocomplete
              disablePortal
              options={familyinc}
              value={selectedFamily}
              onChange={(event, newValue) => {
                setSelectedFamily(newValue);
                console.log("Familia seleccionada:", newValue?.label);
              }}
              getOptionLabel={(option) => option.label || ""}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Familia"
                  fullWidth
                  variant="outlined"
                />
              )}
              sx={{ width: 300 }}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>No</Button>

          <Button
            variant="contained"
            onClick={handleCreateNewPart}
            disabled={!newPartData.descrip.trim() || !selectedFamily}
          >
            Sí, agregar
          </Button>
        </DialogActions>
      </Dialog>

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
