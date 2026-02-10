import React, { useState, useRef, useEffect } from "react";
import {
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Snackbar,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  CircularProgress,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { makeStyles } from "@mui/styles";
import api from "../../services/api";
import { getCurrentUser } from "../../services/auth";

//Negritas (Bold)
const useStyles = makeStyles({
  boldHeader: {
    "& .MuiTableCell-head": {
      fontWeight: "bold",
    },
  },
});

const MaterialWithdrawal = ({ fetchWithdrawals }) => {
  const classes = useStyles();
  const [orderNumber, setOrderNumber] = useState("");
  const [scan, setScan] = useState("");
  const [entries, setEntries] = useState([]);
  const [manualMode, setManualMode] = useState(false);

  // Campos manuales
  const [manualPartCode, setManualPartCode] = useState("");
  const [manualBatch, setManualBatch] = useState("");
  const [manualQty, setManualQty] = useState("");

  const scanBufferRef = useRef("");
  let scanTimeout = null;

  // Escaneo
  const handleScanInput = (e) => {
    if (!orderNumber) {
      setFeedback({
        open: true,
        message: "Debes ingresar el N° de Orden (OF) antes de escanear",
        severity: "error",
      });
      return;
    }

    scanBufferRef.current += e.nativeEvent.data || "";
    if (scanTimeout) clearTimeout(scanTimeout);

    scanTimeout = setTimeout(() => {
      const finalScan = scanBufferRef.current.trim();
      if (finalScan) {
        addEntry({ data: finalScan });
      }
      scanBufferRef.current = "";
    }, 100);
  };

  // Agregar entrada (escáner o manual)
  // Agregar entrada (escáner o manual)
  // const addEntry = (item) => {
  //   if (item.data) {
  //     let part_code = "";
  //     let batch = "";
  //     let qty = 0;

  //     if (
  //       item.data.includes("ÇOD+") &&
  //       item.data.includes("LOT+") &&
  //       item.data.includes("QTY+")
  //     ) {
  //       try {
  //         const parts = item.data.split("´");
  //         if (parts.length !== 3) {
  //           throw new Error("Formato inválido en el código escaneado.");
  //         }
  //         part_code = parts[0].replace("ÇOD+", "").trim();
  //         batch = parts[1].replace("LOT+", "").trim();
  //         qty = parseFloat(parts[2].replace("QTY+", "").trim());

  //         if (!part_code || isNaN(qty)) {
  //           throw new Error("Código o cantidad inválida.");
  //         }

  //         if (entries.some((e) => e.batch === batch)) {
  //           setFeedback({
  //             open: true,
  //             message: `El lote ${batch} ya fue ingresado.`,
  //             severity: "warning",
  //           });
  //           return;
  //         }

  //         setEntries((prev) => [...prev, { part_code, batch, qty }]);
  //       } catch (err) {
  //         setFeedback({
  //           open: true,
  //           message: err.message || "Formato de escaneo inválido.",
  //           severity: "error",
  //         });
  //         return;
  //       }
  //     } else {
  //       const parts = item.data.trim().split(" ");
  //       if (parts.length === 3) {
  //         part_code = parts[0];
  //         batch = parts[1];
  //         qty = parseFloat(parts[2]);
  //       } else if (parts.length === 2) {
  //         part_code = parts[0];
  //         batch = "";
  //         qty = parseFloat(parts[1]);
  //       } else {
  //         setFeedback({
  //           open: true,
  //           message: "Formato inválido. No es posible agregar datos a la tabla",
  //           severity: "error",
  //         });
  //         return;
  //       }

  //       if (!part_code || isNaN(qty)) {
  //         setFeedback({
  //           open: true,
  //           message: "Código de parte o cantidad inválida.",
  //           severity: "error",
  //         });
  //         return;
  //       }

  //       if (batch && entries.some((e) => e.batch === batch)) {
  //         setFeedback({
  //           open: true,
  //           message: `El lote ${batch} ya fue ingresado.`,
  //           severity: "warning",
  //         });
  //         return;
  //       }

  //       setEntries((prev) => [...prev, { part_code, batch, qty }]);
  //     }
  //   } else {
  //     // Caso manual con inputs directos
  //     if (item.batch && entries.some((e) => e.batch === item.batch)) {
  //       setFeedback({
  //         open: true,
  //         message: `El lote ${item.batch} ya fue ingresado.`,
  //         severity: "warning",
  //       });
  //       return;
  //     }
  //     setEntries((prev) => [...prev, item]);
  //   }

  //   setManualPartCode("");
  //   setManualBatch("");
  //   setManualQty("");
  // };
  const addEntry = (item) => {
    if (item.data) {
      let part_code = "";
      let batch = "";
      let qty = 0;

      try {
        let normalized = item.data
          .toUpperCase()
          .replace("ÇOD", "COD")
          .replace(/´/g, "+");

        const regex = /COD\+(\w+)\+LOT\+(\w+)\+QTY\+([\d.]+)/;
        const match = normalized.match(regex);

        if (match) {
          part_code = match[1];
          batch = match[2];
          qty = parseFloat(match[3]);

          if (!part_code || isNaN(qty)) {
            throw new Error("Código de parte o cantidad inválida.");
          }

          if (entries.some((e) => e.batch === batch)) {
            setFeedback({
              open: true,
              message: `El lote ${batch} ya fue ingresado.`,
              severity: "warning",
            });
            return;
          }

          setEntries((prev) => [...prev, { part_code, batch, qty }]);
        } else {
          const parts = normalized.trim().split(" ");

          if (parts.length === 3) {
            part_code = parts[0];
            batch = parts[1];
            qty = parseFloat(parts[2]);
          } else if (parts.length === 2) {
            part_code = parts[0];
            batch = "";
            qty = parseFloat(parts[1]);
          } else {
            throw new Error(
              "Formato inválido. No es posible agregar datos a la tabla"
            );
          }

          if (!part_code || isNaN(qty)) {
            throw new Error("Código de parte o cantidad inválida.");
          }

          if (batch && entries.some((e) => e.batch === batch)) {
            setFeedback({
              open: true,
              message: `El lote ${batch} ya fue ingresado.`,
              severity: "warning",
            });
            return;
          }

          setEntries((prev) => [...prev, { part_code, batch, qty }]);
        }
      } catch (err) {
        setFeedback({
          open: true,
          message: err.message || "Formato de escaneo inválido.",
          severity: "error",
        });
        return;
      }
    } else {
      if (item.batch && entries.some((e) => e.batch === item.batch)) {
        setFeedback({
          open: true,
          message: `El lote ${item.batch} ya fue ingresado.`,
          severity: "warning",
        });
        return;
      }
      setEntries((prev) => [...prev, item]);
    }

    setManualPartCode("");
    setManualBatch("");
    setManualQty("");
  };

  // Agregar desde inputs manuales
  const handleAddManual = () => {
    if (!orderNumber) {
      setFeedback({
        open: true,
        message: "Debes ingresar el N° de OF antes de agregar líneas.",
        severity: "error",
      });
      return;
    }

    if (!manualPartCode || !manualQty) {
      setFeedback({
        open: true,
        message: "El N° de parte y cantidad son obligatorios",
        severity: "error",
      });
      return;
    }
    addEntry({
      part_code: manualPartCode,
      batch: manualBatch || "",
      qty: manualQty,
    });
  };

  // Eliminar fila
  const removeEntry = (index) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  // Guardar en backend
  const handleSave = async () => {
    if (!orderNumber) {
      setFeedback({
        open: true,
        message: "Debes ingresar el N° de OF antes de guardar.",
        severity: "error",
      });
      return;
    }

    try {
      const user = getCurrentUser();
      const dataToSend = {
        order_number: orderNumber,
        lines: entries.map((entry) =>
          `${entry.part_code} ${entry.batch || ""} ${entry.qty}`.trim()
        ),
      };

      await api.post("/save-material-withdrawal/", dataToSend);

      setFeedback({
        open: true,
        message: "Material retirado guardado correctamente",
        severity: "success",
      });
      setEntries([]);
      setOrderNumber("");
      await fetchData();
    } catch (error) {
      console.error(error);
      setFeedback({
        open: true,
        message: "Error al guardar el material",
        severity: "error",
      });
    }
  };

  // Feedback
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const handleClose = () => setFeedback({ ...feedback, open: false });

  const [user, setUser] = useState(null);

  const [filters, setFilters] = useState({
    part_code: "",
    order_number: "",
    date: "",
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingfile, setLoadingfile] = useState(false);

  // Definición de columnas
  const columns = [
    {
      field: "order_number",
      headerName: "N° Orden",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "part_code",
      headerName: "N° Parte",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "total_qty",
      headerName: "Cantidad Total",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "entry_date",
      headerName: "Fecha Entrada",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
      // renderCell: (params) => new Date(params.value).toLocaleString("es-MX"),
      renderCell: (params) => {
        if (!params.value) return "-";
        const date = new Date(params.value);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        const time = date.toLocaleTimeString("es-MX");
        return `${year}-${month}-${day}, ${time}`;
      },
    },
    {
      field: "user_out_material",
      headerName: "Usuario",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
      renderCell: (params) => {
        return params.row.user_out_material?.username || "-";
      },
    },
  ];

  // Construir la URL con filtros
  const buildQuery = () => {
    const params = new URLSearchParams();
    if (filters.part_code) params.append("part_code", filters.part_code);
    if (filters.order_number)
      params.append("order_number", filters.order_number);
    if (filters.date) params.append("date", filters.date);
    return params.toString();
  };

  // Cargar datos desde API
  const fetchData = async () => {
    try {
      setLoading(true);
      const query = buildQuery();
      const url = query
        ? `/material-withdrawals-summary/?${query}`
        : "/material-withdrawals-summary/";

      const res = await api.get(url);
      // Añadir id para DataGrid
      const withIds = res.data.map((item, idx) => ({ id: idx + 1, ...item }));
      setRows(withIds);
    } catch (error) {
      console.error("Error cargando material withdrawals summary:", error);
    } finally {
      setLoading(false);
    }
  };

  // Llamar API al inicio
  useEffect(() => {
    fetchData();
  }, []);

  const handleValidate = async () => {
    if (!filters.date) {
      setFeedback({
        open: true,
        message: "Debes ingresar una fecha (YYYY-MM-DD)",
        severity: "warning",
      });
      return;
    }

    try {
      const res = await api.get(`/validar-descargas/?date=${filters.date}`);
      // Aquí puedes mostrar resultados en otro DataGrid
      console.log("Validación:", res.data);
    } catch (error) {
      console.error("Error en validación:", error);
      setFeedback({
        open: true,
        message: "Error en la validación",
        severity: "error",
      });
    }
  };

  const handleDownloadExcel = async () => {
    if (!filters.date) {
      setFeedback({
        open: true,
        message: "Debes ingresar una fecha (YYYY-MM-DD)",
        severity: "warning",
      });
      return;
    }

    setLoadingfile(true);

    try {
      const params = new URLSearchParams();
      params.set("date", filters.date);
      params.set("export", "1");
      if (filters.order_number)
        params.set("order_number", filters.order_number);
      if (filters.part_code) params.set("part_code", filters.part_code);

      const response = await api.get(
        `/validar-descargas/?${params.toString()}`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `validacion_${filters.date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setFeedback({
        open: true,
        message: "Archivo descargado correctamente",
        severity: "success",
      });
    } catch (error) {
      console.error("Error en la descarga:", error);
      setFeedback({
        open: true,
        message: "Error en la descarga",
        severity: "error",
      });
    } finally {
      setLoadingfile(false);
    }
  };

  return (
    <div>
      {/* Input de N° de Orden */}
      <TextField
        label="N° de Orden (OF)"
        variant="outlined"
        fullWidth
        value={orderNumber}
        onChange={(e) => setOrderNumber(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* Selector de modo */}
      <FormControlLabel
        control={
          <Checkbox
            checked={manualMode}
            onChange={(e) => setManualMode(e.target.checked)}
          />
        }
        label="Ingresar manualmente"
      />

      {!manualMode ? (
        <TextField
          label="Escanea código"
          variant="outlined"
          value={scan}
          onInput={handleScanInput}
          fullWidth
          autoFocus
        />
      ) : (
        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
          <TextField
            label="N° de parte"
            variant="outlined"
            value={manualPartCode}
            onChange={(e) => setManualPartCode(e.target.value)}
          />
          <TextField
            label="Lote"
            variant="outlined"
            value={manualBatch}
            onChange={(e) => setManualBatch(e.target.value)}
          />
          <TextField
            label="Cantidad"
            variant="outlined"
            type="number"
            value={manualQty}
            onChange={(e) => setManualQty(e.target.value)}
          />
          <Button variant="contained" onClick={handleAddManual}>
            Agregar
          </Button>
        </Box>
      )}

      {/* Tabla */}
      <Table sx={{ marginTop: 2 }}>
        <TableHead className={classes.boldHeader}>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>N° Parte</TableCell>
            <TableCell>Lote</TableCell>
            <TableCell>Cantidad</TableCell>
            <TableCell>Acción</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry, index) => (
            <TableRow key={index}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{entry.part_code}</TableCell>
              <TableCell>{entry.batch || "-"}</TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={entry.qty}
                  onChange={(e) => {
                    const newQty = e.target.value;
                    setEntries((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, qty: newQty } : row
                      )
                    );
                  }}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Button color="error" onClick={() => removeEntry(index)}>
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Guardar */}
      {entries.length > 0 && (
        <Button
          variant="contained"
          color="primary"
          sx={{ marginTop: 2, mb: 10 }}
          onClick={handleSave}
        >
          Guardar materiales
        </Button>
      )}

      {/* Snackbar */}
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

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <strong>Material Retirado</strong>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ height: 500, width: "100%" }}>
            {/* Filtros */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                label="Buscar N° Parte"
                value={filters.part_code}
                onChange={(e) =>
                  setFilters({ ...filters, part_code: e.target.value })
                }
              />
              <TextField
                label="Buscar N° Orden (OF)"
                value={filters.order_number}
                onChange={(e) =>
                  setFilters({ ...filters, order_number: e.target.value })
                }
              />
              <TextField
                label="Fecha (YYYY-MM-DD)"
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={fetchData}
                disabled={loading}
              >
                Buscar
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setFilters({ part_code: "", order_number: "", date: "" });
                  fetchData();
                }}
              >
                Limpiar
              </Button>

              <Button
                variant="contained"
                color="success"
                onClick={handleDownloadExcel}
                disabled={loadingfile}
                startIcon={
                  loadingfile ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : null
                }
              >
                {loadingfile ? "Descargando..." : "Validar descargas"}
              </Button>
            </Box>

            {/* DataGrid */}
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
              disableColumnFilter
              disableColumnMenu
              pageSize={10}
              loading={loading}
            />
          </Box>
        </AccordionDetails>
      </Accordion>
    </div>
  );
};

export default MaterialWithdrawal;
