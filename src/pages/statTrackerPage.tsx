import { useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "../hooks/useAuthFetch";
import { useAuth } from "../context/AuthContext";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";

type Team = { _id: string; name: string };

type Game = {
  _id: string;
  teamId: string;
  gameDate: string;
  gameType: string;
  opponent?: { teamName?: string; roster?: { number: number; name: string }[] };
  status?: "scheduled" | "live" | "intermission" | "final";
  currentPeriod?: number;
  clockSecondsRemaining?: number;
  clockStartedAt?: string | null;
  startTime?: string;
  endTime?: string;
  score?: { us?: number; them?: number };
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
  faceoffsWon: number;
  faceoffsLost: number;
};

type OpponentPlayer = {
  number: number;
  name: string;
};

type GameEventRecord = {
  _id: string;
  gameId: string;
  teamId: string;
  eventType: "faceoff" | "hit" | "penalty" | "shot" | "goal";
  team: "home" | "away";
  homePlayerId: string | null;
  homePlayerName: string;
  homePlayerNumber: number | null;
  awayPlayerName: string;
  awayPlayerNumber: number | null;
  winner: "home" | "away" | null;
  penaltyMinutes: number;
  period: number;
  clockSecondsRemaining: number;
  gameSecondsElapsed: number;
  timestamp: string;
};

const API = {
  teams: "/api/teams",
  games: "/api/games",
  players: "/api/players",
  stats: "/api/stats",
  events: "/api/events",
};

const PERIOD_LENGTH_SECONDS = 20 * 60;
const CREAM = "#fff2d1";
const GREEN = "#005F02";
const PAGE_SIZE = 5;
const SWIPE_THRESHOLD = 80;

const intOrZero = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const formatClock = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};


const getGameSecondsElapsed = (period: number, secondsRemaining: number) => {
  const elapsedBeforePeriod = (Math.max(1, period) - 1) * PERIOD_LENGTH_SECONDS;
  const elapsedThisPeriod = PERIOD_LENGTH_SECONDS - secondsRemaining;
  return elapsedBeforePeriod + elapsedThisPeriod;
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

  "& .MuiSelect-select": { color: GREEN, fontWeight: 800 },

  "&.Mui-disabled .MuiSelect-select": {
    WebkitTextFillColor: GREEN,
    color: GREEN,
    opacity: 1,
  },

  "& input": { color: GREEN, fontWeight: 800 },

  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: GREEN,
    color: GREEN,
    opacity: 1,
  },
};

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
  const authFetch = useAuthFetch();
  const { user } = useAuth();

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

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingStatKey, setEditingStatKey] = useState<keyof StatLine>("goals");
  const [editingValue, setEditingValue] = useState<number>(0);

  const [currentPeriod, setCurrentPeriod] = useState<number>(1);
  const [clockSecondsRemaining, setClockSecondsRemaining] = useState<number>(PERIOD_LENGTH_SECONDS);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [endingGame, setEndingGame] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  // Faceoff state
  const [faceoffHomePlayer, setFaceoffHomePlayer] = useState<Player | null>(null);
  const [faceoffAwayPlayer, setFaceoffAwayPlayer] = useState<OpponentPlayer | null>(null);
  const [faceoffs, setFaceoffs] = useState<GameEventRecord[]>([]);
  const [faceoffSaving, setFaceoffSaving] = useState(false);

  // Hit/Penalty state
  const [hitPenalties, setHitPenalties] = useState<GameEventRecord[]>([]);
  const [hpSaving, setHpSaving] = useState(false);
  const [hpPenaltyPlayer, setHpPenaltyPlayer] = useState<Player | null>(null);
  const [hpPenaltyMinutes, setHpPenaltyMinutes] = useState<number>(2);

  // Shots/Goals state
  const [shotGoals, setShotGoals] = useState<GameEventRecord[]>([]);
  const [sgSaving, setSgSaving] = useState(false);

  // Possession tracker state
  const [possessionOwner, setPossessionOwner] = useState<"home" | "away" | "none">("none");
  const [homeSeconds, setHomeSeconds] = useState(0);
  const [awaySeconds, setAwaySeconds] = useState(0);
  const [possessionSaving, setPossessionSaving] = useState(false);

  useEffect(() => {
    if (!isClockRunning) return;

    const timer = window.setInterval(() => {
      setClockSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsClockRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isClockRunning]);

  // Possession timer — tick every second for whichever team has possession
  useEffect(() => {
    if (possessionOwner === "none") return;
    const timer = window.setInterval(() => {
      if (possessionOwner === "home") setHomeSeconds((s) => s + 1);
      else if (possessionOwner === "away") setAwaySeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [possessionOwner]);

  useEffect(() => {
    (async () => {
      setLoadingTeams(true);
      setMsg(null);
      try {
        const res = await authFetch(API.teams);
        const data = await res.json();
        const all: Team[] = Array.isArray(data) ? data : [];
        // Only show the team this user belongs to
        const filtered = user?.teamId ? all.filter((t) => t._id === user.teamId) : all;
        setTeams(filtered);
        // Auto-select if there's only one option
        if (filtered.length === 1) {
          setTeamId(filtered[0]._id);
        }
      } catch (e) {
        console.error(e);
        setMsg({ type: "error", text: "Failed to load teams." });
      } finally {
        setLoadingTeams(false);
      }
    })();
  }, [authFetch, user?.teamId]);

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
          authFetch(`${API.games}?teamId=${encodeURIComponent(teamId)}`),
          authFetch(`${API.players}?teamId=${encodeURIComponent(teamId)}`),
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
  }, [teamId, authFetch]);

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
        const res = await authFetch(
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
              faceoffsWon: 0,
              faceoffsLost: 0,
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
              faceoffsWon: map[p._id].faceoffsWon ?? 0,
              faceoffsLost: map[p._id].faceoffsLost ?? 0,
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
  }, [teamId, gameId, players, authFetch]);

  const selectedGame = useMemo(() => games.find((g) => g._id === gameId), [games, gameId]);

  // Restore clock state from backend on game selection
  useEffect(() => {
    if (!selectedGame) return;

    setCurrentPeriod(selectedGame.currentPeriod ?? 1);

    if (selectedGame.clockStartedAt && selectedGame.status === 'live') {
      // Clock was running — recalculate remaining time
      const startedAt = new Date(selectedGame.clockStartedAt).getTime();
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const stored = selectedGame.clockSecondsRemaining ?? PERIOD_LENGTH_SECONDS;
      const remaining = Math.max(0, stored - elapsed);
      setClockSecondsRemaining(remaining);
      setIsClockRunning(remaining > 0);
    } else {
      setClockSecondsRemaining(selectedGame.clockSecondsRemaining ?? PERIOD_LENGTH_SECONDS);
      setIsClockRunning(false);
    }
  }, [selectedGame]);

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

  const toggleClock = async () => {
    if (!gameId) return;
    if (isClockRunning) {
      // Pausing — save remaining seconds to backend, clear clockStartedAt
      setIsClockRunning(false);
      try {
        await authFetch(`${API.games}/${gameId}/live`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "live",
            clockSecondsRemaining: clockSecondsRemaining,
            clockStartedAt: null,
            currentPeriod,
          }),
        });
      } catch (e) {
        console.error("Failed to save paused clock state", e);
      }
    } else {
      // Starting — save clockStartedAt and current remaining seconds to backend
      const now = new Date().toISOString();
      setIsClockRunning(true);
      try {
        await authFetch(`${API.games}/${gameId}/live`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "live",
            clockSecondsRemaining: clockSecondsRemaining,
            clockStartedAt: now,
            currentPeriod,
          }),
        });
      } catch (e) {
        console.error("Failed to save clock start state", e);
      }
    }
  };

  const endGame = async () => {
    if (!gameId || !selectedGame) return;
    setEndingGame(true);
    setMsg(null);
    try {
      const res = await authFetch(`${API.games}/${gameId}/finish`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          us: selectedGame.score?.us ?? 0,
          them: selectedGame.score?.them ?? 0,
          currentPeriod,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to end game");
      }
      setIsClockRunning(false);
      setClockSecondsRemaining(0);
      // Refresh game list to reflect new status
      const gRes = await authFetch(`${API.games}?teamId=${encodeURIComponent(teamId)}`);
      const gData = await gRes.json();
      setGames(Array.isArray(gData) ? gData : []);
      setMsg({ type: "success", text: "Game ended and saved to history!" });
    } catch (e: any) {
      console.error(e);
      setMsg({ type: "error", text: e.message || "Failed to end game." });
    } finally {
      setEndingGame(false);
    }
  };

  const onTeamChange = (e: SelectChangeEvent) => setTeamId(e.target.value);
  const onGameChange = (e: SelectChangeEvent) => setGameId(e.target.value);

  // Fetch faceoffs when game is selected
  useEffect(() => {
    if (!gameId) {
      setFaceoffs([]);
      setFaceoffHomePlayer(null);
      setFaceoffAwayPlayer(null);
      setHitPenalties([]);
      setHpPenaltyPlayer(null);
      setShotGoals([]);
      setPossessionOwner("none");
      setHomeSeconds(0);
      setAwaySeconds(0);
      return;
    }
    (async () => {
      try {
        const eventsRes = await authFetch(`${API.events}?gameId=${encodeURIComponent(gameId)}`);
        if (eventsRes.ok) {
          const allEvents: GameEventRecord[] = await eventsRes.json();
          setFaceoffs(allEvents.filter((e) => e.eventType === "faceoff"));
          setHitPenalties(allEvents.filter((e) => e.eventType === "hit" || e.eventType === "penalty"));
          setShotGoals(allEvents.filter((e) => e.eventType === "shot" || e.eventType === "goal"));
        }
      } catch (e) {
        console.error("Failed to load game events", e);
      }
      // Load latest possession
      try {
        const posRes = await authFetch(`/api/possession/game/${encodeURIComponent(gameId)}/latest`);
        if (posRes.ok) {
          const posData = await posRes.json();
          setHomeSeconds(posData.homeSeconds ?? 0);
          setAwaySeconds(posData.awaySeconds ?? 0);
        }
      } catch (e) {
        console.error("Failed to load possession data", e);
      }
    })();
  }, [gameId, authFetch]);

  const opponentRoster = useMemo<OpponentPlayer[]>(() => {
    if (!selectedGame?.opponent?.roster) return [];
    return [...selectedGame.opponent.roster].sort((a, b) => a.number - b.number);
  }, [selectedGame]);

  // Helper: get or create a default stat line for a player, then increment a field and bulkSave
  const incrementStatAndSave = async (playerId: string, field: keyof StatLine, amount: number) => {
    let line = linesByPlayerId[playerId];
    if (!line) {
      line = {
        gameId,
        teamId,
        playerId,
        goals: 0, assists: 0, shots: 0, hits: 0, pim: 0,
        plusMinus: 0, saves: 0, goalsAgainst: 0, faceoffsWon: 0, faceoffsLost: 0,
      };
    }
    const updated: StatLine = { ...line, [field]: (line[field] as number) + amount };
    setLinesByPlayerId((prev) => ({ ...prev, [playerId]: updated }));

    const gameSecondsElapsed = getGameSecondsElapsed(currentPeriod, clockSecondsRemaining);
    await authFetch(`${API.stats}/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        gameId,
        lines: [{
          playerId: updated.playerId,
          goals: updated.goals, assists: updated.assists, shots: updated.shots,
          hits: updated.hits, pim: updated.pim, plusMinus: updated.plusMinus,
          saves: updated.saves, goalsAgainst: updated.goalsAgainst,
          faceoffsWon: updated.faceoffsWon, faceoffsLost: updated.faceoffsLost,
        }],
        historyMeta: { period: currentPeriod, clockSecondsRemaining, gameSecondsElapsed },
      }),
    });
  };

  const recordFaceoff = async (winner: "home" | "away") => {
    if (!faceoffHomePlayer || !faceoffAwayPlayer || !gameId || !teamId) return;
    setFaceoffSaving(true);
    try {
      const gameSecondsElapsed = getGameSecondsElapsed(currentPeriod, clockSecondsRemaining);
      const res = await authFetch(API.events, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          teamId,
          eventType: "faceoff",
          team: "home",
          homePlayerId: faceoffHomePlayer._id,
          homePlayerName: faceoffHomePlayer.name,
          homePlayerNumber: faceoffHomePlayer.number,
          awayPlayerName: faceoffAwayPlayer.name,
          awayPlayerNumber: faceoffAwayPlayer.number,
          winner,
          period: currentPeriod,
          clockSecondsRemaining,
          gameSecondsElapsed,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setFaceoffs((prev) => [created, ...prev]);
        // Also update the home player's stat line via bulkSave
        const faceoffField = winner === "home" ? "faceoffsWon" : "faceoffsLost";
        await incrementStatAndSave(faceoffHomePlayer._id, faceoffField, 1);
        setFaceoffHomePlayer(null);
        setFaceoffAwayPlayer(null);
        setMsg({ type: "success", text: `Faceoff recorded — ${winner === "home" ? "Home" : "Away"} wins!` });
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: data?.error || "Failed to save faceoff." });
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Failed to save faceoff." });
    } finally {
      setFaceoffSaving(false);
    }
  };

  const undoFaceoff = async () => {
    if (!gameId) return;
    setFaceoffSaving(true);
    try {
      const res = await authFetch(`${API.events}/undo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, eventType: "faceoff" }),
      });
      if (res.ok) {
        setFaceoffs((prev) => prev.slice(1));
        setMsg({ type: "success", text: "Last faceoff undone." });
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: data?.error || "Failed to undo faceoff." });
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Failed to undo faceoff." });
    } finally {
      setFaceoffSaving(false);
    }
  };

  const faceoffStats = useMemo(() => {
    let homeWins = 0;
    let awayWins = 0;
    for (const f of faceoffs) {
      if (f.winner === "home") homeWins++;
      else awayWins++;
    }
    return { homeWins, awayWins, total: faceoffs.length };
  }, [faceoffs]);

  // ── Hit/Penalty helpers ──
  const recordHit = async (player: Player) => {
    if (!gameId || !teamId) return;
    setHpSaving(true);
    try {
      const gameSecondsElapsed = getGameSecondsElapsed(currentPeriod, clockSecondsRemaining);
      const res = await authFetch(API.events, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          teamId,
          eventType: "hit",
          team: "home",
          homePlayerId: player._id,
          homePlayerName: player.name,
          homePlayerNumber: player.number,
          period: currentPeriod,
          clockSecondsRemaining,
          gameSecondsElapsed,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setHitPenalties((prev) => [created, ...prev]);
        // Also update the player's stat line (hits +1) via bulkSave
        await incrementStatAndSave(player._id, "hits", 1);
        setMsg({ type: "success", text: `Hit recorded for #${player.number} ${player.name}` });
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: data?.error || "Failed to save hit." });
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Failed to save hit." });
    } finally {
      setHpSaving(false);
    }
  };

  const submitPenalty = async () => {
    if (!hpPenaltyPlayer || !gameId || !teamId) return;
    setHpSaving(true);
    try {
      const gameSecondsElapsed = getGameSecondsElapsed(currentPeriod, clockSecondsRemaining);
      const res = await authFetch(API.events, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          teamId,
          eventType: "penalty",
          team: "home",
          homePlayerId: hpPenaltyPlayer._id,
          homePlayerName: hpPenaltyPlayer.name,
          homePlayerNumber: hpPenaltyPlayer.number,
          penaltyMinutes: hpPenaltyMinutes,
          period: currentPeriod,
          clockSecondsRemaining,
          gameSecondsElapsed,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setHitPenalties((prev) => [created, ...prev]);
        // Also update the player's stat line (pim += penaltyMinutes) via bulkSave
        await incrementStatAndSave(hpPenaltyPlayer._id, "pim", hpPenaltyMinutes);
        setMsg({ type: "success", text: `Penalty recorded: #${hpPenaltyPlayer.number} ${hpPenaltyPlayer.name} — ${hpPenaltyMinutes} min` });
        setHpPenaltyPlayer(null);
        setHpPenaltyMinutes(2);
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: data?.error || "Failed to save penalty." });
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Failed to save penalty." });
    } finally {
      setHpSaving(false);
    }
  };

  const undoHitPenalty = async () => {
    if (!gameId) return;
    setHpSaving(true);
    try {
      const res = await authFetch(`${API.events}/undo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
      if (res.ok) {
        setHitPenalties((prev) => prev.slice(1));
        setMsg({ type: "success", text: "Last hit/penalty undone." });
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: data?.error || "Failed to undo hit/penalty." });
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Failed to undo hit/penalty." });
    } finally {
      setHpSaving(false);
    }
  };

  const hpStats = useMemo(() => {
    let totalHits = 0;
    let totalPenalties = 0;
    let totalPIM = 0;
    for (const r of hitPenalties) {
      if (r.eventType === "hit") totalHits++;
      else {
        totalPenalties++;
        totalPIM += r.penaltyMinutes || 0;
      }
    }
    return { totalHits, totalPenalties, totalPIM, total: hitPenalties.length };
  }, [hitPenalties]);

  // ── Shots/Goals helpers ──
  const recordShot = async (player: Player) => {
    if (!gameId || !teamId) return;
    setSgSaving(true);
    try {
      const gameSecondsElapsed = getGameSecondsElapsed(currentPeriod, clockSecondsRemaining);
      const res = await authFetch(API.events, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId, teamId, eventType: "shot", team: "home",
          homePlayerId: player._id, homePlayerName: player.name, homePlayerNumber: player.number,
          period: currentPeriod, clockSecondsRemaining, gameSecondsElapsed,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setShotGoals((prev) => [created, ...prev]);
        await incrementStatAndSave(player._id, "shots", 1);
        setMsg({ type: "success", text: `Shot recorded for #${player.number} ${player.name}` });
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: data?.error || "Failed to save shot." });
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Failed to save shot." });
    } finally {
      setSgSaving(false);
    }
  };

  const recordGoal = async (player: Player) => {
    if (!gameId || !teamId) return;
    setSgSaving(true);
    try {
      const gameSecondsElapsed = getGameSecondsElapsed(currentPeriod, clockSecondsRemaining);
      const res = await authFetch(API.events, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId, teamId, eventType: "goal", team: "home",
          homePlayerId: player._id, homePlayerName: player.name, homePlayerNumber: player.number,
          period: currentPeriod, clockSecondsRemaining, gameSecondsElapsed,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setShotGoals((prev) => [created, ...prev]);
        // Goal counts as a goal + a shot
        const line = linesByPlayerId[player._id] ?? {
          gameId, teamId, playerId: player._id,
          goals: 0, assists: 0, shots: 0, hits: 0, pim: 0,
          plusMinus: 0, saves: 0, goalsAgainst: 0, faceoffsWon: 0, faceoffsLost: 0,
        };
        const updated = { ...line, goals: line.goals + 1, shots: line.shots + 1 };
        setLinesByPlayerId((prev) => ({ ...prev, [player._id]: updated }));
        const elapsed = getGameSecondsElapsed(currentPeriod, clockSecondsRemaining);
        await authFetch(`${API.stats}/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId, gameId,
            lines: [{
              playerId: updated.playerId, goals: updated.goals, assists: updated.assists,
              shots: updated.shots, hits: updated.hits, pim: updated.pim,
              plusMinus: updated.plusMinus, saves: updated.saves, goalsAgainst: updated.goalsAgainst,
              faceoffsWon: updated.faceoffsWon, faceoffsLost: updated.faceoffsLost,
            }],
            historyMeta: { period: currentPeriod, clockSecondsRemaining, gameSecondsElapsed: elapsed },
          }),
        });
        setMsg({ type: "success", text: `Goal + shot recorded for #${player.number} ${player.name}` });
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: data?.error || "Failed to save goal." });
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Failed to save goal." });
    } finally {
      setSgSaving(false);
    }
  };

  const undoShotGoal = async () => {
    if (!gameId) return;
    setSgSaving(true);
    try {
      const res = await authFetch(`${API.events}/undo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
      if (res.ok) {
        setShotGoals((prev) => prev.slice(1));
        setMsg({ type: "success", text: "Last shot/goal undone." });
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: data?.error || "Failed to undo shot/goal." });
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Failed to undo shot/goal." });
    } finally {
      setSgSaving(false);
    }
  };

  const sgStats = useMemo(() => {
    let totalShots = 0;
    let totalGoals = 0;
    for (const r of shotGoals) {
      if (r.eventType === "shot") totalShots++;
      else if (r.eventType === "goal") { totalGoals++; totalShots++; }
    }
    return { totalShots, totalGoals };
  }, [shotGoals]);

  const changePossession = async (newOwner: "home" | "away" | "none") => {
    // Save snapshot when possession changes from a team
    if (possessionOwner !== "none" && gameId && teamId) {
      setPossessionSaving(true);
      try {
        const gameSecondsElapsed = getGameSecondsElapsed(currentPeriod, clockSecondsRemaining);
        await authFetch("/api/possession", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId,
            teamId,
            homeSeconds,
            awaySeconds,
            period: currentPeriod,
            clockSecondsRemaining,
            gameSecondsElapsed,
          }),
        });
      } catch (e) {
        console.error("Failed to save possession snapshot", e);
      } finally {
        setPossessionSaving(false);
      }
    }
    setPossessionOwner(newOwner);
  };

  const formatPossessionTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const editingPlayer = useMemo(() => {
    if (!editingPlayerId) return null;
    return sortedPlayers.find((p) => p._id === editingPlayerId) || null;
  }, [editingPlayerId, sortedPlayers]);

  const openEdit = (playerId: string) => {
    let line = linesByPlayerId[playerId];

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
        faceoffsWon: 0,
        faceoffsLost: 0,
      };

      setLinesByPlayerId((prev) => ({
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
        faceoffsWon: nextLine.faceoffsWon,
        faceoffsLost: nextLine.faceoffsLost,
      };

      const gameSecondsElapsed = getGameSecondsElapsed(currentPeriod, clockSecondsRemaining);

      const res = await authFetch(`${API.stats}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          gameId,
          lines: [payloadLine],
          historyMeta: {
            period: currentPeriod,
            clockSecondsRemaining,
            gameSecondsElapsed,
          },
        }),
      });

      const raw = await res.text();
      let data: any = null;
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          // ignore non-json body
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

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: CREAM, pt: 12, pb: 5 }}>
      <Navbar />
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

          <Paper elevation={6} sx={{ p: 2.5, borderRadius: 4 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
              <FormControl fullWidth sx={{ minWidth: 220 }} disabled={loadingTeams}>
                <InputLabel shrink sx={{ color: GREEN, fontWeight: 700 }}>
                  Team
                </InputLabel>
                <Select
                  label="Team"
                  value={teamId}
                  onChange={onTeamChange}
                  displayEmpty
                  notched
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
                <InputLabel
                  shrink
                  sx={{ color: GREEN, fontWeight: 700, "&.Mui-disabled": { color: GREEN } }}
                >
                  Game
                </InputLabel>
                <Select
                  label="Game"
                  value={gameId}
                  onChange={onGameChange}
                  displayEmpty
                  notched
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
              <Typography sx={{ opacity: 1, color: GREEN, fontWeight: 700 }}>
                Pick a game to load the player cards.
              </Typography>
            )}

            {msg && (
              <Box sx={{ mt: 2 }}>
                <Alert severity={msg.type}>{msg.text}</Alert>
              </Box>
            )}
          </Paper>

          {selectedGame && (
            <Paper elevation={6} sx={{ p: 2.5, borderRadius: 4 }}>
              <Stack spacing={2}>
                <Typography sx={{ color: GREEN, fontWeight: 1000, fontSize: 24 }}>
                  Live Game Controls
                </Typography>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                  <FormControl sx={{ minWidth: 160 }}>
                    <InputLabel sx={{ color: GREEN, fontWeight: 700 }}>Period</InputLabel>
                    <Select
                      value={String(currentPeriod)}
                      label="Period"
                      onChange={(e) => setCurrentPeriod(Number(e.target.value))}
                      sx={greenFieldSx}
                      MenuProps={greenMenuProps}
                    >
                      <MenuItem value="1">1st</MenuItem>
                      <MenuItem value="2">2nd</MenuItem>
                      <MenuItem value="3">3rd</MenuItem>
                      <MenuItem value="4">OT</MenuItem>
                    </Select>
                  </FormControl>

                  <Stack direction="row" spacing={0.5}>
                    <Button
                      variant="outlined"
                      onClick={() => setClockSecondsRemaining((prev) => Math.min(PERIOD_LENGTH_SECONDS, prev + 1))}
                      disabled={selectedGame?.status === 'final'}
                      sx={{ borderColor: GREEN, color: GREEN, fontWeight: 900, minWidth: 70 }}
                    >
                      +1 Sec
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setClockSecondsRemaining((prev) => Math.max(0, prev - 1))}
                      disabled={selectedGame?.status === 'final'}
                      sx={{ borderColor: GREEN, color: GREEN, fontWeight: 900, minWidth: 70 }}
                    >
                      -1 Sec
                    </Button>
                  </Stack>

                  <Paper
                    elevation={0}
                    sx={{
                      px: 3,
                      py: 1.5,
                      borderRadius: 3,
                      bgcolor: GREEN,
                      color: CREAM,
                      textAlign: "center",
                      minWidth: 180,
                    }}
                  >
                    <Typography sx={{ fontWeight: 900, color: CREAM }}>Period {currentPeriod}</Typography>
                    <Typography sx={{ fontWeight: 1000, fontSize: 32, lineHeight: 1.1, color: CREAM }}>
                      {formatClock(clockSecondsRemaining)}
                    </Typography>
                  </Paper>

                  <Button
                    variant="contained"
                    onClick={toggleClock}
                    disabled={selectedGame?.status === 'final'}
                    sx={{ bgcolor: GREEN, fontWeight: 900 }}
                  >
                    {isClockRunning ? "Pause Clock" : "Start Clock"}
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={() => setClockSecondsRemaining(PERIOD_LENGTH_SECONDS)}
                    sx={{ borderColor: GREEN, color: GREEN, fontWeight: 900 }}
                  >
                    Reset Period
                  </Button>

                  <Button
                    variant="contained"
                    onClick={() => setConfirmEndOpen(true)}
                    disabled={endingGame || selectedGame?.status === 'final'}
                    sx={{
                      bgcolor: "#b71c1c",
                      fontWeight: 900,
                      "&:hover": { bgcolor: "#8b0000" },
                    }}
                  >
                    {endingGame ? "Ending…" : "End Game"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          )}

          <Paper elevation={6} sx={{ borderRadius: 4, p: 2.5 }}>
            {!teamId || !gameId ? (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ color: GREEN, fontWeight: 700 }}>
                  Select a team and game to begin.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton onClick={prevPage} disabled={!canPrev}>
                    <ChevronLeftIcon />
                  </IconButton>

                  <Typography sx={{ fontWeight: 1000, color: GREEN }}>
                    Players {pageIndex * PAGE_SIZE + 1}–
                    {Math.min(sortedPlayers.length, (pageIndex + 1) * PAGE_SIZE)} of{" "}
                    {sortedPlayers.length}
                  </Typography>

                  <IconButton onClick={nextPage} disabled={!canNext}>
                    <ChevronRightIcon />
                  </IconButton>

                  <Box sx={{ flex: 1 }} />

                  <Typography sx={{ color: GREEN, fontWeight: 1000 }}>
                    Page {pageIndex + 1}/{totalPages}
                  </Typography>
                </Stack>

                <Box sx={{ overflow: "visible" }}>
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

          {/* ── Faceoff Tracker Section ── */}
          {selectedGame && opponentRoster.length > 0 && (
            <Paper elevation={6} sx={{ p: 2.5, borderRadius: 4 }}>
              <Typography
                sx={{ color: GREEN, fontWeight: 1000, fontSize: 24, mb: 2, textAlign: "center" }}
              >
                Faceoff Tracker
              </Typography>

              {/* Summary */}
              <Stack direction="row" justifyContent="center" spacing={3} sx={{ mb: 2 }}>
                <Typography sx={{ color: GREEN, fontWeight: 900 }}>
                  Home Wins: {faceoffStats.homeWins}
                </Typography>
                <Typography sx={{ color: GREEN, fontWeight: 900 }}>
                  Away Wins: {faceoffStats.awayWins}
                </Typography>
                <Typography sx={{ color: GREEN, fontWeight: 900 }}>
                  Total: {faceoffStats.total}
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
                {/* Home Team Table */}
                <Box sx={{ flex: 1, width: "100%" }}>
                  <Typography sx={{ color: GREEN, fontWeight: 900, mb: 1, textAlign: "center" }}>
                    Home Team
                  </Typography>
                  <TableContainer component={Paper} elevation={2} sx={{ maxHeight: 350, overflow: "auto" }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 900, color: GREEN }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 900, color: GREEN }}>Name</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 900, color: GREEN }}>Select</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedPlayers.map((p) => (
                          <TableRow
                            key={p._id}
                            selected={faceoffHomePlayer?._id === p._id}
                            sx={{
                              cursor: "pointer",
                              bgcolor: faceoffHomePlayer?._id === p._id ? "rgba(0,95,2,0.12)" : undefined,
                              "&:hover": { bgcolor: "rgba(0,95,2,0.06)" },
                            }}
                            onClick={() => setFaceoffHomePlayer(p)}
                          >
                            <TableCell sx={{ fontWeight: 800 }}>{p.number}</TableCell>
                            <TableCell>{p.name}</TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant={faceoffHomePlayer?._id === p._id ? "contained" : "outlined"}
                                onClick={(e) => { e.stopPropagation(); setFaceoffHomePlayer(p); }}
                                sx={{
                                  minWidth: 60,
                                  bgcolor: faceoffHomePlayer?._id === p._id ? GREEN : undefined,
                                  borderColor: GREEN,
                                  color: faceoffHomePlayer?._id === p._id ? CREAM : GREEN,
                                  fontWeight: 900,
                                  "&:hover": { bgcolor: GREEN, color: CREAM },
                                }}
                              >
                                {faceoffHomePlayer?._id === p._id ? "✓" : "Add"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* Faceoff Center Element */}
                <Box sx={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                  <Paper
                    elevation={4}
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      bgcolor: GREEN,
                      color: CREAM,
                      width: "100%",
                      maxWidth: 320,
                      textAlign: "center",
                    }}
                  >
                    <Typography sx={{ fontWeight: 1000, fontSize: 18, mb: 2, color: CREAM }}>
                      Current Faceoff
                    </Typography>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 900, fontSize: 14, opacity: 0.8, color: CREAM }}>HOME</Typography>
                        {faceoffHomePlayer ? (
                          <>
                            <Typography sx={{ fontWeight: 1000, fontSize: 28, color: CREAM }}>
                              #{faceoffHomePlayer.number}
                            </Typography>
                            <Typography sx={{ fontWeight: 800, fontSize: 13, color: CREAM }}>
                              {faceoffHomePlayer.name}
                            </Typography>
                          </>
                        ) : (
                          <Typography sx={{ fontWeight: 700, fontSize: 14, opacity: 0.6, color: CREAM }}>
                            Select player
                          </Typography>
                        )}
                      </Box>

                      <Typography sx={{ fontWeight: 1000, fontSize: 22, color: CREAM }}>VS</Typography>

                      <Box>
                        <Typography sx={{ fontWeight: 900, fontSize: 14, opacity: 0.8, color: CREAM }}>AWAY</Typography>
                        {faceoffAwayPlayer ? (
                          <>
                            <Typography sx={{ fontWeight: 1000, fontSize: 28, color: CREAM }}>
                              #{faceoffAwayPlayer.number}
                            </Typography>
                            <Typography sx={{ fontWeight: 800, fontSize: 13, color: CREAM }}>
                              {faceoffAwayPlayer.name}
                            </Typography>
                          </>
                        ) : (
                          <Typography sx={{ fontWeight: 700, fontSize: 14, opacity: 0.6, color: CREAM }}>
                            Select player
                          </Typography>
                        )}
                      </Box>
                    </Stack>

                    <Divider sx={{ borderColor: "rgba(255,255,255,0.3)", mb: 2 }} />

                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button
                        variant="contained"
                        disabled={!faceoffHomePlayer || !faceoffAwayPlayer || faceoffSaving}
                        onClick={() => recordFaceoff("home")}
                        sx={{
                          bgcolor: CREAM,
                          color: GREEN,
                          fontWeight: 1000,
                          "&:hover": { bgcolor: "#e6d9b8" },
                          "&:disabled": { bgcolor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.5)" },
                        }}
                      >
                        Home Win
                      </Button>
                      <Button
                        variant="contained"
                        disabled={!faceoffHomePlayer || !faceoffAwayPlayer || faceoffSaving}
                        onClick={() => recordFaceoff("away")}
                        sx={{
                          bgcolor: CREAM,
                          color: GREEN,
                          fontWeight: 1000,
                          "&:hover": { bgcolor: "#e6d9b8" },
                          "&:disabled": { bgcolor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.5)" },
                        }}
                      >
                        Away Win
                      </Button>
                      <Button
                        variant="outlined"
                        disabled={faceoffs.length === 0 || faceoffSaving}
                        onClick={undoFaceoff}
                        sx={{
                          borderColor: CREAM,
                          color: CREAM,
                          fontWeight: 900,
                          "&:hover": { borderColor: "#e6d9b8", bgcolor: "rgba(255,255,255,0.1)" },
                          "&:disabled": { borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.5)" },
                        }}
                      >
                        Undo
                      </Button>
                    </Stack>
                  </Paper>
                </Box>

                {/* Away Team Table */}
                <Box sx={{ flex: 1, width: "100%" }}>
                  <Typography sx={{ color: GREEN, fontWeight: 900, mb: 1, textAlign: "center" }}>
                    {selectedGame.opponent?.teamName || "Opponent"}
                  </Typography>
                  <TableContainer component={Paper} elevation={2} sx={{ maxHeight: 350, overflow: "auto" }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 900, color: GREEN }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 900, color: GREEN }}>Name</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 900, color: GREEN }}>Select</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {opponentRoster.map((p, idx) => (
                          <TableRow
                            key={`opp-${idx}`}
                            selected={faceoffAwayPlayer?.number === p.number && faceoffAwayPlayer?.name === p.name}
                            sx={{
                              cursor: "pointer",
                              bgcolor: faceoffAwayPlayer?.number === p.number && faceoffAwayPlayer?.name === p.name ? "rgba(0,95,2,0.12)" : undefined,
                              "&:hover": { bgcolor: "rgba(0,95,2,0.06)" },
                            }}
                            onClick={() => setFaceoffAwayPlayer(p)}
                          >
                            <TableCell sx={{ fontWeight: 800 }}>{p.number}</TableCell>
                            <TableCell>{p.name}</TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant={faceoffAwayPlayer?.number === p.number && faceoffAwayPlayer?.name === p.name ? "contained" : "outlined"}
                                onClick={(e) => { e.stopPropagation(); setFaceoffAwayPlayer(p); }}
                                sx={{
                                  minWidth: 60,
                                  bgcolor: faceoffAwayPlayer?.number === p.number && faceoffAwayPlayer?.name === p.name ? GREEN : undefined,
                                  borderColor: GREEN,
                                  color: faceoffAwayPlayer?.number === p.number && faceoffAwayPlayer?.name === p.name ? CREAM : GREEN,
                                  fontWeight: 900,
                                  "&:hover": { bgcolor: GREEN, color: CREAM },
                                }}
                              >
                                {faceoffAwayPlayer?.number === p.number && faceoffAwayPlayer?.name === p.name ? "✓" : "Add"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Stack>
            </Paper>
          )}

          {/* ── Hit & Penalty Tracker Section ── */}
          {selectedGame && (
            <Paper elevation={6} sx={{ p: 2.5, borderRadius: 4 }}>
              <Typography
                sx={{ color: GREEN, fontWeight: 1000, fontSize: 24, mb: 2, textAlign: "center" }}
              >
                Hit & Penalty Tracker
              </Typography>

              {/* Summary */}
              <Stack direction="row" justifyContent="center" spacing={3} sx={{ mb: 2 }}>
                <Typography sx={{ color: GREEN, fontWeight: 900 }}>
                  Hits: {hpStats.totalHits}
                </Typography>
                <Typography sx={{ color: GREEN, fontWeight: 900 }}>
                  Penalties: {hpStats.totalPenalties}
                </Typography>
                <Typography sx={{ color: GREEN, fontWeight: 900 }}>
                  PIM: {hpStats.totalPIM}
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
                {/* Home Team Table */}
                <Box sx={{ flex: 1, width: "100%" }}>
                  <Typography sx={{ color: GREEN, fontWeight: 900, mb: 1, textAlign: "center" }}>
                    Home Team
                  </Typography>
                  <TableContainer component={Paper} elevation={2} sx={{ maxHeight: 350, overflow: "auto" }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 900, color: GREEN }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 900, color: GREEN }}>Name</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: GREEN }}>Hit</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: GREEN }}>Penalty</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedPlayers.map((p) => (
                          <TableRow key={`hp-home-${p._id}`} sx={{ "&:hover": { bgcolor: "rgba(0,95,2,0.06)" } }}>
                            <TableCell sx={{ fontWeight: 800 }}>{p.number}</TableCell>
                            <TableCell>{p.name}</TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="contained"
                                disabled={hpSaving}
                                onClick={() => recordHit(p)}
                                sx={{
                                  minWidth: 50,
                                  bgcolor: GREEN,
                                  color: CREAM,
                                  fontWeight: 900,
                                  "&:hover": { bgcolor: "#004a01" },
                                }}
                              >
                                Hit
                              </Button>
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={hpSaving}
                                onClick={() => { setHpPenaltyPlayer(p); setHpPenaltyMinutes(2); }}
                                sx={{
                                  minWidth: 70,
                                  borderColor: "#b71c1c",
                                  color: "#b71c1c",
                                  fontWeight: 900,
                                  "&:hover": { bgcolor: "rgba(183,28,28,0.08)", borderColor: "#8b0000" },
                                }}
                              >
                                Penalty
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* Center Panel */}
                <Box sx={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                  <Paper
                    elevation={4}
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      bgcolor: GREEN,
                      color: CREAM,
                      width: "100%",
                      maxWidth: 320,
                      textAlign: "center",
                    }}
                  >
                    {hpPenaltyPlayer ? (
                      <>
                        <Typography sx={{ fontWeight: 1000, fontSize: 18, mb: 2, color: CREAM }}>
                          Record Penalty
                        </Typography>
                        <Typography sx={{ fontWeight: 1000, fontSize: 28, color: CREAM }}>
                          #{hpPenaltyPlayer.number}
                        </Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2, color: CREAM }}>
                          {hpPenaltyPlayer.name}
                        </Typography>

                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel sx={{ color: CREAM, fontWeight: 700, "&.Mui-focused": { color: CREAM } }}>Minutes</InputLabel>
                          <Select
                            value={String(hpPenaltyMinutes)}
                            label="Minutes"
                            onChange={(e) => setHpPenaltyMinutes(Number(e.target.value))}
                            sx={{
                              color: CREAM,
                              fontWeight: 900,
                              "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.5)" },
                              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: CREAM },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: CREAM },
                              "& .MuiSelect-icon": { color: CREAM },
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: { "& .MuiMenuItem-root": { fontWeight: 800 } },
                              },
                            }}
                          >
                            <MenuItem value="2">2 Minutes</MenuItem>
                            <MenuItem value="4">4 Minutes</MenuItem>
                            <MenuItem value="5">5 Minutes</MenuItem>
                            <MenuItem value="10">10 Minutes</MenuItem>
                          </Select>
                        </FormControl>

                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Button
                            variant="contained"
                            disabled={hpSaving}
                            onClick={submitPenalty}
                            sx={{
                              bgcolor: CREAM,
                              color: GREEN,
                              fontWeight: 1000,
                              "&:hover": { bgcolor: "#e6d9b8" },
                              "&:disabled": { bgcolor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.5)" },
                            }}
                          >
                            {hpSaving ? "Saving…" : "Submit Penalty"}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => setHpPenaltyPlayer(null)}
                            sx={{
                              borderColor: CREAM,
                              color: CREAM,
                              fontWeight: 900,
                              "&:hover": { borderColor: "#e6d9b8", bgcolor: "rgba(255,255,255,0.1)" },
                            }}
                          >
                            Cancel
                          </Button>
                        </Stack>
                      </>
                    ) : (
                      <>
                        <Typography sx={{ fontWeight: 1000, fontSize: 18, mb: 2, color: CREAM }}>
                          Hit & Penalty Actions
                        </Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: 14, opacity: 0.7, mb: 2, color: CREAM }}>
                          Press "Hit" to instantly record a hit. Press "Penalty" to select minutes.
                        </Typography>
                      </>
                    )}

                    <Divider sx={{ borderColor: "rgba(255,255,255,0.3)", my: 2 }} />

                    <Button
                      variant="outlined"
                      disabled={hitPenalties.length === 0 || hpSaving}
                      onClick={undoHitPenalty}
                      sx={{
                        borderColor: CREAM,
                        color: CREAM,
                        fontWeight: 900,
                        "&:hover": { borderColor: "#e6d9b8", bgcolor: "rgba(255,255,255,0.1)" },
                        "&:disabled": { borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.5)" },
                      }}
                    >
                      Undo Last
                    </Button>
                  </Paper>
                </Box>

                {/* Away Team Table */}
                <Box sx={{ flex: 1, width: "100%" }}>
                  <Typography sx={{ color: GREEN, fontWeight: 900, mb: 1, textAlign: "center" }}>
                    {selectedGame.opponent?.teamName || "Opponent"}
                  </Typography>
                  <TableContainer component={Paper} elevation={2} sx={{ maxHeight: 350, overflow: "auto" }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 900, color: GREEN }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 900, color: GREEN }}>Name</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: GREEN }}>Hit</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: GREEN }}>Penalty</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {opponentRoster.map((p, idx) => (
                          <TableRow key={`hp-opp-${idx}`} sx={{ "&:hover": { bgcolor: "rgba(0,95,2,0.06)" } }}>
                            <TableCell sx={{ fontWeight: 800 }}>{p.number}</TableCell>
                            <TableCell>{p.name}</TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="contained"
                                disabled={hpSaving}
                                onClick={async () => {
                                  if (!gameId || !teamId) return;
                                  setHpSaving(true);
                                  try {
                                    const gameSecondsElapsed = getGameSecondsElapsed(currentPeriod, clockSecondsRemaining);
                                    const res = await authFetch(API.events, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        gameId,
                                        teamId,
                                        eventType: "hit",
                                        team: "away",
                                        awayPlayerName: p.name,
                                        awayPlayerNumber: p.number,
                                        period: currentPeriod,
                                        clockSecondsRemaining,
                                        gameSecondsElapsed,
                                      }),
                                    });
                                    if (res.ok) {
                                      const created = await res.json();
                                      setHitPenalties((prev) => [created, ...prev]);
                                      setMsg({ type: "success", text: `Hit recorded for #${p.number} ${p.name}` });
                                    } else {
                                      const data = await res.json().catch(() => ({}));
                                      setMsg({ type: "error", text: data?.error || "Failed to save hit." });
                                    }
                                  } catch (e) {
                                    console.error(e);
                                    setMsg({ type: "error", text: "Failed to save hit." });
                                  } finally {
                                    setHpSaving(false);
                                  }
                                }}
                                sx={{
                                  minWidth: 50,
                                  bgcolor: GREEN,
                                  color: CREAM,
                                  fontWeight: 900,
                                  "&:hover": { bgcolor: "#004a01" },
                                }}
                              >
                                Hit
                              </Button>
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={hpSaving}
                                onClick={() => {
                                  setHpPenaltyPlayer({ _id: "000000000000000000000000", name: p.name, number: p.number, teamId: "" } as Player);
                                  setHpPenaltyMinutes(2);
                                }}
                                sx={{
                                  minWidth: 70,
                                  borderColor: "#b71c1c",
                                  color: "#b71c1c",
                                  fontWeight: 900,
                                  "&:hover": { bgcolor: "rgba(183,28,28,0.08)", borderColor: "#8b0000" },
                                }}
                              >
                                Penalty
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Stack>
            </Paper>
          )}

          {/* ── Shots & Goals Tracker Section ── */}
          {selectedGame && (
            <Paper elevation={6} sx={{ p: 2.5, borderRadius: 4 }}>
              <Typography sx={{ color: GREEN, fontWeight: 1000, fontSize: 24, mb: 2, textAlign: "center" }}>
                Shots & Goals Tracker
              </Typography>

              {/* Summary */}
              <Stack direction="row" justifyContent="center" spacing={3} sx={{ mb: 2 }}>
                <Typography sx={{ color: GREEN, fontWeight: 900 }}>Shots: {sgStats.totalShots}</Typography>
                <Typography sx={{ color: GREEN, fontWeight: 900 }}>Goals: {sgStats.totalGoals}</Typography>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
                {/* Home Team Table */}
                <Box sx={{ flex: 1, width: "100%" }}>
                  <Typography sx={{ color: GREEN, fontWeight: 900, mb: 1, textAlign: "center" }}>Home Team</Typography>
                  <TableContainer component={Paper} elevation={2} sx={{ maxHeight: 350, overflow: "auto" }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 900, color: GREEN }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 900, color: GREEN }}>Name</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: GREEN }}>Shot</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: GREEN }}>Goal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedPlayers.map((p) => (
                          <TableRow key={`sg-home-${p._id}`} sx={{ "&:hover": { bgcolor: "rgba(0,95,2,0.06)" } }}>
                            <TableCell sx={{ fontWeight: 800 }}>{p.number}</TableCell>
                            <TableCell>{p.name}</TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="contained"
                                disabled={sgSaving}
                                onClick={() => recordShot(p)}
                                sx={{ minWidth: 55, bgcolor: GREEN, color: CREAM, fontWeight: 900, "&:hover": { bgcolor: "#004a01" } }}
                              >
                                Shot
                              </Button>
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={sgSaving}
                                onClick={() => recordGoal(p)}
                                sx={{ minWidth: 55, borderColor: "#e65100", color: "#e65100", fontWeight: 900, "&:hover": { bgcolor: "rgba(230,81,0,0.08)", borderColor: "#bf360c" } }}
                              >
                                Goal
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* Center Panel */}
                <Box sx={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                  <Paper elevation={4} sx={{ p: 3, borderRadius: 4, bgcolor: GREEN, color: CREAM, width: "100%", maxWidth: 320, textAlign: "center" }}>
                    <Typography sx={{ fontWeight: 1000, fontSize: 18, mb: 2, color: CREAM }}>
                      Shot & Goal Actions
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, opacity: 0.7, mb: 3, color: CREAM }}>
                      Press "Shot" to record a shot. Press "Goal" to record a goal — a shot is automatically added too.
                    </Typography>
                    <Divider sx={{ borderColor: "rgba(255,255,255,0.3)", my: 2 }} />
                    <Button
                      variant="outlined"
                      disabled={shotGoals.length === 0 || sgSaving}
                      onClick={undoShotGoal}
                      sx={{
                        borderColor: CREAM, color: CREAM, fontWeight: 900,
                        "&:hover": { borderColor: "#e6d9b8", bgcolor: "rgba(255,255,255,0.1)" },
                        "&:disabled": { borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.5)" },
                      }}
                    >
                      Undo Last
                    </Button>
                  </Paper>
                </Box>

                {/* Away Team Table */}
                <Box sx={{ flex: 1, width: "100%" }}>
                  <Typography sx={{ color: GREEN, fontWeight: 900, mb: 1, textAlign: "center" }}>
                    {selectedGame.opponent?.teamName || "Opponent"}
                  </Typography>
                  <TableContainer component={Paper} elevation={2} sx={{ maxHeight: 350, overflow: "auto" }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 900, color: GREEN }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 900, color: GREEN }}>Name</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: GREEN }}>Shot</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: GREEN }}>Goal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {opponentRoster.map((p, idx) => (
                          <TableRow key={`sg-opp-${idx}`} sx={{ "&:hover": { bgcolor: "rgba(0,95,2,0.06)" } }}>
                            <TableCell sx={{ fontWeight: 800 }}>{p.number}</TableCell>
                            <TableCell>{p.name}</TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="contained"
                                disabled={sgSaving}
                                onClick={async () => {
                                  if (!gameId || !teamId) return;
                                  setSgSaving(true);
                                  try {
                                    const gameSecondsElapsed = getGameSecondsElapsed(currentPeriod, clockSecondsRemaining);
                                    const res = await authFetch(API.events, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        gameId, teamId, eventType: "shot", team: "away",
                                        homePlayerId: null, homePlayerName: p.name, homePlayerNumber: p.number,
                                        period: currentPeriod, clockSecondsRemaining, gameSecondsElapsed,
                                      }),
                                    });
                                    if (res.ok) {
                                      const created = await res.json();
                                      setShotGoals((prev) => [created, ...prev]);
                                      setMsg({ type: "success", text: `Shot recorded for #${p.number} ${p.name}` });
                                    } else {
                                      const data = await res.json().catch(() => ({}));
                                      setMsg({ type: "error", text: data?.error || "Failed to save shot." });
                                    }
                                  } catch (e) { console.error(e); setMsg({ type: "error", text: "Failed to save shot." }); }
                                  finally { setSgSaving(false); }
                                }}
                                sx={{ minWidth: 55, bgcolor: GREEN, color: CREAM, fontWeight: 900, "&:hover": { bgcolor: "#004a01" } }}
                              >
                                Shot
                              </Button>
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={sgSaving}
                                onClick={async () => {
                                  if (!gameId || !teamId) return;
                                  setSgSaving(true);
                                  try {
                                    const gameSecondsElapsed = getGameSecondsElapsed(currentPeriod, clockSecondsRemaining);
                                    const res = await authFetch(API.events, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        gameId, teamId, eventType: "goal", team: "away",
                                        homePlayerId: null, homePlayerName: p.name, homePlayerNumber: p.number,
                                        period: currentPeriod, clockSecondsRemaining, gameSecondsElapsed,
                                      }),
                                    });
                                    if (res.ok) {
                                      const created = await res.json();
                                      setShotGoals((prev) => [created, ...prev]);
                                      setMsg({ type: "success", text: `Goal + shot recorded for #${p.number} ${p.name}` });
                                    } else {
                                      const data = await res.json().catch(() => ({}));
                                      setMsg({ type: "error", text: data?.error || "Failed to save goal." });
                                    }
                                  } catch (e) { console.error(e); setMsg({ type: "error", text: "Failed to save goal." }); }
                                  finally { setSgSaving(false); }
                                }}
                                sx={{ minWidth: 55, borderColor: "#e65100", color: "#e65100", fontWeight: 900, "&:hover": { bgcolor: "rgba(230,81,0,0.08)", borderColor: "#bf360c" } }}
                              >
                                Goal
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Stack>
            </Paper>
          )}

          {/* ── Time of Possession Tracker ── */}
          {selectedGame && (
            <Paper elevation={6} sx={{ p: 2.5, borderRadius: 4 }}>
              <Typography
                sx={{ color: GREEN, fontWeight: 1000, fontSize: 24, mb: 2, textAlign: "center" }}
              >
                Time of Possession
              </Typography>

              {/* Timers */}
              <Stack direction="row" justifyContent="center" spacing={4} sx={{ mb: 3 }}>
                <Paper
                  elevation={3}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: possessionOwner === "home" ? GREEN : "rgba(0,95,2,0.08)",
                    textAlign: "center",
                    minWidth: 160,
                    transition: "all 0.3s ease",
                  }}
                >
                  <Typography sx={{ fontWeight: 900, fontSize: 14, opacity: 0.85, color: possessionOwner === "home" ? CREAM : GREEN }}>
                    {teams.find((t) => t._id === teamId)?.name || "HOME"}
                  </Typography>
                  <Typography sx={{ fontWeight: 1000, fontSize: 40, lineHeight: 1.2, color: possessionOwner === "home" ? CREAM : GREEN }}>
                    {formatPossessionTime(homeSeconds)}
                  </Typography>
                </Paper>

                <Paper
                  elevation={3}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: possessionOwner === "away" ? GREEN : "rgba(0,95,2,0.08)",
                    textAlign: "center",
                    minWidth: 160,
                    transition: "all 0.3s ease",
                  }}
                >
                  <Typography sx={{ fontWeight: 900, fontSize: 14, opacity: 0.85, color: possessionOwner === "away" ? CREAM : GREEN }}>
                    {selectedGame.opponent?.teamName || "AWAY"}
                  </Typography>
                  <Typography sx={{ fontWeight: 1000, fontSize: 40, lineHeight: 1.2, color: possessionOwner === "away" ? CREAM : GREEN }}>
                    {formatPossessionTime(awaySeconds)}
                  </Typography>
                </Paper>
              </Stack>

              {/* Buttons */}
              <Stack direction="row" justifyContent="center" spacing={2}>
                <Button
                  variant={possessionOwner === "home" ? "contained" : "outlined"}
                  disabled={possessionSaving}
                  onClick={() => changePossession("home")}
                  sx={{
                    minWidth: 140,
                    bgcolor: possessionOwner === "home" ? GREEN : undefined,
                    borderColor: GREEN,
                    color: possessionOwner === "home" ? CREAM : GREEN,
                    fontWeight: 1000,
                    fontSize: 16,
                    py: 1.5,
                    "&:hover": { bgcolor: GREEN, color: CREAM },
                  }}
                >
                  {teams.find((t) => t._id === teamId)?.name || "Home"} Possession
                </Button>

                <Button
                  variant={possessionOwner === "none" ? "contained" : "outlined"}
                  disabled={possessionSaving}
                  onClick={() => changePossession("none")}
                  sx={{
                    minWidth: 140,
                    bgcolor: possessionOwner === "none" ? "#666" : undefined,
                    borderColor: "#666",
                    color: possessionOwner === "none" ? "#fff" : "#666",
                    fontWeight: 1000,
                    fontSize: 16,
                    py: 1.5,
                    "&:hover": { bgcolor: "#666", color: "#fff" },
                  }}
                >
                  Stop Timer
                </Button>

                <Button
                  variant={possessionOwner === "away" ? "contained" : "outlined"}
                  disabled={possessionSaving}
                  onClick={() => changePossession("away")}
                  sx={{
                    minWidth: 140,
                    bgcolor: possessionOwner === "away" ? "#b71c1c" : undefined,
                    borderColor: "#b71c1c",
                    color: possessionOwner === "away" ? "#fff" : "#b71c1c",
                    fontWeight: 1000,
                    fontSize: 16,
                    py: 1.5,
                    "&:hover": { bgcolor: "#b71c1c", color: "#fff" },
                  }}
                >
                  {selectedGame.opponent?.teamName || "Away"} Possession
                </Button>
              </Stack>

            </Paper>
          )}
        </Stack>

        <Dialog open={confirmEndOpen} onClose={() => setConfirmEndOpen(false)}>
          <DialogTitle sx={{ fontWeight: 900, color: "#b71c1c" }}>End Game?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to end the game? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setConfirmEndOpen(false)}
              sx={{ color: GREEN, fontWeight: 900 }}
            >
              No
            </Button>
            <Button
              onClick={() => { setConfirmEndOpen(false); endGame(); }}
              variant="contained"
              sx={{ bgcolor: "#b71c1c", fontWeight: 900, "&:hover": { bgcolor: "#8b0000" } }}
            >
              Yes, End Game
            </Button>
          </DialogActions>
        </Dialog>

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
                            <MenuItem value="faceoffsWon">Faceoffs Won</MenuItem>
                            <MenuItem value="faceoffsLost">Faceoffs Lost</MenuItem>
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
      elevation={0}
      sx={{
        cursor: "pointer",
        borderRadius: "18px",
        overflow: "visible",
        transition: "transform .15s ease",
        "&:hover": { transform: isLg ? "none" : "translateY(-5px)" },
        background: "linear-gradient(135deg, #0a3d0a, #1a5c1a)",
        border: "1px solid rgba(255,255,255,.15)",
        pointerEvents: isLg ? "none" : "auto",
      }}
    >
      <Box sx={{ p: pad, color: "#fff", "& .MuiTypography-root": { color: "#fff" } }}>
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
            bgcolor: "rgba(255,255,255,.10)",
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

        <Divider sx={{ my: 1, opacity: 0.4, borderColor: "rgba(255,255,255,.3)" }} />

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