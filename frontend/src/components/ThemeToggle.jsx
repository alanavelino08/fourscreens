import { Box, Radio, RadioGroup, FormControlLabel, FormLabel, FormControl } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';

export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme();

  //if (!mode) return null;

  return (
    <Box sx={{ p: 2 }}>
      <FormControl>
        <FormLabel id="theme-toggle-label">Tema</FormLabel>
        <RadioGroup
          row
          aria-labelledby="theme-toggle-label"
          name="theme"
          //value={mode}
          value={mode || 'light'}
          onChange={(e) => setMode(e.target.value)}
        >
          <FormControlLabel value="light" control={<Radio />} label="Claro" />
          <FormControlLabel value="dark" control={<Radio />} label="Oscuro" />
          <FormControlLabel value="system" control={<Radio />} label="Sistema" />
        </RadioGroup>
      </FormControl>
    </Box>
  );
}
