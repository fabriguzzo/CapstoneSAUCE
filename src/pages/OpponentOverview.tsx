import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  Chip,
  Button,
} from "@mui/material";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuthFetch } from "../hooks/useAuthFetch";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

interface Player {
  _id: string;
  name: string;
  number: number;
}

interface Game {
  _id: string;
  teamId: string;
  gameDate: string;
  gameType: string;
  opponent?: { teamName?: string };
  score?: { us?: number; them?: number };
  status?: string;
}

interface FinalStat {
  gameId: string;
  teamId: string;
  playerId: string;
  goals: number;
  assists: number;
  shots: number;
  hits: number;
  pim: number;
  saves: number;
}

interface Team {
  _id: string;
  name: string;
}

const STAT_FIELDS = [
  { key: "goals", label: "Goals", color: "#8884d8" },
  { key: "assists", label: "Assists", color: "#82ca9d" },
  { key: "shots", label: "Shots", color: "#ffc658" },
  { key: "hits", label: "Hits", color: "#ff7300" },
  { key: "pim", label: "PIM", color: "#ef4444" },
  { key: "saves", label: "Saves", color: "#10b981" },
] as const;

const CREAM = "#fff2d1";
const GREEN = "#005F02";
const DARK_GREEN = "#003801";

const greenFieldSx = {
  "& .MuiInputLabel-root": { color: GREEN, fontWeight: 700 },
  "& .MuiInputLabel-root.Mui-focused": { color: GREEN },
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: GREEN },
    "&:hover fieldset": { borderColor: GREEN },
    "&.Mui-focused fieldset": { borderColor: GREEN },
  },
  "& .MuiSelect-icon": { color: GREEN },
  "& .MuiSelect-select": { color: GREEN, fontWeight: 700 },
  "& input": { color: GREEN, fontWeight: 700 },
};

const greenMenuProps = {
  PaperProps: {
    sx: {
      zIndex: 3000,
      "& .MuiMenuItem-root": { color: GREEN, fontWeight: 700 },
      "& .MuiMenuItem-root.Mui-selected": {
        backgroundColor: "rgba(0,95,2,0.10)",
      },
    },
  },
  sx: { zIndex: 3000 },
};

export default function OpponentOverview() {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const [searchParams] = useSearchParams();

  const initialTeamId = searchParams.get("teamId") || "";
  const initialOpponent = searchParams.get("opponent") || "";

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId);
  const [opponents, setOpponents] = useState<string[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState(initialOpponent);

  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [finalStats, setFinalStats] = useState<FinalStat[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [viewMode, setViewMode] = useState<"team" | "players">("team");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedStats, setSelectedStats] = useState<string[]>(["goals", "assists", "shots", "hits"]);

  // Load teams on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/teams`);
        const data: Team[] = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching teams:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // When team is selected, load all its games to discover opponents
  useEffect(() => {
    if (!selectedTeamId) {
      setOpponents([]);
      setSelectedOpponent("");
      return;
    }
    (async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/games?teamId=${selectedTeamId}`);
        const allGames: Game[] = await res.json();
        const opponentSet = new Set<string>();
        allGames.forEach((g) => {
          const name = g.opponent?.teamName;
          if (name) opponentSet.add(name);
        });
        setOpponents([...opponentSet].sort());

        // Also load players for this team
        const playersRes = await authFetch(`${API_BASE_URL}/api/players?teamId=${selectedTeamId}`);
        const playersData = await playersRes.json();
        setPlayers(Array.isArray(playersData) ? playersData : []);
      } catch (err) {
        console.error("Error fetching games for team:", err);
      }
    })();
  }, [selectedTeamId]);

  // When opponent is selected, fetch matching games and their final stats
  useEffect(() => {
    if (!selectedTeamId || !selectedOpponent) {
      setGames([]);
      setFinalStats([]);
      return;
    }
    (async () => {
      setIsLoadingStats(true);
      try {
        const res = await authFetch(`${API_BASE_URL}/api/games?teamId=${selectedTeamId}`);
        const allGames: Game[] = await res.json();
        const matched = allGames
          .filter((g) => g.opponent?.teamName === selectedOpponent)
          .sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());
        setGames(matched);

        if (matched.length > 0) {
          const gameIds = matched.map((g) => g._id).join(",");
          const statsRes = await authFetch(
            `${API_BASE_URL}/api/stats/history/final?gameIds=${encodeURIComponent(gameIds)}`
          );
          const statsData: FinalStat[] = await statsRes.json();
          setFinalStats(Array.isArray(statsData) ? statsData : []);
        } else {
          setFinalStats([]);
        }
      } catch (err) {
        console.error("Error fetching opponent games:", err);
      } finally {
        setIsLoadingStats(false);
      }
    })();
  }, [selectedTeamId, selectedOpponent]);

  // Build chart data: each game on X-axis, team-total stats as Y values
  const teamChartData = useMemo(() => {
    if (games.length === 0 || finalStats.length === 0) return [];

    return games.map((game, idx) => {
      const gameStats = finalStats.filter((s) => s.gameId === game._id);

      const totals: Record<string, number> = {};
      STAT_FIELDS.forEach((stat) => {
        totals[stat.key] = 0;
      });
      gameStats.forEach((ps) => {
        STAT_FIELDS.forEach((stat) => {
          totals[stat.key] += (ps as unknown as Record<string, number>)[stat.key] || 0;
        });
      });

      const date = new Date(game.gameDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const score =
        game.score ? `${game.score.us ?? 0}-${game.score.them ?? 0}` : "";

      return {
        gameIndex: idx + 1,
        label: `Game ${idx + 1}\n${date}`,
        shortLabel: `G${idx + 1}`,
        tooltip: `Game ${idx + 1} — ${date}${score ? ` (${score})` : ""}`,
        ...totals,
      };
    });
  }, [games, finalStats]);

  // Build player chart data: each game on X-axis, per-player stats as Y values
  const playerChartData = useMemo(() => {
    if (games.length === 0 || finalStats.length === 0) return [];

    return games.map((game, idx) => {
      const gameStats = finalStats.filter((s) => s.gameId === game._id);
      const date = new Date(game.gameDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const score =
        game.score ? `${game.score.us ?? 0}-${game.score.them ?? 0}` : "";

      const point: Record<string, string | number> = {
        gameIndex: idx + 1,
        label: `Game ${idx + 1}\n${date}`,
        shortLabel: `G${idx + 1}`,
        tooltip: `Game ${idx + 1} — ${date}${score ? ` (${score})` : ""}`,
      };

      selectedPlayers.forEach((playerId) => {
        const playerStat = gameStats.find((s) => s.playerId === playerId);
        const player = players.find((p) => p._id === playerId);
        const playerName = player ? `#${player.number}` : playerId;

        STAT_FIELDS.forEach((stat) => {
          point[`${playerName}_${stat.key}`] = playerStat
            ? (playerStat as unknown as Record<string, number>)[stat.key] || 0
            : 0;
        });
      });

      return point;
    });
  }, [games, finalStats, selectedPlayers, players]);

  const chartData = viewMode === "players" ? playerChartData : teamChartData;

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const handleStatToggle = (statKey: string) => {
    setSelectedStats((prev) =>
      prev.includes(statKey) ? prev.filter((key) => key !== statKey) : [...prev, statKey]
    );
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: CREAM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress sx={{ color: GREEN }} />
      </Box>
    );
  }

  return (
    <>
      <Navbar />
      <Box sx={{ minHeight: "100vh", bgcolor: CREAM, py: { xs: 4, md: 6 }, pt: { xs: 12, md: 14 } }}>
        <Container maxWidth="xl">
          <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
            <Button
              onClick={() => navigate("/gamehistory")}
              sx={{ color: GREEN, fontWeight: 600, mr: 2 }}
            >
              ← Back to Game History
            </Button>
          </Stack>

          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              fontSize: { xs: 28, sm: 36, md: 48 },
              mb: 1,
              color: GREEN,
              fontFamily: "Oswald, sans-serif",
            }}
          >
            Opponent Overview
          </Typography>

          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 600,
              fontSize: { xs: 14, md: 18 },
              mb: 3,
              color: GREEN,
              opacity: 0.8,
            }}
          >
            View stats across all games against an opponent
          </Typography>

          {/* Team + Opponent selectors */}
          <Paper
            elevation={6}
            sx={{
              borderRadius: 4,
              p: 3,
              mb: 3,
              boxShadow: "0 10px 30px rgba(0,0,0,.12)",
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ minWidth: 200 }}>
                <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>Team</InputLabel>
                <Select
                  value={selectedTeamId}
                  label="Team"
                  onChange={(e) => {
                    setSelectedTeamId(e.target.value);
                    setSelectedOpponent("");
                  }}
                  sx={greenFieldSx}
                  MenuProps={greenMenuProps}
                >
                  {teams.map((team) => (
                    <MenuItem key={team._id} value={team._id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ minWidth: 200 }} disabled={!selectedTeamId}>
                <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>Opponent</InputLabel>
                <Select
                  value={selectedOpponent}
                  label="Opponent"
                  onChange={(e) => setSelectedOpponent(e.target.value)}
                  sx={greenFieldSx}
                  MenuProps={greenMenuProps}
                >
                  {opponents.map((name) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ minWidth: 180 }}>
                <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>View Mode</InputLabel>
                <Select
                  value={viewMode}
                  label="View Mode"
                  onChange={(e) => setViewMode(e.target.value as "team" | "players")}
                  sx={greenFieldSx}
                  MenuProps={greenMenuProps}
                >
                  <MenuItem value="team">Team Totals</MenuItem>
                  <MenuItem value="players">Individual Players</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Typography sx={{ fontWeight: 800, color: GREEN, mt: 1, mb: 1 }}>
              Stats to Display:
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {STAT_FIELDS.map((stat) => (
                <Chip
                  key={stat.key}
                  label={stat.label}
                  onClick={() => handleStatToggle(stat.key)}
                  sx={{
                    bgcolor: selectedStats.includes(stat.key) ? stat.color : "rgba(0,95,2,.1)",
                    color: selectedStats.includes(stat.key) ? "#fff" : GREEN,
                    fontWeight: 700,
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: selectedStats.includes(stat.key) ? stat.color : "rgba(0,95,2,.2)",
                    },
                  }}
                />
              ))}
            </Box>

            {viewMode === "players" && (
              <>
                <Typography sx={{ fontWeight: 800, color: GREEN, mt: 3, mb: 1 }}>
                  Select Players:
                </Typography>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {players.map((player) => (
                    <Chip
                      key={player._id}
                      label={`#${player.number} ${player.name}`}
                      onClick={() => handlePlayerToggle(player._id)}
                      sx={{
                        bgcolor: selectedPlayers.includes(player._id) ? GREEN : "rgba(0,95,2,.1)",
                        color: selectedPlayers.includes(player._id) ? CREAM : GREEN,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </Box>
              </>
            )}
          </Paper>

          {/* Info strip showing matched games */}
          {selectedTeamId && selectedOpponent && (
            <Paper
              elevation={3}
              sx={{ borderRadius: 4, p: 2, mb: 3, bgcolor: GREEN, color: CREAM }}
            >
              <Typography sx={{ fontWeight: 800, textAlign: "center", fontSize: { xs: 16, md: 20 }, color: CREAM }}>
                {games.length} game{games.length !== 1 ? "s" : ""} found vs {selectedOpponent}
              </Typography>
              {games.length > 0 && (
                <Typography
                  sx={{ textAlign: "center", mt: 0.5, opacity: 0.85, fontSize: { xs: 12, md: 14 }, color: CREAM }}
                >
                  {games.map((g, i) => {
                    const date = new Date(g.gameDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const score = g.score
                      ? ` (${g.score.us ?? 0}-${g.score.them ?? 0})`
                      : "";
                    return `Game ${i + 1}: ${date}${score}`;
                  }).join("  •  ")}
                </Typography>
              )}
            </Paper>
          )}

          {/* Chart */}
          <Paper
            elevation={6}
            sx={{
              borderRadius: 4,
              p: 3,
              boxShadow: "0 10px 30px rgba(0,0,0,.12)",
              bgcolor: DARK_GREEN,
            }}
          >
            {isLoadingStats ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress sx={{ color: CREAM }} />
              </Box>
            ) : !selectedTeamId || !selectedOpponent ? (
              <Typography sx={{ textAlign: "center", py: 8, color: CREAM, opacity: 0.7 }}>
                Select a team and opponent to view stats across games.
              </Typography>
            ) : chartData.length === 0 ? (
              <Typography sx={{ textAlign: "center", py: 8, color: CREAM, opacity: 0.7 }}>
                No stat data available for these games.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={500}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke={CREAM} strokeDasharray="5 5" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="shortLabel"
                    stroke={CREAM}
                    tick={{ fill: CREAM, fontWeight: 600 }}
                  />
                  <YAxis
                    stroke={CREAM}
                    tick={{ fill: CREAM, fontWeight: 600 }}
                    tickCount={10}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    labelFormatter={(_, payload) => {
                      const point = payload?.[0]?.payload;
                      return point?.tooltip || "";
                    }}
                  />
                  <Legend wrapperStyle={{ color: CREAM }} />

                  {viewMode === "players"
                    ? STAT_FIELDS.filter((stat) => selectedStats.includes(stat.key)).flatMap(
                        (stat) =>
                          selectedPlayers.map((playerId) => {
                            const player = players.find((p) => p._id === playerId);
                            const playerName = player ? `#${player.number}` : playerId;

                            return (
                              <Line
                                key={`${playerId}-${stat.key}`}
                                type="monotone"
                                dataKey={`${playerName}_${stat.key}`}
                                stroke={stat.color}
                                strokeWidth={2}
                                dot={{ r: 5, fill: stat.color, strokeWidth: 2, stroke: CREAM }}
                                name={`${player?.name || playerId} - ${stat.label}`}
                              />
                            );
                          })
                      )
                    : STAT_FIELDS.filter((stat) => selectedStats.includes(stat.key)).map(
                        (stat) => (
                          <Line
                            key={stat.key}
                            type="monotone"
                            dataKey={stat.key}
                            stroke={stat.color}
                            strokeWidth={3}
                            dot={{ r: 5, fill: stat.color, strokeWidth: 2, stroke: CREAM }}
                            name={stat.label}
                          />
                        )
                      )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Container>
      </Box>
    </>
  );
}
