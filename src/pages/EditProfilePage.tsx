import { useState } from 'react';
import { Container, Paper, Typography, TextField, Button, Box, Alert, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/authService';
import Navbar from '../components/Navbar';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    user?.profilePicture ? `${API_BASE_URL}${user.profilePicture}` : null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePic(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!token) return;

    setLoading(true);
    try {
      const formData = new FormData();
      if (name !== user?.name) formData.append('name', name);
      if (email !== user?.email) formData.append('email', email);
      if (password) formData.append('password', password);
      if (profilePic) formData.append('profilePicture', profilePic);

      const updated = await updateProfile(token, formData);
      updateUser({
        id: (updated as any)._id || updated.id || user!.id,
        email: updated.email,
        name: updated.name,
        role: updated.role || user!.role,
        teamId: updated.teamId || user!.teamId,
        status: updated.status || user!.status,
        profilePicture: updated.profilePicture,
      });
      navigate('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ pt: 12 }}>
        <Container maxWidth="sm" sx={{ py: 6 }}>
          <Paper elevation={6} sx={{ p: 6, borderRadius: 4 }}>
            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700, textAlign: 'center', mb: 4 }}>
              Edit Profile
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar
                  src={preview || undefined}
                  sx={{
                    width: 100,
                    height: 100,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '2.5rem'
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </Avatar>
                <Button variant="outlined" component="label" size="small">
                  Change Photo
                  <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                </Button>
              </Box>

              <TextField
                label="Full Name"
                fullWidth
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 3 }}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 3 }}
              />
              <TextField
                label="New Password (leave blank to keep current)"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Minimum 8 characters"
                sx={{ mb: 3 }}
              />
              {password && (
                <TextField
                  label="Confirm New Password"
                  type="password"
                  fullWidth
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  sx={{ mb: 3 }}
                />
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/profile')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  sx={{ bgcolor: 'primary.main' }}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
