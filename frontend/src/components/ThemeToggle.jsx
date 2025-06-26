// import { Box, Radio, RadioGroup, FormControlLabel, FormLabel, FormControl } from '@mui/material';
// import { useColorScheme } from '@mui/material/styles';

// export default function ThemeToggle() {
//   const { mode, setMode } = useColorScheme();

//   return (
//     <Box sx={{ p: 2 }}>
//       <FormControl>
//         <FormLabel id="theme-toggle-label">Tema</FormLabel>
//         <RadioGroup
//           row
//           aria-labelledby="theme-toggle-label"
//           name="theme"
//           //value={mode}
//           value={mode || 'light'}
//           onChange={(e) => setMode(e.target.value)}
//         >
//           <FormControlLabel value="light" control={<Radio />} label="Claro" />
//           <FormControlLabel value="dark" control={<Radio />} label="Oscuro" />
//           <FormControlLabel value="system" control={<Radio />} label="Sistema" />
//         </RadioGroup>
//       </FormControl>
//     </Box>
//   );
// }
import { Box, FormControlLabel, FormLabel, FormControl, Switch } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';

export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme();

  const isDark = mode === 'dark';

  const handleChange = (event) => {
    setMode(event.target.checked ? 'dark' : 'light');
  };

  return (
    <Box sx={{ p: 2 }}>
      <FormControl component="fieldset">
        <FormLabel component="legend">Tema</FormLabel>
        <FormControlLabel
          control={
            <Switch
              checked={isDark}
              onChange={handleChange}
              name="themeSwitch"
              color="primary"
            />
          }
          label={isDark ? 'Oscuro' : 'Claro'}
        />
      </FormControl>
    </Box>
  );
}
