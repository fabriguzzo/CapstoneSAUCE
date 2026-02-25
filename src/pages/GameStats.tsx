import { useEffect, useState, useMemo } from "react";
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
} from "recharts";
import { useParams, useNavigate } from "react-router-dom";

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
}

interface StatHistoryEntry {
  _id: string;
  gameId: string;
  teamId: string;
  playerId: string;
  timestamp: string;
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
];

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
      "& .MuiMenuItem-root.Mui-selected": { backgroundColor: "rgba(0,95,2,0.10)" },
    },
  },
  sx: { zIndex: 3000 },
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

export default function GameStats() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [statHistory, setStatHistory] = useState<StatHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<"total" | "cumulative" | "players">("cumulative");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedStats, setSelectedStats] = useState<string[]>(["goals", "assists", "shots", "hits"]);
  const [timeRangeStart, setTimeRangeStart] = useState("");
  const [timeRangeEnd, setTimeRangeEnd] = useState("");

  useEffect(() => {
    if (gameId) {
      fetchData();
    }
  }, [gameId]);

  async function fetchData() {
    try {
      setIsLoading(true);
      
      const gameRes = await fetch(`${API_BASE_URL}/api/games/${gameId}`);
      const gameData = await gameRes.json();
      setGame(gameData);

      const teamId = gameData.teamId;
      
      const playersRes = await fetch(`${API_BASE_URL}/api/players?teamId=${teamId}`);
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

  const sortedHistory = useMemo(() => {
    return [...statHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [statHistory]);

  const filteredHistory = useMemo(() => {
    if (sortedHistory.length === 0) return [];

    let filtered = sortedHistory;

    if (timeRangeStart) {
      const startMinutes = parseTimeToMinutes(timeRangeStart);
      filtered = filtered.filter(entry => {
        const entryMinutes = parseTimeToMinutes(formatTime(entry.timestamp));
        return entryMinutes >= startMinutes;
      });
    }

    if (timeRangeEnd) {
      const endMinutes = parseTimeToMinutes(timeRangeEnd);
      filtered = filtered.filter(entry => {
        const entryMinutes = parseTimeToMinutes(formatTime(entry.timestamp));
        return entryMinutes <= endMinutes;
      });
    }

    return filtered;
  }, [sortedHistory, timeRangeStart, timeRangeEnd]);

  const chartData = useMemo(() => {
    if (filteredHistory.length === 0) return [];

    if (viewMode === "cumulative") {
      const cumulativeData: Array<Record<string, number | string>> = [];
      const cumulativeTotals: Record<string, number> = {};
      
      STAT_FIELDS.forEach(stat => {
        cumulativeTotals[stat.key] = 0;
      });

      filteredHistory.forEach((entry) => {
        STAT_FIELDS.forEach((stat) => {
          cumulativeTotals[stat.key] += Number(entry[stat.key as keyof StatHistoryEntry]) || 0;
        });

        const dataPoint: Record<string, number | string> = {
          time: formatTime(entry.timestamp),
        };
        STAT_FIELDS.forEach((stat) => {
          dataPoint[stat.key] = cumulativeTotals[stat.key];
        });
        cumulativeData.push(dataPoint);
      });

      return cumulativeData;
    } else if (viewMode === "total") {
      const totals: Record<string, number> = {};
      STAT_FIELDS.forEach(stat => {
        totals[stat.key] = 0;
      });

      filteredHistory.forEach((entry) => {
        STAT_FIELDS.forEach((stat) => {
          totals[stat.key] += Number(entry[stat.key as keyof StatHistoryEntry]) || 0;
        });
      });

      return [{ time: "Total", ...totals }];
    } else {
      const playerDataByTime: Record<string, Record<string, number | string>> = {};

      filteredHistory.forEach((entry) => {
        const timeKey = formatTime(entry.timestamp);
        if (!playerDataByTime[timeKey]) {
          playerDataByTime[timeKey] = { time: timeKey };
        }

        if (selectedPlayers.includes(entry.playerId)) {
          const player = players.find((p) => p._id === entry.playerId);
          const playerName = player ? `#${player.number}` : entry.playerId;

          STAT_FIELDS.forEach((stat) => {
            const key = `${playerName}_${stat.key}`;
            playerDataByTime[timeKey][key] = entry[stat.key as keyof StatHistoryEntry] as number || 0;
          });
        }
      });

      return Object.values(playerDataByTime);
    }
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

  if (isLoading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: CREAM, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
              mb: 4,
              color: GREEN,
            }}
          >
            {game.gameType} vs {game.opponent?.teamName || "Opponent"}
          </Typography>
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
                <MenuItem value="cumulative" sx={{ color: GREEN, fontWeight: 700 }}>Cumulative (Running Total)</MenuItem>
                <MenuItem value="total" sx={{ color: GREEN, fontWeight: 700 }}>Total (Sum)</MenuItem>
                <MenuItem value="players" sx={{ color: GREEN, fontWeight: 700 }}>Individual Players</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ minWidth: 140 }}>
              <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>Start Time</InputLabel>
              <Select
                value={timeRangeStart}
                label="Start Time"
                onChange={(e) => setTimeRangeStart(e.target.value)}
                sx={greenFieldSx}
                MenuProps={greenMenuProps}
                displayEmpty
              >
                <MenuItem value="" sx={{ color: GREEN, fontWeight: 700 }}>Start of game</MenuItem>
                {sortedHistory.length > 0 && [...new Set(sortedHistory.map(h => formatTime(h.timestamp)))].map((time) => (
                  <MenuItem key={time} value={time} sx={{ color: GREEN, fontWeight: 700 }}>{time}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ minWidth: 140 }}>
              <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>End Time</InputLabel>
              <Select
                value={timeRangeEnd}
                label="End Time"
                onChange={(e) => setTimeRangeEnd(e.target.value)}
                sx={greenFieldSx}
                MenuProps={greenMenuProps}
                displayEmpty
              >
                <MenuItem value="" sx={{ color: GREEN, fontWeight: 700 }}>End of game</MenuItem>
                {sortedHistory.length > 0 && [...new Set(sortedHistory.map(h => formatTime(h.timestamp)))].map((time) => (
                  <MenuItem key={time} value={time} sx={{ color: GREEN, fontWeight: 700 }}>{time}</MenuItem>
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
                      "&:hover": {
                        bgcolor: selectedPlayers.includes(player._id) ? "#004a01" : "rgba(0,95,2,.2)",
                      },
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
              <LineChart
                style={{ width: "100%", aspectRatio: 1.618, maxWidth: 1200, margin: "auto" }}
                data={chartData}
              >
                <CartesianGrid stroke={CREAM} strokeDasharray="5 5" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  stroke={CREAM}
                  tick={{ fill: CREAM, fontWeight: 600 }}
                  label={{ value: "Time", position: "insideBottomRight", offset: -5, fill: CREAM, fontWeight: 600 }}
                />
                <YAxis 
                  stroke={CREAM}
                  tick={{ fill: CREAM, fontWeight: 600 }}
                  tickCount={10}
                />
                <Legend wrapperStyle={{ color: CREAM }} />
                {viewMode === "total"
                  ? STAT_FIELDS.filter((stat) => selectedStats.includes(stat.key)).map((stat) => (
                      <Line
                        key={stat.key}
                        type="monotone"
                        dataKey={stat.key}
                        stroke={stat.color}
                        strokeWidth={3}
                        dot={{ r: 6, fill: stat.color, strokeWidth: 2, stroke: CREAM }}
                        name={stat.label}
                      />
                    ))
                  : viewMode === "cumulative"
                  ? STAT_FIELDS.filter((stat) => selectedStats.includes(stat.key)).map((stat) => (
                      <Line
                        key={stat.key}
                        type="monotone"
                        dataKey={stat.key}
                        stroke={stat.color}
                        strokeWidth={3}
                        dot={{ r: 6, fill: stat.color, strokeWidth: 2, stroke: CREAM }}
                        name={stat.label}
                      />
                    ))
                  : STAT_FIELDS.filter((stat) => selectedStats.includes(stat.key)).map((stat) =>
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
                    )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
