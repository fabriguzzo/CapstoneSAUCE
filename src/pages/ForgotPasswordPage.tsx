import { useState } from 'react';
import { Container, Paper, Typography, TextField, Button, Box, Alert, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../services/authService';
import Navbar from '../components/Navbar';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
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
            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700, textAlign: 'center', mb: 2 }}>
              Reset Password
            </Typography>
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', mb: 4 }}>
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </Typography>

            {success ? (
              <Alert severity="success" sx={{ mb: 3 }}>
                If an account with that email exists, a password reset link has been sent. Check your inbox.
              </Alert>
            ) : (
              <>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit}>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    sx={{ mb: 3 }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    sx={{ bgcolor: 'primary.main', py: 1.5, fontSize: '1rem', mb: 2 }}
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </Box>
              </>
            )}
            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
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
