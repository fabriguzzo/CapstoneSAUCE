import { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box, Button, Avatar, Chip, Stack, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { getNotifications, markNotificationsSeen, type NotificationItem } from '../services/notificationService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (user?.teamId) {
      fetch(`${API_BASE_URL}/api/teams/${user.teamId}`)
        .then(res => res.json())
        .then(data => setTeamName(data.name || ''))
        .catch(() => {});
    }
  }, [user?.teamId]);

  useEffect(() => {
    if (!token || user?.role !== 'member' || user?.status !== 'approved') {
      setNotifications([]);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const items = await getNotifications(token);
        if (isMounted) {
          setNotifications(items);
        }
        await markNotificationsSeen(token);
        if (isMounted) {
          setNotifications((current) => current.map((item) => ({ ...item, seen: true })));
        }
        window.dispatchEvent(new Event('notifications-updated'));
      } catch {
        if (isMounted) {
          setNotifications([]);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [token, user?.role, user?.status]);

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

            {user.role === 'member' && user.status === 'approved' && (
              <>
                <Divider sx={{ my: 4 }} />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700, mb: 2 }}>
                    Notifications
                  </Typography>
                  {notifications.length === 0 ? (
                    <Typography sx={{ color: 'text.secondary' }}>
                      No role assignment notifications yet.
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {notifications.map((notification) => (
                        <Paper
                          key={notification._id}
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 3, bgcolor: notification.seen ? 'grey.50' : 'success.50' }}
                        >
                          <Typography sx={{ fontWeight: 600 }}>
                            {notification.message}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            Assigned {new Date(notification.assignedAt).toLocaleString()}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>
              </>
            )}
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
