import React, { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import NavigationIcon from "@mui/icons-material/Navigation";
import { Box, Typography, Badge } from "@mui/material";
import api from "../../services/api";
import { getCurrentUser } from "../../services/auth";

const MaterialDashboard = () => {
  const [rows, setRows] = useState([]);
  const [user, setUser] = useState(null);
  //cambio de pagina en la tabla
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const fetchEntries = async () => {
    try {
      const res = await api.get("/all-material-entries/");

      // Filtrar antes de ordenar
      const filtered = res.data.filter(
        (entry) => !entry.delivered_at && !entry.removed_at
      );

      // const sorted = filtered.sort((a, b) => {
      //   if (a.is_urgent !== b.is_urgent) {
      //     return b.is_urgent - a.is_urgent;
      //   }
      //   return new Date(a.created_at) - new Date(b.created_at);
      // });
      const sorted = filtered.sort((a, b) => {
        // Urgentes primero
        if (a.is_urgent !== b.is_urgent) {
          return b.is_urgent - a.is_urgent;
        }

        // Luego por fecha más vieja primero
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

  useEffect(() => {
    const pageInterval = setInterval(() => {
      setPage((prevPage) => {
        if (pageCount <= 1) return 0;
        return prevPage + 1 < pageCount ? prevPage + 1 : 0;
      });
    }, 15000); // 15 segundos

    return () => clearInterval(pageInterval);
  }, [pageCount]);

  //Timer en tabla despues de cada cono
  const formatElapsed = (startTime) => {
    if (!startTime) return "-";

    const start = new Date(startTime);
    const now = new Date();

    let diff = Math.floor((now - start) / 1000); // segundos totales

    const hours = Math.floor(diff / 3600);
    diff %= 3600;

    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const getElapsedTime = (entry) => {
    const cone = entry.cone?.color || null;

    switch (cone) {
      case "white":
        return formatElapsed(entry.created_at);

      case "yellow":
        return formatElapsed(entry.document_validation);

      case "green":
        return formatElapsed(entry.released_at);

      case "black":
        return formatElapsed(entry.onhold_at);

      case "red":
        return formatElapsed(entry.rejected_at);

      default:
        return "-";
    }
  };

  const columns = [
    {
      field: "cod_art",
      headerName: "N° de parte",
      width: 150,
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
      width: 200,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "is_urgent",
      headerName: "Urgente",
      width: 100,
      renderCell: (params) => (params.value ? "Sí" : "No"),
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
    },
    {
      field: "cone",
      headerName: "Cono",
      width: 100,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
      renderCell: (params) => {
        const cone = params.row.cone;
        if (!cone || !cone.color) return null;

        return (
          <Badge
            badgeContent={cone.number}
            color="primary"
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            <NavigationIcon
              sx={{
                color: cone.color,
                fontSize: "2.3rem",
              }}
            />
          </Badge>
        );
      },
    },
    {
      field: "elapsed",
      headerName: "Tiempo transcurrido",
      width: 150,
      renderHeader: (params) => <strong>{params.colDef.headerName}</strong>,
      renderCell: (params) => {
        return getElapsedTime(params.row);
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
        pagination
        paginationMode="client"
        page={page}
        onPageChange={(newPage) => setPage(newPage)}
        onPaginationModelChange={(model) => {
          const totalPages = Math.ceil(rows.length / model.pageSize);
          setPageCount(totalPages);
        }}
      />
    </Box>
  );
};

export default MaterialDashboard;
