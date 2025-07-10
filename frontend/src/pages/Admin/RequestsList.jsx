//ACTUAL
import React, { useState, useEffect, useDebugValue } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
  Chip,
  Pagination,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
  InputAdornment,
  IconButton,
  AppBar,
  Toolbar,
  Slide,
  Grid,
  Container,
  Snackbar,
  Alert,
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  Divider,
} from "@mui/material";
import api from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import { makeStyles } from "@mui/styles";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import { Translate } from "@mui/icons-material";
//Negritas (Bold)
const useStyles = makeStyles({
  boldHeader: {
    "& .MuiTableCell-head": {
      fontWeight: "bold",
    },
  },
});

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Codigo timer descendente - hora actual - requerimiento
const CountdownTimer = ({ requirementDate }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(requirementDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(requirementDate);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.total <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [requirementDate]);

  function calculateTimeLeft(dateString) {
    const now = new Date();

    // Parsear correctamente la fecha tipo "5/14/2025, 2:30:00 AM"
    const parsedDate = new Date(Date.parse(dateString));

    const difference = parsedDate - now;

    if (difference <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    return {
      hours: Math.floor(difference / (1000 * 60 * 60)),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      total: difference,
    };
  }

  const { hours, minutes, seconds } = timeLeft;

  return (
    <span>
      {`${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`}
    </span>
  );
};

// Estatus
const STATUS_OPTIONS = [
  { value: "EN PREPARACION", label: "En Preparacion" },
  { value: "TERMINADO", label: "Terminado" },
  { value: "VALIDACION CALIDAD", label: "Validacion Calidad" },
  { value: "ESPERA CAMION", label: "Espera Camion" },
  { value: "ENVIADO", label: "Enviado" },
  { value: "EN ESPERA", label: "En Espera" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "PENDIENTE", label: "Pendiente" },
];

const ShipmentsList = ({ showAll }) => {
  const classes = useStyles();
  const [shipments, setShipments] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [pagination, setPagination] = useState({
    count: 0,
    currentPage: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const user = getCurrentUser();

  const isWarehouseUser = user?.role === "WAREHOUSE";
  const isAdminUser = user?.role === "ADMIN";
  const isPlannerUser = user?.role === "PLANNER";

  // const fetchShipments = async (page = 1) => {
  //   try {
  //     setLoading(true);
  //     // const endpoint = isWarehouseUser
  //     //   ? '/shipments/list/?status=CONFIRMED'
  //     //   : '/shipments/list/';
  //     const endpoint = isWarehouseUser
  //     ? '/shipments/list/?status=EN PREPARACION,TERMINADO,VALIDACION CALIDAD,ESPERA CAMION,ENVIADO,EN ESPERA,CANCELADO'
  //     : '/shipments/list/';
  //     const response = await api.get(`${endpoint}?page=${page}`);
  //     setShipments(response.data.results);
  //     setPagination({
  //       count: response.data.count,
  //       currentPage: page,
  //       totalPages: Math.ceil(response.data.count / 10)
  //     });
  //   } catch (error) {
  //     console.error('Error fetching shipments:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const fetchShipments = async (page = 1) => {
  //   try {
  //     setLoading(true);
  //     let endpoint = '/shipments/list/';

  //     if (isWarehouseUser) {
  //       endpoint = '/shipments/list/?status=EN PREPARACION,TERMINADO,VALIDACION CALIDAD,ESPERA CAMION,ENVIADO,EN ESPERA,CANCELADO';
  //     } else {
  //       if (tabValue === 0) {
  //         // Pendientes
  //         endpoint = '/shipments/list/?status=PENDIENTE';
  //       } else if (tabValue === 1) {
  //         // Procesados (cualquier estado excepto pendiente)
  //         endpoint = '/shipments/list/?exclude_status=PENDIENTE';
  //       } else if (tabValue === 2) {
  //         // Todos
  //         endpoint = '/shipments/list/';
  //       }
  //     }

  //     const separator = endpoint.includes('?') ? '&' : '?';
  //     const response = await api.get(`${endpoint}${separator}page=${page}`);
  //     //const response = await api.get(`${endpoint}&page=${page}`);
  //     setShipments(response.data.results);
  //     setPagination({
  //       count: response.data.count,
  //       currentPage: page,
  //       totalPages: Math.ceil(response.data.count / 10)
  //     });
  //   } catch (error) {
  //     console.error('Error fetching shipments:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchShipments = async (page = 1) => {
    try {
      setLoading(true);
      let endpoint = "/shipments/list/";
      const params = new URLSearchParams();

      if (isWarehouseUser) {
        params.append(
          "status",
          "EN PREPARACION,TERMINADO,VALIDACION CALIDAD,ESPERA CAMION,ENVIADO,EN ESPERA,CANCELADO"
        );
        params.append("taked_by", user.id); // opcional si quieres filtrar por el warehouse actual
        params.append("paginate", "false"); // 👈 para que el backend no pagine
      } else {
        if (tabValue === 0) {
          params.append("status", "PENDIENTE");
        } else if (tabValue === 1) {
          params.append("exclude_status", "PENDIENTE");
        }
        // Si no es warehouse y tabValue === 2, no agregamos filtros
        params.append("page", page);
      }

      const response = await api.get(`${endpoint}?${params.toString()}`);

      // Si no está paginado, usa directamente los datos
      if (isWarehouseUser || !response.data.results) {
        setShipments(
          Array.isArray(response.data.results)
            ? response.data.results
            : response.data
        ); // Asume que el backend regresa una lista sin 'results'
        setPagination({ count: 0, currentPage: 1, totalPages: 1 });
      } else {
        setShipments(response.data.results);
        setPagination({
          count: response.data.count,
          currentPage: page,
          totalPages: Math.ceil(response.data.count / 10),
        });
      }
    } catch (error) {
      console.error("Error fetching shipments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments(1);
  }, [tabValue]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, []);

  //Admin aprueba - confirma Shipment
  // const handleApprove = async (id) => {
  //   try {
  //     await api.patch(`/shipments/${id}/approve/`, { status: 'EN PREPARACION' });
  //     fetchShipments(pagination.currentPage);
  //   } catch (error) {
  //     console.error('Error approving shipment:', error);
  //   }
  // };

  //Cambiar estatus - WH
  const handleStatusChange = async (shipmentId, newStatus) => {
    const shipment = shipments.find((s) => s.id === shipmentId);

    //El flujo del shipment debe de pasar primero por (EN PREPARACION)
    if (shipment.status === "PENDIENTE" && newStatus !== "EN PREPARACION") {
      //alert('Debes pasar por el estatus "EN PREPARACIÓN" antes de cambiar a otro estatus.');
      setSnackbar({
        open: true,
        message:
          'Debes pasar por el estatus "EN PREPARACIÓN" antes de cambiar a otro estatus.',
        severity: "error",
      });
      return;
    }

    //NO enviar shipment sin un albaran asignado
    if (newStatus === "ENVIADO" && !shipment.albaran) {
      setSnackbar({
        open: true,
        message: 'No se puede cambiar a "ENVIADO" sin un albarán asignado.',
        severity: "error",
      });
      return;
    }

    try {
      //await api.patch(`/shipments/${shipmentId}/`, { status: newStatus });
      await api.patch(`/shipments/${shipmentId}/update_status/`, {
        status: newStatus,
      });
      fetchShipments(pagination.currentPage);
    } catch (error) {
      console.error("Error updating shipment status:", error);
    } finally {
      setAnchorEl(null);
    }
  };

  //Calculo de fechas
  const getUrgencyBackground = (requirementDate) => {
    const hours = getHoursDifference(requirementDate);

    if (hours >= 24) return "success.light";
    if (hours >= 9) return "warning.light";
    if (hours >= 0) return "error.light";
    return "grey.200";
  };

  const getUrgencyTextColor = (requirementDate) => {
    const hours = getHoursDifference(requirementDate);

    //if (hours >= 24) return 'success.dark';
    if (hours >= 24) return { bgcolor: "success.dark", color: "white" };
    if (hours >= 9) return { bgcolor: "warning.dark", color: "white" };
    if (hours >= 0) return { bgcolor: "error.dark", color: "white" };
    return "grey.700";
  };

  const isUrgent = (requirementDate) => {
    return (
      getHoursDifference(requirementDate) < 9 &&
      getHoursDifference(requirementDate) >= 0
    );
  };

  const getHoursDifference = (requirementDate) => {
    const now = new Date();
    const requirement = new Date(requirementDate);
    return (requirement - now) / (1000 * 60 * 60);
  };

  const handleStatusClick = (event, shipment) => {
    setAnchorEl(event.currentTarget);
    setSelectedShipment(shipment);
    setSelectedStatus(shipment.status);
  };

  const handleStatusClose = () => {
    setAnchorEl(null);
  };

  const handlePageChange = (event, page) => {
    fetchShipments(page);
  };

  const handleViewDetails = (shipment) => {
    setSelectedShipment(shipment);
    setOpenDetails(true);
  };

  const handleCloseDetails = () => {
    setOpenDetails(false);
  };

  // Filtrar embarques pendieNtes - procesados por usuario y todos
  const filteredShipments =
    showAll || tabValue === 2
      ? shipments
      : shipments.filter(
          (shipment) =>
            shipment.created_by && shipment.created_by.id === user?.id
        );
  //shipments.filter(shipment => shipment.created_by === user?.id);

  const pendingShipments = isWarehouseUser
    ? []
    : filteredShipments.filter((shipment) => shipment.status === "PENDIENTE");

  // excluir los shipments terminados y cancelados
  const processedShipments = filteredShipments.filter((shipment) =>
    isWarehouseUser
      ? shipment.status !== "ENVIADO" && shipment.status !== "CANCELADO"
      : shipment.status !== "PENDIENTE"
  );

  //Input busqueda
  const [searchTerm, setSearchTerm] = useState("");

  // pop-up para mandar albaran
  const [open, setOpen] = useState(false);
  const [comment_albaran, setCommentAlbaran] = useState("");

  const resetAlbaranInput = () => {
    setFormData({
      albaran: "",
    });
  };

  const handleChipClick = (shipment) => {
    if (shipment.status === "TERMINADO") {
      setSelectedShipment(shipment);
      setOpen(true);
    }
  };

  const handleClose = () => setOpen(false);

  const handleSave = async (shipmentId, albaran) => {
    if (!albaran.trim()) {
      setSnackbar({
        open: true,
        message: "El campo alabaran no puede enviarse vacío",
        severity: "error",
      });
      return;
    }

    try {
      const response = await api.patch(
        `/shipments/${shipmentId}/update_add_albaran/`,
        {
          albaran: albaran.trim(),
        }
      );

      setSnackbar({
        open: true,
        message: response.data.success || "Albarán asignado correctamente.",
        severity: "success",
      });

      //resetAlbaranInput();
      handleClose();
    } catch (error) {
      const data = error.response?.data;
      if (data?.error?.includes("albaran ya está registrado")) {
        setSnackbar({
          open: true,
          message: "Este albarán ya existe en otro embarque.",
          severity: "error",
        });
      } else if (data?.error) {
        setSnackbar({
          open: true,
          message: data.error,
          severity: "error",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Error al guardar el albarán.",
          severity: "error",
        });
      }
    }
  };

  // Para pop-up - TRANSPORTE

  const [openTransport, setOpenTransport] = React.useState(false);
  const [openTransportView, setOpenTransportView] = useState(false);

  const handleClickOpenTransport = (shipment) => {
    setSelectedShipment(shipment);

    if (shipment.transport) {
      setOpenTransportView(true);
    } else {
      setOpenTransport(true);
    }

    // setOpenTransport(true);
  };

  const handleCloseTransport = () => {
    setOpenTransport(false);
  };

  const [transportData, setTransportData] = useState({
    placas: "",
    engomado: "",
    caat: "",
    tag: "",
    rfc: "",
    empresa: "",
    conductor: "",
  });

  const resetForm = () => {
    setFormData({
      placas: "",
      engomado: "",
      caat: "",
      tag: "",
      rfc: "",
      empresa: "",
      conductor: "",
    });
  };

  const handleChange = (e) => {
    setTransportData({ ...transportData, [e.target.name]: e.target.value });
  };

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...transportData,
        shipment_id: selectedShipment?.id,
      };
      //console.log(dataToSend, 'que es esto?')
      await api.post("/transports/", dataToSend);
      setSnackbar({
        open: true,
        message: "Datos transporte agregados exitosamente",
        severity: "success",
      });

      //resetForm();
      setOpenTransport(false);
    } catch (error) {
      console.error("Error:", error);
      setSnackbar({
        open: true,
        message:
          error.response?.data?.detail || "Error al procesar la solicitud",
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  //pop up para comentario almacen
  const [whComment, setWhComment] = useState("");
  const [openWarehouseCommentDialog, setOpenWarehouseCommentDialog] =
    useState(false);

  const handleCloseWH = () => setOpenWarehouseCommentDialog(false);

  const handleClickOpenwhcomment = (shipment) => {
    setSelectedShipment(shipment);
    setOpenWarehouseCommentDialog(true);
  };

  const handleSaveWhComment = async (shipmentId) => {
    if (!whComment.trim()) return; // no enviar si está vacío

    try {
      const response = await api.patch(
        `/shipments/${shipmentId}/update_wh_comment/`,
        { wh_comment: whComment }
      );

      setSnackbar({
        open: true,
        message: response.data.success || "comentario agregado correctamente.",
        severity: "success",
      });
      setOpenWarehouseCommentDialog(false);
      setWhComment("");
    } catch (error) {
      console.error("Error guardando comentario de almacén:", error);
    }
  };

  //pop up para comentario admin
  const [adminComment, setAdminComment] = useState("");
  const [openAdminCommentDialog, setOpenAdminCommentDialog] = useState(false);
  const handleCloseAdmin = () => setOpenAdminCommentDialog(false);

  const handleClickOpenadmincomment = (shipment) => {
    setSelectedShipment(shipment);
    setOpenAdminCommentDialog(true);
  };

  const handleSaveAdminComment = async (shipmentId) => {
    if (!adminComment.trim()) return; // no enviar si está vacío

    try {
      const response = await api.patch(
        `/shipments/${shipmentId}/update_admin_comment/`,
        { admin_comment: adminComment }
      );

      setSnackbar({
        open: true,
        message: response.data.success || "comentario agregado correctamente.",
        severity: "success",
      });
      setOpenAdminCommentDialog(false);
      setAdminComment("");
    } catch (error) {
      console.error("Error guardando comentario de admin:", error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {isWarehouseUser
          ? "Embarques para Preparación"
          : showAll
          ? "Todos los Embarques"
          : "Mis Embarques"}
      </Typography>

      {/* Input busqueda */}
      <TextField
        label="Buscar por código"
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2, width: "100%", maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton onClick={() => setSearchTerm("")} size="small">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Mostrar pestañas solo si no es warehouse */}
      {!isWarehouseUser && (
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab label="Pendientes" />
          <Tab label="Procesados" />
          <Tab label="Todos" />
        </Tabs>
      )}

      <TableContainer
        component={Paper}
        sx={{
          mb: 2,
          maxHeight: "calc(100vh - 200ppx)",
          overflow: "auto",
          "& .MuiTableCell-head": {
            backgroundColor: "background.paper",
            position: "sticky",
            top: 0,
            zIndex: 1,
          },
        }}
      >
        <Table>
          <TableHead className={classes.boldHeader}>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Proyecto</TableCell>
              <TableCell>Fecha Requerida</TableCell>
              {/* <TableCell>Comentario</TableCell> */}
              <TableCell>N° de Pedidos</TableCell>
              {/* {showAll && !isWarehouseUser && <TableCell>Creado por</TableCell>} */}
              {isAdminUser && <TableCell>Creado por</TableCell>}
              <TableCell>Fecha creación</TableCell>
              <TableCell>Fecha preparacion</TableCell>
              <TableCell>Tomado por</TableCell>
              <TableCell>Seguimiento por</TableCell>
              <TableCell>Fecha envio</TableCell>
              {/* {isWarehouseUser && <TableCell>Aprobado Por</TableCell>} */}
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(isWarehouseUser
              ? processedShipments
              : tabValue === 0
              ? pendingShipments
              : processedShipments
            )
              .filter(
                (shipment) =>
                  searchTerm === "" ||
                  shipment.shipment_code
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
              )
              .sort((a, b) => {
                const numA = parseInt(a.shipment_code.match(/\d+/)?.[0] || 0);
                const numB = parseInt(b.shipment_code.match(/\d+/)?.[0] || 0);

                if (numA !== numB) {
                  return numB - numA;
                }

                return (
                  new Date(a.requirement_date) - new Date(b.requirement_date)
                ); // luego por requirement_date asc
              })
              .map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell
                    // onClick={() => {
                    //   setSelectedShipment(shipment);
                    //   handleClickOpenTransport(true);
                    // }}
                    onClick={() => {
                      if (isPlannerUser) {
                        handleClickOpenTransport(shipment);
                      } else if (isWarehouseUser) {
                        handleClickOpenwhcomment(shipment);
                      } else if (isAdminUser) {
                        handleClickOpenadmincomment(shipment);
                      }
                    }}
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                  >
                    {shipment.shipment_code}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold">
                      {shipment.requests[0].project}
                    </Typography>
                  </TableCell>
                  {/* <TableCell>
                  {new Date(shipment.requirement_date).toLocaleString()}
                </TableCell> */}
                  <TableCell>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: getUrgencyBackground(
                          shipment.requirement_date
                        ),
                        color: getUrgencyTextColor(shipment.requirement_date),
                        fontWeight: isUrgent(shipment.requirement_date)
                          ? "bold"
                          : "normal",
                        display: "inline-block",
                      }}
                    >
                      {new Date(shipment.requirement_date).toLocaleString()}

                      {shipment.status !== "ENVIADO" && (
                        <p>
                          Faltan{" "}
                          <CountdownTimer
                            requirementDate={shipment.requirement_date}
                          />{" "}
                          hrs
                        </p>
                      )}
                      {/* <p>Faltan <CountdownTimer requirementDate={shipment.requirement_date} /> hrs</p> */}
                      {isUrgent(shipment.requirement_date) &&
                        shipment.status !== "ENVIADO" && (
                          <Chip
                            label="URGENTE"
                            size="small"
                            sx={{
                              ml: 1,
                              backgroundColor: "error.main",
                              color: "white",
                            }}
                          />
                        )}
                    </Box>
                  </TableCell>
                  {/* <TableCell>{shipment.comment || '-'}</TableCell> */}
                  <TableCell>{shipment.requests?.length || 0}</TableCell>
                  {/* {showAll && !isWarehouseUser && ( */}
                  {isAdminUser && (
                    <TableCell>
                      {shipment.created_by === user?.id
                        ? "Tú"
                        : `${shipment.created_by.first_name} ${shipment.created_by.last_name}`}
                    </TableCell>
                  )}
                  {/*Fecha de creacion */}
                  <TableCell>
                    {new Date(shipment.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {shipment?.preparation_at
                      ? new Date(shipment.preparation_at).toLocaleString()
                      : "Pendiente"}
                  </TableCell>
                  <TableCell>
                    {shipment?.taked_by?.id
                      ? `${shipment.taked_by.first_name} ${shipment.taked_by.last_name}`
                      : "No asignado"}
                  </TableCell>
                  <TableCell>
                    {shipment?.give_progress_by?.id
                      ? `${shipment.give_progress_by.first_name} ${shipment.give_progress_by.last_name}`
                      : "No asignado"}
                  </TableCell>
                  <TableCell>
                    {shipment?.delivered_at
                      ? new Date(shipment.delivered_at).toLocaleString()
                      : "pendiente"}
                  </TableCell>
                  {/* {isWarehouseUser && (<TableCell>
                  {shipment.confirmed_by.first_name} {shipment.confirmed_by.last_name}
                </TableCell>
                )} */}
                  {/* <TableCell>
                  <Chip 
                    label={shipment.status} 
                    color={
                      shipment.status === 'TERMINADO' ? 'info' :
                      shipment.status === 'VALIDACION CALIDAD' ? 'info' : 
                      shipment.status === 'PENDIENTE' ? 'warning' :
                      shipment.status === 'CANCELADO' ? 'error' :
                      shipment.status === 'EN PREPARACION' ? 'secondary' :
                      shipment.status === 'ESPERA CAMION' ? 'warning' :
                      shipment.status === 'EN ESPERA' ? 'warning' :
                      shipment.status === 'ENVIADO' ? 'success' : 'error'
                    } 
                  />
                </TableCell> */}
                  <TableCell>
                    <Stack direction="column" spacing={1}>
                      {/* Chip de estado (como ya lo tienes) */}
                      <Chip
                        label={shipment.status}
                        color={
                          shipment.status === "TERMINADO"
                            ? "info"
                            : shipment.status === "VALIDACION CALIDAD"
                            ? "info"
                            : shipment.status === "PENDIENTE"
                            ? "warning"
                            : shipment.status === "CANCELADO"
                            ? "error"
                            : shipment.status === "EN PREPARACION"
                            ? "secondary"
                            : shipment.status === "ESPERA CAMION"
                            ? "warning"
                            : shipment.status === "EN ESPERA"
                            ? "warning"
                            : shipment.status === "ENVIADO"
                            ? "success"
                            : "error"
                        }
                        onClick={() => handleChipClick(shipment)}
                        sx={{
                          cursor:
                            shipment.status === "TERMINADO"
                              ? "pointer"
                              : "default",
                        }}
                      />

                      {/* Nuevo Chip para el tiempo de envío (solo si está ENVIADO) */}
                      {shipment.status === "ENVIADO" &&
                        shipment.requirement_date &&
                        shipment.delivered_at && (
                          <Chip
                            label={
                              new Date(shipment.delivered_at) <
                              new Date(shipment.requirement_date)
                                ? "Enviado en tiempo"
                                : "Enviado fuera de tiempo"
                            }
                            sx={{
                              backgroundColor:
                                new Date(shipment.delivered_at) <
                                new Date(shipment.requirement_date)
                                  ? "#4caf50" // Verde
                                  : "#f44336", // Rojo
                              color: "white",
                              fontWeight: "bold",
                            }}
                            size="small"
                          />
                        )}
                    </Stack>

                    {/* Dialog para ingresar albaran*/}
                    {/* {isWarehouseUser && (
                  <Dialog open={open} onClose={handleClose}>
                    <DialogTitle>Embarque <strong>{selectedShipment?.shipment_code}</strong> TERMINADO </DialogTitle>
                    <DialogContent>
                      <TextField
                        autoFocus
                        margin="dense"
                        label="Ingresa Albaran"
                        name="albaran"
                        required

                        fullWidth
                        value={comment_albaran}
                        onChange={(e) => setCommentAlbaran(e.target.value)}
                      />
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={handleClose}>Cancelar</Button>
                      <Button onClick={() => handleSave(selectedShipment.id, comment_albaran)}
                        color="primary" variant="contained">Enviar</Button>
                    </DialogActions>
                  </Dialog>
                  )} */}

                    {isWarehouseUser && selectedShipment && (
                      <Dialog open={open} onClose={handleClose}>
                        <DialogTitle>
                          Embarque{" "}
                          <strong>{selectedShipment.shipment_code}</strong>{" "}
                          TERMINADO
                        </DialogTitle>
                        <DialogContent>
                          {selectedShipment.albaran ? (
                            <>
                              <p>Este embarque ya tiene un albarán asignado:</p>
                              <TextField
                                fullWidth
                                value={selectedShipment.albaran}
                                InputProps={{
                                  readOnly: true,
                                }}
                              />
                            </>
                          ) : (
                            <>
                              <TextField
                                autoFocus
                                margin="dense"
                                label="Ingresa Albarán"
                                name="albaran"
                                required
                                fullWidth
                                value={comment_albaran}
                                onChange={(e) =>
                                  setCommentAlbaran(e.target.value)
                                }
                              />
                            </>
                          )}
                        </DialogContent>
                        <DialogActions>
                          <Button onClick={handleClose}>Cerrar</Button>
                          {!selectedShipment.albaran && (
                            <Button
                              onClick={() =>
                                handleSave(selectedShipment.id, comment_albaran)
                              }
                              color="primary"
                              variant="contained"
                            >
                              Enviar
                            </Button>
                          )}
                        </DialogActions>
                      </Dialog>
                    )}

                    {/*Dialog para formulario de transporte */}
                    <Dialog
                      fullScreen
                      open={openTransport}
                      onClose={handleCloseTransport}
                      TransitionComponent={Transition}
                    >
                      <AppBar sx={{ position: "relative" }}>
                        <Toolbar>
                          <IconButton
                            edge="start"
                            color="inherit"
                            onClick={handleCloseTransport}
                            aria-label="close"
                          >
                            <CloseIcon />
                          </IconButton>
                          <Typography
                            sx={{ ml: 2, flex: 1 }}
                            variant="h6"
                            component="div"
                          >
                            Datos transporte para embarque:{" "}
                            <strong>{selectedShipment?.shipment_code}</strong>
                          </Typography>
                          <Button
                            autoFocus
                            color="inherit"
                            onClick={handleSubmit}
                          >
                            Guardar
                          </Button>
                        </Toolbar>
                      </AppBar>
                      <Container maxWidth="md">
                        <Box sx={{ p: 3 }}>
                          <TextField
                            fullWidth
                            margin="normal"
                            label="Placas"
                            name="placas"
                            required
                            value={transportData.placas}
                            onChange={handleChange}
                          />
                          <TextField
                            fullWidth
                            margin="normal"
                            label="Engomado"
                            name="engomado"
                            required
                            value={transportData.engomado}
                            onChange={handleChange}
                          />
                          <TextField
                            fullWidth
                            margin="normal"
                            label="CAAT"
                            name="caat"
                            required
                            value={transportData.caat}
                            onChange={handleChange}
                          />
                          <TextField
                            fullWidth
                            margin="normal"
                            label="TAG"
                            name="tag"
                            required
                            value={transportData.tag}
                            onChange={handleChange}
                          />
                          <TextField
                            fullWidth
                            margin="normal"
                            label="RFC"
                            name="rfc"
                            value={transportData.rfc}
                            onChange={handleChange}
                          />
                          <TextField
                            fullWidth
                            margin="normal"
                            label="Empresa"
                            name="empresa"
                            required
                            value={transportData.empresa}
                            onChange={handleChange}
                          />
                          <TextField
                            fullWidth
                            margin="normal"
                            label="Conductor"
                            name="conductor"
                            required
                            value={transportData.conductor}
                            onChange={handleChange}
                          />
                        </Box>
                      </Container>
                    </Dialog>

                    {/*Mostrar Dialog en caso de que el embarque ya tenga datos de transporte */}
                    <Dialog
                      fullScreen
                      open={openTransportView}
                      onClose={() => setOpenTransportView(false)}
                      TransitionComponent={Transition}
                    >
                      <AppBar sx={{ position: "relative" }}>
                        <Toolbar>
                          <IconButton
                            edge="start"
                            color="inherit"
                            onClick={() => setOpenTransportView(false)}
                            aria-label="close"
                          >
                            <CloseIcon />
                          </IconButton>
                          <Typography
                            sx={{ ml: 2, flex: 1 }}
                            variant="h6"
                            component="div"
                          >
                            Transporte registrado de embarque:{" "}
                            <strong> {selectedShipment?.shipment_code} </strong>
                          </Typography>
                        </Toolbar>
                      </AppBar>
                      <Container
                        maxWidth="md"
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          minHeight: "100vh",
                          padding: "20px",
                        }}
                      >
                        <Card
                          sx={{
                            maxWidth: 500,
                            width: "100%",
                            textAlign: "center",
                            margin: "auto",
                          }}
                        >
                          <CardActionArea>
                            <CardMedia
                              component="img"
                              height="210"
                              image="../src/assets/truck.png"
                              alt="green iguana"
                            />
                            <CardContent>
                              <Typography
                                gutterBottom
                                variant="h5"
                                component="div"
                              >
                                <strong>Datos de transporte</strong>
                              </Typography>
                              <Typography variant="subtitle1">
                                <strong>Placas:</strong>{" "}
                                {selectedShipment?.transport?.placas}
                              </Typography>
                              <Typography variant="subtitle1">
                                <strong>Engomado:</strong>{" "}
                                {selectedShipment?.transport?.engomado}
                              </Typography>
                              <Typography variant="subtitle1">
                                <strong>CAAT:</strong>{" "}
                                {selectedShipment?.transport?.caat}
                              </Typography>
                              <Typography variant="subtitle1">
                                <strong>TAG:</strong>{" "}
                                {selectedShipment?.transport?.tag}
                              </Typography>
                              <Typography variant="subtitle1">
                                <strong>RFC:</strong>{" "}
                                {selectedShipment?.transport?.rfc}
                              </Typography>
                              <Typography variant="subtitle1">
                                <strong>Empresa:</strong>{" "}
                                {selectedShipment?.transport?.empresa}
                              </Typography>
                              <Typography variant="subtitle1">
                                <strong>Conductor:</strong>{" "}
                                {selectedShipment?.transport?.conductor}
                              </Typography>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      </Container>
                    </Dialog>

                    {/* Dialog comentario WH*/}
                    <Dialog
                      open={openWarehouseCommentDialog}
                      onClose={() => setOpenWarehouseCommentDialog(false)}
                    >
                      {selectedShipment && (
                        <>
                          <DialogTitle>
                            ¿Quieres agregar un comentario para el embarque{" "}
                            <strong>{selectedShipment.shipment_code}</strong>?
                          </DialogTitle>

                          <DialogContent>
                            {selectedShipment.wh_comment ? (
                              <>
                                <p>
                                  Este embarque ya tiene un comentario asignado:
                                </p>
                                <TextField
                                  fullWidth
                                  value={selectedShipment.wh_comment}
                                  InputProps={{
                                    readOnly: true,
                                  }}
                                />
                              </>
                            ) : (
                              <TextField
                                autoFocus
                                margin="dense"
                                label="Comentario"
                                name="wh_comment"
                                fullWidth
                                value={whComment}
                                onChange={(e) => setWhComment(e.target.value)}
                              />
                            )}
                          </DialogContent>

                          <DialogActions>
                            <Button onClick={handleCloseWH}>Cerrar</Button>
                            {!selectedShipment.wh_comment && (
                              <Button
                                onClick={() =>
                                  handleSaveWhComment(selectedShipment.id)
                                }
                                color="primary"
                                variant="contained"
                              >
                                Enviar
                              </Button>
                            )}
                          </DialogActions>
                        </>
                      )}
                    </Dialog>

                    {/* Dialog comentario Admin*/}
                    <Dialog
                      open={openAdminCommentDialog}
                      onClose={() => setOpenAdminCommentDialog(false)}
                    >
                      {selectedShipment && (
                        <>
                          <DialogTitle>
                            ¿Quieres agregar un comentario para el embarque{" "}
                            <strong>{selectedShipment.shipment_code}</strong>?
                          </DialogTitle>

                          <DialogContent>
                            {selectedShipment.admin_comment ? (
                              <>
                                <p>
                                  Este embarque ya tiene un comentario asignado:
                                </p>
                                <TextField
                                  fullWidth
                                  value={selectedShipment.admin_comment}
                                  InputProps={{
                                    readOnly: true,
                                  }}
                                />
                              </>
                            ) : (
                              <TextField
                                autoFocus
                                margin="dense"
                                label="Comentario Admin"
                                name="admin_comment"
                                fullWidth
                                value={adminComment}
                                onChange={(e) =>
                                  setAdminComment(e.target.value)
                                }
                              />
                            )}
                          </DialogContent>

                          <DialogActions>
                            <Button onClick={handleCloseAdmin}>Cerrar</Button>
                            {!selectedShipment.admin_comment && (
                              <Button
                                onClick={() =>
                                  handleSaveAdminComment(selectedShipment.id)
                                }
                                color="primary"
                                variant="contained"
                              >
                                Enviar
                              </Button>
                            )}
                          </DialogActions>
                        </>
                      )}
                    </Dialog>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      color="info"
                      onClick={() => handleViewDetails(shipment)}
                      sx={{ mr: 1 }}
                    >
                      Detalles
                    </Button>

                    {/* Botón para ADMIN aprobar */}
                    {/* {showAll && shipment.status === 'PENDING' && (
                    <Button 
                      variant="contained" 
                      color="success"
                      onClick={() => handleApprove(shipment.id)}
                    >
                      Confirmar
                    </Button>
                  )} */}

                    {/* Selector de estado para WAREHOUSE */}
                    {isWarehouseUser && shipment.status !== "ENVIADO" && (
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          // value={shipment.status}
                          value={
                            STATUS_OPTIONS.some(
                              (opt) => opt.value === shipment.status
                            )
                              ? shipment.status
                              : ""
                          }
                          onChange={(e) =>
                            handleStatusChange(shipment.id, e.target.value)
                          }
                          displayEmpty
                        >
                          {/* {STATUS_OPTIONS.map((option) => (
                          <MenuItem 
                            key={option.value} 
                            value={option.value}
                          >
                            {option.label}
                          </MenuItem> */}
                          <MenuItem value="" disabled>
                            Seleccionar estado
                          </MenuItem>
                          {/* {STATUS_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                        ))} */}
                          {STATUS_OPTIONS.filter((option) => {
                            // Si es PENDIENTE, mostrar todas las opciones
                            if (shipment.status === "PENDIENTE") return true;
                            // Si no es PENDIENTE, excluir PENDIENTE
                            return option.value !== "PENDIENTE";
                          }).map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {/* <Select
                        value={shipment.status}
                        onChange={(e) => {
                          // Primero maneja el cambio de estado
                          handleStatusChange(shipment.id, e.target.value);
                          
                          // Si el nuevo estado es "EN PREPARACION", ejecuta handleApprove
                          if (e.target.value === 'EN PREPARACION') {
                            handleApprove(shipment.id);
                          }
                        }}
                        displayEmpty
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select> */}
                      </FormControl>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo de detalles */}
      <Dialog
        open={openDetails}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalles del Embarque {selectedShipment?.shipment_code}
        </DialogTitle>
        <DialogContent>
          {selectedShipment && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Creado Por:</strong>{" "}
                {selectedShipment.created_by.first_name}{" "}
                {selectedShipment.created_by.last_name}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Fecha requerida:</strong>{" "}
                {new Date(selectedShipment.requirement_date).toLocaleString(
                  "en-US",
                  { timeZone: "UTC" }
                )}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Comentario Planner:</strong>{" "}
                {selectedShipment.comment || "Ninguno"}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Comentario Almacén:</strong>{" "}
                {selectedShipment.wh_comment || "Ninguno"}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Comentario Issues vistos:</strong>{" "}
                {selectedShipment.admin_comment || "Ninguno"}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Estado:</strong>{" "}
                <Chip
                  label={selectedShipment.status}
                  color={
                    selectedShipment.status === "TERMINADO"
                      ? "info"
                      : selectedShipment.status === "VALIDACION CALIDAD"
                      ? "info"
                      : selectedShipment.status === "PENDIENTE"
                      ? "warning"
                      : selectedShipment.status === "CANCELADO"
                      ? "error"
                      : selectedShipment.status === "EN PREPARACION"
                      ? "secondary"
                      : selectedShipment.status === "ESPERA CAMION"
                      ? "warning"
                      : selectedShipment.status === "EN ESPERA"
                      ? "warning"
                      : selectedShipment.status === "ENVIADO"
                      ? "success"
                      : "error"
                  }
                />
              </Typography>

              <Typography variant="subtitle1" gutterBottom>
                <strong>Albaran:</strong>{" "}
                {selectedShipment.albaran || "Ninguno"}
              </Typography>

              <Typography variant="h6" sx={{ mt: 2 }}>
                Requests asociados
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead className={classes.boldHeader}>
                    <TableRow>
                      <TableCell>CG P/N</TableCell>
                      <TableCell>Cliente P/N</TableCell>
                      <TableCell>Nickname</TableCell>
                      <TableCell>Proyecto</TableCell>
                      <TableCell>Cantidad</TableCell>
                      <TableCell>Orden</TableCell>
                      <TableCell>Línea</TableCell>
                      <TableCell>Comentario</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedShipment.requests?.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.ikor_number}</TableCell>
                        <TableCell>{request.customer_pn}</TableCell>
                        <TableCell>{request.nickname}</TableCell>
                        <TableCell>{request.project}</TableCell>
                        <TableCell>{request.qty}</TableCell>
                        <TableCell>{request.order}</TableCell>
                        <TableCell>{request.line}</TableCell>
                        <TableCell>{request.comment_per_line}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ mb: 4 }} />

              {/* Tabla datos transporte */}
              {selectedShipment.transport ? (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                    Datos de Transporte
                  </Typography>

                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            <strong>Empresa</strong>
                          </TableCell>
                          <TableCell>
                            {selectedShipment.transport.empresa || "-"}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            <strong>Conductor</strong>
                          </TableCell>
                          <TableCell>
                            {selectedShipment.transport.conductor || "-"}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            <strong>Placas</strong>
                          </TableCell>
                          <TableCell>
                            {selectedShipment.transport.placas || "-"}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            <strong>Engomado</strong>
                          </TableCell>
                          <TableCell>
                            {selectedShipment.transport.engomado || "-"}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            <strong>CAAT</strong>
                          </TableCell>
                          <TableCell>
                            {selectedShipment.transport.caat || "-"}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            <strong>RFC</strong>
                          </TableCell>
                          <TableCell>
                            {selectedShipment.transport.rfc || "-"}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            <strong>TAG</strong>
                          </TableCell>
                          <TableCell>
                            {selectedShipment.transport.tag || "-"}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Typography color="textSecondary">
                  No hay datos de transporte
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Paginación */}
      <Stack spacing={2} alignItems="center">
        <Pagination
          count={pagination.totalPages}
          page={pagination.currentPage}
          onChange={handlePageChange}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Stack>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ShipmentsList;
