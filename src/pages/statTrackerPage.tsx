import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
  TextField,
  Divider,
  Button,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { motion, AnimatePresence } from "framer-motion";

type Team = { _id: string; name: string };

type Game = {
  _id: string;
  teamId: string;
  gameDate: string;
  gameType: string;
  opponent?: { teamName?: string };
};

type Player = {
  _id: string;
  name: string;
  number: number;
  teamId: string;
  position?: string;
};

type StatLine = {
  _id?: string;
  gameId: string;
  teamId: string;
  playerId: string;
  goals: number;
  assists: number;
  shots: number;
  hits: number;
  pim: number;
  plusMinus: number;
  saves: number;
  goalsAgainst: number;
};

const API = {
  teams: "/api/teams",
  games: "/api/games",
  players: "/api/players",
  stats: "/api/stats",
};

const CREAM = "#fff2d1";
const GREEN = "#005F02";

const CARD_GOLD_1 = "#f7e7b3";
const CARD_GOLD_2 = "#d7b35b";

const PAGE_SIZE = 5;
const SWIPE_THRESHOLD = 80;

const intOrZero = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const greenFieldSx = {
  "& .MuiInputLabel-root": { color: GREEN, fontWeight: 700 },
  "& .MuiInputLabel-root.Mui-focused": { color: GREEN },

  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: GREEN },
    "&:hover fieldset": { borderColor: GREEN },
    "&.Mui-focused fieldset": { borderColor: GREEN },
    "&.Mui-disabled fieldset": { borderColor: GREEN, opacity: 1 },
  },

  "& .MuiSelect-icon": { color: GREEN },

  // Selected value color
  "& .MuiSelect-select": { color: GREEN, fontWeight: 800 },

  // IMPORTANT: disabled selects get greyed out unless you force text fill
  "&.Mui-disabled .MuiSelect-select": {
    WebkitTextFillColor: GREEN,
    color: GREEN,
    opacity: 1,
  },

  // TextField inputs
  "& input": { color: GREEN, fontWeight: 800 },

  // Disabled TextField inputs
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: GREEN,
    color: GREEN,
    opacity: 1,
  },
};
//z-index stacking Bug solved
const greenMenuProps = {
  PaperProps: {
    sx: {
      zIndex: 3000, 
      "& .MuiMenuItem-root": { color: GREEN, fontWeight: 800, opacity: 1 },
      "& .MuiMenuItem-root.Mui-selected": { backgroundColor: "rgba(0,95,2,0.10)" },
      "& .MuiMenuItem-root.Mui-selected:hover": { backgroundColor: "rgba(0,95,2,0.15)" },
      "& .MuiMenuItem-root:hover": { backgroundColor: "rgba(0,95,2,0.12)" },
      "& .MuiMenuItem-root.Mui-disabled": { color: GREEN, opacity: 1 },
      "& .MuiList-root": { p: 0.5 },
    },
  },
  
  sx: { zIndex: 3000 },
};

export default function StatTrackerPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [teamId, setTeamId] = useState("");
  const [gameId, setGameId] = useState("");

  const [linesByPlayerId, setLinesByPlayerId] = useState<Record<string, StatLine>>({});

  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingGameData, setLoadingGameData] = useState(false);
  const [savingOne, setSavingOne] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);

  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  //Overlay editor state
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingStatKey, setEditingStatKey] = useState<keyof StatLine>("goals");
  const [editingValue, setEditingValue] = useState<number>(0);

  //Load teams once
  useEffect(() => {
    (async () => {
      setLoadingTeams(true);
      setMsg(null);
      try {
        const res = await fetch(API.teams);
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setMsg({ type: "error", text: "Failed to load teams." });
      } finally {
        setLoadingTeams(false);
      }
    })();
  }, []);

  // Load games + players when team changes
  useEffect(() => {
    if (!teamId) {
      setGames([]);
      setPlayers([]);
      setGameId("");
      setLinesByPlayerId({});
      setPageIndex(0);
      return;
    }

    (async () => {
      setLoadingGameData(true);
      setMsg(null);
      try {
        const [gRes, pRes] = await Promise.all([
          fetch(`${API.games}?teamId=${encodeURIComponent(teamId)}`),
          fetch(`${API.players}?teamId=${encodeURIComponent(teamId)}`),
        ]);

        const gData = await gRes.json();
        const pData = await pRes.json();

        setGames(Array.isArray(gData) ? gData : []);
        setPlayers(Array.isArray(pData) ? pData : []);
        setGameId("");
        setLinesByPlayerId({});
        setPageIndex(0);
      } catch (e) {
        console.error(e);
        setMsg({ type: "error", text: "Failed to load games/players." });
      } finally {
        setLoadingGameData(false);
      }
    })();
  }, [teamId]);

  // Load stats when game changes (initialize missing players)
  useEffect(() => {
    if (!teamId || !gameId) {
      setLinesByPlayerId({});
      setPageIndex(0);
      return;
    }

    (async () => {
      setLoadingGameData(true);
      setMsg(null);
      try {
        const res = await fetch(
          `${API.stats}?teamId=${encodeURIComponent(teamId)}&gameId=${encodeURIComponent(gameId)}`
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "stats fetch failed");
        }

        const existing: StatLine[] = await res.json();

        const map: Record<string, StatLine> = {};
        if (Array.isArray(existing)) {
          for (const s of existing) map[s.playerId] = s;
        }

        // Ensure every roster player has a line
        for (const p of players) {
          if (!map[p._id]) {
            map[p._id] = {
              gameId,
              teamId,
              playerId: p._id,
              goals: 0,
              assists: 0,
              shots: 0,
              hits: 0,
              pim: 0,
              plusMinus: 0,
              saves: 0,
              goalsAgainst: 0,
            };
          } else {
            map[p._id] = {
              ...map[p._id],
              goals: map[p._id].goals ?? 0,
              assists: map[p._id].assists ?? 0,
              shots: map[p._id].shots ?? 0,
              hits: map[p._id].hits ?? 0,
              pim: map[p._id].pim ?? 0,
              plusMinus: map[p._id].plusMinus ?? 0,
              saves: map[p._id].saves ?? 0,
              goalsAgainst: map[p._id].goalsAgainst ?? 0,
            };
          }
        }

        setLinesByPlayerId(map);
        setPageIndex(0);
      } catch (e) {
        console.error(e);
        setMsg({ type: "error", text: "Failed to load stats." });
      } finally {
        setLoadingGameData(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, gameId, players.length]);

  const selectedGame = useMemo(() => games.find((g) => g._id === gameId), [games, gameId]);

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.number - b.number), [players]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedPlayers.length / PAGE_SIZE)),
    [sortedPlayers.length]
  );

  const pagePlayers = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return sortedPlayers.slice(start, start + PAGE_SIZE).map((p) => ({
      player: p,
      stat: linesByPlayerId[p._id],
    }));
  }, [sortedPlayers, linesByPlayerId, pageIndex]);

  const canPrev = pageIndex > 0;
  const canNext = pageIndex < totalPages - 1;

  const prevPage = () => setPageIndex((v) => Math.max(0, v - 1));
  const nextPage = () => setPageIndex((v) => Math.min(totalPages - 1, v + 1));

  const onTeamChange = (e: SelectChangeEvent) => setTeamId(e.target.value);
  const onGameChange = (e: SelectChangeEvent) => setGameId(e.target.value);

  const editingPlayer = useMemo(() => {
    if (!editingPlayerId) return null;
    return sortedPlayers.find((p) => p._id === editingPlayerId) || null;
  }, [editingPlayerId, sortedPlayers]);

  const openEdit = (playerId: string) => {
  let line = linesByPlayerId[playerId];

  // If stats failed to load, create a default line on the fly
  if (!line) {
    line = {
      gameId,
      teamId,
      playerId,
      goals: 0,
      assists: 0,
      shots: 0,
      hits: 0,
      pim: 0,
      plusMinus: 0,
      saves: 0,
      goalsAgainst: 0,
    };

    setLinesByPlayerId(prev => ({
      ...prev,
      [playerId]: line!,
    }));
  }

  setEditingPlayerId(playerId);
  setEditingStatKey("goals");
  setEditingValue(line.goals ?? 0);
};

  const closeEdit = () => setEditingPlayerId(null);

  const saveOne = async () => {
  if (!editingPlayerId || !teamId || !gameId) return;

  const playerLine = linesByPlayerId[editingPlayerId];
  if (!playerLine) return;

  // local optimistic update
  const nextLine: StatLine = {
    ...playerLine,
    [editingStatKey]:
      editingStatKey === "plusMinus"
        ? Number(editingValue) || 0
        : intOrZero(editingValue),
  };

  setLinesByPlayerId((prev) => ({ ...prev, [editingPlayerId]: nextLine }));

  setSavingOne(true);
  setMsg(null);

  try {
    const payloadLine = {
      playerId: nextLine.playerId,
      goals: nextLine.goals,
      assists: nextLine.assists,
      shots: nextLine.shots,
      hits: nextLine.hits,
      pim: nextLine.pim,
      plusMinus: nextLine.plusMinus,
      saves: nextLine.saves,
      goalsAgainst: nextLine.goalsAgainst,
    };

    const res = await fetch(`${API.stats}/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, gameId, lines: [payloadLine] }),
    });

    // ✅ handle 204 / empty body / non-json safely
    const raw = await res.text();
    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        // ignore parse errors; treat as non-json success/fail based on status
      }
    }

    if (!res.ok) {
      setMsg({ type: "error", text: data?.error || `Failed to save stat. (${res.status})` });
      return;
    }

    setMsg({ type: "success", text: "Stat saved!" });
    closeEdit();
  } catch (e) {
    console.error(e);
    setMsg({ type: "error", text: "Failed to save stat." });
  } finally {
    setSavingOne(false);
  }
};

  const pageLabelColor = GREEN;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: CREAM, py: 5 }}>
      <Container maxWidth="lg">
        <Stack spacing={2.5}>
          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 1000,
              color: GREEN,
              fontFamily: "Oswald, sans-serif",
              letterSpacing: "-0.03em",
              fontSize: { xs: 34, sm: 44, md: 56 },
            }}
          >
            Stat Tracker
          </Typography>

          {/* Controls */}
          <Paper elevation={6} sx={{ p: 2.5, borderRadius: 4 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
              <FormControl fullWidth sx={{ minWidth: 220 }} disabled={loadingTeams}>
                <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>Team</InputLabel>
                <Select
                  label="Team"
                  value={teamId}
                  onChange={onTeamChange}
                  displayEmpty
                  sx={greenFieldSx}
                  MenuProps={greenMenuProps}
                >
                  <MenuItem value="" sx={{ color: GREEN, fontWeight: 800 }}>
                    Select team
                  </MenuItem>
                  {teams.map((t) => (
                    <MenuItem key={t._id} value={t._id} sx={{ color: GREEN, fontWeight: 800 }}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ minWidth: 320 }} disabled={!teamId}>
                <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>Game</InputLabel>
                <Select
                  label="Game"
                  value={gameId}
                  onChange={onGameChange}
                  displayEmpty
                  sx={greenFieldSx}
                  MenuProps={greenMenuProps}
                >
                  <MenuItem value="" sx={{ color: GREEN, fontWeight: 800 }}>
                    Select game
                  </MenuItem>

                  {games.map((g) => (
                    <MenuItem key={g._id} value={g._id} sx={{ color: GREEN, fontWeight: 800 }}>
                      {new Date(g.gameDate).toLocaleDateString()} — {g.gameType} vs{" "}
                      {g.opponent?.teamName || "Opponent"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ minWidth: 180, display: "flex", justifyContent: "flex-end" }}>
                {loadingTeams || loadingGameData ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} />
                    <Typography variant="body2" sx={{ color: GREEN, fontWeight: 800 }}>
                      Loading…
                    </Typography>
                  </Stack>
                ) : null}
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {selectedGame ? (
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                <Typography sx={{ color: GREEN, fontWeight: 900 }}>
                  {new Date(selectedGame.gameDate).toLocaleString()} • {selectedGame.gameType} • vs{" "}
                  {selectedGame.opponent?.teamName || "—"}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ color: GREEN, fontWeight: 900 }}>
                  {sortedPlayers.length} players loaded
                </Typography>
              </Stack>
            ) : (
              <Typography sx={{ opacity: 1, color: GREEN, fontWeight: 700 }}>Pick a game to load the player cards.</Typography>
            )}

            {msg && (
              <Box sx={{ mt: 2 }}>
                <Alert severity={msg.type}>{msg.text}</Alert>
              </Box>
            )}
          </Paper>

          {/* Cards */}
          <Paper elevation={6} sx={{ borderRadius: 4, p: 2.5 }}>
            {!teamId || !gameId ? (
              <Box sx={{ p: 2 }}>
                <Typography sx = {{color:GREEN, fontWeight: 700}}>Select a team and game to begin.</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {/* Paging controls */}
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton onClick={prevPage} disabled={!canPrev}>
                    <ChevronLeftIcon />
                  </IconButton>

                  <Typography sx={{ fontWeight: 1000, color: GREEN }}>
                    Players {pageIndex * PAGE_SIZE + 1}–{Math.min(sortedPlayers.length, (pageIndex + 1) * PAGE_SIZE)} of{" "}
                    {sortedPlayers.length}
                  </Typography>

                  <IconButton onClick={nextPage} disabled={!canNext}>
                    <ChevronRightIcon />
                  </IconButton>

                  <Box sx={{ flex: 1 }} />

                  <Typography sx={{ color: pageLabelColor, fontWeight: 1000 }}>
                    Page {pageIndex + 1}/{totalPages}
                  </Typography>
                </Stack>

                {/* Swipe row */}
                <Box sx={{ overflow: "hidden" }}>
                  <Box
                    component={motion.div}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.15}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > SWIPE_THRESHOLD) prevPage();
                      else if (info.offset.x < -SWIPE_THRESHOLD) nextPage();
                    }}
                    sx={{ pointerEvents: editingPlayerId ? "none" : "auto" }}
                  >
                    <Grid container spacing={2} sx={{ flexWrap: { xs: "wrap", md: "nowrap" } }}>
                      {pagePlayers.map(({ player, stat }) => (
                        <Grid item xs={12} sm={6} md={2.4 as any} key={player._id}>
                          <PlayerFifaCard
                            player={player}
                            stat={stat}
                            onClick={() => openEdit(player._id)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Box>

                <Typography sx={{ opacity: 0.6, fontSize: 12, color: GREEN }}>
                  Tip: Swipe left/right (or use arrows) to move between groups of 5.
                </Typography>
              </Stack>
            )}
          </Paper>
        </Stack>

        {/* Zoom overlay editor (replaces Dialog) */}
        <AnimatePresence>
          {editingPlayerId && editingPlayer && (
            <Box
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              sx={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
                bgcolor: "rgba(0,0,0,.55)",
                display: "grid",
                placeItems: "center",
                p: 2,
              }}
              onClick={closeEdit}
            >
              <Box
                onClick={(e) => e.stopPropagation()}
                component={motion.div}
                initial={{ opacity: 0, scale: 0.92, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.18 }}
                sx={{
                  width: "min(920px, 96vw)",
                  borderRadius: 4,
                  overflow: "hidden",
                  boxShadow: "0 18px 70px rgba(0,0,0,.45)",
                }}
              >
                <Paper sx={{ p: { xs: 2, md: 3 }, bgcolor: CREAM }}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems="center">
                    <Box sx={{ width: { xs: "100%", md: 360 } }}>
                      <PlayerFifaCard
                        player={editingPlayer}
                        stat={linesByPlayerId[editingPlayerId]}
                        onClick={() => {}}
                        size="lg"
                      />
                    </Box>

                    <Box sx={{ flex: 1, width: "100%" }}>
                      <Typography sx={{ fontWeight: 1000, color: GREEN, mb: 1 }}>
                        Edit Stats — #{editingPlayer.number} {editingPlayer.name}
                      </Typography>

                      <Stack spacing={2}>
                        <FormControl fullWidth>
                          <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>Stat</InputLabel>
                          <Select
                            label="Stat"
                            value={editingStatKey as string}
                            onChange={(e) => {
                              const k = e.target.value as keyof StatLine;
                              setEditingStatKey(k);
                              const line = linesByPlayerId[editingPlayerId];
                              setEditingValue(Number((line as any)?.[k] ?? 0));
                            }}
                            sx={{
                              ...greenFieldSx,
                              "& .MuiSelect-select": { color: GREEN, fontWeight: 800 },
                            }}
                            MenuProps={greenMenuProps}
                          >
                            <MenuItem value="goals">Goals</MenuItem>
                            <MenuItem value="assists">Assists</MenuItem>
                            <MenuItem value="shots">Shots</MenuItem>
                            <MenuItem value="hits">Hits</MenuItem>
                            <MenuItem value="pim">PIM</MenuItem>
                            <MenuItem value="plusMinus">Plus/Minus</MenuItem>
                            <MenuItem value="saves">Saves</MenuItem>
                            <MenuItem value="goalsAgainst">Goals Against</MenuItem>
                          </Select>
                        </FormControl>

                        <TextField
                          type="number"
                          label="Value"
                          value={editingValue}
                          onChange={(e) => setEditingValue(Number(e.target.value))}
                          fullWidth
                          sx={greenFieldSx}
                        />

                        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                          <Button
                            variant="outlined"
                            onClick={closeEdit}
                            sx={{ borderColor: GREEN, color: GREEN, fontWeight: 900 }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            onClick={saveOne}
                            sx={{ bgcolor: GREEN, fontWeight: 1000 }}
                            disabled={savingOne}
                          >
                            {savingOne ? "Saving…" : "Save"}
                          </Button>
                        </Stack>

                        {msg && (
                          <Alert severity={msg.type} sx={{ mt: 1 }}>
                            {msg.text}
                          </Alert>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            </Box>
          )}
        </AnimatePresence>
      </Container>
    </Box>
  );
}

function PlayerFifaCard({
  player,
  stat,
  onClick,
  size = "md",
}: {
  player: Player;
  stat?: StatLine;
  onClick: () => void;
  size?: "md" | "lg";
}) {
  const g = stat?.goals ?? 0;
  const a = stat?.assists ?? 0;
  const sh = stat?.shots ?? 0;
  const h = stat?.hits ?? 0;
  const pim = stat?.pim ?? 0;
  const pm = stat?.plusMinus ?? 0;

  const isLg = size === "lg";
  const pad = isLg ? 2.4 : 1.5;
  const numSize = isLg ? 30 : 22;
  const posSize = isLg ? 14 : 12;
  const silhouetteH = isLg ? 150 : 92;
  const nameSize = isLg ? 16 : 13;
  const statSize = isLg ? 14 : 12;

  return (
    <Paper
      onClick={onClick}
      elevation={8}
      sx={{
        cursor: "pointer",
        borderRadius: "18px",
        overflow: "hidden",
        transition: "transform .15s ease, box-shadow .15s ease",
        "&:hover": { transform: isLg ? "none" : "translateY(-5px)" },
        background: `linear-gradient(135deg, ${CARD_GOLD_1}, ${CARD_GOLD_2})`,
        border: "1px solid rgba(0,0,0,.12)",
        pointerEvents: isLg ? "none" : "auto",
      }}
    >
      <Box sx={{ p: pad }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography sx={{ fontWeight: 1000, fontSize: numSize, lineHeight: 1 }}>
              {player.number}
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: posSize, opacity: 0.85 }}>
              {player.position || "—"}
            </Typography>
          </Box>

          <Typography sx={{ fontWeight: 1000, fontSize: posSize, opacity: 0.85 }}>
            SAUCE
          </Typography>
        </Stack>

        <Box
          sx={{
            mt: 1,
            height: silhouetteH,
            borderRadius: 2,
            bgcolor: "rgba(0,0,0,.10)",
          }}
        />

        <Typography
          sx={{
            mt: 1.2,
            textAlign: "center",
            fontWeight: 1000,
            letterSpacing: ".02em",
            fontSize: nameSize,
          }}
        >
          {player.name.toUpperCase()}
        </Typography>

        <Divider sx={{ my: 1, opacity: 0.4 }} />

        <Stack direction="row" justifyContent="space-between">
          <Box>
            <Typography sx={{ fontSize: statSize, fontWeight: 1000 }}>G {g}</Typography>
            <Typography sx={{ fontSize: statSize, fontWeight: 1000 }}>A {a}</Typography>
            <Typography sx={{ fontSize: statSize, fontWeight: 1000 }}>S {sh}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: statSize, fontWeight: 1000 }}>H {h}</Typography>
            <Typography sx={{ fontSize: statSize, fontWeight: 1000 }}>PIM {pim}</Typography>
            <Typography sx={{ fontSize: statSize, fontWeight: 1000 }}>+/- {pm}</Typography>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}