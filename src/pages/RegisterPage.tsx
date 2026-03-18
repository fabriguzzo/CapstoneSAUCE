import { useState, useEffect } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Alert, Link,
  RadioGroup, Radio, FormControlLabel, FormControl, FormLabel, MenuItem, Select, InputLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface Team {
  _id: string;
  name: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'coach' | 'member'>('member');
  const [teamId, setTeamId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/teams`)
      .then(res => res.json())
      .then(setTeams)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        email,
        password,
        name,
        role,
        ...(role === 'member' ? { teamId } : { teamName }),
      });
      if (user.status === 'pending') {
        navigate('/login', { state: { message: 'Registration successful! Your account is pending approval from your team coach.' } });
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
              Create Account
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                label="Full Name"
                fullWidth
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 3 }}
              />
              <TextField
                label="School Email Address"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                sx={{ mb: 3 }}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Minimum 8 characters"
                sx={{ mb: 3 }}
              />
              <TextField
                label="Confirm Password"
                type="password"
                fullWidth
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                sx={{ mb: 3 }}
              />

              <FormControl sx={{ mb: 3 }}>
                <FormLabel sx={{ color: 'primary.main', fontWeight: 600 }}>I am a...</FormLabel>
                <RadioGroup row value={role} onChange={(e) => setRole(e.target.value as 'coach' | 'member')}>
                  <FormControlLabel value="member" control={<Radio />} label="Team Member" />
                  <FormControlLabel value="coach" control={<Radio />} label="Coach" />
                </RadioGroup>
              </FormControl>

              {role === 'member' ? (
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Select Team</InputLabel>
                  <Select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    label="Select Team"
                    required
                  >
                    {teams.map((t) => (
                      <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  label="Team Name"
                  fullWidth
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  helperText="A new team will be created for you"
                  sx={{ mb: 3 }}
                />
              )}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{ bgcolor: 'primary.main', py: 1.5, fontSize: '1rem', mb: 2 }}
              >
                {loading ? 'Creating Account...' : 'Register'}
              </Button>
              <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
                Already have an account?{' '}
                <Link
                  component="button"
                  type="button"
                  onClick={() => navigate('/login')}
                  sx={{ color: 'primary.main', fontWeight: 600 }}
                >
                  Log In
                </Link>
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
