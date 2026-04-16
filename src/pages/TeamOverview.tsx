import { useEffect, useMemo, useRef, useState } from "react";
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
  LinearProgress,
  Modal,
  IconButton,
  Tooltip as MuiTooltip,
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuthFetch } from "../hooks/useAuthFetch";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  PictureAsPdf as PdfIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon,
  Close as CloseIcon,
  TableChart as CsvIcon,
} from "@mui/icons-material";

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

interface PinnedGraph {
  id: string;
  label: string;
  viewMode: "team" | "players";
  chartType: "line" | "bar" | "pie";
  selectedStats: string[];
  selectedPlayers: string[];
  showOpponent: boolean;
  chartData: Array<Record<string, string | number>>;
  comparisonData: Array<{ stat: string; us: number; opponent: number; key: string }>;
  opponentLineData: Array<Record<string, string | number>>;
  players: Player[];
}

export default function TeamOverview() {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const [searchParams] = useSearchParams();

  const initialTeamId = searchParams.get("teamId") || "";

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId);
  const [selectedTeamName, setSelectedTeamName] = useState("");

  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [finalStats, setFinalStats] = useState<FinalStat[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [viewMode, setViewMode] = useState<"team" | "players">("team");
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedStats, setSelectedStats] = useState<string[]>(["goals", "assists", "shots", "hits"]);

  const [pinnedGraphs, setPinnedGraphs] = useState<PinnedGraph[]>([]);
  const pinnedGraphRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const [showOpponent, setShowOpponent] = useState(false);
  const [gameEvents, setGameEvents] = useState<Record<string, Array<{ eventType: string; team: string }>>>({});

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

  // When team selected, load ALL games + players + final stats
  useEffect(() => {
    if (!selectedTeamId) {
      setGames([]);
      setFinalStats([]);
      setPlayers([]);
      return;
    }
    const team = teams.find((t) => t._id === selectedTeamId);
    setSelectedTeamName(team?.name || "");

    (async () => {
      setIsLoadingStats(true);
      try {
        const [gamesRes, playersRes] = await Promise.all([
          authFetch(`${API_BASE_URL}/api/games?teamId=${selectedTeamId}`),
          authFetch(`${API_BASE_URL}/api/players?teamId=${selectedTeamId}`),
        ]);
        const allGames: Game[] = await gamesRes.json();
        const sorted = (Array.isArray(allGames) ? allGames : [])
          .sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());
        setGames(sorted);

        const playersData = await playersRes.json();
        setPlayers(Array.isArray(playersData) ? playersData : []);

        if (sorted.length > 0) {
          const gameIds = sorted.map((g) => g._id).join(",");
          const statsRes = await authFetch(
            `${API_BASE_URL}/api/stats/history/final?gameIds=${encodeURIComponent(gameIds)}`
          );
          const statsData: FinalStat[] = await statsRes.json();
          setFinalStats(Array.isArray(statsData) ? statsData : []);

          const eventsMap: Record<string, Array<{ eventType: string; team: string }>> = {};
          await Promise.all(
            sorted.map(async (game) => {
              try {
                const evRes = await authFetch(`${API_BASE_URL}/api/events?gameId=${game._id}`);
                const evData = await evRes.json();
                eventsMap[game._id] = Array.isArray(evData) ? evData : [];
              } catch { eventsMap[game._id] = []; }
            })
          );
          setGameEvents(eventsMap);
        } else {
          setFinalStats([]);
          setGameEvents({});
        }
      } catch (err) {
        console.error("Error fetching team data:", err);
      } finally {
        setIsLoadingStats(false);
      }
    })();
  }, [selectedTeamId, teams]);

  const teamChartData = useMemo(() => {
    if (games.length === 0 || finalStats.length === 0) return [];
    return games.map((game, idx) => {
      const gameStats = finalStats.filter((s) => s.gameId === game._id);
      const totals: Record<string, number> = {};
      STAT_FIELDS.forEach((stat) => { totals[stat.key] = 0; });
      gameStats.forEach((ps) => {
        STAT_FIELDS.forEach((stat) => {
          totals[stat.key] += (ps as unknown as Record<string, number>)[stat.key] || 0;
        });
      });
      const date = new Date(game.gameDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const opponent = game.opponent?.teamName || "—";
      const score = game.score ? `${game.score.us ?? 0}-${game.score.them ?? 0}` : "";
      return {
        gameIndex: idx + 1,
        label: `G${idx + 1}\n${date}`,
        shortLabel: `G${idx + 1}`,
        tooltip: `Game ${idx + 1} — ${date} vs ${opponent}${score ? ` (${score})` : ""}`,
        ...totals,
      };
    });
  }, [games, finalStats]);

  const playerChartData = useMemo(() => {
    if (games.length === 0 || finalStats.length === 0) return [];
    return games.map((game, idx) => {
      const gameStats = finalStats.filter((s) => s.gameId === game._id);
      const date = new Date(game.gameDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const opponent = game.opponent?.teamName || "—";
      const score = game.score ? `${game.score.us ?? 0}-${game.score.them ?? 0}` : "";
      const point: Record<string, string | number> = {
        gameIndex: idx + 1,
        label: `G${idx + 1}\n${date}`,
        shortLabel: `G${idx + 1}`,
        tooltip: `Game ${idx + 1} — ${date} vs ${opponent}${score ? ` (${score})` : ""}`,
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

  const opponentLineData = useMemo(() => {
    if (games.length === 0) return [];
    return games.map((game, idx) => {
      const events = gameEvents[game._id] || [];
      const awayEvents = events.filter((e) => e.team === "away");
      const totals: Record<string, number> = { goals: 0, shots: 0, hits: 0 };
      awayEvents.forEach((ev) => {
        if (ev.eventType === "goal") { totals.goals++; totals.shots++; }
        else if (ev.eventType === "shot") totals.shots++;
        else if (ev.eventType === "hit") totals.hits++;
      });
      const date = new Date(game.gameDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const opponent = game.opponent?.teamName || "—";
      const score = game.score ? `${game.score.us ?? 0}-${game.score.them ?? 0}` : "";
      return {
        gameIndex: idx + 1,
        label: `G${idx + 1}\n${date}`,
        shortLabel: `G${idx + 1}`,
        tooltip: `Game ${idx + 1} — ${date} vs ${opponent}${score ? ` (${score})` : ""} [Opponent]`,
        ...totals,
      };
    });
  }, [games, gameEvents]);

  const comparisonData = useMemo(() => {
    if (teamChartData.length === 0) return [];
    const OPP_STATS = ["goals", "shots", "hits"];
    return STAT_FIELDS.map((sf) => {
      const us = teamChartData.reduce((sum, row) => sum + (Number(row[sf.key]) || 0), 0);
      const opponent = OPP_STATS.includes(sf.key)
        ? opponentLineData.reduce((sum, row) => sum + (Number(row[sf.key]) || 0), 0)
        : 0;
      return { stat: sf.label, us, opponent, key: sf.key };
    });
  }, [teamChartData, opponentLineData]);

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

  const handlePinGraph = () => {
    const statLabels = STAT_FIELDS.filter((s) => selectedStats.includes(s.key)).map((s) => s.label).join(", ");
    const modeLabel = viewMode === "team" ? "Team Totals" : "Players";
    const chartLabel = chartType === "bar" ? "Bar" : chartType === "pie" ? "Pie" : "Line";
    const pinned: PinnedGraph = {
      id: `pin-${Date.now()}`,
      label: `${modeLabel} · ${chartLabel} · ${statLabels || "No stats"}${showOpponent ? " (+ Opponent)" : ""}`,
      viewMode,
      chartType,
      selectedStats: [...selectedStats],
      selectedPlayers: [...selectedPlayers],
      showOpponent,
      chartData: (showOpponent && chartType === "line" ? opponentLineData : chartData).map((d) => ({ ...d })),
      comparisonData: comparisonData.map((d) => ({ ...d })),
      opponentLineData: opponentLineData.map((d) => ({ ...d })),
      players: [...players],
    };
    setPinnedGraphs((prev) => [...prev, pinned]);
  };

  const handleUnpinGraph = (id: string) => {
    setPinnedGraphs((prev) => prev.filter((g) => g.id !== id));
  };

  function handleDownloadCsv() {
    if (finalStats.length === 0 || games.length === 0) return;
    const escapeField = (value: string | number): string => {
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const headers = ["Game Date", "Opponent", "Score", "Player Name", "Player Number", ...STAT_FIELDS.map((s) => s.label)];
    const rows: string[] = [];
    games.forEach((game) => {
      const gameStats = finalStats.filter((s) => s.gameId === game._id);
      const date = new Date(game.gameDate).toLocaleDateString();
      const score = game.score ? `${game.score.us ?? 0}-${game.score.them ?? 0}` : "";
      gameStats.forEach((stat) => {
        const player = players.find((p) => p._id === stat.playerId);
        rows.push(
          [
            escapeField(date),
            escapeField(game.opponent?.teamName || ""),
            escapeField(score),
            escapeField(player?.name || "Unknown"),
            player?.number ?? "",
            ...STAT_FIELDS.map((sf) => (stat as unknown as Record<string, number>)[sf.key] ?? 0),
          ].map(escapeField).join(",")
        );
      });
    });
    const csvContent = "\uFEFF" + headers.map(escapeField).join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Team_Overview_${selectedTeamName || "team"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPdf() {
    if (pinnedGraphs.length === 0) return;
    setIsPdfGenerating(true);
    try {
      const total = pinnedGraphs.length;
      setPdfProgress({ current: 0, total });
      const pdf = new jsPDF("landscape", "mm", "a4");
      const pageWidth = 297;
      const pageHeight = 210;
      for (let i = 0; i < pinnedGraphs.length; i++) {
        const pinned = pinnedGraphs[i];
        const el = pinnedGraphRefs.current.get(pinned.id);
        if (!el) continue;
        if (i > 0) pdf.addPage();
        await new Promise<void>((r) => setTimeout(r, 0));
        const canvas = await html2canvas(el, {
          scale: 1.5,
          backgroundColor: DARK_GREEN,
          useCORS: true,
          logging: false,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const ratio = canvas.width / canvas.height;
        let imgWidth = pageWidth;
        let imgHeight = imgWidth / ratio;
        if (imgHeight > pageHeight) {
          imgHeight = pageHeight;
          imgWidth = imgHeight * ratio;
        }
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;
        pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight);
        setPdfProgress({ current: i + 1, total });
      }
      pdf.save(`Team_Overview_${selectedTeamName || "team"}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setIsPdfGenerating(false);
      setPdfProgress({ current: 0, total: 0 });
    }
  }

  function renderChart(
    data: Array<Record<string, string | number>>,
    cData: Array<{ stat: string; us: number; opponent: number; key: string }>,
    cType: "line" | "bar" | "pie",
    vMode: "team" | "players",
    stats: string[],
    sPlayers: string[],
    pList: Player[],
    height = 500,
    oppLabel = "Opponents",
    isOpponentView = false,
  ) {
    if (data.length === 0) {
      return (
        <Typography sx={{ textAlign: "center", py: 8, color: CREAM, opacity: 0.7 }}>
          No stat data available.
        </Typography>
      );
    }

    if (cType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={cData.filter((d) => stats.includes(d.key))}>
            <CartesianGrid stroke={CREAM} strokeDasharray="5 5" strokeOpacity={0.3} />
            <XAxis dataKey="stat" stroke={CREAM} tick={{ fill: CREAM, fontWeight: 600 }} />
            <YAxis stroke={CREAM} tick={{ fill: CREAM, fontWeight: 600 }} />
            <Tooltip />
            <Legend wrapperStyle={{ color: CREAM }} />
            <Bar dataKey="us" name={selectedTeamName || "Team"} fill="#06b6d4" />
            <Bar dataKey="opponent" name={oppLabel} fill="#f43f5e" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (cType === "pie") {
      return (
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4 }}>
          {cData.filter((d) => stats.includes(d.key)).map((d) => {
            const total = d.us + d.opponent;
            const usPct = total > 0 ? ((d.us / total) * 100).toFixed(1) : "0.0";
            const oppPct = total > 0 ? ((d.opponent / total) * 100).toFixed(1) : "0.0";
            const pieData = [
              { name: selectedTeamName || "Team", value: d.us },
              { name: oppLabel, value: d.opponent },
            ];
            const COLORS = ["#06b6d4", "#f43f5e"];
            return (
              <Box key={d.key} sx={{ textAlign: "center" }}>
                <Typography sx={{ color: CREAM, fontWeight: 700, mb: 1 }}>{d.stat}</Typography>
                <PieChart width={300} height={250}>
                  <Pie data={pieData} cx={150} cy={115} innerRadius={50} outerRadius={85} dataKey="value">
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
                <Typography sx={{ color: CREAM, fontSize: 13, opacity: 0.8 }}>
                  {selectedTeamName || "Team"}: {d.us} ({usPct}%) · {oppLabel}: {d.opponent} ({oppPct}%)
                </Typography>
              </Box>
            );
          })}
        </Box>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid stroke={CREAM} strokeDasharray="5 5" strokeOpacity={0.3} />
          <XAxis dataKey="shortLabel" stroke={CREAM} tick={{ fill: CREAM, fontWeight: 600 }} />
          <YAxis stroke={CREAM} tick={{ fill: CREAM, fontWeight: 600 }} tickCount={10} />
          <Tooltip
            formatter={(value: number, name: string) => [value, name]}
            labelFormatter={(_, payload) => {
              const point = payload?.[0]?.payload;
              return point?.tooltip || "";
            }}
          />
          <Legend wrapperStyle={{ color: CREAM }} />
          {vMode === "players"
            ? STAT_FIELDS.filter((stat) => stats.includes(stat.key)).flatMap((stat) =>
                sPlayers.map((playerId) => {
                  const player = pList.find((p) => p._id === playerId);
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
            : STAT_FIELDS.filter((stat) => stats.includes(stat.key)).map((stat) => (
                <Line
                  key={stat.key}
                  type="monotone"
                  dataKey={stat.key}
                  stroke={stat.color}
                  strokeWidth={3}
                  strokeDasharray={isOpponentView ? "6 3" : undefined}
                  dot={{ r: 5, fill: stat.color, strokeWidth: 2, stroke: CREAM }}
                  name={isOpponentView ? `${oppLabel} ${stat.label}` : stat.label}
                />
              ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: CREAM, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
            <Button onClick={() => navigate("/gamehistory")} sx={{ color: GREEN, fontWeight: 600, mr: 2 }}>
              ← Back to Game History
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate("/opponent-overview")}
              sx={{ bgcolor: GREEN, color: CREAM, fontWeight: 700, "&:hover": { bgcolor: "#004a01" } }}
            >
              Opponent Overview
            </Button>
          </Stack>

          <Typography
            sx={{
              textAlign: "center", fontWeight: 900, letterSpacing: "-0.03em",
              fontSize: { xs: 28, sm: 36, md: 48 }, mb: 1, color: GREEN, fontFamily: "Oswald, sans-serif",
            }}
          >
            Team Overview
          </Typography>
          <Typography sx={{ textAlign: "center", fontWeight: 600, fontSize: { xs: 14, md: 18 }, mb: 3, color: GREEN, opacity: 0.8 }}>
            View final-game stats across all games for a team
          </Typography>

          <Paper elevation={6} sx={{ borderRadius: 4, p: 3, mb: 3, boxShadow: "0 10px 30px rgba(0,0,0,.12)" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 900, color: GREEN }}>Options</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={isPdfGenerating ? <CircularProgress size={18} sx={{ color: CREAM }} /> : <PdfIcon />}
                  onClick={handleDownloadPdf}
                  disabled={isPdfGenerating || pinnedGraphs.length === 0}
                  sx={{
                    bgcolor: GREEN, color: CREAM, fontWeight: 700,
                    "&:hover": { bgcolor: DARK_GREEN },
                    "&.Mui-disabled": { bgcolor: "rgba(0,95,2,0.3)", color: "rgba(255,242,209,0.5)" },
                  }}
                >
                  {isPdfGenerating
                    ? `Rendering ${pdfProgress.current}/${pdfProgress.total}...`
                    : `Download Pinned${pinnedGraphs.length > 0 ? ` (${pinnedGraphs.length})` : ""}`}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<CsvIcon />}
                  onClick={handleDownloadCsv}
                  disabled={finalStats.length === 0}
                  sx={{
                    bgcolor: GREEN, color: CREAM, fontWeight: 700,
                    "&:hover": { bgcolor: DARK_GREEN },
                    "&.Mui-disabled": { bgcolor: "rgba(0,95,2,0.3)", color: "rgba(255,242,209,0.5)" },
                  }}
                >
                  Download as CSV
                </Button>
              </Stack>
            </Stack>

            <Modal open={isPdfGenerating}>
              <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", bgcolor: "white", borderRadius: 3, boxShadow: 24, p: 4, minWidth: 340, textAlign: "center" }}>
                <PdfIcon sx={{ fontSize: 40, color: GREEN, mb: 1 }} />
                <Typography sx={{ fontWeight: 800, color: GREEN, fontSize: 20, mb: 1 }}>Generating PDF Report</Typography>
                <Typography sx={{ color: GREEN, mb: 2, fontSize: 14 }}>
                  Rendering page {pdfProgress.current} of {pdfProgress.total}...
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={pdfProgress.total > 0 ? (pdfProgress.current / pdfProgress.total) * 100 : 0}
                  sx={{ height: 10, borderRadius: 5, bgcolor: "rgba(0,95,2,0.1)", "& .MuiLinearProgress-bar": { bgcolor: GREEN, borderRadius: 5 } }}
                />
              </Box>
            </Modal>

            <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ minWidth: 200 }}>
                <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>Team</InputLabel>
                <Select
                  value={selectedTeamId} label="Team"
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  sx={greenFieldSx} MenuProps={greenMenuProps}
                >
                  {teams.map((team) => <MenuItem key={team._id} value={team._id}>{team.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ minWidth: 180 }}>
                <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>View Mode</InputLabel>
                <Select
                  value={viewMode} label="View Mode"
                  onChange={(e) => setViewMode(e.target.value as "team" | "players")}
                  sx={greenFieldSx} MenuProps={greenMenuProps}
                >
                  <MenuItem value="team">Team Totals</MenuItem>
                  <MenuItem value="players">Individual Players</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Typography sx={{ fontWeight: 800, color: GREEN, mt: 1, mb: 1 }}>Stats to Display:</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {STAT_FIELDS.map((stat) => (
                <Chip key={stat.key} label={stat.label} onClick={() => handleStatToggle(stat.key)}
                  sx={{
                    bgcolor: selectedStats.includes(stat.key) ? stat.color : "rgba(0,95,2,.1)",
                    color: selectedStats.includes(stat.key) ? "#fff" : GREEN,
                    fontWeight: 700, cursor: "pointer",
                    "&:hover": { bgcolor: selectedStats.includes(stat.key) ? stat.color : "rgba(0,95,2,.2)" },
                  }}
                />
              ))}
            </Box>

            {viewMode === "players" && (
              <>
                <Typography sx={{ fontWeight: 800, color: GREEN, mt: 3, mb: 1 }}>Select Players:</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {players.map((player) => (
                    <Chip key={player._id} label={`#${player.number} ${player.name}`}
                      onClick={() => handlePlayerToggle(player._id)}
                      sx={{
                        bgcolor: selectedPlayers.includes(player._id) ? GREEN : "rgba(0,95,2,.1)",
                        color: selectedPlayers.includes(player._id) ? CREAM : GREEN,
                        fontWeight: 700, cursor: "pointer",
                      }}
                    />
                  ))}
                </Box>
              </>
            )}

            <Typography sx={{ fontWeight: 800, color: GREEN, mt: 3, mb: 1 }}>Chart Type:</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {(["line", "bar", "pie"] as const).map((ct) => (
                <Chip key={ct}
                  label={ct === "line" ? "Line Graph" : ct === "bar" ? "Bar Graph" : "Pie Chart"}
                  onClick={() => setChartType(ct)}
                  sx={{
                    bgcolor: chartType === ct ? GREEN : "rgba(0,95,2,.1)",
                    color: chartType === ct ? CREAM : GREEN,
                    fontWeight: 700, cursor: "pointer",
                  }}
                />
              ))}
            </Stack>

            {chartType === "line" && (
              <>
                <Typography sx={{ fontWeight: 800, color: GREEN, mt: 3, mb: 1 }}>
                  Opponent Data:
                </Typography>
                <Chip
                  label={showOpponent ? "Showing Opponent" : "Show Opponent"}
                  onClick={() => setShowOpponent((prev) => !prev)}
                  sx={{
                    bgcolor: showOpponent ? "#f43f5e" : "rgba(0,95,2,.1)",
                    color: showOpponent ? "#fff" : GREEN,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                />
              </>
            )}
          </Paper>

          {/* Info strip */}
          {selectedTeamId && (
            <Paper elevation={3} sx={{ borderRadius: 4, p: 2, mb: 3, bgcolor: GREEN, color: CREAM }}>
              <Typography sx={{ fontWeight: 800, textAlign: "center", fontSize: { xs: 16, md: 20 }, color: CREAM }}>
                {games.length} game{games.length !== 1 ? "s" : ""} total for {selectedTeamName || "team"}
              </Typography>
            </Paper>
          )}

          {/* Pin button */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <Button
              variant="contained" startIcon={<PinOutlinedIcon />} onClick={handlePinGraph}
              disabled={chartData.length === 0}
              sx={{
                bgcolor: GREEN, color: CREAM, fontWeight: 700,
                "&:hover": { bgcolor: DARK_GREEN },
                "&.Mui-disabled": { bgcolor: "rgba(0,95,2,0.3)", color: "rgba(255,242,209,0.5)" },
              }}
            >
              Pin This Graph
            </Button>
          </Box>

          {/* Main chart */}
          <Paper elevation={6} sx={{ borderRadius: 4, p: 3, boxShadow: "0 10px 30px rgba(0,0,0,.12)", bgcolor: DARK_GREEN }}>
            {isLoadingStats ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress sx={{ color: CREAM }} />
              </Box>
            ) : !selectedTeamId ? (
              <Typography sx={{ textAlign: "center", py: 8, color: CREAM, opacity: 0.7 }}>
                Select a team to view stats across all games.
              </Typography>
            ) : (
              renderChart(
                showOpponent && chartType === "line" ? opponentLineData : chartData,
                comparisonData,
                chartType,
                showOpponent && chartType === "line" ? "team" : viewMode,
                showOpponent && chartType === "line" ? ["goals", "shots", "hits"].filter((k) => selectedStats.includes(k)) : selectedStats,
                selectedPlayers,
                players,
                500,
                "Opponents",
                showOpponent && chartType === "line",
              )
            )}
          </Paper>

          {/* Pinned graphs */}
          {pinnedGraphs.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 20, color: GREEN, fontFamily: "Oswald, sans-serif", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <PinIcon sx={{ fontSize: 20 }} /> Pinned Graphs
              </Typography>
              <Stack spacing={3}>
                {pinnedGraphs.map((pinned) => (
                  <Paper
                    key={pinned.id}
                    ref={(el) => { if (el) pinnedGraphRefs.current.set(pinned.id, el); else pinnedGraphRefs.current.delete(pinned.id); }}
                    elevation={6}
                    sx={{ borderRadius: 4, p: 3, boxShadow: "0 10px 30px rgba(0,0,0,.12)", bgcolor: DARK_GREEN, position: "relative" }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <PinIcon sx={{ color: CREAM, fontSize: 18, opacity: 0.8 }} />
                        <Typography sx={{ color: CREAM, fontWeight: 700, fontSize: 14, opacity: 0.85 }}>{pinned.label}</Typography>
                      </Box>
                      <MuiTooltip title="Unpin graph" placement="top">
                        <IconButton onClick={() => handleUnpinGraph(pinned.id)} size="small"
                          sx={{ color: CREAM, opacity: 0.7, "&:hover": { opacity: 1, bgcolor: "rgba(255,242,209,0.12)" } }}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </MuiTooltip>
                    </Stack>
                    {renderChart(
                      pinned.chartData,
                      pinned.comparisonData,
                      pinned.chartType,
                      pinned.showOpponent && pinned.chartType === "line" ? "team" : pinned.viewMode,
                      pinned.selectedStats,
                      pinned.selectedPlayers,
                      pinned.players,
                      340,
                      "Opponents",
                      pinned.showOpponent && pinned.chartType === "line",
                    )}
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Container>
      </Box>
    </>
  );
}
