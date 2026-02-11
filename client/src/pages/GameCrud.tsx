import { useMemo, useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  TextField,
  MenuItem,
  Button,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
} from "@mui/material";
import { Add as AddIcon, Remove as RemoveIcon, Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

type TeamOption = { id: string; name: string };
type RosterPlayer = { id: string; number: number; name: string };
type OppPlayer = { number: string; name: string };

type LineupSlot =
  | "G"
  | "LD"
  | "RD"
  | "LW"
  | "C"
  | "RW"
  | "B1"
  | "B2"
  | "B3"
  | "B4"
  | "B5"
  | "B6"
  | "B7"
  | "B8"
  | "B9";

export type CreateGamePayload = {
  teamId: string;
  gameType: string;
  gameDate: string; // datetime-local string or ISO (your backend can parse)
  lineup: { playerId: string; slot: number }[]; // total 15
  opponentTeamName: string;
  opponentRoster: { number: string; name: string }[]; // total 15
};

type Game = {
  _id: string;
  teamId: string;
  teamName?: string;
  gameType: string;
  gameDate: string;
  lineup: { playerId: string; slot: number; playerName?: string; playerNumber?: number }[];
  opponentTeamName: string;
  opponentRoster: { number: string; name: string }[];
  teamScore?: number;
  opponentScore?: number;
};

const CREAM = "#fff2d1";
const GREEN = "#005F02";
const GREEN_TEXT_SX = {
  color: GREEN,
  "& .MuiTypography-root": { color: `${GREEN} !important` },
  "& .MuiButton-root": { color: `${GREEN} !important` },
  "& .MuiInputBase-input": { color: `${GREEN} !important` },
  "& .MuiInputLabel-root": { color: `${GREEN} !important` },
  "& .MuiFormLabel-root.Mui-focused": { color: `${GREEN} !important` },
  "& .MuiSelect-icon": { color: `${GREEN} !important` },
  "& .MuiInputBase-input::placeholder": { color: `${GREEN} !important`, opacity: 1 },
};
const SELECT_MENU_PROPS = {
  PaperProps: {
    sx: {
      "& .MuiMenuItem-root": { color: GREEN },
    },
  },
};

const GAME_TYPES = [
  { value: "regular-season", label: "Regular Season" },
  { value: "league", label: "League" },
  { value: "out-of-league", label: "Out of League" },
  { value: "playoff", label: "Playoff" },
  { value: "final", label: "Final" },
  { value: "tournament", label: "Tournament" },
];

function playerLabel(p: RosterPlayer) {
  return `#${p.number} • ${p.name}`;
}

export default function GameCrud() {
  const [activePanel, setActivePanel] = useState<"home" | "opp">("home");

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [teamId, setTeamId] = useState("");
  const [gameType, setGameType] = useState("");
  const [gameDate, setGameDate] = useState("");

  // Fetch teams and games on mount
  useEffect(() => {
    fetchTeams();
    fetchGames();
  }, []);

  // Fetch players when team changes
  useEffect(() => {
    if (teamId) {
      fetchPlayers(teamId);
    } else {
      setRoster([]);
    }
  }, [teamId]);

  async function fetchTeams() {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/teams`);
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      const data = await response.json();
      setTeams(data.map((t: any) => ({ id: t._id, name: t.name })));
    } catch (err) {
      console.error('Error fetching teams:', err);
      setLoadError('Failed to load teams. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchPlayers(teamId: string) {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/players?teamId=${teamId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch players');
      }
      const data = await response.json();
      setRoster(data.map((p: any) => ({ id: p._id, number: p.number, name: p.name })));
    } catch (err) {
      console.error('Error fetching players:', err);
      setLoadError('Failed to load players. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchGames() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/games`);
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      const data = await response.json();
      setGames(data);
    } catch (err) {
      console.error('Error fetching games:', err);
    }
  }

  const [lineup, setLineup] = useState<Record<LineupSlot, string>>({
    G: "",
    LD: "",
    RD: "",
    LW: "",
    C: "",
    RW: "",
    B1: "",
    B2: "",
    B3: "",
    B4: "",
    B5: "",
    B6: "",
    B7: "",
    B8: "",
    B9: "",
  });

  const [oppTeamName, setOppTeamName] = useState("");
  const [oppRoster, setOppRoster] = useState<OppPlayer[]>(
    Array.from({ length: 15 }, () => ({ number: "", name: "" }))
  );

  const [games, setGames] = useState<Game[]>([]);
  const [editingGame, setEditingGame] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Prevent duplicate selections in lineup (still allows clearing)
  const selectedIds = useMemo(() => new Set(Object.values(lineup).filter(Boolean)), [lineup]);
  function optionsFor(slot: LineupSlot) {
    const current = lineup[slot];
    return roster.filter((p) => !selectedIds.has(p.id) || p.id === current);
  }

  function setLineupSlot(slot: LineupSlot, playerId: string) {
    setLineup((prev) => ({ ...prev, [slot]: playerId }));
  }

  function buildPayload(): CreateGamePayload {
    const starters = [
      { slot: 1, playerId: lineup.G },
      { slot: 2, playerId: lineup.LD },
      { slot: 3, playerId: lineup.RD },
      { slot: 4, playerId: lineup.LW },
      { slot: 5, playerId: lineup.C },
      { slot: 6, playerId: lineup.RW },
    ];
    const bench = [
      { slot: 7, playerId: lineup.B1 },
      { slot: 8, playerId: lineup.B2 },
      { slot: 9, playerId: lineup.B3 },
      { slot: 10, playerId: lineup.B4 },
      { slot: 11, playerId: lineup.B5 },
      { slot: 12, playerId: lineup.B6 },
      { slot: 13, playerId: lineup.B7 },
      { slot: 14, playerId: lineup.B8 },
      { slot: 15, playerId: lineup.B9 },
    ];

    return {
      teamId,
      gameType,
      gameDate,
      lineup: [...starters, ...bench],
      opponentTeamName: oppTeamName.trim(),
      opponentRoster: oppRoster.map((p) => ({
        number: p.number.trim(),
        name: p.name.trim(),
      })),
    };
  }

  // Basic front-end validation (keeps UX clean; backend should also validate)
  function validate(): string | null {
    if (!teamId) return "Please select your team.";
    if (!gameType) return "Please select a game type.";
    if (!gameDate) return "Please choose a game date/time.";
    if (!oppTeamName.trim()) return "Please enter the opponent team name.";

    const allLineupIds = Object.values(lineup);
    if (allLineupIds.some((id) => !id)) return "Please select all 15 players (starters + bench).";

    const uniq = new Set(allLineupIds);
    if (uniq.size !== allLineupIds.length) return "Lineup has duplicate players. Each player can only be selected once.";

    if (oppRoster.length !== 15) return "Opponent roster must have 15 players.";
    for (let i = 0; i < 15; i++) {
      const n = oppRoster[i].number.trim();
      const name = oppRoster[i].name.trim();
      if (!n || !name) return `Opponent roster is incomplete (player ${i + 1}).`;
    }

    return null;
  }

  async function handleCreate() {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    const payload = buildPayload();
    
    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create game');
      }

      const createdGame = await response.json();
      alert('Game created successfully!');
      console.log('Created game:', createdGame);
      
      // Refresh games list
      fetchGames();
      
      // Reset form after successful creation
      setGameType('');
      setGameDate('');
      setOppTeamName('');
      setOppRoster(Array.from({ length: 15 }, () => ({ number: '', name: '' })));
      setLineup({
        G: '',
        LD: '',
        RD: '',
        LW: '',
        C: '',
        RW: '',
        B1: '',
        B2: '',
        B3: '',
        B4: '',
        B5: '',
        B6: '',
        B7: '',
        B8: '',
        B9: '',
      });
    } catch (err: any) {
      console.error('Error creating game:', err);
      alert(`Failed to create game: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function loadGameForEdit(game: Game) {
    setEditingGame(game._id);
    setTeamId(game.teamId);
    setGameType(game.gameType);
    setGameDate(game.gameDate);
    setOppTeamName(game.opponentTeamName);
    
    // Load lineup
    const newLineup = { ...lineup };
    game.lineup.forEach((player) => {
      const slotMap: Record<number, LineupSlot> = {
        1: "G", 2: "LD", 3: "RD", 4: "LW", 5: "C", 6: "RW",
        7: "B1", 8: "B2", 9: "B3", 10: "B4", 11: "B5", 
        12: "B6", 13: "B7", 14: "B8", 15: "B9"
      };
      if (slotMap[player.slot]) {
        newLineup[slotMap[player.slot]] = player.playerId;
      }
    });
    setLineup(newLineup);
    
    // Load opponent roster
    setOppRoster(game.opponentRoster.map(p => ({ number: p.number, name: p.name })));
    
    // Load scores
    setGames(prev => prev.map(g => 
      g._id === game._id ? { ...g, editing: true } : g
    ));
  }

  function updateGameScore(gameId: string, team: 'team' | 'opponent', delta: number) {
    setGames(prev => prev.map(game => {
      if (game._id === gameId) {
        const updatedGame = { ...game };
        if (team === 'team') {
          updatedGame.teamScore = Math.max(0, (updatedGame.teamScore || 0) + delta);
        } else {
          updatedGame.opponentScore = Math.max(0, (updatedGame.opponentScore || 0) + delta);
        }
        setHasChanges(true);
        return updatedGame;
      }
      return game;
    }));
  }

  function deleteGame(gameId: string) {
    if (confirm('Are you sure you want to delete this game?')) {
      setGames(prev => prev.filter(g => g._id !== gameId));
      setHasChanges(true);
    }
  }

  async function syncChanges() {
    try {
      setIsSubmitting(true);
      
      // Update games with score changes
      const gamesWithScores = games.filter(g => g.teamScore !== undefined || g.opponentScore !== undefined);
      
      for (const game of gamesWithScores) {
        await fetch(`${API_BASE_URL}/api/games/${game._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamScore: game.teamScore,
            opponentScore: game.opponentScore,
          }),
        });
      }
      
      setHasChanges(false);
      alert('Changes synced successfully!');
    } catch (err: any) {
      console.error('Error syncing changes:', err);
      alert(`Failed to sync changes: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
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
          Create Game
        </Typography>

        {loadError && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: '#ffebee', color: '#c62828' }}>
            <Typography>{loadError}</Typography>
          </Paper>
        )}

        <Stack direction="row" justifyContent="center" spacing={1.5} sx={{ mb: 3, flexWrap: "wrap" }}>
          <Button
            variant={activePanel === "home" ? "contained" : "outlined"}
            onClick={() => setActivePanel("home")}
            sx={{
              bgcolor: activePanel === "home" ? GREEN : "transparent",
              borderColor: GREEN,
              color: activePanel === "home" ? CREAM : GREEN,
              fontWeight: activePanel === "home" ? 700 : 500,
              textTransform: "none",
              "&:hover": { 
                bgcolor: activePanel === "home" ? "#004a01" : "rgba(0,95,2,.08)",
                color: activePanel === "home" ? CREAM : GREEN,
              },
            }}
          >
            Loyola Lineup
          </Button>

          <Button
            variant={activePanel === "opp" ? "contained" : "outlined"}
            onClick={() => setActivePanel("opp")}
            sx={{
              bgcolor: activePanel === "opp" ? GREEN : "transparent",
              borderColor: GREEN,
              color: activePanel === "opp" ? CREAM : GREEN,
              fontWeight: activePanel === "opp" ? 700 : 500,
              textTransform: "none",
              "&:hover": { 
                bgcolor: activePanel === "opp" ? "#004a01" : "rgba(0,95,2,.08)",
                color: activePanel === "opp" ? CREAM : GREEN,
              },
            }}
          >
            Opponent
          </Button>
        </Stack>

        <AnimatePresence mode="wait">
          {activePanel === "home" ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25 }}
            >
              <Paper
                elevation={6}
                sx={{
                  borderRadius: 4,
                  p: { xs: 2.5, md: 3 },
                  boxShadow: "0 10px 30px rgba(0,0,0,.12)",
                }}
              >
                <Typography sx={{ fontWeight: 900, color: GREEN, mb: 1.2 }}>Game Details</Typography>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    select
                    fullWidth
                    label="Your Team"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    slotProps={{
                      select: {
                        MenuProps: SELECT_MENU_PROPS,
                      },
                    }}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    {teams.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    label="Game Type"
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value)}
                    slotProps={{
                      select: {
                        MenuProps: SELECT_MENU_PROPS,
                      },
                    }}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    {GAME_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    fullWidth
                    label="Game Date"
                    type="datetime-local"
                    value={gameDate}
                    onChange={(e) => setGameDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  {/* RINK */}
                  <Box
                    sx={{
                      flex: 1,
                      position: "relative",
                      borderRadius: 3,
                      border: "1px solid rgba(0,0,0,.10)",
                      bgcolor: "#fff",
                      minHeight: 460,
                      overflow: "hidden",
                    }}
                  >
                    <Box sx={{ position: "absolute", top: "28%", left: 0, right: 0, height: 4, bgcolor: "rgba(255,0,0,.65)" }} />
                    <Box sx={{ position: "absolute", top: "58%", left: 0, right: 0, height: 4, bgcolor: "rgba(0,72,255,.55)" }} />
                    <Box sx={{ position: "absolute", top: "12%", left: "8%", width: 130, height: 130, borderRadius: 999, border: "4px solid rgba(255,0,0,.50)" }} />
                    <Box sx={{ position: "absolute", top: "12%", right: "8%", width: 130, height: 130, borderRadius: 999, border: "4px solid rgba(255,0,0,.50)" }} />

                    <StarterSlot title="Goalie" code="G" top="18%" left="50%" value={lineup.G} onChange={(v) => setLineupSlot("G", v)} options={optionsFor("G")} />
                    <StarterSlot title="Left D" code="LD" top="37%" left="33%" value={lineup.LD} onChange={(v) => setLineupSlot("LD", v)} options={optionsFor("LD")} />
                    <StarterSlot title="Right D" code="RD" top="37%" left="67%" value={lineup.RD} onChange={(v) => setLineupSlot("RD", v)} options={optionsFor("RD")} />
                    <StarterSlot title="Left Wing" code="LW" top="73%" left="30%" value={lineup.LW} onChange={(v) => setLineupSlot("LW", v)} options={optionsFor("LW")} />
                    <StarterSlot title="Center" code="C" top="76%" left="50%" value={lineup.C} onChange={(v) => setLineupSlot("C", v)} options={optionsFor("C")} />
                    <StarterSlot title="Right Wing" code="RW" top="73%" left="70%" value={lineup.RW} onChange={(v) => setLineupSlot("RW", v)} options={optionsFor("RW")} />
                  </Box>

                  {/* BENCH */}
                  <Paper
                    elevation={0}
                    sx={{
                      width: { xs: "100%", md: 280 },
                      borderRadius: 3,
                      border: "1px solid rgba(0,0,0,.10)",
                      bgcolor: "#fff",
                      p: 2,
                    }}
                  >
                    <Typography sx={{ fontWeight: 1000, color: GREEN, mb: 1 }}>Bench (9)</Typography>

                    <Stack spacing={1.2}>
                      {(["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"] as LineupSlot[]).map((slot, idx) => (
                        <Stack key={slot} direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: 2,
                              bgcolor: "rgba(0,95,2,.10)",
                              border: "1px solid rgba(0,95,2,.20)",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 1000,
                              color: GREEN,
                              fontSize: 12,
                            }}
                          >
                            {idx + 1}
                          </Box>

                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Player"
                            value={lineup[slot]}
                            onChange={(e) => setLineupSlot(slot, e.target.value)}
                            slotProps={{
                              select: {
                                MenuProps: SELECT_MENU_PROPS,
                              },
                            }}
                          >
                            <MenuItem value="">Select…</MenuItem>
                            {optionsFor(slot).map((p) => (
                              <MenuItem key={p.id} value={p.id}>
                                {playerLabel(p)}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                </Stack>

                <Stack direction="row" spacing={1.5} sx={{ mt: 2.5, flexWrap: "wrap" }}>
                  <Button 
                    variant="contained" 
                    onClick={handleCreate} 
                    disabled={!!isSubmitting} 
                    sx={{ 
                      bgcolor: GREEN,
                      color: CREAM,
                      fontWeight: 700,
                      textTransform: "none",
                      "&:hover": { 
                        bgcolor: "#004a01",
                        color: CREAM,
                      },
                    }}
                  >
                    {isSubmitting ? "Creating…" : "Create Game"}
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={() => setActivePanel("opp")} 
                    sx={{ 
                      borderColor: GREEN, 
                      color: GREEN,
                      fontWeight: 500,
                      textTransform: "none",
                      "&:hover": { bgcolor: "rgba(0,95,2,.08)" },
                    }}
                  >
                    → Opponent
                  </Button>
                </Stack>
              </Paper>
            </motion.div>
          ) : (
            <motion.div
              key="opp"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25 }}
            >
              <Paper
                elevation={6}
                sx={{
                  borderRadius: 4,
                  p: { xs: 2.5, md: 3 },
                  boxShadow: "0 10px 30px rgba(0,0,0,.12)",
                }}
              >
                <Typography sx={{ fontWeight: 900, color: GREEN, mb: 1.2 }}>Opponent</Typography>

                <TextField
                  fullWidth
                  label="Opponent Team Name"
                  value={oppTeamName}
                  onChange={(e) => setOppTeamName(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Divider sx={{ my: 2 }} />

                <Typography sx={{ fontWeight: 1000, color: GREEN, mb: 1 }}>Opponent Roster (15)</Typography>

                <Stack spacing={1.2}>
                  {oppRoster.map((p, i) => (
                    <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                      <TextField
                        label="#"
                        value={p.number}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOppRoster((prev) => prev.map((x, idx) => (idx === i ? { ...x, number: v } : x)));
                        }}
                        sx={{ width: { xs: "100%", sm: 140 } }}
                        inputProps={{ inputMode: "numeric" }}
                      />
                      <TextField
                        fullWidth
                        label="Name"
                        value={p.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOppRoster((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: v } : x)));
                        }}
                      />
                    </Stack>
                  ))}
                </Stack>

                <Stack direction="row" spacing={1.5} sx={{ mt: 2.5, flexWrap: "wrap" }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => setActivePanel("home")} 
                    sx={{ 
                      borderColor: GREEN, 
                      color: GREEN,
                      fontWeight: 500,
                      textTransform: "none",
                      "&:hover": { bgcolor: "rgba(0,95,2,.08)" },
                    }}
                  >
                    ← Back to Loyola
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleCreate} 
                    disabled={!!isSubmitting} 
                    sx={{ 
                      bgcolor: GREEN,
                      color: CREAM,
                      fontWeight: 700,
                      textTransform: "none",
                      "&:hover": { 
                        bgcolor: "#004a01",
                        color: CREAM,
                      },
                    }}
                  >
                    {isSubmitting ? "Creating…" : "Create Game"}
                  </Button>
                </Stack>
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Games Management Table */}
        <Paper
          elevation={6}
          sx={{
            borderRadius: 4,
            p: { xs: 2.5, md: 3 },
            mt: 4,
            boxShadow: "0 10px 30px rgba(0,0,0,.12)",
          }}
        >
          <Typography sx={{ fontWeight: 900, color: GREEN, mb: 2 }}>Manage Games</Typography>
          
          {games.length === 0 ? (
            <Typography sx={{ textAlign: "center", py: 4, color: GREEN, opacity: 0.7 }}>
              No games created yet. Create your first game above!
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Team</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Opponent</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Score</TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {games.map((game) => (
                    <TableRow key={game._id}>
                      <TableCell sx={{ color: GREEN }}>
                        {new Date(game.gameDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell sx={{ color: GREEN }}>
                        {teams.find(t => t.id === game.teamId)?.name || 'Unknown Team'}
                      </TableCell>
                      <TableCell sx={{ color: GREEN }}>
                        {game.opponentTeamName}
                      </TableCell>
                      <TableCell sx={{ color: GREEN }}>
                        <Chip 
                          label={game.gameType} 
                          size="small" 
                          sx={{ 
                            bgcolor: "rgba(0,95,2,.1)", 
                            color: GREEN,
                            fontSize: 12
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => updateGameScore(game._id, 'team', -1)}
                            sx={{ color: GREEN }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ color: GREEN, minWidth: 30, textAlign: "center" }}>
                            {game.teamScore || 0}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateGameScore(game._id, 'team', 1)}
                            sx={{ color: GREEN }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ color: GREEN, mx: 1 }}>vs</Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateGameScore(game._id, 'opponent', -1)}
                            sx={{ color: GREEN }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ color: GREEN, minWidth: 30, textAlign: "center" }}>
                            {game.opponentScore || 0}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateGameScore(game._id, 'opponent', 1)}
                            sx={{ color: GREEN }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => loadGameForEdit(game)}
                            sx={{ color: GREEN }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => deleteGame(game._id)}
                            sx={{ color: "#d32f2f" }}
                          >
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

          {hasChanges && (
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Button
                variant="contained"
                onClick={syncChanges}
                disabled={isSubmitting}
                sx={{
                  bgcolor: GREEN,
                  color: CREAM,
                  fontWeight: 700,
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: "#004a01",
                    color: CREAM,
                  },
                }}
              >
                {isSubmitting ? "Syncing…" : "Submit Changes to Database"}
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

function StarterSlot({
  title,
  code,
  top,
  left,
  value,
  onChange,
  options,
}: {
  title: string;
  code: string;
  top: string;
  left: string;
  value: string;
  onChange: (v: string) => void;
  options: RosterPlayer[];
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        top,
        left,
        transform: "translate(-50%, -50%)",
        width: 170,
        textAlign: "center",
      }}
    >
      <Box
        sx={{
          width: 76,
          height: 76,
          mx: "auto",
          mb: 1,
          borderRadius: 2.5,
          bgcolor: "rgba(0,95,2,.10)",
          border: "2px solid rgba(0,95,2,.20)",
          display: "grid",
          placeItems: "center",
          fontWeight: 1000,
          color: GREEN,
          letterSpacing: ".3px",
        }}
      >
        {code}
      </Box>

      <Typography sx={{ fontSize: 12, fontWeight: 900, color: GREEN, mb: 0.8 }}>{title}</Typography>

      <TextField
        select
        size="small"
        fullWidth
        label="Player"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        slotProps={{
          select: {
            MenuProps: SELECT_MENU_PROPS,
          },
        }}
      >
        <MenuItem value="">Select…</MenuItem>
        {options.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {playerLabel(p)}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}
