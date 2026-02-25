import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import theme from './theme';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ViewFeedbackPage from './pages/ViewFeedbackPage';
import GameCrud from './pages/GameCrud';
import PlayerTeamCrud from './pages/PlayerTeamCrud';
import StatTrackerPage from './pages/statTrackerPage';
import StatRoleAssignPage from "./pages/statRoleAssignPage";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/feedback" element={<ViewFeedbackPage />} />
          <Route path="/gamecrud" element={<GameCrud />} />
          <Route path="/playerteamcrud" element={<PlayerTeamCrud />} />
          <Route path="/stattracker" element={<StatTrackerPage />} />
          <Route path="/assign-roles" element={<StatRoleAssignPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
