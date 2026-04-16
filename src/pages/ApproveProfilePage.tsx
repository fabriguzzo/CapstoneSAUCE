import { useState, useEffect, useCallback } from 'react';
import {
  Container, Paper, Typography, Box, Button, Alert,
  Table, TableHead, TableBody, TableRow, TableCell,
  CircularProgress, Chip, Divider, Stack, TextField, IconButton,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../context/AuthContext';
import { useAuthFetch } from '../hooks/useAuthFetch';
import {
  getPendingMembers,
  getTeamMembers,
  approveMember,
  rejectMember,
  removeMember,
  type User,
} from '../services/authService';
import Navbar from '../components/Navbar';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const GREEN = '#005F02';

type RosterPlayer = { _id: string; name: string; number: number };

export default function ApproveProfilePage() {
  const { token, user } = useAuth();
  const authFetch = useAuthFetch();

  const [pending, setPending] = useState<User[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [addingPlayer, setAddingPlayer] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [p, m] = await Promise.all([
        getPendingMembers(token),
        getTeamMembers(token),
      ]);
      setPending(p);
      setMembers(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadRoster = useCallback(async () => {
    if (!user?.teamId) return;
    setRosterLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/players?teamId=${user.teamId}`);
      if (!res.ok) throw new Error('Failed to load roster');
      const data = await res.json();
      setRosterPlayers(Array.isArray(data) ? data : []);
    } catch (err) {
      setRosterError(err instanceof Error ? err.message : 'Failed to load roster');
    } finally {
      setRosterLoading(false);
    }
  }, [authFetch, user?.teamId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadRoster(); }, [loadRoster]);

  const handleApprove = async (userId: string) => {
    if (!token) return;
    try {
      await approveMember(token, userId);
      setActionMsg('Member approved');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleReject = async (userId: string) => {
    if (!token) return;
    try {
      await rejectMember(token, userId);
      setActionMsg('Request rejected');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!token) return;
    try {
      await removeMember(token, userId);
      setActionMsg('Member removed');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleAddPlayer = async () => {
    const name = newPlayerName.trim();
    const number = parseInt(newPlayerNumber, 10);
    if (!name) { setRosterError('Player name is required.'); return; }
    if (!newPlayerNumber || isNaN(number)) { setRosterError('Jersey number is required.'); return; }
    if (!user?.teamId) return;

    setAddingPlayer(true);
    setRosterError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, number, teamId: user.teamId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to add player');
      }
      setNewPlayerName('');
      setNewPlayerNumber('');
      loadRoster();
      setActionMsg(`${name} added to roster`);
    } catch (err) {
      setRosterError(err instanceof Error ? err.message : 'Failed to add player');
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/players/${playerId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove player');
      setRosterPlayers((prev) => prev.filter((p) => p._id !== playerId));
      setActionMsg(`${playerName} removed from roster`);
    } catch (err) {
      setRosterError(err instanceof Error ? err.message : 'Failed to remove player');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ pt: 12 }}>
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700, mb: 4 }}>
            Manage Team Members
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
          {actionMsg && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setActionMsg(null)}>{actionMsg}</Alert>}

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <>
              {/* Pending Requests */}
              <Paper elevation={6} sx={{ p: 4, borderRadius: 4, mb: 4 }}>
                <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 600, mb: 2 }}>
                  Pending Requests
                  {pending.length > 0 && (
                    <Chip label={pending.length} color="warning" size="small" sx={{ ml: 1 }} />
                  )}
                </Typography>

                {pending.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    No pending requests
                  </Typography>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Email</strong></TableCell>
                        <TableCell align="right"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pending.map((u) => (
                        <TableRow key={u.id || (u as any)._id}>
                          <TableCell>{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<CheckIcon />}
                              onClick={() => handleApprove(u.id || (u as any)._id)}
                              sx={{ mr: 1 }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<CloseIcon />}
                              onClick={() => handleReject(u.id || (u as any)._id)}
                            >
                              Reject
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Paper>

              <Divider sx={{ mb: 4 }} />

              {/* Current Members */}
              <Paper elevation={6} sx={{ p: 4, borderRadius: 4, mb: 4 }}>
                <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 600, mb: 2 }}>
                  Current Members
                  <Chip label={members.length} color="primary" size="small" sx={{ ml: 1 }} />
                </Typography>

                {members.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    No approved members yet
                  </Typography>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Email</strong></TableCell>
                        <TableCell><strong>Role</strong></TableCell>
                        <TableCell align="right"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {members.map((u) => (
                        <TableRow key={u.id || (u as any)._id}>
                          <TableCell>{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                              color={u.role === 'coach' ? 'primary' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {u.role !== 'coach' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<PersonRemoveIcon />}
                                onClick={() => handleRemove(u.id || (u as any)._id)}
                              >
                                Remove
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Paper>

              <Divider sx={{ mb: 4 }} />

              {/* Roster */}
              <Paper elevation={6} sx={{ p: 4, borderRadius: 4 }}>
                <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 600, mb: 1 }}>
                  Roster
                  <Chip label={rosterPlayers.length} color="primary" size="small" sx={{ ml: 1 }} />
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  Players added here don't need an account — they're used for stat tracking and game lineup selection.
                </Typography>

                {rosterError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRosterError(null)}>
                    {rosterError}
                  </Alert>
                )}

                {/* Add player form */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start" sx={{ mb: 3 }}>
                  <TextField
                    label="Jersey #"
                    value={newPlayerNumber}
                    onChange={(e) => setNewPlayerNumber(e.target.value)}
                    inputProps={{ inputMode: 'numeric' }}
                    sx={{ width: { xs: '100%', sm: 110 } }}
                    size="small"
                  />
                  <TextField
                    label="Player Name"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlayer(); }}
                    fullWidth
                    size="small"
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddPlayer}
                    disabled={addingPlayer}
                    sx={{ bgcolor: GREEN, fontWeight: 700, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#004a01' } }}
                  >
                    {addingPlayer ? 'Adding…' : 'Add Player'}
                  </Button>
                </Stack>

                {rosterLoading ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                ) : rosterPlayers.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    No players on the roster yet
                  </Typography>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>#</strong></TableCell>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell align="right"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...rosterPlayers]
                        .sort((a, b) => a.number - b.number)
                        .map((p) => (
                          <TableRow key={p._id}>
                            <TableCell sx={{ fontWeight: 700, color: GREEN }}>{p.number}</TableCell>
                            <TableCell>{p.name}</TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemovePlayer(p._id, p.name)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </Paper>
            </>
          )}
        </Container>
      </Box>
    </Box>
  );
}
