import { useState, useEffect, useCallback } from 'react';
import {
  Container, Paper, Typography, Box, Button, Alert,
  Table, TableHead, TableBody, TableRow, TableCell,
  CircularProgress, Chip, Divider
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { useAuth } from '../context/AuthContext';
import {
  getPendingMembers,
  getTeamMembers,
  approveMember,
  rejectMember,
  removeMember,
  type User,
} from '../services/authService';
import Navbar from '../components/Navbar';

export default function ApproveProfilePage() {
  const { token } = useAuth();
  const [pending, setPending] = useState<User[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

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

  useEffect(() => { loadData(); }, [loadData]);

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
              <Paper elevation={6} sx={{ p: 4, borderRadius: 4 }}>
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
            </>
          )}
        </Container>
      </Box>
    </Box>
  );
}
