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
} from "recharts";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuthFetch } from "../hooks/useAuthFetch";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { PictureAsPdf as PdfIcon, PushPin as PinIcon, PushPinOutlined as PinOutlinedIcon, Close as CloseIcon } from "@mui/icons-material";

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
  status?: "scheduled" | "live" | "intermission" | "final";
  currentPeriod?: number;
  clockSecondsRemaining?: number;
  startTime?: string;
  endTime?: string;
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
  faceoffsWon: number;
  faceoffsLost: number;
}

interface PossessionSnapshot {
  _id: string;
  gameId: string;
  teamId: string;
  homeSeconds: number;
  awaySeconds: number;
  period?: number;
  clockSecondsRemaining?: number;
  gameSecondsElapsed?: number;
  timestamp: string;
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
  { key: "faceoffsWon", label: "Faceoffs Won", color: "#a855f7" },
  { key: "faceoffsLost", label: "Faceoffs Lost", color: "#f97316" },
  { key: "homePossession", label: "Home Possession (s)", color: "#06b6d4" },
  { key: "awayPossession", label: "Away Possession (s)", color: "#d946ef" },
] as const;

const CREAM = "#fff2d1";
const GREEN = "#005F02";
const DARK_GREEN = "#003801";

const PRINTER_STAT_STYLES: Record<string, { shape: string; strokeDasharray: string; legendType: string }> = {
  goals:        { shape: "square",        strokeDasharray: "",          legendType: "square" },
  assists:      { shape: "circle",        strokeDasharray: "6 3",       legendType: "circle" },
  shots:        { shape: "triangle-up",   strokeDasharray: "2 3",       legendType: "triangle" },
  hits:         { shape: "triangle-down", strokeDasharray: "8 3 2 3",   legendType: "triangle" },
  pim:          { shape: "diamond",       strokeDasharray: "12 3",      legendType: "diamond" },
  plusMinus:    { shape: "cross",         strokeDasharray: "4 2 4 2",   legendType: "cross" },
  saves:        { shape: "star",          strokeDasharray: "10 4",      legendType: "star" },
  goalsAgainst: { shape: "x-mark",        strokeDasharray: "2 2",       legendType: "wye" },
  faceoffsWon:  { shape: "pentagon",      strokeDasharray: "16 4 2 4",  legendType: "rect" },
  faceoffsLost: { shape: "hexagon",       strokeDasharray: "8 2 2 2",   legendType: "rect" },
};

function makePrinterDot(shape: string) {
  return (props: Record<string, unknown>) => {
    const cx = Number(props.cx ?? 0);
    const cy = Number(props.cy ?? 0);
    const s = 5;
    switch (shape) {
      case "square":
        return <rect x={cx - s} y={cy - s} width={s * 2} height={s * 2} fill="#000" />;
      case "circle":
        return <circle cx={cx} cy={cy} r={s} fill="#000" />;
      case "triangle-up": {
        const h = s * 1.732;
        const pts = `${cx},${cy - h * 0.67} ${cx - s},${cy + h * 0.33} ${cx + s},${cy + h * 0.33}`;
        return <polygon points={pts} fill="#000" />;
      }
      case "triangle-down": {
        const h = s * 1.732;
        const pts = `${cx},${cy + h * 0.67} ${cx - s},${cy - h * 0.33} ${cx + s},${cy - h * 0.33}`;
        return <polygon points={pts} fill="#000" />;
      }
      case "diamond": {
        const pts = `${cx},${cy - s * 1.4} ${cx + s},${cy} ${cx},${cy + s * 1.4} ${cx - s},${cy}`;
        return <polygon points={pts} fill="#000" />;
      }
      case "cross": {
        const t = s * 0.35;
        const pts = [
          `${cx - t},${cy - s}`, `${cx + t},${cy - s}`,
          `${cx + t},${cy - t}`, `${cx + s},${cy - t}`,
          `${cx + s},${cy + t}`, `${cx + t},${cy + t}`,
          `${cx + t},${cy + s}`, `${cx - t},${cy + s}`,
          `${cx - t},${cy + t}`, `${cx - s},${cy + t}`,
          `${cx - s},${cy - t}`, `${cx - t},${cy - t}`,
        ].join(" ");
        return <polygon points={pts} fill="#000" />;
      }
      case "star": {
        const outerR = s * 1.2;
        const innerR = s * 0.48;
        const pts = Array.from({ length: 10 }, (_, i) => {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(" ");
        return <polygon points={pts} fill="#000" />;
      }
      case "x-mark":
        return (
          <g>
            <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke="#000" strokeWidth={2.5} />
            <line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} stroke="#000" strokeWidth={2.5} />
          </g>
        );
      case "pentagon": {
        const pts = Array.from({ length: 5 }, (_, i) => {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          return `${cx + s * Math.cos(angle)},${cy + s * Math.sin(angle)}`;
        }).join(" ");
        return <polygon points={pts} fill="#000" />;
      }
      case "hexagon": {
        const pts = Array.from({ length: 6 }, (_, i) => {
          const angle = (i * Math.PI) / 3;
          return `${cx + s * Math.cos(angle)},${cy + s * Math.sin(angle)}`;
        }).join(" ");
        return <polygon points={pts} fill="#000" />;
      }
      default:
        return <circle cx={cx} cy={cy} r={s} fill="#000" />;
    }
  };
}

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

interface PinnedGraph {
  id: string;
  label: string;
  viewMode: "total" | "cumulative" | "players";
  selectedStats: string[];
  selectedPlayers: string[];
  chartData: Array<Record<string, string | number>>;
  players: Player[];
}

export default function GameStats() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const authFetch = useAuthFetch();

  const isLiveMode = location.pathname.includes("/live");

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [statHistory, setStatHistory] = useState<StatHistoryEntry[]>([]);
  const [possessionHistory, setPossessionHistory] = useState<PossessionSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<"total" | "cumulative" | "players">("cumulative");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedStats, setSelectedStats] = useState<string[]>(["goals", "assists", "shots", "hits"]);
  const [timeRangeStart, setTimeRangeStart] = useState<number | "">("");
  const [timeRangeEnd, setTimeRangeEnd] = useState<number | "">("");  const [teamName, setTeamName] = useState<string>("");
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const printerPdfRef = useRef<HTMLDivElement>(null);
  const [pinnedGraphs, setPinnedGraphs] = useState<PinnedGraph[]>([]);
  const pinnedGraphRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [isPrinterPdfGenerating, setIsPrinterPdfGenerating] = useState(false);
  const [printerPdfProgress, setPrinterPdfProgress] = useState({ current: 0, total: 0 });
  async function fetchData() {
    try {
      const gameRes = await authFetch(`${API_BASE_URL}/api/games/${gameId}`);
      const gameData = await gameRes.json();
      setGame(gameData);

      if (!gameData.teamId) {
        console.error("Game has no teamId");
        return;
      }

      const [playersRes, historyRes, teamRes, possessionRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/players?teamId=${gameData.teamId}`),
        authFetch(`${API_BASE_URL}/api/stats/history/game/${gameId}`),
        authFetch(`${API_BASE_URL}/api/teams/${gameData.teamId}`),
        authFetch(`${API_BASE_URL}/api/possession/game/${gameId}`),
      ]);

      const playersData = await playersRes.json();
      setPlayers(Array.isArray(playersData) ? playersData : []);

      const historyData = await historyRes.json();
      setStatHistory(Array.isArray(historyData) ? historyData : []);

      const teamData = await teamRes.json();
      setTeamName(teamData.name || "Team");

      const possessionData = await possessionRes.json();
      setPossessionHistory(Array.isArray(possessionData) ? possessionData : []);
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

  const isGameActive = game != null && game.status !== "final";

  useEffect(() => {
    if (!gameId || (!isLiveMode && !isGameActive)) return;
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [gameId, isLiveMode, isGameActive]);

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

  // Build sorted possession data for interpolation
  const sortedPossession = useMemo(() => {
    return [...possessionHistory].sort(
      (a, b) => (a.gameSecondsElapsed ?? 0) - (b.gameSecondsElapsed ?? 0)
    );
  }, [possessionHistory]);

  const getPossessionAt = (gameSecondsElapsed: number) => {
    // Find the last possession snapshot at or before this time
    let home = 0, away = 0;
    for (const snap of sortedPossession) {
      if ((snap.gameSecondsElapsed ?? 0) <= gameSecondsElapsed) {
        home = snap.homeSeconds;
        away = snap.awaySeconds;
      } else break;
    }
    return { homePossession: home, awayPossession: away };
  };

  const chartData = useMemo(() => {
    if (filteredHistory.length === 0 && sortedPossession.length === 0) return [];

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
        faceoffsWon: entry.faceoffsWon ?? 0,
        faceoffsLost: entry.faceoffsLost ?? 0,
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

      // Merge possession data at this time point
      const possAt = getPossessionAt(entry.gameSecondsElapsed ?? 0);
      totals.homePossession = possAt.homePossession;
      totals.awayPossession = possAt.awayPossession;

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
  }, [filteredHistory, viewMode, selectedPlayers, players, sortedPossession]);

  const pdfTeamChartData = useMemo(() => {
    if (sortedHistory.length === 0) return [];
    const snapshotsByPlayer: Record<string, Record<string, number>> = {};
    const series: Array<Record<string, string | number>> = [];
    sortedHistory.forEach((entry) => {
      const playerId = String(entry.playerId);
      snapshotsByPlayer[playerId] = {};
      STAT_FIELDS.forEach((stat) => {
        snapshotsByPlayer[playerId][stat.key] =
          Number(entry[stat.key as keyof StatHistoryEntry]) || 0;
      });
      const totals: Record<string, number> = {};
      STAT_FIELDS.forEach((stat) => {
        totals[stat.key] = 0;
      });
      Object.values(snapshotsByPlayer).forEach((snapshot) => {
        STAT_FIELDS.forEach((stat) => {
          totals[stat.key] += snapshot[stat.key] || 0;
        });
      });
      const possAt = getPossessionAt(entry.gameSecondsElapsed ?? 0);
      totals.homePossession = possAt.homePossession;
      totals.awayPossession = possAt.awayPossession;
      series.push({
        gameSecondsElapsed: entry.gameSecondsElapsed ?? 0,
        label: formatPeriodClock(entry.period ?? 1, entry.clockSecondsRemaining ?? 1200),
        ...totals,
      });
    });
    return series;
  }, [sortedHistory, sortedPossession]);

  const pdfPlayerChartData = useMemo(() => {
    return players
      .map((player) => {
        const playerHistory = sortedHistory.filter(
          (e) => e.playerId === player._id
        );
        const data = playerHistory.map((entry) => ({
          gameSecondsElapsed: entry.gameSecondsElapsed ?? 0,
          label: formatPeriodClock(
            entry.period ?? 1,
            entry.clockSecondsRemaining ?? 1200
          ),
          goals: entry.goals ?? 0,
          assists: entry.assists ?? 0,
          shots: entry.shots ?? 0,
          hits: entry.hits ?? 0,
          pim: entry.pim ?? 0,
          plusMinus: entry.plusMinus ?? 0,
          saves: entry.saves ?? 0,
          goalsAgainst: entry.goalsAgainst ?? 0,
          faceoffsWon: entry.faceoffsWon ?? 0,
          faceoffsLost: entry.faceoffsLost ?? 0,
        }));
        return { player, data };
      })
      .filter(({ data }) => data.length > 0);
  }, [sortedHistory, players]);

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

  const handlePinGraph = () => {
    const statLabels = STAT_FIELDS
      .filter((s) => selectedStats.includes(s.key))
      .map((s) => s.label)
      .join(", ");
    const modeLabel =
      viewMode === "cumulative"
        ? "Cumulative"
        : viewMode === "total"
        ? "Final Total"
        : "Players";
    const pinned: PinnedGraph = {
      id: `pin-${Date.now()}`,
      label: `${modeLabel} · ${statLabels || "No stats"}`,
      viewMode,
      selectedStats: [...selectedStats],
      selectedPlayers: [...selectedPlayers],
      chartData: chartData.map((d) => ({ ...d })),
      players: [...players],
    };
    setPinnedGraphs((prev) => [...prev, pinned]);
  };

  const handleUnpinGraph = (id: string) => {
    setPinnedGraphs((prev) => prev.filter((g) => g.id !== id));
  };

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

        // Yield to the UI so the progress bar updates
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

      const dateStr = game
        ? new Date(game.gameDate).toLocaleDateString().replace(/\//g, "-")
        : "game";
      const opponent = game?.opponent?.teamName || "opponent";
      pdf.save(`Pinned_Stats_vs_${opponent}_${dateStr}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setIsPdfGenerating(false);
      setPdfProgress({ current: 0, total: 0 });
    }
  }

  async function handleDownloadPrinterFriendlyPdf() {
    if (pinnedGraphs.length === 0) return;
    setIsPrinterPdfGenerating(true);

    const container = printerPdfRef.current;
    if (!container) {
      setIsPrinterPdfGenerating(false);
      return;
    }

    try {
      const sections = container.querySelectorAll<HTMLElement>(".printer-pdf-page");
      const total = sections.length;
      setPrinterPdfProgress({ current: 0, total });

      const pdf = new jsPDF("landscape", "mm", "a4");
      const pageWidth = 297;
      const pageHeight = 210;

      for (let i = 0; i < total; i++) {
        if (i > 0) pdf.addPage();

        await new Promise<void>((r) => setTimeout(r, 0));

        const canvas = await html2canvas(sections[i], {
          scale: 1.5,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
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

        setPrinterPdfProgress({ current: i + 1, total });
      }

      const dateStr = game
        ? new Date(game.gameDate).toLocaleDateString().replace(/\//g, "-")
        : "game";
      const opponent = game?.opponent?.teamName || "opponent";
      pdf.save(`Pinned_Stats_PrinterFriendly_vs_${opponent}_${dateStr}.pdf`);
    } catch (err) {
      console.error("Error generating printer-friendly PDF:", err);
    } finally {
      setIsPrinterPdfGenerating(false);
      setPrinterPdfProgress({ current: 0, total: 0 });
    }
  }

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
            {game.startTime && (
              <> · Started: {new Date(game.startTime).toLocaleTimeString()}</>
            )}
            {game.endTime && (
              <> · Ended: {new Date(game.endTime).toLocaleTimeString()}</>
            )}
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
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={1}
            sx={{ mb: 2 }}
          >
            <Typography sx={{ fontWeight: 900, color: GREEN }}>Options</Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {/* Color PDF */}
              <Button
                variant="contained"
                startIcon={isPdfGenerating ? <CircularProgress size={18} sx={{ color: CREAM }} /> : <PdfIcon />}
                onClick={handleDownloadPdf}
                disabled={isPdfGenerating || isPrinterPdfGenerating || pinnedGraphs.length === 0}
                sx={{
                  bgcolor: GREEN,
                  color: CREAM,
                  fontWeight: 700,
                  "&:hover": { bgcolor: DARK_GREEN },
                  "&.Mui-disabled": {
                    bgcolor: "rgba(0,95,2,0.3)",
                    color: "rgba(255,242,209,0.5)",
                  },
                }}
              >
                {isPdfGenerating
                  ? `Rendering ${pdfProgress.current}/${pdfProgress.total}...`
                  : `Download Pinned${pinnedGraphs.length > 0 ? ` (${pinnedGraphs.length})` : ""}`}
              </Button>

              {/* Printer-friendly PDF */}
              <Button
                variant="outlined"
                startIcon={isPrinterPdfGenerating ? <CircularProgress size={18} sx={{ color: GREEN }} /> : <PdfIcon />}
                onClick={handleDownloadPrinterFriendlyPdf}
                disabled={isPdfGenerating || isPrinterPdfGenerating || pinnedGraphs.length === 0}
                sx={{
                  borderColor: GREEN,
                  color: GREEN,
                  fontWeight: 700,
                  "&:hover": { borderColor: DARK_GREEN, bgcolor: "rgba(0,95,2,0.06)" },
                  "&.Mui-disabled": {
                    borderColor: "rgba(0,95,2,0.3)",
                    color: "rgba(0,95,2,0.35)",
                  },
                }}
              >
                {isPrinterPdfGenerating
                  ? `Rendering ${printerPdfProgress.current}/${printerPdfProgress.total}...`
                  : "Printer Friendly"}
              </Button>
            </Stack>

            {/* Color PDF progress modal */}
            <Modal open={isPdfGenerating}>
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  bgcolor: "white",
                  borderRadius: 3,
                  boxShadow: 24,
                  p: 4,
                  minWidth: 340,
                  textAlign: "center",
                }}
              >
                <PdfIcon sx={{ fontSize: 40, color: GREEN, mb: 1 }} />
                <Typography sx={{ fontWeight: 800, color: GREEN, fontSize: 20, mb: 1 }}>
                  Generating PDF Report
                </Typography>
                <Typography sx={{ color: GREEN, mb: 2, fontSize: 14 }}>
                  Rendering page {pdfProgress.current} of {pdfProgress.total}...
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={pdfProgress.total > 0 ? (pdfProgress.current / pdfProgress.total) * 100 : 0}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: "rgba(0,95,2,0.1)",
                    "& .MuiLinearProgress-bar": { bgcolor: GREEN, borderRadius: 5 },
                  }}
                />
                <Typography sx={{ color: GREEN, mt: 1.5, fontSize: 12, opacity: 0.7 }}>
                  Please wait — this may take a moment
                </Typography>
              </Box>
            </Modal>

            {/* Printer-friendly PDF progress modal */}
            <Modal open={isPrinterPdfGenerating}>
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  bgcolor: "white",
                  borderRadius: 3,
                  boxShadow: 24,
                  p: 4,
                  minWidth: 340,
                  textAlign: "center",
                }}
              >
                <PdfIcon sx={{ fontSize: 40, color: "#333", mb: 1 }} />
                <Typography sx={{ fontWeight: 800, color: "#333", fontSize: 20, mb: 1 }}>
                  Generating Printer-Friendly PDF
                </Typography>
                <Typography sx={{ color: "#555", mb: 2, fontSize: 14 }}>
                  Rendering page {printerPdfProgress.current} of {printerPdfProgress.total}...
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={printerPdfProgress.total > 0 ? (printerPdfProgress.current / printerPdfProgress.total) * 100 : 0}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: "rgba(0,0,0,0.1)",
                    "& .MuiLinearProgress-bar": { bgcolor: "#333", borderRadius: 5 },
                  }}
                />
                <Typography sx={{ color: "#777", mt: 1.5, fontSize: 12 }}>
                  Please wait — this may take a moment
                </Typography>
              </Box>
            </Modal>
          </Stack>

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
            position: "relative",
          }}
        >
          <MuiTooltip title="Pin this graph" placement="top">
            <IconButton
              onClick={handlePinGraph}
              disabled={chartData.length === 0}
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                color: CREAM,
                bgcolor: "rgba(255,242,209,0.12)",
                "&:hover": { bgcolor: "rgba(255,242,209,0.22)" },
                "&.Mui-disabled": { color: "rgba(255,242,209,0.25)" },
                zIndex: 1,
              }}
            >
              <PinOutlinedIcon />
            </IconButton>
          </MuiTooltip>
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

        {pinnedGraphs.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: 20,
                color: GREEN,
                fontFamily: "Oswald, sans-serif",
                mb: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <PinIcon sx={{ fontSize: 20 }} />
              Pinned Graphs
            </Typography>

            <Stack spacing={3}>
              {pinnedGraphs.map((pinned) => (
                <Paper
                  key={pinned.id}
                  ref={(el) => {
                    if (el) pinnedGraphRefs.current.set(pinned.id, el);
                    else pinnedGraphRefs.current.delete(pinned.id);
                  }}
                  elevation={6}
                  sx={{
                    borderRadius: 4,
                    p: 3,
                    boxShadow: "0 10px 30px rgba(0,0,0,.12)",
                    bgcolor: DARK_GREEN,
                    position: "relative",
                  }}
                >
                  {/* Header row */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 2 }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <PinIcon sx={{ color: CREAM, fontSize: 18, opacity: 0.8 }} />
                      <Typography
                        sx={{
                          color: CREAM,
                          fontWeight: 700,
                          fontSize: 14,
                          opacity: 0.85,
                        }}
                      >
                        {pinned.label}
                      </Typography>
                    </Box>
                    <MuiTooltip title="Unpin graph" placement="top">
                      <IconButton
                        onClick={() => handleUnpinGraph(pinned.id)}
                        size="small"
                        sx={{
                          color: CREAM,
                          opacity: 0.7,
                          "&:hover": { opacity: 1, bgcolor: "rgba(255,242,209,0.12)" },
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </MuiTooltip>
                  </Stack>

                  {pinned.chartData.length === 0 ? (
                    <Typography sx={{ textAlign: "center", py: 4, color: CREAM, opacity: 0.5 }}>
                      No data captured in this snapshot.
                    </Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={340}>
                      <LineChart data={pinned.chartData}>
                        <CartesianGrid stroke={CREAM} strokeDasharray="5 5" strokeOpacity={0.3} />
                        <XAxis
                          dataKey="gameSecondsElapsed"
                          stroke={CREAM}
                          tick={{ fill: CREAM, fontWeight: 600 }}
                        />
                        <YAxis
                          stroke={CREAM}
                          tick={{ fill: CREAM, fontWeight: 600 }}
                          tickCount={8}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [value, name]}
                          labelFormatter={(_, payload) => {
                            const point = payload?.[0]?.payload;
                            return point?.label || "";
                          }}
                        />
                        <Legend wrapperStyle={{ color: CREAM }} />

                        {pinned.viewMode === "players"
                          ? STAT_FIELDS.filter((s) => pinned.selectedStats.includes(s.key)).flatMap((stat) =>
                              pinned.selectedPlayers.map((playerId) => {
                                const player = pinned.players.find((p) => p._id === playerId);
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
                          : STAT_FIELDS.filter((s) => pinned.selectedStats.includes(s.key)).map((stat) => (
                              <Line
                                key={stat.key}
                                type="monotone"
                                dataKey={stat.key}
                                stroke={stat.color}
                                strokeWidth={2}
                                dot={{ r: 4, fill: stat.color, strokeWidth: 2, stroke: CREAM }}
                                name={stat.label}
                              />
                            ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        <Box
          ref={pdfContentRef}
          sx={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            zIndex: -1,
            pointerEvents: "none",
          }}
        >
            {/* Team Totals Page */}
            <Box
              className="pdf-page"
              sx={{ width: 1200, bgcolor: CREAM, p: 4 }}
            >
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: 36,
                  color: GREEN,
                  textAlign: "center",
                  fontFamily: "Oswald, sans-serif",
                  mb: 1,
                }}
              >
                Game Stats Report
              </Typography>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: 22,
                  color: GREEN,
                  textAlign: "center",
                  mb: 0.5,
                }}
              >
                {game?.gameType} vs{" "}
                {game?.opponent?.teamName || "Opponent"} &mdash;{" "}
                {game
                  ? new Date(game.gameDate).toLocaleDateString()
                  : ""}
              </Typography>
              {(game?.startTime || game?.endTime) && (
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: 16,
                    color: GREEN,
                    textAlign: "center",
                    mb: 2,
                    opacity: 0.8,
                  }}
                >
                  {game?.startTime &&
                    `Started: ${new Date(
                      game.startTime
                    ).toLocaleTimeString()}`}
                  {game?.startTime && game?.endTime && " | "}
                  {game?.endTime &&
                    `Ended: ${new Date(
                      game.endTime
                    ).toLocaleTimeString()}`}
                </Typography>
              )}
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 20,
                  color: GREEN,
                  mb: 1,
                }}
              >
                {teamName} &mdash; Team Totals
              </Typography>
              <Box
                sx={{ bgcolor: DARK_GREEN, borderRadius: 2, p: 2 }}
              >
                <LineChart
                  width={1120}
                  height={500}
                  data={pdfTeamChartData}
                >
                  <CartesianGrid
                    stroke={CREAM}
                    strokeDasharray="5 5"
                    strokeOpacity={0.3}
                  />
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
                  <Tooltip />
                  <Legend wrapperStyle={{ color: CREAM }} />
                  {STAT_FIELDS.map((stat) => (
                    <Line
                      key={stat.key}
                      type="monotone"
                      dataKey={stat.key}
                      stroke={stat.color}
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: stat.color,
                        strokeWidth: 2,
                        stroke: CREAM,
                      }}
                      name={stat.label}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </Box>
            </Box>

            {/* Individual Player Pages */}
            {pdfPlayerChartData.map(({ player, data }) => (
              <Box
                key={player._id}
                className="pdf-page"
                sx={{ width: 1200, bgcolor: CREAM, p: 4 }}
              >
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: 28,
                    color: GREEN,
                    fontFamily: "Oswald, sans-serif",
                    mb: 0.5,
                  }}
                >
                  #{player.number} {player.name}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: GREEN,
                    mb: 1,
                    opacity: 0.7,
                  }}
                >
                  {game?.gameType} vs{" "}
                  {game?.opponent?.teamName || "Opponent"} &mdash;{" "}
                  {game
                    ? new Date(game.gameDate).toLocaleDateString()
                    : ""}
                </Typography>
                <Box
                  sx={{ bgcolor: DARK_GREEN, borderRadius: 2, p: 2 }}
                >
                  <LineChart width={1120} height={550} data={data}>
                    <CartesianGrid
                      stroke={CREAM}
                      strokeDasharray="5 5"
                      strokeOpacity={0.3}
                    />
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
                    <Tooltip />
                    <Legend wrapperStyle={{ color: CREAM }} />
                    {STAT_FIELDS.map((stat) => (
                      <Line
                        key={stat.key}
                        type="monotone"
                        dataKey={stat.key}
                        stroke={stat.color}
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill: stat.color,
                          strokeWidth: 2,
                          stroke: CREAM,
                        }}
                        name={stat.label}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </Box>
              </Box>
            ))}
          </Box>

        {/* Hidden printer-friendly charts for PDF capture */}
        <Box
          ref={printerPdfRef}
          sx={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            zIndex: -1,
            pointerEvents: "none",
          }}
        >
          {pinnedGraphs.map((pinned, idx) => (
            <Box
              key={pinned.id}
              className="printer-pdf-page"
              sx={{ width: 1200, bgcolor: "#ffffff", p: 4 }}
            >
              {/* Page header */}
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: 28,
                  color: "#000",
                  fontFamily: "Oswald, sans-serif",
                  mb: 0.5,
                }}
              >
                Pinned Graph {idx + 1}
              </Typography>
              <Typography sx={{ fontSize: 14, color: "#333", mb: 0.5, fontWeight: 600 }}>
                {pinned.label}
              </Typography>
              {game && (
                <Typography sx={{ fontSize: 13, color: "#555", mb: 2 }}>
                  {game.gameType} vs {game.opponent?.teamName || "Opponent"} &mdash;{" "}
                  {new Date(game.gameDate).toLocaleDateString()}
                </Typography>
              )}

              <Box sx={{ bgcolor: "#fff", border: "1px solid #ccc", borderRadius: 1, p: 1 }}>
                <LineChart width={1120} height={480} data={pinned.chartData}>
                  <CartesianGrid stroke="#ccc" strokeDasharray="4 4" strokeOpacity={0.6} />
                  <XAxis
                    dataKey="gameSecondsElapsed"
                    stroke="#000"
                    tick={{ fill: "#000", fontWeight: 600, fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#000"
                    tick={{ fill: "#000", fontWeight: 600, fontSize: 12 }}
                    tickCount={8}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    labelFormatter={(_, payload) => {
                      const point = payload?.[0]?.payload;
                      return point?.label || "";
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#000" }} />

                  {pinned.viewMode === "players"
                    ? STAT_FIELDS.filter((s) => pinned.selectedStats.includes(s.key)).flatMap((stat) =>
                        pinned.selectedPlayers.map((playerId) => {
                          const player = pinned.players.find((p) => p._id === playerId);
                          const playerName = player ? `#${player.number}` : playerId;
                          const style = PRINTER_STAT_STYLES[stat.key] ?? { shape: "circle", strokeDasharray: "", legendType: "circle" };
                          return (
                            <Line
                              key={`${playerId}-${stat.key}`}
                              type="monotone"
                              dataKey={`${playerName}_${stat.key}`}
                              stroke="#000"
                              strokeWidth={2}
                              strokeDasharray={style.strokeDasharray}
                              dot={makePrinterDot(style.shape)}
                              legendType={style.legendType as "square" | "circle" | "triangle" | "diamond" | "cross" | "star" | "wye" | "rect"}
                              name={`${player?.name || playerId} - ${stat.label}`}
                              isAnimationActive={false}
                            />
                          );
                        })
                      )
                    : STAT_FIELDS.filter((s) => pinned.selectedStats.includes(s.key)).map((stat) => {
                        const style = PRINTER_STAT_STYLES[stat.key] ?? { shape: "circle", strokeDasharray: "", legendType: "circle" };
                        return (
                          <Line
                            key={stat.key}
                            type="monotone"
                            dataKey={stat.key}
                            stroke="#000"
                            strokeWidth={2}
                            strokeDasharray={style.strokeDasharray}
                            dot={makePrinterDot(style.shape)}
                            legendType={style.legendType as "square" | "circle" | "triangle" | "diamond" | "cross" | "star" | "wye" | "rect"}
                            name={stat.label}
                            isAnimationActive={false}
                          />
                        );
                      })}
                </LineChart>
              </Box>
            </Box>
          ))}
        </Box>

      </Container>
    </Box>
  );
}