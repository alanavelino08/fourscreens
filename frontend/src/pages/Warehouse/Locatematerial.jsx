import { useEffect, useState, useRef } from "react";
import {
  TextField,
  Button,
  Snackbar,
  Alert,
  Box,
  Divider,
  Typography,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  List,
  ListItem,
  ListItemText,
  IconButton,
  DialogActions,
  Tooltip,
} from "@mui/material";
import api from "../../services/api";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import CircleIcon from "@mui/icons-material/Circle";

//color para identificar espacio en las location
const getColor = (pallets, qty) => {
  if (pallets >= 4 || qty >= 72) return "#ff4d4f";
  if (pallets > 0 || qty > 0) return "#faad14";
  return "#52c41a";
};

const ScanPallet = () => {
  //Apartado de registrar material en ubicacion disponible
  const [scan, setScan] = useState("");
  const [location, setLocation] = useState("");
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const locationInputRef = useRef(null);
  const scanInputRef = useRef(null);

  const handleClose = () => setFeedback({ ...feedback, open: false });

  //Para input con escaneo
  let scanTimeout = null;

  const scanBufferRef = useRef("");

  const handleScanInput = (e) => {
    scanBufferRef.current += e.nativeEvent.data || "";

    if (scanTimeout) {
      clearTimeout(scanTimeout);
    }

    scanTimeout = setTimeout(() => {
      const finalScan = scanBufferRef.current.trim();
      setScan(finalScan);
      scanBufferRef.current = "";

      console.log("Escaneo de material:", finalScan);

      locationInputRef.current?.focus();
    }, 100);
  };

  //Input de busqueda
  const searchBufferRef = useRef("");
  let searchTimeout = null;

  const handleSearchInput = (e) => {
    searchBufferRef.current += e.nativeEvent.data || "";

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    searchTimeout = setTimeout(() => {
      const finalSearch = searchBufferRef.current.trim();
      searchBufferRef.current = "";
      console.log("Escaneo de material:", finalSearch);
      setSearchPart(finalSearch);
      handleSearch(finalSearch); // ⬅️ Pasamos el valor capturado directamente
    }, 100); // ajusta el tiempo si hace falta
  };

  const handleSubmit = async () => {
    if (!scan || !location) {
      setFeedback({
        open: true,
        message: "Debes escanear el código QR y/o dar ubicación",
        severity: "warning",
      });
      return;
    }

    try {
      const response = await api.post("/scan-pallet/", { scan, location });
      const { message, location: loc } = response.data;

      setFeedback({
        open: true,
        message: `${message} en ubicación ${loc.rack}-${loc.code_location} (${loc.pallet_count} pallets / ${loc.total_quantity} unidades)`,
        severity: "success",
      });

      setScan("");
      setLocation("");
      await fetchLocations();
    } catch (error) {
      setFeedback({
        open: true,
        message:
          error.response?.data?.error || "Error al registrar el material",
        severity: "error",
      });
      setScan("");
      setLocation("");
      await fetchLocations();
    }
  };

  // Apartado de ver las locations
  const [locations, setLocations] = useState([]);
  const [searchPart, setSearchPart] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [filteredPallets, setFilteredPallets] = useState(null);
  const [searchedPartNumber, setSearchedPartNumber] = useState("");

  useEffect(() => {
    api
      .get("/location-status/")
      .then((res) => setLocations(res.data))
      .catch((err) => console.error("Error al cargar ubicaciones", err));
  }, []);

  const extractPartNumberFromScan = (scanStr) => {
    if (!scanStr) return "";

    const match = scanStr.match(/\((\d{5})"/);
    if (match) {
      return match[1];
    }

    const altMatch = scanStr.match(/^([A-Z0-9]+)\D/);
    if (altMatch) {
      return altMatch[1];
    }

    return scanStr;
  };

  // const handleSearch = () => {
  //   if (!searchPart.trim()) return;

  //   const partToFind = extractPartNumberFromScan(searchPart.trim());

  //   const result = locations.find((loc) =>
  //     loc.pallets?.some((p) => p.part_number.includes(partToFind))
  //   );

  //   if (result) {
  //     setSearchResult(result);
  //     setSelectedLocation(result);
  //     setSearchedPartNumber(partToFind);
  //     setSearchPart("");
  //     setFilteredPallets(
  //       result.pallets.filter((p) => p.part_number.includes(partToFind))
  //     );
  //     setDialogOpen(true);
  //     setNotFound(false);
  //   } else {
  //     setSearchResult(null);
  //     setFilteredPallets(null);
  //     setSearchPart("");
  //     setDialogOpen(false);
  //     setNotFound(true);
  //   }
  // };
  const handleSearch = (value = searchPart) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const partToFind = extractPartNumberFromScan(trimmed);

    const result = locations.find((loc) =>
      loc.pallets?.some((p) => p.part_number.includes(partToFind))
    );

    if (result) {
      setSearchResult(result);
      setSelectedLocation(result);
      setSearchedPartNumber(partToFind);
      setSearchPart("");
      setFilteredPallets(
        result.pallets.filter((p) => p.part_number.includes(partToFind))
      );
      setDialogOpen(true);
      setNotFound(false);
    } else {
      setSearchResult(null);
      setFilteredPallets(null);
      setSearchPart("");
      setDialogOpen(false);
      setNotFound(true);
    }
  };

  //Detalles - Location
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
    setFilteredPallets(null);
    setDialogOpen(true);
  };

  //Sacar material

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [palletToDelete, setPalletToDelete] = useState(null);

  const handleDeletePallet = (palletId) => {
    setPalletToDelete(palletId);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/pallets/${palletToDelete}/`);
      setPalletToDelete(null);
      setFeedback({
        open: true,
        message: "Material retirado exitosamente",
        severity: "success",
      });
      setConfirmOpen(false);
      fetchLocations();
    } catch (err) {
      console.error("Error al retirar material", err);
      setFeedback({
        open: true,
        message: "No se pudo eliminar el pallet",
        severity: "error",
      });
    }
  };

  //Reload
  const fetchLocations = async () => {
    try {
      const response = await api.get("/location-status/"); // Ajusta a tu endpoint real
      setLocations(response.data);
    } catch (err) {
      console.error("Error al cargar ubicaciones:", err);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  //update cantidad
  const [quantityMap, setQuantityMap] = useState({});
  const handleUpdateQuantity = async (palletId) => {
    const newQty = quantityMap[palletId];
    try {
      await api.patch(`/update-pallet/${palletId}/`, { quantity: newQty });
      setFeedback({
        open: true,
        message: "Cantidad actualizada correctamente",
        severity: "success",
      });
      await fetchLocations();
    } catch (error) {
      setFeedback({
        open: true,
        message: error.response?.data?.error || "Error al actualizar cantidad",
        severity: "error",
      });
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        maxWidth: 600,
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography variant="h4" gutterBottom>
        Producto Terminado
      </Typography>

      {/* <TextField
        label="Escanea QR"
        variant="outlined"
        value={scan}
        // onChange={(e) => setScan(e.target.value)}
        onChange={(e) => {
          console.log("onChange SCAN:", e.target.value);
          setScan(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            locationInputRef.current?.focus();
          }
        }}
        fullWidth
      /> */}
      <TextField
        label="Escanea QR"
        variant="outlined"
        value={scan}
        onInput={handleScanInput}
        fullWidth
      />
      <TextField
        label="Escanea ubicación"
        variant="outlined"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        inputRef={locationInputRef}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
            scanInputRef.current?.focus();
          }
        }}
        fullWidth
      />

      <Divider></Divider>
      <Box>
        {/* Paleta colores */}
        <Grid container sx={{ justifyContent: "center" }}>
          <Grid container spacing={3} columns={4}>
            <Tooltip title="Disponible" placement="bottom-start">
              <CircleIcon sx={{ color: "#52c41a" }} />
            </Tooltip>
            <Tooltip title="Ocupado pero disponible" placement="bottom">
              <CircleIcon sx={{ color: "#faad14" }} />
            </Tooltip>
            <Tooltip title="Lleno" placement="bottom-end">
              <CircleIcon sx={{ color: "#ff4d4f" }} />
            </Tooltip>
          </Grid>
        </Grid>
        <Grid container justifyContent="center">
          <Grid item>
            <Typography
              variant="h7"
              gutterBottom
              sx={{ justifyContent: "center" }}
            >
              Consultar paleta de colores
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ my: 5, display: "flex", gap: 2 }}>
          {/* <TextField
            label="Buscar por número de parte"
            variant="outlined"
            fullWidth
            value={searchPart}
            onChange={(e) => setSearchPart(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          /> */}
          <TextField
            label="Buscar por número de parte"
            variant="outlined"
            fullWidth
            value={searchPart}
            onInput={handleSearchInput}
          />
        </Box>

        {/* {searchResult && (
          <Alert
            severity="success"
            sx={{ mb: 2, cursor: "pointer" }}
            onClick={() => {
              setSelectedLocation(searchResult);
              setDialogOpen(true);
            }}
          >
            Parte <strong>{searchedPartNumber}</strong> encontrada en:{" "}
            <strong>{searchResult.code_location}</strong> ({searchResult.rack})
            — Haz clic para ver los pallets.
          </Alert>
        )} */}
        {searchResult && (
          <Alert
            severity="success"
            sx={{ mb: 2, cursor: "pointer" }}
            onClick={() => {
              setSelectedLocation(searchResult);
              setDialogOpen(true);
            }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchResult(null);
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            Parte <strong>{searchedPartNumber}</strong> encontrada en:{" "}
            <strong>{searchResult.code_location}</strong> ({searchResult.rack})
            — Haz clic para ver los pallets.
          </Alert>
        )}

        {notFound && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setNotFound(false)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            No se encontró la parte en ninguna ubicación.
          </Alert>
        )}

        {/* {notFound && (
          <Alert severity="error" sx={{ mb: 2 }}>
            No se encontró la parte en ninguna ubicación.
          </Alert>
        )} */}

        <Grid container spacing={3} columns={4}>
          {locations.map((loc, index) => (
            <Grid key={index}>
              <Paper
                onClick={() => handleLocationClick(loc)}
                elevation={3}
                sx={{
                  p: 2,
                  textAlign: "center",
                  backgroundColor: getColor(
                    loc.pallet_count,
                    loc.total_quantity
                  ),
                  color: "#fff",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "0.2s",
                  "&:hover": {
                    transform: "scale(1.03)",
                  },
                }}
              >
                {loc.code_location}
                <Typography variant="body2">{loc.pallet_count} N/P</Typography>
                <Typography variant="body2">
                  {loc.total_quantity} piezas
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Ubicación: <strong>{selectedLocation?.rack}</strong> -
            <strong>{selectedLocation?.code_location}</strong>
            <IconButton
              aria-label="close"
              onClick={() => setDialogOpen(false)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {(filteredPallets || selectedLocation?.pallets)?.length > 0 ? (
              <List>
                {(filteredPallets || selectedLocation.pallets).map((p, idx) => (
                  <ListItem
                    key={idx}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeletePallet(p.id)}
                      >
                        <DeleteIcon sx={{ color: "#f44336" }} />
                      </IconButton>
                    }
                  >
                    <>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong>Cantidad:</strong>
                        <TextField
                          type="number"
                          size="small"
                          sx={{ width: 100 }}
                          value={quantityMap[p.id] ?? p.quantity}
                          onChange={(e) =>
                            setQuantityMap((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleUpdateQuantity(p.id)}
                          disabled={Number(quantityMap[p.id]) === p.quantity}
                        >
                          actualizar
                        </Button>
                      </Box>
                    </>
                    <ListItemText
                      primary={`${p.part_number} - ${p.project}`}
                      secondary={` Man Part-N°: ${
                        p.mfg_part_number
                      } | Box ID: ${p.box_id} | Ingresado el: ${new Date(
                        p.timestamp
                      ).toLocaleString()} | Ingresado por: ${
                        p.user?.first_name
                      } ${p.user?.last_name}`}
                    />
                    <Divider></Divider>
                  </ListItem>
                ))}
              </List>
            ) : (
              <DialogContentText>
                No hay material en esta ubicación.
              </DialogContentText>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>¿Quieres sacar material de esta ubicación?</DialogTitle>
          <DialogContent>
            <DialogContentText>¿Deseas continuar?</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              Sacar material
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

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

export default ScanPallet;
