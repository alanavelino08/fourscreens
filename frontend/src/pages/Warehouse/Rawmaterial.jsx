import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import api from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import { DataGrid } from "@mui/x-data-grid";

const RawMaterial = () => {
  const [storage, setStorage] = useState("");
  const [zona, setZona] = useState("");
  const [area, setArea] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [scan, setScan] = useState("");
  const [manualPartCode, setManualPartCode] = useState("");
  const [manualBatch, setManualBatch] = useState("");
  const [manualQty, setManualQty] = useState("");

  const handleAddManual = () => {
    console.log("Agregar manualmente:", {
      manualPartCode,
      manualBatch,
      manualQty,
    });
  };

  const handleScanInput = (e) => {
    setScan(e.target.value);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        <strong>Capturar RAW material</strong>
      </Typography>

      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: 2,
          mb: 4,
          width: "80%",
          mx: "auto",
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <SettingsIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Definir preferencias
          </Typography>
        </Box>

        {/* Filtros */}
        <Grid container spacing={2}>
          <Grid item>
            <FormControl required sx={{ minWidth: 180 }}>
              <InputLabel>Área OPS</InputLabel>
              <Select
                value={area}
                label="Área OPS"
                onChange={(e) => setArea(e.target.value)}
              >
                <MenuItem value="Backend">Backend</MenuItem>
                <MenuItem value="SMT">SMT</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item>
            <FormControl required sx={{ minWidth: 180 }}>
              <InputLabel>Zona</InputLabel>
              <Select
                value={zona}
                label="Zona"
                onChange={(e) => setZona(e.target.value)}
              >
                <MenuItem value="Rack1">Rack 1</MenuItem>
                <MenuItem value="Rack2">Rack 2</MenuItem>
                <MenuItem value="Rack3">Rack 3</MenuItem>
                <MenuItem value="Rack4">Rack 4</MenuItem>
                <MenuItem value="Rack5">Rack 5</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item>
            <FormControl required sx={{ minWidth: 180 }}>
              <InputLabel>Ubicación</InputLabel>
              <Select
                value={storage}
                label="Storage"
                onChange={(e) => setStorage(e.target.value)}
              >
                <MenuItem value="PTV">00001</MenuItem>
                <MenuItem value="Ten">00002</MenuItem>
                <MenuItem value="Twenty">00003</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Botón */}
        <Box mt={3}>
          <Button
            variant="contained"
            color="success"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Guardar preferencias
          </Button>
        </Box>
      </Paper>

      <Paper
        elevation={2}
        sx={{
          p: 3,
          borderRadius: 2,
          width: "80%",
          mx: "auto",
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Typography variant="h6" fontWeight="bold">
            Escaneo de material
          </Typography>
        </Box>

        {/* Checkbox modo manual */}
        <FormControlLabel
          control={
            <Checkbox
              checked={manualMode}
              onChange={(e) => setManualMode(e.target.checked)}
            />
          }
          label="Ingresar manualmente"
        />

        {/* Inputs dinámicos */}
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
      </Paper>
    </Box>
  );
};

export default RawMaterial;
