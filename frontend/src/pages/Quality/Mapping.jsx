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
  IconButton,
  AppBar,
  Toolbar,
  Autocomplete,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  InputLabel,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import VerifiedIcon from "@mui/icons-material/Verified";
import MarkEmailUnreadIcon from "@mui/icons-material/MarkEmailUnread";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import api from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(isoWeek);

const PedidoViewer = (open, entry) => {
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
          invoice_number: item.invoice_number,
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
  const [docDialogOpen, setDocDialogOpen] = useState(false); // para documentos
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false); // para material
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false); // paara todos los detalles
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [rejectedDialogOpen, setRejectedDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const [currentEntryId, setCurrentEntryId] = useState(null);
  const [isPo, setIsPo] = useState(false);
  const [isInvoice, setIsInvoice] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);

  // Función para mapear los pasos extra
  // const mapStep = (current_step) => {
  //   if (current_step === 6) {
  //     return 0;
  //   }
  //   if (current_step === 5) {
  //     return 0;
  //   }
  //   return current_step;
  // };
  const mapStep = (entry) => {
    // protección contra entry indefinida (primer render, etc.)
    if (!entry) return 0;

    const {
      cone,
      is_pn_ok,
      is_pn_supp_ok,
      is_qty_ok,
      is_label_attached,
      validation_at,
      current_step,
    } = entry;

    // Si está en CONO NEGRO -> quedarse en Ingreso (índice 0)
    if (cone?.color === "black") {
      return 0;
    }

    // Si está en CONO ROJO -> mostrar el paso donde se cayó:
    if (cone?.color === "red") {
      // Si pasó validación de material (tiene validation_at) o todos los checks de material son true
      const materialChecks = [
        is_pn_ok,
        is_pn_supp_ok,
        is_qty_ok,
        is_label_attached,
      ];
      const allMaterialTrue = materialChecks.every(Boolean);

      if (validation_at || allMaterialTrue) {
        // Rechazado en calidad -> mantener en Validación Calidad (índice 2)
        return 2;
      } else {
        // Rechazado en material -> mantenerse en Validación Material (índice 1)
        return 1;
      }
    }

    // CASOS NORMALES (cono blanco, amarillo, verde, etc.)
    // Si el backend ya manda un current_step que encaje en 0..steps.length-1, úsalo
    if (
      typeof current_step === "number" &&
      current_step >= 0 &&
      current_step <= steps.length - 1
    ) {
      return current_step;
    }

    // Si el backend usa códigos mayores (ej. 5,6) o valores fuera de rango -> fallback seguro a Ingreso (0)
    return 0;
  };

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
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
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

  useEffect(() => {
    if (
      docDialogOpen ||
      materialDialogOpen ||
      qualityDialogOpen ||
      rejectedDialogOpen
    )
      return;

    fetchEntries();

    const interval = setInterval(() => {
      console.log("Ejecutando intervalo...");
      fetchEntries();
    }, 10000);

    return () => clearInterval(interval);
  }, [
    docDialogOpen,
    materialDialogOpen,
    qualityDialogOpen,
    rejectedDialogOpen,
  ]);

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

  //Correo
  const [buyers, setBuyers] = useState([]);
  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([
    "c.ortiz@connectgroup.com",
    "cgmg.incoming01.connectgroup.com",
    "cgmg.incoming02.connectgroup.com",
    "cgmg.incoming03.connectgroup.com",
  ]);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState(
    `Hola buen turno equipo de compras, 
    
    ¿Nos pueden apoyar con la resolución del siguiente problema? No tenemos la información completa para darle el ingreso y el material se encuentra en status de HOLDMAT

    Problema: 
    Proveedor: 
    PO: 
    Número de la factura: 
    Números de parte: 

    Gracias de antemano, quedamos en espera de su respuesta.`
  );

  // Fetch buyers on load
  useEffect(() => {
    if (open) {
      api
        .get("/buyers/")
        .then((res) => setBuyers(res.data))
        .catch((err) => console.error(err));
    }
  }, [open]);

  // Generate subject based on selected entry
  useEffect(() => {
    if (selectedEntry) {
      setSubject(
        `PO: ${selectedEntry.order || ""} - N° de parte: ${
          selectedEntry.cod_art
        } - Guía: ${selectedEntry.request_guide}`
      );
    }
  }, [selectedEntry]);

  const handleSend = async () => {
    try {
      await api.post("/send-mail/", { to, subject, content });
      setFeedback({
        open: true,
        message: "✅ Correo enviado a compras",
        severity: "success",
      });
      setTo([]);
      setMailDialogOpen(false);
    } catch (err) {
      console.error(err);
      setFeedback({
        open: true,
        message: "❌ Error al enviar correo",
        severity: "error",
      });
    }
  };

  const [rejectedOption, setRejectedOption] = useState("");
  const [rejectedComment, setRejectedComment] = useState("");

  const handleRejectedSubmit = async (entryId) => {
    try {
      const response = await api.post(
        `/material-entry/${entryId}/handle-rejected/`,
        {
          option: rejectedOption,
          comment: rejectedComment,
          user: user?.id || null,
        }
      );

      if (response.data.removed) {
        // Caso RMA → eliminar de la vista
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
      } else {
        // Caso ingreso → actualizar con los datos devueltos
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  ...response.data,
                  cone: {
                    ...(e.cone || {}),
                    color: response.data.cone || "yellow",
                  },
                  rejected_at: null,
                }
              : e
          )
        );
      }

      setRejectedDialogOpen(false);
      setRejectedOption("");
      setRejectedComment("");
    } catch (err) {
      console.error("Error al manejar rechazo:", err);
    }
  };

  //Datecode validation
  const [shelfLife, setShelfLife] = useState("");
  const [calcResult, setCalcResult] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  const handleCalculate = () => {
    const result = getExpiration(dateCode, shelfLife);
    setCalcResult(result.message);
    setIsExpired(result.expired);
  };

  function isoWeekStart(year, week) {
    const jan4 = new Date(year, 0, 4);
    const day = jan4.getDay();
    const isoWeekday = day === 0 ? 7 : day;
    const mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setDate(jan4.getDate() - (isoWeekday - 1));
    const target = new Date(mondayOfWeek1);
    target.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
    return target;
  }

  function getExpiration(code, years) {
    let baseDate = null;

    // YYYYMMDD
    if (/^\d{8}$/.test(code)) {
      baseDate = dayjs(code, "YYYYMMDD");
    }
    // YYWW  (ej: "2323" -> yy=23, ww=23)
    else if (/^\d{4}$/.test(code)) {
      const yy = parseInt(code.slice(0, 2), 10);
      const ww = parseInt(code.slice(2, 4), 10);

      if (ww < 1 || ww > 53) {
        return { message: "⚠️ Semana inválida", expired: true };
      }

      let year = 2000 + yy;

      const monday = isoWeekStart(year, ww);
      baseDate = dayjs(monday);
    }
    // YYYYMM
    else if (/^\d{6}$/.test(code)) {
      baseDate = dayjs(code, "YYYYMM");
    }

    if (!baseDate || !baseDate.isValid()) {
      return { message: "⚠️ Formato inválido", expired: true };
    }

    const expDate = baseDate.add(years, "year");
    const now = dayjs();

    if (expDate.isAfter(now)) {
      return {
        message: `✅ Vigente. Fecha fabricación: ${baseDate.format(
          "YYYY-MM-DD"
        )}. Vence: ${expDate.format("YYYY-MM-DD")}`,
        expired: false,
      };
    } else {
      return {
        message: `❌ Expirado. Fecha fabricación: ${baseDate.format(
          "YYYY-MM-DD"
        )}. Venció: ${expDate.format("YYYY-MM-DD")}`,
        expired: true,
      };
    }
  }

  useEffect(() => {
    if (materialDialogOpen) {
      setCalcResult(null);
      setIsExpired(false);
    }
  }, [materialDialogOpen]);

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
              .filter((entry) => !entry.delivered_at && !entry.removed_at)
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

                          <Stepper activeStep={mapStep(entry)} alternativeLabel>
                            {steps.map((label) => (
                              <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                              </Step>
                            ))}
                          </Stepper>

                          {/* <Stepper
                            activeStep={
                              typeof entry.current_step === "number"
                                ? mapStep(entry.current_step)
                                : 0
                            }
                            alternativeLabel
                          >
                            {steps.map((label) => (
                              <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                              </Step>
                            ))}
                          </Stepper> */}
                          {/* <Stepper
                            activeStep={
                              typeof entry.current_step === "number"
                                ? mapStep(entry)
                                : 0
                            }
                            alternativeLabel
                          >
                            {steps.map((label) => (
                              <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                              </Step>
                            ))}
                          </Stepper> */}

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
                          ) : entry.is_rejected ? (
                            <Button
                              variant="contained"
                              color="error"
                              onClick={() => {
                                setCurrentEntryId(entry.id);
                                setRejectedDialogOpen(true);
                              }}
                              sx={{ mt: 2 }}
                            >
                              Rechazado
                            </Button>
                          ) : (
                            <Button
                              variant="contained"
                              onClick={() => {
                                setCurrentEntryId(entry.id);
                                setIsPo(entry.is_po || false);
                                setGuideInput(entry.guideInput || "");
                                setInvoiceNumber(entry.invoiceNumber || "");
                                setSupplierName(entry.supplierName || "");
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

                          {/* <Tooltip title="Ver más detalles">
                            <IconButton
                              size="large"
                              onClick={() => 
                                setDetailsDialogOpen(true)}
                            >
                              <VisibilityIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip> */}
                          <Tooltip title="Ver más detalles">
                            <IconButton
                              size="large"
                              onClick={() => {
                                setSelectedEntry(entry); // guardamos la info del entry actual
                                setDetailsDialogOpen(true); // abrimos el diálogo
                              }}
                            >
                              <VisibilityIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>

                          {entry.cone?.color === "black" && (
                            <Typography
                            // color="warning.main"
                            // variant="body2"
                            // sx={{ mt: 1 }}
                            >
                              <Button
                                color="error"
                                onClick={() => {
                                  setSelectedEntry(entry);
                                  setMailDialogOpen(true);
                                }}
                              >
                                ⚠️ En espera de documentos - Cono negro asignado
                              </Button>
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
          {!currentEntry?.request_guide && (
            <TextField
              fullWidth
              label="Ingresa N° de guía"
              value={guideInput}
              onChange={(e) => setGuideInput(e.target.value)}
              margin="normal"
            />
          )}

          {!currentEntry?.invoice_number && (
            <TextField
              fullWidth
              label="Ingresa N° de factura"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              margin="normal"
            />
          )}

          {!currentEntry?.supplier_name && (
            <TextField
              fullWidth
              label="Ingresa P/N proveedor"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              margin="normal"
            />
          )}

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

                // si no existe en la DB y el usuario lo ingresó, enviarlo
                if (!currentEntry?.request_guide && guideInput.trim()) {
                  payload.request_guide = guideInput.trim();
                }

                if (!currentEntry?.supplier_name && supplierName.trim()) {
                  payload.supplier_name = supplierName.trim();
                }

                if (!currentEntry?.invoice_number && invoiceNumber.trim()) {
                  payload.invoice_number = invoiceNumber.trim();
                }

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
            {/* <TextField
              label="Date Code"
              value={dateCode}
              onChange={(e) => setDateCode(e.target.value)}
              fullWidth
              margin="dense"
              disabled={!isWarehouseUser}
            /> */}
            <Box display="flex" alignItems="center" gap={2} mt={1}>
              <TextField
                label="Date Code"
                value={dateCode}
                onChange={(e) => setDateCode(e.target.value)}
                fullWidth
                margin="dense"
                disabled={!isWarehouseUser}
              />
              <FormControl sx={{ minWidth: 100 }}>
                <InputLabel>Vida útil</InputLabel>
                <Select
                  value={shelfLife}
                  onChange={(e) => setShelfLife(e.target.value)}
                  disabled={!isWarehouseUser}
                >
                  <MenuItem value={2}>2 años</MenuItem>
                  <MenuItem value={5}>5 años</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Botón para calcular después de los inputs */}
            <Box mt={2}>
              <Button
                variant="outlined"
                onClick={handleCalculate}
                disabled={!isWarehouseUser || !dateCode || !shelfLife}
              >
                Calcular vencimiento
              </Button>
            </Box>

            {/* Mostrar resultado */}
            {calcResult && (
              <Typography
                variant="body2"
                sx={{ mt: 1 }}
                color={isExpired ? "error" : "success.main"}
              >
                {calcResult}
              </Typography>
            )}

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
                    is_expired: isExpired,
                  }
                );

                const allTrue =
                  isPnOk &&
                  isPnSuppOk &&
                  isQtyOk &&
                  isLabelAttached &&
                  !isExpired;

                setFeedback({
                  open: true,
                  message: allTrue
                    ? "Validación de material completada. Pendiente validación de calidad."
                    : "❌ Material rechazado",
                  severity: allTrue ? "success" : "error",
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

      {/* Ver todos los detalles */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Detalles del material</DialogTitle>
        <DialogContent dividers>
          {selectedEntry ? (
            <Box
              component="form"
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 2,
                mt: 1,
              }}
            >
              <TextField
                label="N° de parte"
                value={selectedEntry.cod_art || ""}
                disabled
                fullWidth
                variant="filled"
              />
              <TextField
                label="N° de Proveedor"
                value={selectedEntry.supplier_name || ""}
                disabled
                fullWidth
                variant="filled"
              />
              <TextField
                label="Descripción"
                value={selectedEntry.descrip || ""}
                disabled
                fullWidth
                variant="filled"
              />
              <TextField
                label="Cantidad"
                value={selectedEntry.quantity || ""}
                disabled
                fullWidth
                variant="filled"
              />
              <TextField
                label="Proveedor"
                value={selectedEntry.supplier_company || ""}
                disabled
                fullWidth
                multiline
                variant="filled"
              />
              <TextField
                label="Orden (PO)"
                value={selectedEntry.order || ""}
                disabled
                fullWidth
                multiline
                variant="filled"
              />
              <TextField
                label="Guia"
                value={selectedEntry.request_guide || ""}
                disabled
                fullWidth
                multiline
                variant="filled"
              />
              <TextField
                label="Paquetería"
                value={selectedEntry.parcel_service || ""}
                disabled
                fullWidth
                multiline
                variant="filled"
              />
              <TextField
                label="Factura"
                value={selectedEntry.invoice_number || ""}
                disabled
                fullWidth
                multiline
                variant="filled"
              />
              <TextField
                label="Ingresado por"
                value={
                  selectedEntry.user
                    ? `${selectedEntry.user.first_name} ${selectedEntry.user.last_name}`
                    : "En espera"
                }
                disabled
                fullWidth
                variant="filled"
              />
              <TextField
                label="creado por"
                value={
                  selectedEntry.created_by
                    ? `${selectedEntry.created_by.first_name} ${selectedEntry.created_by.last_name}`
                    : "No creado por compras"
                }
                disabled
                fullWidth
                variant="filled"
              />
              <TextField
                label="Fecha de ingreso"
                value={new Date(selectedEntry.created_at).toLocaleString(
                  "es-MX"
                )}
                disabled
                fullWidth
                variant="filled"
              />
            </Box>
          ) : (
            <Typography>No hay datos disponibles</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialogo para mandar correo */}
      <Dialog
        fullScreen
        open={mailDialogOpen}
        onClose={() => setMailDialogOpen(false)}
      >
        <AppBar sx={{ position: "relative" }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => {
                setMailDialogOpen(false);
              }}
            >
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Enviar correo a compras
            </Typography>
            <Button autoFocus color="inherit" onClick={handleSend}>
              Enviar
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3 }}>
          {/* Campo TO */}
          <Autocomplete
            multiple
            options={buyers}
            value={to}
            onChange={(e, newValue) => setTo(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Para"
                placeholder="Selecciona compradores"
              />
            )}
            sx={{ mb: 2 }}
          />

          {/* Campo CC */}
          <TextField
            fullWidth
            label="CC"
            value={cc.join(", ")}
            disabled
            sx={{ mb: 2 }}
          />

          {/* Campo Subject */}
          <TextField
            fullWidth
            label="Asunto"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            sx={{ mb: 2 }}
          />

          {/* Campo Content */}
          <TextField
            fullWidth
            label="Contenido"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            multiline
            rows={12}
          />
        </Box>
      </Dialog>

      <Dialog
        open={rejectedDialogOpen}
        onClose={() => setRejectedDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>¿Qué deseas hacer?</DialogTitle>

        <DialogContent dividers>
          <TextField
            fullWidth
            label="Comentario"
            multiline
            rows={6}
            value={rejectedComment}
            onChange={(e) => setRejectedComment(e.target.value)}
          />
          <FormControl>
            <RadioGroup
              row
              value={rejectedOption}
              onChange={(e) => setRejectedOption(e.target.value)}
            >
              <FormControlLabel value="rma" control={<Radio />} label="RMA" />
              <FormControlLabel
                value="income"
                control={<Radio />}
                label="INGRESO"
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectedDialogOpen(false)}>Cerrar</Button>
          <Button
            onClick={() => handleRejectedSubmit(currentEntryId)} // <-- ahora sí le pasamos el id
            disabled={!rejectedOption}
          >
            Enviar opción
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
