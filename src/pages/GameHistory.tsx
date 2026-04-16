import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Button,
  Stack,
} from "@mui/material";
import { Visibility as ViewIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuthFetch } from "../hooks/useAuthFetch";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

interface ApiTeam {
  _id: string;
  name: string;
}

interface ApiGame {
  _id: string;
  teamId: string;
  gameType: string;
  gameDate: string;
  startTime?: string;
  endTime?: string;
  opponent?: { teamName?: string };
  score?: { us?: number; them?: number };
  status?: "scheduled" | "live" | "intermission" | "final";
  currentPeriod?: number;
  clockSecondsRemaining?: number;
  clockStartedAt?: string | null;
}

interface Game {
  _id: string;
  teamId: string;
  teamName: string;
  gameType: string;
  gameDate: string;
  startTime?: string;
  endTime?: string;
  opponentTeamName: string;
  teamScore?: number;
  opponentScore?: number;
  status?: "scheduled" | "live" | "intermission" | "final";
  currentPeriod?: number;
  clockSecondsRemaining?: number;
  clockStartedAt?: string | null;
}

interface GameEvent {
  _id: string;
  eventType: string;
  team: "home" | "away";
  winner?: "home" | "away" | null;
}

interface PossessionSnapshot {
  homeSeconds: number;
  awaySeconds: number;
}

interface GlanceStats {
  faceoffPct: string;
  hitCount: string;
  possessionPct: string;
}

const CREAM = "#fff2d1";
const GREEN = "#005F02";

function formatClock(seconds = 0) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getLiveClockSeconds(game: Game) {
  if (game.clockStartedAt && game.status === "live") {
    const startedAt = new Date(game.clockStartedAt).getTime();
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, (game.clockSecondsRemaining ?? 0) - elapsed);
  }
  return game.clockSecondsRemaining ?? 0;
}

function getStatusLabel(game: Game) {
  if (game.status === "live") {
    return `Live • P${game.currentPeriod ?? "-"} • ${formatClock(getLiveClockSeconds(game))}`;
  }
  if (game.status === "intermission") {
    return `Intermission • P${game.currentPeriod ?? "-"}`;
  }
  if (game.status === "final") return "Final";
  return "Scheduled";
}

export default function GameHistory() {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [glanceStats, setGlanceStats] = useState<GlanceStats | null>(null);

  async function fetchData() {
    try {
      setIsLoading(true);

      const [teamsRes, gamesRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/teams`),
        authFetch(`${API_BASE_URL}/api/games`),
      ]);

      const teamsData: ApiTeam[] = await teamsRes.json();
      const gamesData: ApiGame[] = await gamesRes.json();

      const teamsMap: Record<string, string> = {};
      teamsData.forEach((t) => {
        teamsMap[t._id] = t.name;
      });

      const mappedGames: Game[] = gamesData.map((game) => ({
        _id: game._id,
        teamId: game.teamId,
        teamName: teamsMap[game.teamId] || "Unknown Team",
        gameType: game.gameType,
        gameDate: game.gameDate,
        startTime: game.startTime,
        endTime: game.endTime,
        opponentTeamName: game.opponent?.teamName || "Unknown Opponent",
        teamScore: game.score?.us ?? 0,
        opponentScore: game.score?.them ?? 0,
        status: game.status,
        currentPeriod: game.currentPeriod,
        clockSecondsRemaining: game.clockSecondsRemaining,
        clockStartedAt: game.clockStartedAt,
      }));

      const sorted = mappedGames.sort(
        (a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime()
      );
      setGames(sorted);

      // Fetch "At a Glance" stats for the last completed game
      const lastFinal = sorted.find((g) => g.status === "final");
      if (lastFinal) {
        fetchGlanceStats(lastFinal._id);
      } else {
        setGlanceStats(null);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchGlanceStats(gameId: string) {
    try {
      const [eventsRes, possessionRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/events?gameId=${encodeURIComponent(gameId)}`),
        authFetch(`${API_BASE_URL}/api/possession/game/${encodeURIComponent(gameId)}/latest`),
      ]);

      let faceoffPct = "—";
      let hitCount = "—";
      let possessionPct = "—";

      if (eventsRes.ok) {
        const events: GameEvent[] = await eventsRes.json();
        const faceoffs = events.filter((e) => e.eventType === "faceoff");
        if (faceoffs.length > 0) {
          const homeWins = faceoffs.filter((e) => e.winner === "home").length;
          faceoffPct = `${Math.round((homeWins / faceoffs.length) * 100)}%`;
        }
        const hits = events.filter((e) => e.eventType === "hit");
        if (hits.length > 0) {
          hitCount = String(hits.length);
        }
      }

      if (possessionRes.ok) {
        const possession: PossessionSnapshot = await possessionRes.json();
        const total = (possession.homeSeconds ?? 0) + (possession.awaySeconds ?? 0);
        if (total > 0) {
          possessionPct = `${Math.round((possession.homeSeconds / total) * 100)}%`;
        }
      }

      setGlanceStats({ faceoffPct, hitCount, possessionPct });
    } catch (err) {
      console.error("Error fetching glance stats:", err);
      setGlanceStats(null);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleHistoryClick = (gameId: string) => {
    navigate(`/gamestats/${gameId}`);
  };

  const handleLiveClick = (gameId: string) => {
    navigate(`/games/${gameId}/live`);
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
    <Box sx={{ minHeight: "100vh", bgcolor: CREAM, py: { xs: 6, md: 8 }, pt: { xs: 12, md: 14 } }}>
      <Container maxWidth="lg">
        <Typography
          sx={{
            textAlign: "center",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            fontSize: { xs: 34, sm: 44, md: 60 },
            mb: 2,
            color: GREEN,
            fontFamily: "Oswald, sans-serif",
          }}
        >
          Game History
        </Typography>

        <Stack direction="row" justifyContent="center" spacing={2} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            onClick={() => navigate("/opponent-overview")}
            sx={{
              bgcolor: GREEN,
              color: CREAM,
              fontWeight: 700,
              px: 3,
              "&:hover": { bgcolor: "#004a01" },
            }}
          >
            Opponent Overview
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate("/team-overview")}
            sx={{
              bgcolor: GREEN,
              color: CREAM,
              fontWeight: 700,
              px: 3,
              "&:hover": { bgcolor: "#004a01" },
            }}
          >
            Team Overview
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
          {/* ── At a Glance sidebar ── */}
          {(() => {
            const lastFinal = games.find((g) => g.status === "final");
            const won =
              lastFinal &&
              (lastFinal.teamScore ?? 0) > (lastFinal.opponentScore ?? 0);
            const lost =
              lastFinal &&
              (lastFinal.teamScore ?? 0) < (lastFinal.opponentScore ?? 0);
            return (
              <Paper
                elevation={6}
                sx={{
                  borderRadius: 4,
                  p: 3,
                  minWidth: 220,
                  width: { xs: "100%", md: 240 },
                  flexShrink: 0,
                  boxShadow: "0 10px 30px rgba(0,0,0,.12)",
                  bgcolor: "#fff",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: 13,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: GREEN,
                    mb: 1.5,
                    fontFamily: "Oswald, sans-serif",
                  }}
                >
                  At a Glance
                </Typography>

                {!lastFinal ? (
                  <Typography sx={{ color: GREEN, opacity: 0.55, fontSize: 13 }}>
                    No completed games yet.
                  </Typography>
                ) : (
                  <>
                    <Typography
                      sx={{ fontSize: 11, color: GREEN, opacity: 0.6, mb: 0.5, fontWeight: 600 }}
                    >
                      YOUR PREVIOUS GAME
                    </Typography>

                    {/* Result badge */}
                    <Box
                      sx={{
                        display: "inline-block",
                        px: 1.5,
                        py: 0.25,
                        borderRadius: 2,
                        mb: 1,
                        bgcolor: won
                          ? "rgba(0,95,2,.12)"
                          : lost
                          ? "rgba(200,0,0,.1)"
                          : "rgba(0,0,0,.07)",
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 900,
                          fontSize: 15,
                          color: won ? GREEN : lost ? "#b00000" : "#555",
                          fontFamily: "Oswald, sans-serif",
                        }}
                      >
                        {won ? "WIN" : lost ? "LOSS" : "TIE"}
                      </Typography>
                    </Box>

                    {/* Score */}
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: 28,
                        color: GREEN,
                        lineHeight: 1,
                        mb: 0.25,
                        fontFamily: "Oswald, sans-serif",
                      }}
                    >
                      {lastFinal.teamScore ?? 0} – {lastFinal.opponentScore ?? 0}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: GREEN, opacity: 0.6, mb: 2 }}>
                      vs. {lastFinal.opponentTeamName}
                    </Typography>

                    {/* Stat rows */}
                    {[
                      { label: "Face Off %", value: glanceStats?.faceoffPct ?? "—" },
                      { label: "Hits", value: glanceStats?.hitCount ?? "—" },
                      { label: "Time of Poss %", value: glanceStats?.possessionPct ?? "—" },
                    ].map(({ label, value }) => (
                      <Box
                        key={label}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          py: 0.75,
                          borderTop: "1px solid rgba(0,95,2,.1)",
                        }}
                      >
                        <Typography sx={{ fontSize: 12, color: GREEN, opacity: 0.75 }}>
                          {label}
                        </Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: GREEN }}>
                          {value}
                        </Typography>
                      </Box>
                    ))}
                  </>
                )}
              </Paper>
            );
          })()}

          {/* ── Game table ── */}
          <Paper
            elevation={6}
            sx={{
              borderRadius: 4,
              p: { xs: 2.5, md: 3 },
              boxShadow: "0 10px 30px rgba(0,0,0,.12)",
              flex: 1,
              minWidth: 0,
            }}
          >
          {games.length === 0 ? (
            <Typography sx={{ textAlign: "center", py: 4, color: GREEN, opacity: 0.7 }}>
              No games have been played yet.
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
                    <TableCell sx={{ color: GREEN, fontWeight: 700 }}>Status</TableCell>
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
                      <TableCell sx={{ color: GREEN }}>{game.teamName}</TableCell>
                      <TableCell sx={{ color: GREEN }}>{game.opponentTeamName}</TableCell>
                      <TableCell sx={{ color: GREEN }}>
                        <Chip
                          label={game.gameType}
                          size="small"
                          sx={{
                            bgcolor: "rgba(0,95,2,.1)",
                            color: GREEN,
                            fontSize: 12,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: GREEN }}>
                        <Chip
                          label={getStatusLabel(game)}
                          size="small"
                          sx={{
                            bgcolor:
                              game.status === "live"
                                ? "rgba(0,95,2,.18)"
                                : game.status === "intermission"
                                ? "rgba(255,193,7,.22)"
                                : "rgba(0,95,2,.1)",
                            color: GREEN,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: GREEN, fontWeight: 700 }}>
                          {game.teamScore ?? 0} - {game.opponentScore ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ViewIcon />}
                            onClick={() => handleHistoryClick(game._id)}
                            sx={{
                              borderColor: GREEN,
                              color: GREEN,
                              fontWeight: 700,
                              textTransform: "none",
                            }}
                          >
                            History
                          </Button>

                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleLiveClick(game._id)}
                            disabled={game.status !== "live" && game.status !== "intermission"}
                            sx={{
                              bgcolor: GREEN,
                              color: CREAM,
                              fontWeight: 700,
                              textTransform: "none",
                              "&:hover": { bgcolor: "#004a01" },
                              "&.Mui-disabled": {
                                bgcolor: "rgba(0,95,2,.18)",
                                color: "rgba(0,95,2,.45)",
                              },
                            }}
                          >
                            Live
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          </Paper>
        </Stack>
      </Container>
    </Box>
    </>
  );
}