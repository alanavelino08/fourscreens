import React, { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import { Box, Typography } from "@mui/material";
import api from "../../services/api";
import { getCurrentUser } from "../../services/auth";

const MaterialDashboard = () => {
  const [rows, setRows] = useState([]);
  const [user, setUser] = useState(null);

  const fetchEntries = async () => {
    try {
      const res = await api.get("/all-material-entries/");

      // Filtrar antes de ordenar
      const filtered = res.data.filter(
        (entry) => !entry.delivered_at && !entry.removed_at
      );

      const sorted = filtered.sort((a, b) => {
        if (a.is_urgent !== b.is_urgent) {
          return b.is_urgent - a.is_urgent;
        }
        return new Date(a.created_at) - new Date(b.created_at);
      });

      setRows(sorted);
    } catch (error) {
      console.error("Error al traer datos:", error);
    }
  };

  useEffect(() => {
    setUser(getCurrentUser());
    fetchEntries();

    const interval = setInterval(() => {
      console.log("Ejecutando intervalo...");
      fetchEntries();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const columns = [
    {
      field: "cod_art",
      headerName: "N° de parte",
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
      field: "created_at",
      headerName: "Fecha ingreso",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
      renderCell: (params) => {
        const date = new Date(params.value);
        return date.toLocaleString("es-MX", {
          timeZone: "America/Mexico_City",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      },
    },
    {
      field: "step_label",
      headerName: "Estatus",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "is_urgent",
      headerName: "Urgente",
      flex: 1,
      renderCell: (params) => (params.value ? "Sí" : "No"),
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "cone",
      headerName: "Cono",
      flex: 1,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
      renderCell: (params) => {
        const cone = params.row.cone;
        if (!cone || !cone.color) return null;

        return (
          <ChangeHistoryIcon
            sx={{
              color: cone.color,
              fontSize: "2rem",
            }}
          />
        );
      },
    },
  ];

  return (
    <Box sx={{ height: "85vh", width: "100%", p: 2 }}>
      {user && (
        <Typography variant="h4" sx={{ mb: 2 }}>
          <strong>Material ingresado</strong>
        </Typography>
      )}
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        pageSize={10}
        rowsPerPageOptions={[10, 20, 50]}
      />
    </Box>
  );
};

export default MaterialDashboard;
