import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Container, Paper, Button } from '@mui/material';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'coach' | 'member';
  requireApproved?: boolean;
}

export default function ProtectedRoute({ children, requiredRole, requireApproved = true }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireApproved && user.status !== 'approved') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center' }}>
        <Container maxWidth="sm">
          <Paper elevation={6} sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700, mb: 2 }}>
              Pending Approval
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 3 }}>
              Your account is awaiting approval from your team's coach. You'll be able to access this page once approved.
            </Typography>
            <Button variant="contained" href="/" sx={{ bgcolor: 'primary.main' }}>
              Go Home
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center' }}>
        <Container maxWidth="sm">
          <Paper elevation={6} sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700, mb: 2 }}>
              Access Denied
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 3 }}>
              You don't have permission to access this page. This area is restricted to {requiredRole}s only.
            </Typography>
            <Button variant="contained" href="/" sx={{ bgcolor: 'primary.main' }}>
              Go Home
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return <>{children}</>;
}
