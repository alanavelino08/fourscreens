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
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleClose = () => setFeedback({ ...feedback, open: false });

  const fetchHistory = async () => {
    try {
      const params = {};
      if (search.trim()) params.part = search.trim();
      if (startDate) params.start = startDate;
      if (endDate) params.end = endDate;

      const res = await api.get("/pallet-history/", { params });
      setHistory(res.data);
    } catch (err) {
      console.error("Error cargando historial:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSearch = () => {
    if (!search) {
      setFeedback({
        open: true,
        message: "Debes escanear el código QR y/o dar ubicación",
        severity: "warning",
      });
      return;
    } else {
      fetchHistory();
      setSearch("");
    }
  };

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
          label="Desde (fecha ingreso)"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Hasta (fecha retiro)"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={handleSearch}>
          Buscar
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
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No hay registros
                </TableCell>
              </TableRow>
            ) : (
              history.map((item, index) => (
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
      </Paper>

      <Snackbar
        open={feedback.open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      ></Snackbar>
    </Box>
  );
}
