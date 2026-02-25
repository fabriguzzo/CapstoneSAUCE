import { createTheme } from '@mui/material/styles';

/**
 * Custom theme for CapstoneSAUCE
 * Color palette based on team branding requirements (NFR1)
 */
const theme = createTheme({
  palette: {
    primary: {
      main: '#005F02',
      light: '#427A43',
      contrastText: '#fff2d1',
    },
    secondary: {
      main: '#C0B87A',
      contrastText: '#005F02',
    },
    background: {
      default: '#fff2d1',
      paper: '#ffffff',
    },
    text: {
      primary: '#005F02',
      secondary: '#427A43',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      color: '#fff2d1',
      fontWeight: 600,
    },
    h2: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      color: '#fff2d1',
      fontWeight: 600,
    },
    h3: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      color: '#fff2d1',
      fontWeight: 500,
    },
    h4: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      color: '#fff2d1',
      fontWeight: 400,
    },
    body1: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      color: '#fff2d1',
    },
    body2: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      color: '#fff2d1',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#005F02',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
