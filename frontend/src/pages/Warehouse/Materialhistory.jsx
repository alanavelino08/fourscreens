import React, { useEffect, useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Box,
  Button,
  Paper,
  Typography,
  Snackbar,
  Alert,
  TablePagination,
} from "@mui/material";
import api from "../../services/api";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles({
  boldHeader: {
    "& .MuiTableCell-head": {
      fontWeight: "bold",
    },
  },
});

export default function PalletHistoryTable() {
  const classes = useStyles();

  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Estados para la paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleClose = () => setFeedback({ ...feedback, open: false });

  // 🔹 Obtener historial con filtros
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.part = search.trim();
      if (startDate) params.start = startDate;
      if (endDate) params.end = endDate;

      const res = await api.get("/pallet-history/", { params });
      setHistory(res.data);
      setPage(0); // 👈 Reinicia la paginación cuando hay nuevos resultados
    } catch (err) {
      console.error("Error cargando historial:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSearch = () => {
    if (!search && !startDate && !endDate) {
      setFeedback({
        open: true,
        message: "Debes ingresar al menos un filtro (parte o rango de fechas)",
        severity: "warning",
      });
      return;
    }
    fetchHistory();
  };

  // 🔹 Si se limpian los filtros, recarga todo
  useEffect(() => {
    if (!search && !startDate && !endDate) {
      fetchHistory();
    }
  }, [search, startDate, endDate]);

  // 🔹 Manejo de cambio de página
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // 🔹 Manejo de cambio de filas por página
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 🔹 Calcular las filas visibles
  const paginatedRows = history.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Historial de Pallets Retirados
      </Typography>

      {/* Filtros */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          label="Buscar por número de parte"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />

        <TextField
          label="Desde (Fecha de retiro)"
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Hasta (Fecha de retiro)"
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <Button variant="contained" onClick={handleSearch} disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            setSearch("");
            setStartDate("");
            setEndDate("");
          }}
          disabled={loading}
        >
          {loading ? "Reseteando..." : "Reset"}
        </Button>
      </Box>

      {/* Tabla */}
      <Paper>
        <Table>
          <TableHead className={classes.boldHeader}>
            <TableRow>
              <TableCell>N° Parte</TableCell>
              <TableCell>Cantidad</TableCell>
              <TableCell>Box ID</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell>Ingresado por</TableCell>
              <TableCell>Fecha Ingreso</TableCell>
              <TableCell>Retirado por</TableCell>
              <TableCell>Fecha Retiro</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay registros
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.part_number}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.box_id}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>{item.user_in}</TableCell>
                  <TableCell>
                    {new Date(item.timestamp_in).toLocaleString()}
                  </TableCell>
                  <TableCell>{item.user_out}</TableCell>
                  <TableCell>
                    {new Date(item.timestamp_out).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* 🔹 Paginador */}
        <TablePagination
          component="div"
          count={history.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página"
        />
      </Paper>

      {/* Snackbar */}
      <Snackbar
        open={feedback.open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleClose} severity={feedback.severity}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
