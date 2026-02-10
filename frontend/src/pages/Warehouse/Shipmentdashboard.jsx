import React, { useEffect, useState } from "react";
import { Grid, Paper, Typography, Box, TextField, Button } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import api from "../../services/api";
import { getCurrentUser } from "../../services/auth";

const ShipmentDashboard = () => {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({
    date_start: "",
    date_end: "",
  });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!filters.date_start || !filters.date_end) {
      alert("Debes seleccionar ambas fechas antes de consultar.");
      return;
    }

    try {
      setLoading(true);
      const user = getCurrentUser();
      const res = await api.get("/shipment_report/", {
        params: filters,
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setData(res.data);
    } catch (error) {
      console.error("Error fetching shipment data", error);
    } finally {
      setLoading(false);
    }
  };

  // 📊 Cálculo de métricas
  const totalEmbarques = data.length;
  const enviadosEnTiempo = data.filter(
    (s) =>
      s.status === "ENVIADO" &&
      s.enviado &&
      s.fecha_requerida &&
      new Date(s.enviado) < new Date(s.fecha_requerida)
  ).length;
  const enviadosFueraTiempo = data.filter(
    (s) =>
      s.status === "ENVIADO" &&
      s.enviado &&
      s.fecha_requerida &&
      new Date(s.enviado) >= new Date(s.fecha_requerida)
  ).length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" mb={3} fontWeight="bold">
        Métricos de Embarque
      </Typography>

      {/* 🔹 Filtros de fecha y hora */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <TextField
          label="Fecha inicio"
          type="datetime-local"
          value={filters.date_start ? filters.date_start.replace(" ", "T") : ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              date_start: e.target.value
                ? e.target.value.replace("T", " ")
                : "",
            })
          }
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Fecha fin"
          type="datetime-local"
          value={filters.date_end ? filters.date_end.replace(" ", "T") : ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              date_end: e.target.value ? e.target.value.replace("T", " ") : "",
            })
          }
          InputLabelProps={{ shrink: true }}
        />
        <Button
          variant="contained"
          onClick={fetchData}
          disabled={!filters.date_start || !filters.date_end || loading}
        >
          {loading ? "Consultando..." : "Consultar"}
        </Button>
      </Box>

      {/* Si no hay datos aún */}
      {data.length === 0 && !loading && (
        <Typography variant="body1" color="textSecondary">
          Ingresa un rango de fechas y haz clic en "Consultar" para ver los
          resultados.
        </Typography>
      )}

      {/* Cards resumen */}
      {data.length > 0 && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h6">Total Embarques</Typography>
                <Typography variant="h3">{totalEmbarques}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h6">Enviados en Tiempo</Typography>
                <Typography variant="h3" color="green">
                  {enviadosEnTiempo}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h6">Fuera de Tiempo</Typography>
                <Typography variant="h3" color="red">
                  {enviadosFueraTiempo}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Gráfico de barras */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Estado de Envíos
            </Typography>
            <BarChart
              xAxis={[
                { scaleType: "band", data: ["En tiempo", "Fuera de tiempo"] },
              ]}
              series={[
                {
                  data: [enviadosEnTiempo, enviadosFueraTiempo],
                  color: "#1976d2",
                },
              ]}
              width={500}
              height={300}
            />
          </Paper>
        </>
      )}
    </Box>
  );
};

export default ShipmentDashboard;
