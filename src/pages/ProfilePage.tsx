import { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box, Button, Avatar, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (user?.teamId) {
      fetch(`${API_BASE_URL}/api/teams/${user.teamId}`)
        .then(res => res.json())
        .then(data => setTeamName(data.name || ''))
        .catch(() => {});
    }
  }, [user?.teamId]);

  if (!user) return null;

  const profilePicUrl = user.profilePicture
    ? `${API_BASE_URL}${user.profilePicture}`
    : undefined;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ pt: 12 }}>
        <Container maxWidth="sm" sx={{ py: 6 }}>
          <Paper elevation={6} sx={{ p: 6, borderRadius: 4, textAlign: 'center' }}>
            <Avatar
              src={profilePicUrl}
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 3,
                bgcolor: 'primary.main',
                fontSize: '3rem'
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </Avatar>

            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700, mb: 1 }}>
              {user.name}
            </Typography>

            <Typography sx={{ color: 'text.secondary', mb: 2 }}>
              {user.email}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
              <Chip
                label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={user.status === 'approved' ? 'Approved' : 'Pending'}
                color={user.status === 'approved' ? 'success' : 'warning'}
                variant="outlined"
              />
            </Box>

            {teamName && (
              <Typography sx={{ color: 'text.secondary', mb: 4 }}>
                Team: <strong>{teamName}</strong>
              </Typography>
            )}

            <Button
              variant="contained"
              onClick={() => navigate('/edit-profile')}
              sx={{ bgcolor: 'primary.main', px: 4 }}
            >
              Edit Profile
            </Button>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
