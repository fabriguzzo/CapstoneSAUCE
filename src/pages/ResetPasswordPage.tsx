import { useState } from 'react';
import { Container, Paper, Typography, TextField, Button, Box, Alert, Link } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/authService';
import Navbar from '../components/Navbar';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ pt: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Container maxWidth="sm">
          <Paper elevation={6} sx={{ p: 6, borderRadius: 4 }}>
            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700, textAlign: 'center', mb: 4 }}>
              Set New Password
            </Typography>

            {success ? (
              <>
                <Alert severity="success" sx={{ mb: 3 }}>
                  Your password has been reset successfully!
                </Alert>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate('/login')}
                  sx={{ bgcolor: 'primary.main', py: 1.5, fontSize: '1rem' }}
                >
                  Go to Login
                </Button>
              </>
            ) : (
              <>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit}>
                  <TextField
                    label="New Password"
                    type="password"
                    fullWidth
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    helperText="Minimum 8 characters"
                    sx={{ mb: 3 }}
                  />
                  <TextField
                    label="Confirm New Password"
                    type="password"
                    fullWidth
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    sx={{ mb: 3 }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    sx={{ bgcolor: 'primary.main', py: 1.5, fontSize: '1rem' }}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </Box>
              </>
            )}
            <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, color: 'text.secondary' }}>
              <Link
                component="button"
                type="button"
                onClick={() => navigate('/login')}
                sx={{ color: 'primary.main', fontWeight: 600 }}
              >
                Back to Login
              </Link>
            </Typography>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
