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
import { useParams, useNavigate, useLocation } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
const PERIOD_LENGTH_SECONDS = 20 * 60;

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
  status?: "scheduled" | "live" | "intermission" | "final";
  currentPeriod?: number;
  clockSecondsRemaining?: number;
}

interface StatHistoryEntry {
  _id: string;
  gameId: string;
  teamId: string;
  playerId: string;
  timestamp: string;
  period?: number;
  clockSecondsRemaining?: number;
  gameSecondsElapsed?: number;
  goals: number;
  assists: number;
  shots: number;
  hits: number;
  pim: number;
  plusMinus: number;
  saves: number;
  goalsAgainst: number;
}

const STAT_FIELDS = [
  { key: "goals", label: "Goals", color: "#8884d8" },
  { key: "assists", label: "Assists", color: "#82ca9d" },
  { key: "shots", label: "Shots", color: "#ffc658" },
  { key: "hits", label: "Hits", color: "#ff7300" },
  { key: "pim", label: "PIM", color: "#ef4444" },
  { key: "plusMinus", label: "+/-", color: "#3b82f6" },
  { key: "saves", label: "Saves", color: "#10b981" },
  { key: "goalsAgainst", label: "Goals Against", color: "#f43f5e" },
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

function formatClockRemaining(secondsRemaining = 0): string {
  const safe = Math.max(0, secondsRemaining);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatPeriodClock(period = 1, clockSecondsRemaining = 1200): string {
  return `P${period} ${formatClockRemaining(clockSecondsRemaining)}`;
}

function uniqueTimeOptions(history: StatHistoryEntry[]) {
  const seen = new Set<string>();
  return history.filter((entry) => {
    const key = `${entry.period ?? 1}-${entry.clockSecondsRemaining ?? 1200}-${entry.gameSecondsElapsed ?? 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function GameStats() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isLiveMode = location.pathname.includes("/live");

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [statHistory, setStatHistory] = useState<StatHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<"total" | "cumulative" | "players">("cumulative");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedStats, setSelectedStats] = useState<string[]>(["goals", "assists", "shots", "hits"]);
  const [timeRangeStart, setTimeRangeStart] = useState<number | "">("");
  const [timeRangeEnd, setTimeRangeEnd] = useState<number | "">("");

  async function fetchData() {
    try {
      const gameRes = await fetch(`${API_BASE_URL}/api/games/${gameId}`);
      const gameData = await gameRes.json();
      setGame(gameData);

      const playersRes = await fetch(`${API_BASE_URL}/api/players?teamId=${gameData.teamId}`);
      const playersData = await playersRes.json();
      setPlayers(Array.isArray(playersData) ? playersData : []);

      const historyRes = await fetch(`${API_BASE_URL}/api/stats/history/game/${gameId}`);
      const historyData = await historyRes.json();
      setStatHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!gameId) return;
    setIsLoading(true);
    fetchData();
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !isLiveMode) return;
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [gameId, isLiveMode]);

  const sortedHistory = useMemo(() => {
    return [...statHistory].sort((a, b) => {
      const aTime = a.gameSecondsElapsed ?? 0;
      const bTime = b.gameSecondsElapsed ?? 0;
      if (aTime !== bTime) return aTime - bTime;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }, [statHistory]);

  const filteredHistory = useMemo(() => {
    let filtered = sortedHistory;

    if (timeRangeStart !== "") {
      filtered = filtered.filter((entry) => (entry.gameSecondsElapsed ?? 0) >= timeRangeStart);
    }

    if (timeRangeEnd !== "") {
      filtered = filtered.filter((entry) => (entry.gameSecondsElapsed ?? 0) <= timeRangeEnd);
    }

    return filtered;
  }, [sortedHistory, timeRangeStart, timeRangeEnd]);

  const chartData = useMemo(() => {
    if (filteredHistory.length === 0) return [];

    if (viewMode === "players") {
      const playerDataByTime: Record<string, Record<string, string | number>> = {};

      filteredHistory.forEach((entry) => {
        const gameSecondsElapsed = entry.gameSecondsElapsed ?? 0;
        const timeKey = String(gameSecondsElapsed);

        if (!playerDataByTime[timeKey]) {
          playerDataByTime[timeKey] = {
            gameSecondsElapsed,
            label: formatPeriodClock(entry.period ?? 1, entry.clockSecondsRemaining ?? 1200),
          };
        }

        if (selectedPlayers.includes(entry.playerId)) {
          const player = players.find((p) => p._id === entry.playerId);
          const playerName = player ? `#${player.number}` : entry.playerId;

          STAT_FIELDS.forEach((stat) => {
            const key = `${playerName}_${stat.key}`;
            playerDataByTime[timeKey][key] =
              Number(entry[stat.key as keyof StatHistoryEntry]) || 0;
          });
        }
      });

      return Object.values(playerDataByTime).sort(
        (a, b) => Number(a.gameSecondsElapsed) - Number(b.gameSecondsElapsed)
      );
    }

    const snapshotsByPlayer: Record<string, Record<string, number>> = {};
    const series: Array<Record<string, string | number>> = [];

    filteredHistory.forEach((entry) => {
      const playerId = String(entry.playerId);

      snapshotsByPlayer[playerId] = {
        goals: entry.goals ?? 0,
        assists: entry.assists ?? 0,
        shots: entry.shots ?? 0,
        hits: entry.hits ?? 0,
        pim: entry.pim ?? 0,
        plusMinus: entry.plusMinus ?? 0,
        saves: entry.saves ?? 0,
        goalsAgainst: entry.goalsAgainst ?? 0,
      };

      const totals: Record<string, number> = {};
      STAT_FIELDS.forEach((stat) => {
        totals[stat.key] = 0;
      });

      Object.values(snapshotsByPlayer).forEach((playerSnapshot) => {
        STAT_FIELDS.forEach((stat) => {
          totals[stat.key] += playerSnapshot[stat.key] || 0;
        });
      });

      series.push({
        gameSecondsElapsed: entry.gameSecondsElapsed ?? 0,
        label: formatPeriodClock(entry.period ?? 1, entry.clockSecondsRemaining ?? 1200),
        ...totals,
      });
    });

    if (viewMode === "total") {
      return series.length > 0 ? [series[series.length - 1]] : [];
    }

    return series;
  }, [filteredHistory, viewMode, selectedPlayers, players]);

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleStatToggle = (statKey: string) => {
    setSelectedStats((prev) =>
      prev.includes(statKey)
        ? prev.filter((key) => key !== statKey)
        : [...prev, statKey]
    );
  };

  const timeOptions = useMemo(() => uniqueTimeOptions(sortedHistory), [sortedHistory]);

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
    <Box sx={{ minHeight: "100vh", bgcolor: CREAM, py: { xs: 4, md: 6 } }}>
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
          {game ? new Date(game.gameDate).toLocaleDateString() : "Game Stats"}
        </Typography>

        {game && (
          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 600,
              fontSize: { xs: 16, md: 20 },
              mb: 3,
              color: GREEN,
            }}
          >
            {game.gameType} vs {game.opponent?.teamName || "Opponent"}
          </Typography>
        )}

        {isLiveMode && game && (
          <Paper
            elevation={6}
            sx={{
              borderRadius: 4,
              p: 3,
              mb: 3,
              textAlign: "center",
              bgcolor: GREEN,
              color: CREAM,
              boxShadow: "0 10px 30px rgba(0,0,0,.12)",
            }}
          >
            <Typography sx={{ fontWeight: 1000, fontSize: { xs: 22, md: 30 } }}>
              {game.status === "live"
                ? "LIVE"
                : game.status === "intermission"
                ? "INTERMISSION"
                : game.status?.toUpperCase() || "LIVE VIEW"}
            </Typography>

            <Typography sx={{ fontWeight: 800, mt: 1, fontSize: { xs: 18, md: 24 } }}>
              Period {game.currentPeriod ?? "-"}
            </Typography>

            <Typography
              sx={{
                fontWeight: 1000,
                mt: 1,
                fontSize: { xs: 38, md: 60 },
                lineHeight: 1,
              }}
            >
              {formatClockRemaining(game.clockSecondsRemaining ?? 0)}
            </Typography>
          </Paper>
        )}

        <Paper
          elevation={6}
          sx={{
            borderRadius: 4,
            p: 3,
            mb: 3,
            boxShadow: "0 10px 30px rgba(0,0,0,.12)",
          }}
        >
          <Typography sx={{ fontWeight: 900, color: GREEN, mb: 2 }}>Options</Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <FormControl fullWidth sx={{ minWidth: 180 }}>
              <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>View Mode</InputLabel>
              <Select
                value={viewMode}
                label="View Mode"
                onChange={(e) => setViewMode(e.target.value as "total" | "cumulative" | "players")}
                sx={greenFieldSx}
                MenuProps={greenMenuProps}
              >
                <MenuItem value="cumulative">Cumulative (Running Snapshot)</MenuItem>
                <MenuItem value="total">Final Total</MenuItem>
                <MenuItem value="players">Individual Players</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ minWidth: 160 }}>
              <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>Start Time</InputLabel>
              <Select
                value={timeRangeStart === "" ? "" : String(timeRangeStart)}
                label="Start Time"
                onChange={(e) =>
                  setTimeRangeStart(e.target.value === "" ? "" : Number(e.target.value))
                }
                sx={greenFieldSx}
                MenuProps={greenMenuProps}
              >
                <MenuItem value="">Start of game</MenuItem>
                {timeOptions.map((entry) => (
                  <MenuItem key={`start-${entry._id}`} value={String(entry.gameSecondsElapsed ?? 0)}>
                    {formatPeriodClock(entry.period ?? 1, entry.clockSecondsRemaining ?? 1200)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ minWidth: 160 }}>
              <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>End Time</InputLabel>
              <Select
                value={timeRangeEnd === "" ? "" : String(timeRangeEnd)}
                label="End Time"
                onChange={(e) =>
                  setTimeRangeEnd(e.target.value === "" ? "" : Number(e.target.value))
                }
                sx={greenFieldSx}
                MenuProps={greenMenuProps}
              >
                <MenuItem value="">End of game</MenuItem>
                {timeOptions.map((entry) => (
                  <MenuItem key={`end-${entry._id}`} value={String(entry.gameSecondsElapsed ?? 0)}>
                    {formatPeriodClock(entry.period ?? 1, entry.clockSecondsRemaining ?? 1200)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Typography sx={{ fontWeight: 800, color: GREEN, mt: 3, mb: 1 }}>
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
                    bgcolor: selectedStats.includes(stat.key)
                      ? stat.color
                      : "rgba(0,95,2,.2)",
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

        <Paper
          elevation={6}
          sx={{
            borderRadius: 4,
            p: 3,
            boxShadow: "0 10px 30px rgba(0,0,0,.12)",
            bgcolor: DARK_GREEN,
          }}
        >
          {chartData.length === 0 ? (
            <Typography sx={{ textAlign: "center", py: 8, color: CREAM, opacity: 0.7 }}>
              No stat history data available for this game.
            </Typography>
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData}>
                <CartesianGrid stroke={CREAM} strokeDasharray="5 5" strokeOpacity={0.3} />
                <XAxis
                  dataKey="gameSecondsElapsed"
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
                    return point?.label || "";
                  }}
                />
                <Legend wrapperStyle={{ color: CREAM }} />

                {viewMode === "players"
                  ? STAT_FIELDS.filter((stat) => selectedStats.includes(stat.key)).flatMap((stat) =>
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
                            dot={{ r: 4, fill: stat.color, strokeWidth: 2, stroke: CREAM }}
                            name={`${player?.name || playerId} - ${stat.label}`}
                          />
                        );
                      })
                    )
                  : STAT_FIELDS.filter((stat) => selectedStats.includes(stat.key)).map((stat) => (
                      <Line
                        key={stat.key}
                        type="monotone"
                        dataKey={stat.key}
                        stroke={stat.color}
                        strokeWidth={3}
                        dot={{ r: 5, fill: stat.color, strokeWidth: 2, stroke: CREAM }}
                        name={stat.label}
                      />
                    ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Paper>
      </Container>
    </Box>
  );
}