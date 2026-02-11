import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import theme from './theme';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import GameCrud from './pages/GameCrud';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/gamecrud" element={<GameCrud />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
