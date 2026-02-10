import React, { useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  colors,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../../services/api";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";

export default function MaterialMetrics() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [metrics, setMetrics] = useState(null);

  const fetchMetrics = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);

    try {
      const response = await api.get("/material_metrics/", {
        params: {
          date_start: startDate,
          date_end: endDate,
        },
      });

      setRows(response.data.results || []);
      setMetrics(response.data.metrics || {});
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }

    setLoading(false);
  };

  const columns = [
    {
      field: "id",
      headerName: "ID",
      width: 80,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },

    {
      field: "folio",
      headerName: "Folio",
      width: 180,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "cod_art",
      headerName: "N° Parte",
      width: 100,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "descrip",
      headerName: "Descripcion",
      width: 200,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "time_created_to_released",
      headerName: "Tiempo Ingreso - Liberado",
      width: 200,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "time_onhold_to_document_validation",
      headerName: "Tiempo Detenido - De nuevo en proceso",
      width: 200,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "time_released_to_delivered",
      headerName: "Tiempo Liberado - Entregado",
      width: 220,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
  ];

  const parseTimeToHours = (timeStr) => {
    if (!timeStr) return 0;

    const [h, m, s] = timeStr.split(":").map(Number);
    return h + m / 60 + s / 3600;
  };

  const timeChartData = rows.map((item) => ({
    folio: item.folio,
    hours: parseTimeToHours(item.time_created_to_released),
  }));

  const urgentData = [
    {
      id: 0,
      value: metrics?.urgent_count || 0,
      label: "Urgentes",
      color: "#F54927",
    },
    {
      id: 1,
      value: (metrics?.count || 0) - (metrics?.urgent_count || 0),
      label: "No urgentes",
      color: "#06C957",
    },
  ];

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3} fontWeight="bold">
        Métricos de Material
      </Typography>

      {/* FILTROS */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <TextField
            label="Fecha inicio"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            fullWidth
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            label="Fecha fin"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            fullWidth
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            sx={{ height: "56px" }}
            onClick={fetchMetrics}
          >
            Buscar
          </Button>
        </Grid>
      </Grid>

      {/* MÉTRICOS GLOBALES */}
      {metrics && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  Total Registros
                </Typography>
                <Typography fontSize={22} color="primary" fontWeight="bold">
                  {metrics.count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  {/* Creado - Liberado */}
                  Total Rechazados
                </Typography>
                {/* <Typography>{metrics.created_to_released}</Typography> */}
                <Typography fontSize={22} color="error" fontWeight="bold">
                  {metrics.rejections}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  {/* Creado - Liberado */}
                  Total Urgentes
                </Typography>
                {/* <Typography>{metrics.created_to_released}</Typography> */}
                <Typography fontSize={22} color="error" fontWeight="bold">
                  {metrics.urgent_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  {/* Creado - Liberado */}
                  Total Detenidos
                </Typography>
                {/* <Typography>{metrics.created_to_released}</Typography> */}
                <Typography fontSize={22} color="warning" fontWeight="bold">
                  {metrics.onhold_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  Detenido - De nuevo en proceso
                </Typography>
                <Typography>{metrics.onhold_to_document_validation}</Typography>
              </CardContent>
            </Card>
          </Grid> */}

          {/* <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  Liberado - Entregado
                </Typography>
                <Typography>{metrics.released_to_delivered}</Typography>
              </CardContent>
            </Card>
          </Grid> */}
        </Grid>
      )}

      {/* TABLA */}
      {loading ? (
        <CircularProgress />
      ) : (
        <div style={{ height: 400, width: "100%" }}>
          <DataGrid rows={rows} columns={columns} getRowId={(r) => r.id} />
        </div>
      )}

      {/* === GRAFICA DE BARRAS === */}
      {rows.length > 0 && (
        <Card sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            Tiempo Ingreso → Liberado (horas)
          </Typography>

          <BarChart
            xAxis={[
              {
                scaleType: "band",
                data: timeChartData.map((i) => i.folio),
                label: "Folio",
              },
            ]}
            series={[
              {
                data: timeChartData.map((i) => i.hours),
                label: "Horas",
              },
            ]}
            width={900}
            height={300}
          />
        </Card>
      )}

      {/* === PIE CHART === */}
      {metrics && (
        <Card sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            Urgentes vs No urgentes
          </Typography>

          <PieChart
            series={[
              {
                data: urgentData,
              },
            ]}
            width={400}
            height={300}
          />
        </Card>
      )}
    </Box>
  );
}
