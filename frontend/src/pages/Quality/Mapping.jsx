import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { useState } from "react";

const steps = [
  "Verificación de Documentación",
  "Chequeo de Material",
  "Liberado",
];

export default function PartFlowStepper() {
  const [partNumber, setPartNumber] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [coneColor, setConeColor] = useState(null);
  const [started, setStarted] = useState(false);

  const [openValidationDialog, setOpenValidationDialog] = useState(false);
  const [openCommentDialog, setOpenCommentDialog] = useState(false);
  const [comment] = useState("");

  const handleScan = () => {
    if (!partNumber.trim()) return;
    setConeColor("WHITE");
    setStarted(true);
  };

  const handleValidate = () => {
    setOpenValidationDialog(true);
  };

  const handleContinue = () => {
    setOpenValidationDialog(false);
    if (currentStep === 0) {
      setConeColor("YELLOW");
      setCurrentStep(1);
    } else if (currentStep === 1) {
      setConeColor("GREEN");
      setCurrentStep(2);
    }
  };

  const handleFaltaInfo = () => {
    setOpenValidationDialog(false);
    setOpenCommentDialog(true);
  };

  const handleCommentSubmit = () => {
    if (currentStep === 0) {
      setConeColor("BLACK");
    } else if (currentStep === 1) {
      setConeColor("RED");
    }
    setOpenCommentDialog(false);
    console.log(`Comentario registrado: ${comment}`);
    ("");
  };

  const reset = () => {
    setPartNumber("");
    setCurrentStep(0);
    setConeColor(null);
    setStarted(false);
    ("");
  };

  return (
    <Box sx={{ p: 4 }}>
      {!started ? (
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Número de Parte"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
          />
          <Button variant="contained" onClick={handleScan}>
            Escanear
          </Button>
        </Box>
      ) : (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Parte: {partNumber} | Cono: {coneColor}
          </Typography>

          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
            {coneColor !== "GREEN" && coneColor !== "RED" && (
              <Button variant="contained" onClick={handleValidate}>
                {currentStep === 0
                  ? "Validar Documentación"
                  : "Validar Material"}
              </Button>
            )}
            <Button variant="outlined" color="secondary" onClick={reset}>
              Reiniciar
            </Button>
          </Box>
        </>
      )}

      {/* Diálogo Validación */}
      <Dialog
        open={openValidationDialog}
        onClose={() => setOpenValidationDialog(false)}
      >
        <DialogTitle>
          {currentStep === 0
            ? "¿La documentación está correcta?"
            : "¿El material está correcto?"}
        </DialogTitle>
        <DialogActions>
          <Button onClick={handleFaltaInfo} color="warning">
            Falta información
          </Button>
          <Button onClick={handleContinue} variant="contained">
            Continuar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo Comentario */}
      <Dialog
        open={openCommentDialog}
        onClose={() => setOpenCommentDialog(false)}
      >
        <DialogTitle>Selecciona el motivo</DialogTitle>
        <DialogContent>
          {/* <TextField
            autoFocus
            multiline
            fullWidth
            rows={4}
            label="Comentario"
            value={comment}
            onChange={(e) => (e.target.value)}
          /> */}
          <RadioGroup
            aria-labelledby="demo-radio-buttons-group-label"
            defaultValue="female"
            name="radio-buttons-group"
          >
            <FormControlLabel
              value="female"
              control={<Radio />}
              label="Faltante de PO"
            />
            <FormControlLabel
              value="male"
              control={<Radio />}
              label="Cantidad diferente"
            />
            <FormControlLabel
              value="male"
              control={<Radio />}
              label="Fecha adelantada"
            />
            <FormControlLabel
              value="male"
              control={<Radio />}
              label="Fecha atrasada"
            />
            <FormControlLabel
              value="male"
              control={<Radio />}
              label="Factura incompleta"
            />
            <FormControlLabel value="Other" control={<Radio />} label="Other" />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCommentDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCommentSubmit}
            disabled={!comment.trim()}
          >
            Enviar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
