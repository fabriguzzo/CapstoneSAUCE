import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const CREAM = "#fff2d1";
const GREEN = "#005F02";
const GREEN_TEXT_SX = {
  color: GREEN,
  "& .MuiTypography-root": { color: `${GREEN} !important` },
  "& .MuiInputBase-input": { color: `${GREEN} !important` },
  "& .MuiInputLabel-root": { color: `${GREEN} !important` },
  "& .MuiFormLabel-root.Mui-focused": { color: `${GREEN} !important` },
  "& .MuiSelect-icon": { color: `${GREEN} !important` },
};
const SELECT_MENU_PROPS = {
  PaperProps: {
    sx: {
      "& .MuiMenuItem-root": { color: GREEN },
    },
  },
};

interface Team {
  _id: string;
  name: string;
  coach?: string;
  description?: string;
}

interface Player {
  _id: string;
  name: string;
  number: number;
  teamId: string;
  position?: string;
  teamName?: string;
}

export default function PlayerTeamCrud() {
  const [activeTab, setActiveTab] = useState<"teams" | "players">("teams");
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [teamCoach, setTeamCoach] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [playerNumber, setPlayerNumber] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [playerTeamId, setPlayerTeamId] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState("");

  useEffect(() => {
    fetchTeams();
    fetchPlayers();
  }, []);

  async function fetchTeams() {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/teams`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data);
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchPlayers(teamId?: string) {
    try {
      setIsLoading(true);
      const url = teamId ? `${API_BASE_URL}/api/players?teamId=${teamId}` : `${API_BASE_URL}/api/players`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch players');
      const data = await response.json();
      const teamsData = await fetch(`${API_BASE_URL}/api/teams`).then(r => r.json());
      const teamMap = new Map(teamsData.map((t: Team) => [t._id, t.name]));
      const playersWithTeamName = data.map((p: Player) => ({
        ...p,
        teamName: teamMap.get(p.teamId) || 'Unknown Team'
      }));
      setPlayers(playersWithTeamName);
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTeam() {
    if (!teamName.trim()) {
      alert('Team name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName.trim(),
          coach: teamCoach.trim() || undefined,
          description: teamDescription.trim() || undefined
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create team');
      }

      alert('Team created successfully!');
      resetTeamForm();
      fetchTeams();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to create team: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateTeam() {
    if (!editingTeamId || !teamName.trim()) {
      alert('Team name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/teams/${editingTeamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName.trim(),
          coach: teamCoach.trim() || undefined,
          description: teamDescription.trim() || undefined
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update team');
      }

      alert('Team updated successfully!');
      resetTeamForm();
      fetchTeams();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to update team: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTeam(teamId: string) {
    if (confirm('Are you sure you want to delete this team?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to delete team');

        setTeams(prev => prev.filter(t => t._id !== teamId));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        alert(`Failed to delete team: ${message}`);
      }
    }
  }

  function loadTeamForEdit(team: Team) {
    setEditingTeamId(team._id);
    setTeamName(team.name);
    setTeamCoach(team.coach || "");
    setTeamDescription(team.description || "");
  }

  function resetTeamForm() {
    setEditingTeamId(null);
    setTeamName("");
    setTeamCoach("");
    setTeamDescription("");
  }

  async function handleCreatePlayer() {
    if (!playerName.trim() || !playerNumber || !playerTeamId) {
      alert('Player name, number, and team are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playerName.trim(),
          number: parseInt(playerNumber),
          teamId: playerTeamId,
          position: playerPosition.trim() || undefined
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create player');
      }

      alert('Player created successfully!');
      resetPlayerForm();
      fetchPlayers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to create player: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdatePlayer() {
    if (!editingPlayerId || !playerName.trim() || !playerNumber || !playerTeamId) {
      alert('Player name, number, and team are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/players/${editingPlayerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playerName.trim(),
          number: parseInt(playerNumber),
          teamId: playerTeamId,
          position: playerPosition.trim() || undefined
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update player');
      }

      alert('Player updated successfully!');
      resetPlayerForm();
      fetchPlayers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to update player: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deletePlayer(playerId: string) {
    if (confirm('Are you sure you want to delete this player?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/players/${playerId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to delete player');

        setPlayers(prev => prev.filter(p => p._id !== playerId));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        alert(`Failed to delete player: ${message}`);
      }
    }
  }

  function loadPlayerForEdit(player: Player) {
    setEditingPlayerId(player._id);
    setPlayerName(player.name);
    setPlayerNumber(String(player.number));
    setPlayerPosition(player.position || "");
    setPlayerTeamId(player.teamId);
  }

  function resetPlayerForm() {
    setEditingPlayerId(null);
    setPlayerName("");
    setPlayerNumber("");
    setPlayerPosition("");
    setPlayerTeamId("");
  }

  if (isLoading && teams.length === 0) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: CREAM, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: GREEN }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: CREAM, py: { xs: 6, md: 8 }, ...GREEN_TEXT_SX }}>
      <Container maxWidth="lg">
        <Typography
          sx={{
            textAlign: "center",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            fontSize: { xs: 34, sm: 44, md: 60 },
            mb: 3,
            color: GREEN,
            fontFamily: "Oswald, sans-serif",
          }}
        >
          {editingTeamId ? "Edit Team" : editingPlayerId ? "Edit Player" : "Manage Teams & Players"}
        </Typography>

        <Stack direction="row" justifyContent="center" spacing={1.5} sx={{ mb: 4, flexWrap: "wrap" }}>
          <Button
            variant={activeTab === "teams" ? "contained" : "outlined"}
            onClick={() => setActiveTab("teams")}
            sx={{
              bgcolor: activeTab === "teams" ? GREEN : "transparent",
              borderColor: GREEN,
              color: activeTab === "teams" ? CREAM : GREEN,
              fontWeight: activeTab === "teams" ? 700 : 500,
              textTransform: "none",
              "&:hover": {
                bgcolor: activeTab === "teams" ? "#004a01" : "rgba(0,95,2,.08)",
                color: activeTab === "teams" ? CREAM : GREEN,
              },
            }}
          >
            Teams
          </Button>
          <Button
            variant={activeTab === "players" ? "contained" : "outlined"}
            onClick={() => setActiveTab("players")}
            sx={{
              bgcolor: activeTab === "players" ? GREEN : "transparent",
              borderColor: GREEN,
              color: activeTab === "players" ? CREAM : GREEN,
              fontWeight: activeTab === "players" ? 700 : 500,
              textTransform: "none",
              "&:hover": {
                bgcolor: activeTab === "players" ? "#004a01" : "rgba(0,95,2,.08)",
                color: activeTab === "players" ? CREAM : GREEN,
              },
            }}
          >
            Players
          </Button>
        </Stack>

        {activeTab === "teams" ? (
          <>
            <Paper
              elevation={6}
              sx={{
                borderRadius: 4,
                p: { xs: 2.5, md: 3 },
                mb: 4,
                boxShadow: "0 10px 30px rgba(0,0,0,.12)",
              }}
            >
              <Typography sx={{ fontWeight: 900, color: GREEN, mb: 2 }}>
                {editingTeamId ? "Edit Team" : "Add New Team"}
              </Typography>

              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Team Name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
                <TextField
                  fullWidth
                  label="Coach"
                  value={teamCoach}
                  onChange={(e) => setTeamCoach(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="Description"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  multiline
                  rows={2}
                />
                <Stack direction="row" spacing={1.5}>
                  {editingTeamId && (
                    <Button
                      variant="outlined"
                      onClick={resetTeamForm}
                      sx={{
                        borderColor: GREEN,
                        color: GREEN,
                        textTransform: "none",
                        "&:hover": { bgcolor: "rgba(0,95,2,.08)" },
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    onClick={editingTeamId ? handleUpdateTeam : handleCreateTeam}
                    disabled={isSubmitting}
                    sx={{
                      bgcolor: GREEN,
                      color: CREAM,
                      fontWeight: 700,
                      textTransform: "none",
                      "&:hover": { bgcolor: "#004a01", color: CREAM },
                    }}
                  >
                    {isSubmitting ? "Saving..." : editingTeamId ? "Update Team" : "Add Team"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            <Paper
              elevation={6}
              sx={{
                borderRadius: 4,
                p: { xs: 2.5, md: 3 },
                boxShadow: "0 10px 30px rgba(0,0,0,.12)",
              }}
            >
              <Typography sx={{ fontWeight: 900, color: GREEN, mb: 2 }}>Teams</Typography>

              {teams.length === 0 ? (
                <Typography sx={{ textAlign: "center", py: 4, color: GREEN, opacity: 0.7 }}>
                  No teams yet. Add your first team above!
                </Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Name</TableCell>
                        <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Coach</TableCell>
                        <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Description</TableCell>
                        <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {teams.map((team) => (
                        <TableRow key={team._id}>
                          <TableCell sx={{ color: GREEN }}>{team.name}</TableCell>
                          <TableCell sx={{ color: GREEN }}>{team.coach || '-'}</TableCell>
                          <TableCell sx={{ color: GREEN }}>{team.description || '-'}</TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", gap: 1 }}>
                              <IconButton size="small" onClick={() => loadTeamForEdit(team)} sx={{ color: GREEN }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => deleteTeam(team._id)} sx={{ color: "#d32f2f" }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </>
        ) : (
          <>
            <Paper
              elevation={6}
              sx={{
                borderRadius: 4,
                p: { xs: 2.5, md: 3 },
                mb: 4,
                boxShadow: "0 10px 30px rgba(0,0,0,.12)",
              }}
            >
              <Typography sx={{ fontWeight: 900, color: GREEN, mb: 2 }}>
                {editingPlayerId ? "Edit Player" : "Add New Player"}
              </Typography>

              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Player Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  required
                />
                <TextField
                  fullWidth
                  label="Player Number"
                  type="number"
                  value={playerNumber}
                  onChange={(e) => setPlayerNumber(e.target.value)}
                  required
                  inputProps={{ min: 1 }}
                />
                <FormControl fullWidth>
                  <InputLabel>Team</InputLabel>
                  <Select
                    value={playerTeamId}
                    label="Team"
                    onChange={(e) => setPlayerTeamId(e.target.value)}
                    required
                    sx={{ color: GREEN }}
                    MenuProps={SELECT_MENU_PROPS}
                  >
                    <MenuItem value="">Select a team...</MenuItem>
                    {teams.map((team) => (
                      <MenuItem key={team._id} value={team._id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Position"
                  value={playerPosition}
                  onChange={(e) => setPlayerPosition(e.target.value)}
                />
                <Stack direction="row" spacing={1.5}>
                  {editingPlayerId && (
                    <Button
                      variant="outlined"
                      onClick={resetPlayerForm}
                      sx={{
                        borderColor: GREEN,
                        color: GREEN,
                        textTransform: "none",
                        "&:hover": { bgcolor: "rgba(0,95,2,.08)" },
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    onClick={editingPlayerId ? handleUpdatePlayer : handleCreatePlayer}
                    disabled={isSubmitting}
                    sx={{
                      bgcolor: GREEN,
                      color: CREAM,
                      fontWeight: 700,
                      textTransform: "none",
                      "&:hover": { bgcolor: "#004a01", color: CREAM },
                    }}
                  >
                    {isSubmitting ? "Saving..." : editingPlayerId ? "Update Player" : "Add Player"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            <Paper
              elevation={6}
              sx={{
                borderRadius: 4,
                p: { xs: 2.5, md: 3 },
                boxShadow: "0 10px 30px rgba(0,0,0,.12)",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 900, color: GREEN }}>
                  Players
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel sx={{ color: GREEN }}>Filter by Team</InputLabel>
                  <Select
                    value={teamFilter}
                    label="Filter by Team"
                    onChange={(e) => {
                      setTeamFilter(e.target.value);
                      fetchPlayers(e.target.value || undefined);
                    }}
                    sx={{ color: GREEN }}
                    MenuProps={SELECT_MENU_PROPS}
                  >
                    <MenuItem value="">All Teams</MenuItem>
                    {teams.map((team) => (
                      <MenuItem key={team._id} value={team._id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {players.length === 0 ? (
                <Typography sx={{ textAlign: "center", py: 4, color: GREEN, opacity: 0.7 }}>
                  No players yet. Add your first player above!
                </Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: GREEN, fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Name</TableCell>
                        <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Team</TableCell>
                        <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Position</TableCell>
                        <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {players.map((player) => (
                        <TableRow key={player._id}>
                          <TableCell sx={{ color: GREEN }}>{player.number}</TableCell>
                          <TableCell sx={{ color: GREEN }}>{player.name}</TableCell>
                          <TableCell sx={{ color: GREEN }}>{player.teamName}</TableCell>
                          <TableCell sx={{ color: GREEN }}>{player.position || '-'}</TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", gap: 1 }}>
                              <IconButton size="small" onClick={() => loadPlayerForEdit(player)} sx={{ color: GREEN }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => deletePlayer(player._id)} sx={{ color: "#d32f2f" }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
}
