import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import AboutPage from './pages/AboutPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AboutPage />
    </ThemeProvider>
  );
}

export default App;
