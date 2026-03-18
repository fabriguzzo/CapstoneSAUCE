import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Box sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      bgcolor: 'background.default',
      boxShadow: 1
    }}>
      <Container maxWidth="lg">
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2
        }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 'bold', color: 'primary.main', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            SAUCE
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {isAuthenticated && user?.status === 'approved' && (
              <>
                <Button variant="text" onClick={() => navigate('/gamehistory')} sx={{ color: 'text.primary' }}>
                  Game History
                </Button>
                {user.role === 'coach' && (
                  <>
                    <Button variant="text" onClick={() => navigate('/gamecrud')} sx={{ color: 'text.primary' }}>
                      Games
                    </Button>
                    <Button variant="text" onClick={() => navigate('/playerteamcrud')} sx={{ color: 'text.primary' }}>
                      Players & Teams
                    </Button>
                  </>
                )}
                <Button variant="text" onClick={() => navigate('/stattracker')} sx={{ color: 'text.primary' }}>
                  Stat Tracker
                </Button>
                {user.role === 'coach' && (
                  <>
                    <Button variant="text" onClick={() => navigate('/assign-roles')} sx={{ color: 'text.primary' }}>
                      Assign Roles
                    </Button>
                    <Button variant="text" onClick={() => navigate('/approve-members')} sx={{ color: 'text.primary' }}>
                      Manage Team
                    </Button>
                  </>
                )}
              </>
            )}
            <Button variant="text" onClick={() => navigate('/about')} sx={{ color: 'text.primary' }}>
              About
            </Button>
            <Button variant="text" onClick={() => navigate('/contact')} sx={{ color: 'text.primary' }}>
              Contact Us
            </Button>
            {isAuthenticated ? (
              <>
                <Button variant="text" onClick={() => navigate('/profile')} sx={{ color: 'text.primary' }}>
                  Profile
                </Button>
                <Button variant="contained" onClick={handleLogout} sx={{ bgcolor: 'primary.main' }}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="text" onClick={() => navigate('/login')} sx={{ color: 'text.primary' }}>
                  Login
                </Button>
                <Button variant="contained" onClick={() => navigate('/register')} sx={{ bgcolor: 'primary.main' }}>
                  Sign Up
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
