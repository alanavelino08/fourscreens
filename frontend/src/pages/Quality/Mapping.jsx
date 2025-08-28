import React, { useState, useEffect, useRef } from "react";
import {
  TextField,
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  Accordion,
  AccordionActions,
  AccordionSummary,
  AccordionDetails,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Tooltip,
  FormGroup,
  FormControlLabel,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import VerifiedIcon from "@mui/icons-material/Verified";
import MarkEmailUnreadIcon from "@mui/icons-material/MarkEmailUnread";
import api from "../../services/api";
import { getCurrentUser } from "../../services/auth";

const PedidoViewer = () => {
  const [user, setUser] = useState(null);
  const [pedido, setPedido] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const handleClose = () => setFeedback({ ...feedback, open: false });
  const inputRef = useRef(null);

  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState({});
  const handleSupplierChange = (rowId, supplier) => {
    setSelectedSuppliers((prev) => ({
      ...prev,
      [rowId]: supplier,
    }));
  };

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  //Input buscar PO
  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && pedido.trim() !== "") {
      try {
        setLoading(true);
        const response = await api.get(`/match-pedido/?n_pedido=${pedido}`);
        const results = response.data.results;

        if (!results || results.length === 0) {
          setFeedback({
            open: true,
            message: "No se encontró la PO ingresada",
            severity: "error",
          });
          setPedido("");
          return;
        }

        const formattedRows = results.map((item, index) => ({
          id: index + 1,
          cod_art: item.cod_art,
          cant_ped: item.cant_ped,
          des_art: item.descrip,
          name: item.name,
          is_urgent: item.is_urgent,
          suppliers: item.suppliers,
          order: item.order,
          request_guide: item.request_guide,
        }));

        setRows(formattedRows);
      } catch (error) {
        console.error("Error al obtener pedido:", error);
        setFeedback({
          open: true,
          message: "Error al buscar la PO",
          severity: "error",
        });
        setPedido("");
        return;
      } finally {
        setLoading(false);
      }
    }
  };

  //Agregar lineas y setear cono blanco
  const handleGuardarLineas = async () => {
    if (!selectedRows?.ids || !(selectedRows.ids instanceof Set)) {
      console.error("selectedRows no es válido.");
      return;
    }

    const rowIds = Array.from(selectedRows.ids);

    const dataToSend = rowIds.map((rowId) => {
      const row = rows.find((r) => r.id === rowId);
      return {
        cod_art: row.cod_art,
        descrip: row.des_art,
        quantity: row.cant_ped,
        is_urgent: row.is_urgent,
        name: row.name,
        supplier_name: selectedSuppliers[rowId],
        order: row.order,
      };
    });

    try {
      const response = await api.post("/save-material-entries/", {
        entries: dataToSend,
      });
      console.log(dataToSend);
      console.log("Guardado exitoso:", response.data);
      setFeedback({
        open: true,
        message: "Líneas guardadas correctamente",
        severity: "success",
      });
      setPedido("");
      setRows([]);
      inputRef.current.focus();
      await fetchEntries();
    } catch (error) {
      console.error("Error al guardar líneas:", error);
      setFeedback({
        open: true,
        message: "Error al guardar líneas",
        severity: "error",
      });
    }
  };

  // Reset input y tabla
  const handleReset = () => {
    setPedido("");
    setRows([]);
    inputRef.current.focus();
  };

  // Steps to flow
  const steps = [
    "Ingreso",
    "Validación Material",
    "Validación Calidad",
    "Liberado",
    "Finalizado",
  ];
  const [entries, setEntries] = useState([]);
  //const [dialogOpen, setDialogOpen] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false); // para documentos
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false); // para material

  const [currentEntryId, setCurrentEntryId] = useState(null);
  const [isPo, setIsPo] = useState(false);
  const [isInvoice, setIsInvoice] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);

  const visibleEntries = entries.filter((item) => !item.delivered_at);

  const [isPnOk, setIsPnOk] = useState(false);
  const [isPnSuppOk, setIsPnSuppOk] = useState(false);
  const [isQtyOk, setIsQtyOk] = useState(false);
  const [dateCode, setDateCode] = useState("");
  const [isLabelAttached, setIsLabelAttached] = useState(false);

  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [measures, setMeasures] = useState(false);
  const [packingStatus, setPackingStatus] = useState(false);
  const [specialCharacteristics, setSpecialCharacteristics] = useState(false);
  const [qualityCertified, setQualityCertified] = useState(false);
  const [validatedLabels, setValidatedLabels] = useState(false);

  const [guideInput, setGuideInput] = useState("");
  const currentEntry = entries.find((e) => e.id === currentEntryId);

  //Show all current lines to add in WH
  const fetchEntries = async () => {
    try {
      const response = await api.get("/all-material-entries/");
      setEntries(response.data);

      if (currentEntryId) {
        const entry = response.data.find((e) => e.id === currentEntryId);
        if (entry) {
          const stepIndex = steps.findIndex((step) => step === entry.stage);
          if (stepIndex !== -1) {
            setCurrentStep(stepIndex);
            //await fetchEntries();
          }
        }
      }
    } catch (error) {
      console.error("Error al cargar entradas:", error);
      setFeedback({
        open: true,
        message: "Error al cargar entradas.",
        severity: "error",
      });
    }
  };

  // useEffect(() => {
  //   fetchEntries();
  // }, []);
  // useEffect(() => {
  //   if (docDialogOpen) return;

  //   fetchEntries();

  //   const interval = setInterval(() => {
  //     console.log("Ejecutando intervalo...");
  //     fetchEntries();
  //   }, 10000); // cada 10 segundos

  //   return () => clearInterval(interval);
  // }, [docDialogOpen]);
  useEffect(() => {
    if (docDialogOpen || materialDialogOpen || qualityDialogOpen) return;

    fetchEntries();

    const interval = setInterval(() => {
      console.log("Ejecutando intervalo...");
      fetchEntries();
    }, 10000);

    return () => clearInterval(interval);
  }, [docDialogOpen, materialDialogOpen, qualityDialogOpen]);

  const colorMap = {
    white: "gray",
    yellow: "yellow",
    green: "green",
    black: "black",
    red: "red",
  };

  const translateColor = (color) => {
    const colorMap = {
      red: "rojo",
      green: "verde",
      yellow: "amarillo",
      black: "negro",
      white: "blanco",
    };
    return colorMap[color?.toLowerCase()] || color || "sin color";
  };

  // Columnas tabla (DataGrid)
  const columns = [
    {
      field: "cod_art",
      headerName: "N° Parte",
      width: 150,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "cant_ped",
      headerName: "Cantidad",
      width: 100,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "des_art",
      headerName: "Descripción",
      width: 300,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "name",
      headerName: "Proveedor",
      width: 300,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "suppliers",
      headerName: "N° parte proveedor",
      width: 300,
      sortable: false,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
      renderCell: (params) => {
        const suppliers = params.row.suppliers || [];
        const selected = selectedSuppliers[params.row.id] || "";

        return (
          <Select
            value={selected}
            onChange={(e) =>
              handleSupplierChange(params.row.id, e.target.value)
            }
            defaultValue=""
            displayEmpty
            fullWidth
            size="small"
            sx={{ fontSize: "0.875rem" }}
          >
            <MenuItem disabled value="">
              Seleccionar proveedor
            </MenuItem>
            {suppliers.map((s, idx) => (
              <MenuItem key={idx} value={s.value}>
                {s.supplier} - {s.value}
              </MenuItem>
            ))}
          </Select>
        );
      },
    },
  ];

  //Urgent first
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.is_urgent && !b.is_urgent) return -1;
    if (!a.is_urgent && b.is_urgent) return 1;
    // Si los dos son iguales, ordena por fecha
    return new Date(a.created_at) - new Date(b.created_at);
  });

  const isWarehouseUser = user?.role === "WAREHOUSE";
  const isQualityUser = user?.role === "QUALITY";
  //const isBuyer = user?.role === "BUYER";

  //Delivering material
  const handleDeliver = async (entryId) => {
    try {
      const response = await api.post(`/entries/${entryId}/finalize-green/`);

      // actualizar lista de entries en el estado
      setEntries((prev) =>
        prev.map((item) =>
          item.id === entryId
            ? {
                ...item,
                cone: null,
                current_step: response.data.current_step,
                delivered_at: response.data.delivered_at,
              }
            : item
        )
      );

      // mostrar snackbar éxito
      setFeedback({
        open: true,
        message: "✅ Material entregado y cono liberado",
        severity: "success",
      });
    } catch (error) {
      console.error("Error al entregar:", error);

      setFeedback({
        open: true,
        message:
          error.response?.data?.detail || "❌ No se pudo entregar el material",
        severity: "error",
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        <strong>Recibo Incoming</strong>
      </Typography>
      <Accordion defaultExpanded>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3-content"
          id="panel3-header"
        >
          <Typography component="span">
            <strong>Ingresar Material</strong>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            label="Buscar PO"
            value={pedido}
            onChange={(e) => setPedido(e.target.value)}
            onKeyDown={handleKeyDown}
            fullWidth
            sx={{ mb: 2 }}
            inputRef={inputRef}
          />
          {loading && (
            <Box display="flex" justifyContent="center" sx={{ my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            pageSize={10}
            rowsPerPageOptions={[10]}
            checkboxSelection
            disableRowSelectionOnClick
            sx={{ mb: 2 }}
            onRowSelectionModelChange={(newSelectionModel) => {
              console.log("Seleccionados:", newSelectionModel);
              setSelectedRows(newSelectionModel);
            }}
          />
        </AccordionDetails>
        <AccordionActions>
          <Button onClick={handleReset}>Resetear</Button>
          <Button onClick={handleGuardarLineas}>Agregar líneas</Button>
        </AccordionActions>
      </Accordion>

      {/* Material added */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <strong>Material Ingresado</strong>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* {sortedEntries.map((entry, index) => { */}
            {sortedEntries
              .filter((entry) => !entry.delivered_at)
              .map((entry, index) => {
                const color = entry.cone?.color || "white";
                const isBlocked = sortedEntries.some(
                  (e, i) =>
                    i < index && !e.released_at && !e.rejected_at && e.onhold_at
                );

                return (
                  <Grid item xs={12} key={entry.id}>
                    <Box border={1} borderRadius={2} p={2}>
                      <Grid container alignItems="center" spacing={2}>
                        <Grid item>
                          <strong>{entry.cone?.number}</strong>
                          <Tooltip
                            title={`Cono ${translateColor(
                              entry.cone?.color
                            )}: N° ${entry.cone?.number || "sin número"}`}
                            placement="bottom-start"
                          >
                            <ChangeHistoryIcon
                              sx={{ fontSize: 60, color: colorMap[color] }}
                            />
                          </Tooltip>
                        </Grid>

                        <Grid item xs>
                          <Typography variant="subtitle2" display="block">
                            <strong>PO: </strong>
                            {entry.order}

                            {entry.is_urgent && (
                              <Tooltip title="Material Urgente">
                                <NewReleasesIcon sx={{ color: "red", ml: 1 }} />
                              </Tooltip>
                            )}
                            {entry.validation_at &&
                              (!entry.released_at ? (
                                <Tooltip title="En espera de validación Calidad">
                                  <MarkEmailUnreadIcon
                                    sx={{ color: "#F76719", ml: 1 }}
                                  />
                                </Tooltip>
                              ) : (
                                <Tooltip title="Validado y liberado por Calidad">
                                  <VerifiedIcon
                                    sx={{ color: "#4CAF50", ml: 1 }}
                                  />
                                </Tooltip>
                              ))}
                          </Typography>

                          <Typography variant="subtitle2">
                            <strong>Ingresado por:</strong>{" "}
                            {/* {entry.user.first_name} {entry.user.last_name} -{" "} */}
                            {entry.user
                              ? `${entry.user.first_name} ${entry.user.last_name}`
                              : "En Espera de"}{" "}
                            - <strong>En fecha: </strong>
                            {new Date(entry.created_at).toLocaleString("es-MX")}
                          </Typography>

                          <Typography variant="subtitle2">
                            <strong>P/N:</strong> {entry.cod_art} -{" "}
                            <strong>QTY:</strong> {entry.quantity} -{" "}
                            <strong>P/N Proveedor: </strong>
                            {entry.supplier_name}
                          </Typography>
                          <Typography variant="caption" display="block">
                            <strong>{entry.descrip}</strong>
                          </Typography>

                          <Stepper
                            activeStep={
                              typeof entry.current_step === "number"
                                ? entry.current_step
                                : 0
                            }
                            alternativeLabel
                          >
                            {steps.map((label) => (
                              <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                              </Step>
                            ))}
                          </Stepper>

                          {entry.released_at ? (
                            <Button
                              variant="contained"
                              color="success"
                              onClick={() => {
                                // Lógica para entregar
                                handleDeliver(entry.id);
                              }}
                              sx={{ mt: 2 }}
                            >
                              Entregar
                            </Button>
                          ) : (
                            // ) : entry.rejected_at ? (
                            //   <Button
                            //     variant="contained"
                            //     color="error"
                            //     // onClick={() => {
                            //     //   handleRejected(entry.id);
                            //     // }}
                            //     sx={{ mt: 2 }}
                            //   >
                            //     Rechazado
                            //   </Button>
                            // )
                            <Button
                              variant="contained"
                              onClick={() => {
                                setCurrentEntryId(entry.id);
                                setIsPo(entry.is_po || false);
                                setIsInvoice(entry.is_invoice || false);
                                setIsPnOk(entry.is_pn_ok || false);
                                setIsPnSuppOk(entry.is_pn_supp_ok || false);
                                setIsQtyOk(entry.is_qty_ok || false);
                                setDateCode(entry.date_code || "");
                                setIsLabelAttached(
                                  entry.is_label_attached || false
                                );

                                // Abrir diálogo acorde al color actual y rol
                                if (entry.cone?.color === "white") {
                                  if (isWarehouseUser) {
                                    setDocDialogOpen(true);
                                  } else {
                                    setFeedback({
                                      open: true,
                                      message:
                                        "Solo el usuario almacén puede validar documentos.",
                                      severity: "warning",
                                    });
                                  }
                                } else if (entry.cone?.color === "yellow") {
                                  if (isWarehouseUser) {
                                    if (entry.current_step === 1) {
                                      // Primera vez en validación de material
                                      setMaterialDialogOpen(true);
                                    } else {
                                      // Ya pasó material → pendiente calidad
                                      setFeedback({
                                        open: true,
                                        message:
                                          "Pendiente validación de calidad.",
                                        severity: "warning",
                                      });
                                    }
                                  } else if (
                                    isQualityUser &&
                                    entry.current_step === 2
                                  ) {
                                    setQualityDialogOpen(true);
                                  } else {
                                    setFeedback({
                                      open: true,
                                      message: isQualityUser
                                        ? "La validación de calidad aún no está lista para este material."
                                        : "No tienes permiso para esta etapa.",
                                      severity: "warning",
                                    });
                                  }
                                } else if (entry.cone?.color === "black") {
                                  // Caso cono negro: permitir que avance a documentos
                                  if (isWarehouseUser) {
                                    setDocDialogOpen(true);
                                  } else {
                                    setFeedback({
                                      open: true,
                                      message:
                                        "Solo WAREHOUSE puede iniciar la validación desde cono negro.",
                                      severity: "warning",
                                    });
                                  }
                                }
                                // else if (entry.cone?.color === "red") {
                                //   setMaterialDialogOpen(true);
                                // }
                              }}
                              //disabled={isBlocked || loading}
                              sx={{ mt: 2 }}
                            >
                              Siguiente
                            </Button>
                          )}

                          {entry.cone?.color === "black" && (
                            <Typography
                              color="warning.main"
                              variant="body2"
                              sx={{ mt: 1 }}
                            >
                              ⚠️ En espera de documentos - Cono negro asignado
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                );
              })}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Document dialog */}
      {/* <Dialog open={docDialogOpen} onClose={() => setDocDialogOpen(false)}>
        <DialogTitle>Validación de Documentos</DialogTitle>
        <DialogContent>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPo}
                  onChange={(e) => setIsPo(e.target.checked)}
                />
              }
              label="PO recibido"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isInvoice}
                  onChange={(e) => setIsInvoice(e.target.checked)}
                />
              }
              label="Factura recibida"
            />
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={async () => {
              setLoading(true);
              try {
                const res = await api.post(
                  `/material-entry/${currentEntryId}/advance/`,
                  { is_po: isPo, is_invoice: isInvoice }
                );
                setFeedback({
                  open: true,
                  message: "Se avanzó de flujo correctamente",
                  severity: "success",
                });
                await fetchEntries();
                setDocDialogOpen(false);
                if (res.data?.current_step !== undefined)
                  setCurrentStep(res.data.current_step);
              } catch (error) {
                console.error("Error al avanzar paso:", error);
                setFeedback({
                  open: true,
                  message: "Error al avanzar de flujo",
                  severity: "error",
                });
              } finally {
                setLoading(false);
              }
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog> */}
      {/* <Dialog open={docDialogOpen} onClose={() => setDocDialogOpen(false)}>
        <DialogTitle>
          Validación de Documentos -
          {currentEntry?.request_guide && (
            <span
              style={{
                fontWeight: "normal",
                fontSize: "0.9rem",
                marginLeft: "8px",
              }}
            >
              N° Guía: {currentEntry.request_guide}
            </span>
          )}
        </DialogTitle>
        <DialogContent>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPo}
                  onChange={(e) => setIsPo(e.target.checked)}
                />
              }
              label="PO recibido"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isInvoice}
                  onChange={(e) => setIsInvoice(e.target.checked)}
                />
              }
              label="Factura recibida"
            />
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={async () => {
              setLoading(true);
              try {
                const res = await api.post(
                  `/material-entry/${currentEntryId}/advance/`,
                  { is_po: isPo, is_invoice: isInvoice }
                );
                setFeedback({
                  open: true,
                  message: "Se avanzó de flujo correctamente",
                  severity: "success",
                });
                await fetchEntries();
                setDocDialogOpen(false);
                if (res.data?.current_step !== undefined)
                  setCurrentStep(res.data.current_step);
              } catch (error) {
                console.error("Error al avanzar paso:", error);
                setFeedback({
                  open: true,
                  message: "Error al avanzar de flujo",
                  severity: "error",
                });
              } finally {
                setLoading(false);
              }
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog> */}
      <Dialog open={docDialogOpen} onClose={() => setDocDialogOpen(false)}>
        <DialogTitle>
          Validación de Documentos{" "}
          {currentEntry?.request_guide && (
            <span
              style={{
                fontWeight: "normal",
                fontSize: "0.9rem",
                marginLeft: "8px",
              }}
            >
              (Guía: {currentEntry.request_guide})
            </span>
          )}
        </DialogTitle>

        <DialogContent>
          {/* Si no hay request_guide mostrar input */}
          {/* {!currentEntry?.request_guide && (
            <TextField
              fullWidth
              label="Ingresa N° de guía"
              value={guideInput}
              onChange={(e) => setGuideInput(e.target.value)}
              margin="normal"
            />
          )} */}

          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPo}
                  onChange={(e) => setIsPo(e.target.checked)}
                />
              }
              label="PO recibido"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isInvoice}
                  onChange={(e) => setIsInvoice(e.target.checked)}
                />
              }
              label="Factura recibida"
            />
          </FormGroup>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDocDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={async () => {
              setLoading(true);
              try {
                const payload = {
                  is_po: isPo,
                  is_invoice: isInvoice,
                };

                // // si no existe en la DB y el usuario lo ingresó, enviarlo
                // if (!currentEntry?.request_guide && guideInput.trim()) {
                //   payload.request_guide = guideInput.trim();
                // }

                const res = await api.post(
                  `/material-entry/${currentEntryId}/advance/`,
                  payload
                );

                setFeedback({
                  open: true,
                  message: "Se avanzó de flujo correctamente",
                  severity: "success",
                });

                await fetchEntries();
                setDocDialogOpen(false);

                if (res.data?.current_step !== undefined) {
                  setCurrentStep(res.data.current_step);
                }
              } catch (error) {
                console.error("Error al avanzar paso:", error);
                setFeedback({
                  open: true,
                  message: "Error al avanzar de flujo",
                  severity: "error",
                });
              } finally {
                setLoading(false);
              }
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Material dialog (etapa material) */}
      <Dialog
        open={materialDialogOpen}
        onClose={() => setMaterialDialogOpen(false)}
      >
        <DialogTitle>Validación de Material</DialogTitle>
        <DialogContent>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPnOk}
                  onChange={(e) => setIsPnOk(e.target.checked)}
                  disabled={!isWarehouseUser}
                />
              }
              label="PN correcto"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPnSuppOk}
                  onChange={(e) => setIsPnSuppOk(e.target.checked)}
                  disabled={!isWarehouseUser}
                />
              }
              label="PN Proveedor correcto"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isQtyOk}
                  onChange={(e) => setIsQtyOk(e.target.checked)}
                  disabled={!isWarehouseUser}
                />
              }
              label="Cantidad correcta"
            />
            <TextField
              label="Date Code"
              value={dateCode}
              onChange={(e) => setDateCode(e.target.value)}
              fullWidth
              margin="dense"
              disabled={!isWarehouseUser}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isLabelAttached}
                  onChange={(e) => setIsLabelAttached(e.target.checked)}
                  disabled={!isWarehouseUser}
                />
              }
              label="Etiqueta adherida"
            />
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMaterialDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!isWarehouseUser}
            onClick={async () => {
              setLoading(true);
              try {
                const res = await api.post(
                  `/material-entry/${currentEntryId}/advance-yellow/`,
                  {
                    stage: "material",
                    is_pn_ok: isPnOk,
                    is_pn_supp_ok: isPnSuppOk,
                    is_qty_ok: isQtyOk,
                    date_code: dateCode,
                    is_label_attached: isLabelAttached,
                  }
                );
                setFeedback({
                  open: true,
                  message: isWarehouseUser
                    ? "Validación de material completada. Pendiente validación de calidad."
                    : "Validación de material completada",
                  severity: "success",
                });
                await fetchEntries();
                setMaterialDialogOpen(false);
              } catch (error) {
                console.error(error);
                setFeedback({
                  open: true,
                  message: "Error en validación de material",
                  severity: "error",
                });
              } finally {
                setLoading(false);
              }
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quality dialog (etapa calidad) */}
      <Dialog
        open={qualityDialogOpen}
        onClose={() => setQualityDialogOpen(false)}
      >
        <DialogTitle>Validación de Calidad</DialogTitle>
        <DialogContent>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={measures}
                  onChange={(e) => setMeasures(e.target.checked)}
                />
              }
              label="Medidas correctas"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={packingStatus}
                  onChange={(e) => setPackingStatus(e.target.checked)}
                />
              }
              label="Estado de empaque"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={specialCharacteristics}
                  onChange={(e) => setSpecialCharacteristics(e.target.checked)}
                />
              }
              label="Validación de características especiales"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={qualityCertified}
                  onChange={(e) => setQualityCertified(e.target.checked)}
                />
              }
              label="Certificado de calidad"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={validatedLabels}
                  onChange={(e) => setValidatedLabels(e.target.checked)}
                />
              }
              label="Etiquetas validadas"
            />
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQualityDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={async () => {
              setLoading(true);
              try {
                const res = await api.post(
                  `/material-entry/${currentEntryId}/advance-yellow/`,
                  {
                    stage: "quality",
                    measures,
                    packing_status: packingStatus,
                    special_characteristics: specialCharacteristics,
                    quality_certified: qualityCertified,
                    validated_labels: validatedLabels,
                  }
                );
                setFeedback({
                  open: true,
                  message: "Validación de calidad completada",
                  severity: "success",
                });
                await fetchEntries();
                setQualityDialogOpen(false);
                if (res.data?.current_step !== undefined)
                  setCurrentStep(res.data.current_step);
              } catch (error) {
                console.error(error);
                setFeedback({
                  open: true,
                  message: "Error en validación de calidad",
                  severity: "error",
                });
              } finally {
                setLoading(false);
              }
            }}
          >
            Confirmar
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

export default PedidoViewer;
