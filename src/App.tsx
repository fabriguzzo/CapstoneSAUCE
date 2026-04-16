import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ViewFeedbackPage from './pages/ViewFeedbackPage';
import GameCrud from './pages/GameCrud';
import PlayerTeamCrud from './pages/PlayerTeamCrud';
import StatTrackerPage from './pages/statTrackerPage';
import GameHistory from './pages/GameHistory';
import GameStats from './pages/GameStats';
import OpponentOverview from './pages/OpponentOverview';
import StatRoleAssignPage from "./pages/statRoleAssignPage";
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import ApproveProfilePage from './pages/ApproveProfilePage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/feedback" element={<ViewFeedbackPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/profile" element={<ProtectedRoute requireApproved={false}><ProfilePage /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute requireApproved={false}><EditProfilePage /></ProtectedRoute>} />
            <Route path="/gamecrud" element={<ProtectedRoute requiredRole="coach"><GameCrud /></ProtectedRoute>} />
            <Route path="/playerteamcrud" element={<ProtectedRoute requiredRole="coach"><PlayerTeamCrud /></ProtectedRoute>} />
            <Route path="/stattracker" element={<ProtectedRoute><StatTrackerPage /></ProtectedRoute>} />
            <Route path="/gamehistory" element={<ProtectedRoute><GameHistory /></ProtectedRoute>} />
            <Route path="/gamestats/:gameId" element={<ProtectedRoute><GameStats /></ProtectedRoute>} />
            <Route path="/gamestats/:gameId/live" element={<ProtectedRoute><GameStats /></ProtectedRoute>} />
            <Route path="/opponent-overview" element={<ProtectedRoute><OpponentOverview /></ProtectedRoute>} />
            <Route path="/assign-roles" element={<ProtectedRoute requiredRole="coach"><StatRoleAssignPage /></ProtectedRoute>} />
            <Route path="/approve-members" element={<ProtectedRoute requiredRole="coach"><ApproveProfilePage /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
