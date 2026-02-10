import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Box,
  Modal,
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Checkbox,
  ListItemText,
  Snackbar,
  Alert,
  Tab,
  Accordion,
  AccordionActions,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@mui/material";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import api from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 720,
  bgcolor: "background.paper",
  borderRadius: 3,
  boxShadow: 24,
  p: 4,
};

export default function AuditoryCalendar() {
  const user = getCurrentUser();
  const [events, setEvents] = useState([]);
  const [areas, setAreas] = useState([]);
  const [warehouseUsers, setWarehouseUsers] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const [newTask, setNewTask] = useState({
    task: "",
    description: "",
    area: "",
    assigned_to: [],
  });

  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const handleClose = () => setFeedback({ ...feedback, open: false });

  const isWarehouseUser = user?.role === "WAREHOUSE";

  const [value, setValue] = React.useState(isWarehouseUser ? "2" : "1");

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  // Cargar áreas + usuarios
  useEffect(() => {
    const fetchData = async () => {
      try {
        const areasRes = await api.get("/areas/");
        const warehouseRes = await api.get("/users/?role=WAREHOUSE");

        const areasData = Array.isArray(areasRes.data)
          ? areasRes.data
          : areasRes.data.results || [];

        const usersData = Array.isArray(warehouseRes.data)
          ? warehouseRes.data
          : warehouseRes.data.results || [];

        setAreas(areasData);
        setWarehouseUsers(usersData);
      } catch (err) {
        console.error("Error cargando áreas o usuarios:", err);
      }
    };

    fetchData();
  }, []);

  //Función para recargar auditorías
  const fetchAuditories = async () => {
    try {
      const data = await fetchAllPages("/auditories/");
      const formatted = data.map((a) => ({
        id: a.id,
        title: `${a.folio || ""} - ${a.task}`,
        date: a.scheduled_date,
        backgroundColor:
          a.status === "DONE"
            ? "#4caf50"
            : a.status === "IN_PROGRESS"
            ? "#ffb300"
            : "#2196f3",
      }));

      setEvents(formatted);
    } catch (err) {
      console.error("Error cargando auditorías:", err);
    }
  };

  // Cargar auditorías al iniciar
  useEffect(() => {
    fetchAuditories();
    fetchPendingAuditories();
  }, []);

  //Abrir modal al hacer clic
  const handleDateClick = (info) => {
    const week = getWeekFromDate(info.date);

    setNewTask((prev) => ({
      ...prev,
      task: `WK${week} - `,
    }));

    setSelectedDate(info.dateStr);
    setOpenModal(true);
  };

  //Crear nueva auditoría
  const handleCreateTask = async () => {
    try {
      const payload = {
        task: newTask.task,
        description: newTask.description,
        area_id: newTask.area,
        assigned_to: newTask.assigned_to,
        scheduled_date: selectedDate,
      };

      await api.post("/auditories/", payload);

      await fetchAuditories();
      await fetchPendingAuditories();

      // Cerrar modal y limpiar formulario
      setOpenModal(false);
      setNewTask({
        task: "",
        description: "",
        area: "",
        assigned_to: [],
      });

      setFeedback({
        open: true,
        message: "Plan de auditoría creado exitosamente",
        severity: "success",
      });
    } catch (err) {
      console.error("Error creando auditoría:", err.response?.data || err);
    }
  };

  //Calendario anual
  const closeAnnualPanel = () => {
    setAnnualSelectedDay(null);
  };
  const [annualSelectedDay, setAnnualSelectedDay] = useState(null);
  const [annualDayEvents, setAnnualDayEvents] = useState([]);

  // Genera los días del calendario por mes
  const generateMonth = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];

    // Ajuste: convertir domingo (0) a final de semana
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    for (let i = 0; i < startDay; i++) {
      days.push(null); // celdas vacías
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  // Obtiene eventos por fecha YYYY-MM-DD
  const getEventsForDate = (dateStr) => {
    return events.filter((ev) => ev.date === dateStr);
  };

  // Manejar clic en día
  const handleAnnualDayClick = (day) => {
    const dateStr = day.toISOString().split("T")[0];
    setAnnualSelectedDay(dateStr);
    setAnnualDayEvents(getEventsForDate(dateStr));
  };

  const [year, setYear] = useState(new Date().getFullYear());

  // --- FUNCIONES PARA NAVEGAR ENTRE AÑOS ---
  const goToPrevYear = () => setYear((y) => y - 1);
  const goToNextYear = () => setYear((y) => y + 1);
  const goToCurrentYear = () => setYear(new Date().getFullYear());

  const [pendingAuditories, setPendingAuditories] = useState([]);
  const [auditories, setAuditories] = useState([]);
  const [dialogOpenAuditory, setDialogOpenAuditory] = useState(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [selectedAuditory, setSelectedAuditory] = useState(null);

  const actionOptions = [
    "N/A",
    "Bolsa dañada",
    "Caja dañada",
    "PCB sin sellar al vacio",
    "Tarima dañada",
    "Mal identificada por estatus de color",
  ];

  //Obtener TODOS los registros paginados de DRF
  const fetchAllPages = async (url) => {
    let results = [];
    let nextUrl = url;

    while (nextUrl) {
      const res = await api.get(nextUrl);
      const data = res.data;

      const pageResults = Array.isArray(data) ? data : data.results || [];

      results = [...results, ...pageResults];
      nextUrl = data.next
        ? data.next.replace("http://localhost:8000/api", "")
        : null;
    }

    return results;
  };

  const fetchPendingAuditories = async () => {
    try {
      const data = await fetchAllPages("/auditories/");

      const pending = data.filter((a) => a.status !== "DONE");
      setPendingAuditories(pending);

      setAuditories(data);
    } catch (err) {
      console.error("Error cargando auditorías pendientes:", err);
    }
  };

  const [evidenceFile, setEvidenceFile] = useState(null);
  const [actionEvidenceFile, setActionEvidenceFile] = useState(null);

  const handleSaveEvidence = async () => {
    const fd = new FormData();

    evidenceFile?.forEach((f) => fd.append("evidence", f));
    actionEvidenceFile?.forEach((f) => fd.append("action_evidence", f));

    await api.post(`/auditories/${selectedAuditory.id}/upload_evidence/`, fd);
  };

  //DIALOG DEL PANEL LATERAL
  const [auditDetailDialogOpen, setAuditDetailDialogOpen] = useState(false);
  const [selectedAuditDetail, setSelectedAuditDetail] = useState(null);

  const openAuditDetail = async (auditId) => {
    try {
      const res = await api.get(`/auditories/${auditId}/`);
      setSelectedAuditDetail(res.data);
      setAuditDetailDialogOpen(true);
    } catch (err) {
      console.error("Error cargando detalles:", err);
    }
  };

  // Auditorias por mes
  const filterByCurrentMonth = (auditories) => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0 = enero
    const currentYear = now.getFullYear();

    return auditories
      .filter((aud) => {
        const date = new Date(aud.scheduled_date);
        return (
          date.getMonth() === currentMonth && date.getFullYear() === currentYear
        );
      })
      .sort((a, b) => {
        return new Date(a.scheduled_date) - new Date(b.scheduled_date);
      });
  };

  const pendingThisMonth = filterByCurrentMonth(pendingAuditories);

  // reflejar numeros de semana
  function getWeekFromDate(date) {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Calendario de Auditorías
      </Typography>

      <TabContext value={value}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <TabList onChange={handleChange}>
            {!isWarehouseUser && <Tab label="Mensual" value="1" />}
            <Tab label="Anual" value="2" />
          </TabList>
        </Box>
        <TabPanel value="1">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            dateClick={handleDateClick}
            events={events}
            height="75vh"
          />

          {/* ---------------- MODAL ---------------- */}
          <Modal open={openModal} onClose={() => setOpenModal(false)}>
            <Box sx={modalStyle}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                Crear nueva auditoría ({selectedDate})
              </Typography>

              <TextField
                label="Tarea"
                fullWidth
                sx={{ mb: 2 }}
                value={newTask.task}
                onChange={(e) =>
                  setNewTask({ ...newTask, task: e.target.value })
                }
              />

              <TextField
                label="Descripción"
                multiline
                rows={3}
                fullWidth
                sx={{ mb: 2 }}
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Área</InputLabel>
                <Select
                  value={newTask.area}
                  label="Área"
                  onChange={(e) =>
                    setNewTask({ ...newTask, area: e.target.value })
                  }
                >
                  {areas.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.area}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Asignar a</InputLabel>
                <Select
                  multiple
                  value={newTask.assigned_to}
                  onChange={(e) =>
                    setNewTask({ ...newTask, assigned_to: e.target.value })
                  }
                  renderValue={(selected) =>
                    selected
                      .map((id) => {
                        const u = warehouseUsers.find((user) => user.id === id);
                        return u ? `${u.first_name} ${u.last_name}` : "";
                      })
                      .join(", ")
                  }
                >
                  {warehouseUsers.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      <Checkbox
                        checked={newTask.assigned_to.includes(user.id)}
                      />
                      <ListItemText
                        primary={`${user.first_name} ${user.last_name}`}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCreateTask}
                >
                  Crear tarea
                </Button>
              </Box>
            </Box>
          </Modal>
        </TabPanel>
        <TabPanel value="2">
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Calendario Anual
            </Typography>

            {/* CONTROLES DE AÑO */}
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              gap={2}
              my={2}
            >
              <Button
                variant="outlined"
                onClick={goToPrevYear}
                startIcon={<ChevronLeftIcon />}
              ></Button>

              <Typography variant="h5" fontWeight="bold">
                {year}
              </Typography>

              <Button
                variant="outlined"
                onClick={goToNextYear}
                startIcon={<ChevronRightIcon />}
              ></Button>

              <Button variant="contained" onClick={goToCurrentYear}>
                Hoy
              </Button>
            </Box>

            {/* CUADRÍCULA DE 12 MESES */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 3,
              }}
            >
              {[...Array(12).keys()].map((month) => {
                const days = generateMonth(year, month);

                return (
                  <Box
                    key={month}
                    sx={{
                      border: "1px solid #ddd",
                      borderRadius: 2,
                      p: 2,
                      // background: "#fff",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        mb: 1,
                        fontWeight: "bold",
                        color: "#1976d2",
                        textTransform: "capitalize",
                      }}
                    >
                      {new Date(year, month).toLocaleString("es-MX", {
                        month: "long",
                      })}
                    </Typography>

                    {/* Encabezados */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        textAlign: "center",
                        fontWeight: "bold",
                        color: "#666",
                        mb: 1,
                      }}
                    >
                      {["L", "M", "MI", "J", "V", "S", "D"].map((d) => (
                        <div key={d}>{d}</div>
                      ))}
                    </Box>

                    {/* DÍAS */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        textAlign: "center",
                        rowGap: 1,
                      }}
                    >
                      {days.map((day, i) => {
                        if (!day) return <div key={i}></div>;

                        const dateStr = day.toISOString().split("T")[0];
                        const hasEvents = getEventsForDate(dateStr).length > 0;

                        return (
                          <Box
                            key={dateStr}
                            onClick={() => handleAnnualDayClick(day)}
                            sx={{
                              cursor: "pointer",
                              position: "relative",
                              p: 1,
                              borderRadius: "50%",
                              "&:hover": {
                                background: "#e3f2fd",
                              },
                            }}
                          >
                            {day.getDate()}

                            {hasEvents && (
                              <Box
                                sx={{
                                  width: 6,
                                  height: 6,
                                  bgcolor: "#1976d2",
                                  borderRadius: "50%",
                                  position: "absolute",
                                  bottom: 3,
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                }}
                              ></Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* PANEL LATERAL */}
            {annualSelectedDay && (
              <Box
                sx={{
                  position: "fixed",
                  right: 20,
                  top: 100,
                  width: 320,
                  bgcolor: "#DBDBDB",
                  boxShadow: 4,
                  borderRadius: 3,
                  p: 2,
                  maxHeight: "70vh",
                  overflowY: "auto",
                  zIndex: 999,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={closeAnnualPanel}
                    sx={{ minWidth: "unset", color: "#666" }}
                  >
                    ❌
                  </Button>
                </Box>

                <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
                  Auditorías del {annualSelectedDay}
                </Typography>

                {annualDayEvents.length === 0 ? (
                  <Typography sx={{ color: "#888" }}>Sin auditorías</Typography>
                ) : (
                  annualDayEvents.map((ev) => (
                    <Box
                      key={ev.id}
                      onClick={() => openAuditDetail(ev.id)}
                      sx={{
                        p: 1,
                        borderBottom: "1px solid #ddd",
                        mb: 1,
                        cursor: "pointer",
                        "&:hover": { bgcolor: "#f5f5f5" },
                      }}
                    >
                      <Typography sx={{ fontWeight: "bold" }}>
                        {ev.title}
                      </Typography>

                      <Typography variant="body2">
                        Estado:{" "}
                        <span style={{ color: ev.backgroundColor }}>
                          {ev.backgroundColor === "#4caf50"
                            ? "Completada"
                            : ev.backgroundColor === "#ffb300"
                            ? "En progreso"
                            : "Pendiente"}
                        </span>
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            )}
          </Box>
        </TabPanel>
      </TabContext>

      {/* {isWarehouseUser && ( */}
      <Accordion defaultExpanded>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3-content"
          id="panel3-header"
        >
          <Typography component="span">
            <strong>Auditorias pendientes</strong>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "grid", gap: 2 }}>
            {pendingThisMonth.length === 0 ? (
              <Typography color="text.secondary">
                No hay auditorías pendientes
              </Typography>
            ) : (
              pendingThisMonth.map((aud) => (
                <Card key={aud.id} variant="outlined">
                  <CardContent
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1">
                        <strong>{aud.folio}</strong> — {aud.task} -{" "}
                        <strong>En fecha: {aud.scheduled_date}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Área: {aud.area?.area || "N/A"}
                      </Typography>
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ mb: 2, fontWeight: "bold" }}
                      >
                        Asignado a:{" "}
                        {(aud.assigned_to_details || [])
                          .map((u) => `${u.first_name} ${u.last_name}`)
                          .join(", ") || "Sin asignar"}
                      </Typography>

                      <Typography variant="caption" display="block">
                        <strong>Estado:</strong>{" "}
                        <span
                          style={{
                            color:
                              aud.status === "DONE"
                                ? "#4caf50"
                                : aud.status === "IN_PROGRESS"
                                ? "#ffb300"
                                : "#3688f4ff",
                          }}
                        >
                          {aud.status}
                        </span>
                      </Typography>
                    </Box>

                    <Box>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ mr: 1 }}
                        onClick={() => {
                          setSelectedAuditory(aud);
                          setDialogOpenAuditory(true);
                        }}
                      >
                        Ver detalles
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
      {/* )} */}

      {/* DIALOG: Detalle de auditoría y formulario */}
      <Modal
        open={dialogOpenAuditory}
        onClose={() => {
          setDialogOpenAuditory(false);
          setSelectedAuditory(null);
        }}
      >
        <Box sx={modalStyle}>
          {selectedAuditory ? (
            <>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
                {selectedAuditory.folio} — {selectedAuditory.task}
              </Typography>

              <Typography
                variant="caption"
                display="block"
                sx={{ mb: 1, fontWeight: "bold" }}
              >
                Área: {selectedAuditory.area?.area || "N/A"}
              </Typography>

              <Typography
                variant="caption"
                display="block"
                sx={{ mb: 2, fontWeight: "bold" }}
              >
                Asignado a:{" "}
                {(selectedAuditory.assigned_to_details || [])
                  .map((u) => `${u.first_name} ${u.last_name}`)
                  .join(", ") || "Sin asignar"}
              </Typography>

              <TextField
                label="Descripción de la tarea"
                multiline
                disabled
                rows={5}
                fullWidth
                sx={{ mb: 2 }}
                value={selectedAuditory.description}
              ></TextField>

              {selectedAuditory.status === "IN_PROGRESS" && (
                <>
                  {/* Campos a completar por warehouse */}
                  <TextField
                    label="Comentario de la auditoria"
                    multiline
                    rows={3}
                    fullWidth
                    sx={{ mb: 2 }}
                    value={selectedAuditory.comments || ""}
                    onChange={(e) => {
                      setSelectedAuditory({
                        ...selectedAuditory,
                        comments: e.target.value,
                      });
                    }}
                  />

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="action-label">Defectos</InputLabel>
                    <Select
                      labelId="action-label"
                      value={selectedAuditory.action || "N/A"}
                      label="Action"
                      onChange={(e) => {
                        setSelectedAuditory({
                          ...selectedAuditory,
                          action: e.target.value,
                        });
                      }}
                    >
                      {actionOptions.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Subir Evidencia (foto)
                    </Typography>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setEvidenceFile(Array.from(e.target.files))
                      }
                    />
                    {selectedAuditory.evidence && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          Evidencia existente:
                        </Typography>
                        <img
                          src={`http://localhost:8000${selectedAuditory.evidence}`}
                          style={{
                            width: "100%",
                            maxHeight: 200,
                            objectFit: "cover",
                            marginTop: 8,
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </>
              )}

              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setDialogOpenAuditory(false);
                    setSelectedAuditory(null);
                  }}
                >
                  Cerrar
                </Button>

                {/* Si está IN_PROGRESS mostrar botón Terminar, habilitado solo si comments tiene texto */}
                {selectedAuditory.status === "IN_PROGRESS"
                  ? isWarehouseUser && (
                      <Button
                        variant="contained"
                        color="success"
                        disabled={
                          !selectedAuditory.comments ||
                          selectedAuditory.comments.trim() === ""
                        }
                        onClick={() => setFinishConfirmOpen(true)}
                      >
                        Terminar
                      </Button>
                    )
                  : // Si está PENDING, mostramos botón TOMAR también aquí (opcional)
                    selectedAuditory.status === "PENDING" &&
                    isWarehouseUser && (
                      <Button
                        variant="contained"
                        onClick={async () => {
                          try {
                            await api.post(
                              `/auditories/${selectedAuditory.id}/take/`
                            );
                            await fetchAuditories();
                            await fetchPendingAuditories();
                            // refrescar selectedAuditory status
                            setSelectedAuditory({
                              ...selectedAuditory,
                              status: "IN_PROGRESS",
                            });
                          } catch (err) {
                            console.error("Error al tomar auditoría:", err);
                          }
                        }}
                      >
                        TOMAR
                      </Button>
                    )}
              </Box>

              {/* DIALOG confirmación de terminar */}
              <Modal
                open={finishConfirmOpen}
                onClose={() => setFinishConfirmOpen(false)}
              >
                <Box sx={{ ...modalStyle, width: 360 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Confirmar terminación
                  </Typography>
                  <Typography sx={{ mb: 2 }}>
                    ¿Estás seguro de que deseas finalizar esta auditoría?
                  </Typography>

                  <Box
                    sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}
                  >
                    <Button onClick={() => setFinishConfirmOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={async () => {
                        try {
                          // 1) Guardar evidencias si existen
                          await handleSaveEvidence();

                          // 2) PATCH de comments, action, etc.
                          const fd = new FormData();
                          fd.append(
                            "comments",
                            selectedAuditory.comments || ""
                          );

                          if (selectedAuditory.action) {
                            fd.append("action", selectedAuditory.action);
                          }

                          // Regla: si action !== "N/A" NO permitir action_evidence
                          if (selectedAuditory.action === "N/A") {
                            if (actionEvidenceFile) {
                              fd.append("action_evidence", actionEvidenceFile);
                            }
                          }

                          // await api.patch(
                          //   `/auditories/${selectedAuditory.id}/`,
                          //   fd,
                          //   {
                          //     headers: {
                          //       "Content-Type": "multipart/form-data",
                          //     },
                          //   }
                          // );

                          // 3) Acción custom para marcar como DONE
                          // await api.post(
                          //   `/auditories/${selectedAuditory.id}/mark_done/`
                          // );
                          await api.post(
                            `/auditories/${selectedAuditory.id}/finish/`,
                            {
                              comments: selectedAuditory.comments,
                              action: selectedAuditory.action,
                            }
                          );

                          // 4) Refrescar listados
                          await fetchAuditories();
                          await fetchPendingAuditories();

                          setFinishConfirmOpen(false);
                          setDialogOpenAuditory(false);
                          setSelectedAuditory(null);

                          setFeedback({
                            open: true,
                            message: "Auditoría finalizada",
                            severity: "success",
                          });
                        } catch (err) {
                          console.error("Error finalizando auditoría:", err);
                          setFeedback({
                            open: true,
                            message: "Error al finalizar",
                            severity: "error",
                          });
                        }
                      }}
                    >
                      Confirmar
                    </Button>
                  </Box>
                </Box>
              </Modal>
            </>
          ) : (
            <Typography>Cargando...</Typography>
          )}
        </Box>
      </Modal>

      <Dialog
        open={auditDetailDialogOpen}
        onClose={() => setAuditDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Detalles de Auditoría</DialogTitle>

        <DialogContent dividers>
          {selectedAuditDetail ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* FOLIO */}
              <Typography variant="h6">
                <strong>{selectedAuditDetail.folio}</strong> - Fecha:{" "}
                {selectedAuditDetail.scheduled_date}
              </Typography>

              {/* TAREA */}
              <Typography>
                <strong>Tarea:</strong> {selectedAuditDetail.task}
              </Typography>
              {/* ÁREA */}
              <Typography>
                <strong>Área:</strong> {selectedAuditDetail.area?.area || "N/A"}
              </Typography>
              <Typography>
                <strong>Descripción:</strong>
              </Typography>
              <TextField
                disabled
                multiline
                rows={4}
                value={selectedAuditDetail.description || "N/A"}
              ></TextField>
              {/* COMENTARIOS */}
              <Typography>
                <strong>Comentarios:</strong>{" "}
              </Typography>
              <TextField
                disabled
                multiline
                rows={4}
                value={selectedAuditDetail.comments || "N/A"}
              ></TextField>

              <Typography>
                <strong>Estado:</strong>{" "}
                <span
                  style={{
                    color:
                      selectedAuditDetail.status === "DONE"
                        ? "#4caf50"
                        : selectedAuditDetail.status === "IN_PROGRESS"
                        ? "#ffb300"
                        : "#3688f4ff",
                  }}
                >
                  {selectedAuditDetail.status}
                </span>
              </Typography>

              {/* 📌 EVIDENCIA SOLO SI STATUS = DONE */}
              {/* {selectedAuditDetail.status === "DONE" && (
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, fontWeight: "bold" }}
                  >
                    Evidencias:
                  </Typography>

                  {selectedAuditDetail.evidences && (
                    <img
                      src={selectedAuditDetail.evidences}
                      alt="evidencia"
                      style={{
                        width: "100%",
                        maxWidth: "280px",
                        borderRadius: "8px",
                        marginBottom: "12px",
                      }}
                    />
                  )}
                </Box>
              )} */}
              {selectedAuditDetail.status === "DONE" && (
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, fontWeight: "bold" }}
                  >
                    Evidencias:
                  </Typography>

                  {selectedAuditDetail.evidences &&
                  selectedAuditDetail.evidences.length > 0 ? (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                      {selectedAuditDetail.evidences.map((ev) => (
                        <img
                          key={ev.id}
                          src={ev.image}
                          alt="evidencia"
                          style={{
                            width: "100%",
                            maxWidth: "280px",
                            borderRadius: "8px",
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography color="text.secondary">
                      No hay evidencias
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          ) : (
            <Typography>Cargando...</Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setAuditDetailDialogOpen(false)}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
}
